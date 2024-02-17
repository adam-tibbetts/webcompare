const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const urlListGenerator = require('./crawler/urlListGenerator');
const screenshotTaker = require('./crawler/screenshotTaker');
const imageCompare = require('./imageCompare/imageCompare');
const fs = require('fs');
const path = require('path');
const util = require('util');

const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
console.log('############################## ', settingsFilePath)

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    const workingDirectory = loadWorkingDirectory();
    if (workingDirectory) {
      mainWindow.webContents.send('set-working-directory', workingDirectory);
    }
  });
}

app.whenReady().then(createWindow);

async function selectDirectory() {
  const directory = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openDirectory'],
  });

  if (directory) {
    const selectedDirectory = directory[0];
    saveWorkingDirectory(selectedDirectory); // Save the selected directory
    return selectedDirectory;
  }
  return null;
}

function saveWorkingDirectory(directoryPath) {
  const settings = { workingDirectory: directoryPath };
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings), 'utf-8');
}

function loadWorkingDirectory() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
      return settings.workingDirectory;
    }
  } catch (error) {
    console.error('Failed to load the working directory:', error);
  }
  return null;
}

ipcMain.handle('select-directory', selectDirectory);

async function readDirectory(directoryPath) {
  directoryPath = path.resolve(directoryPath);

  if (!fs.existsSync(directoryPath)) {
    console.log(`Directory does not exist: ${directoryPath}`);
    return [];
  }

  let files;
  try {
    const readdir = util.promisify(fs.readdir);
    files = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    console.log('An error occurred while reading directory: ', error);
    throw error;
  }

  const imageFiles = files
    .filter((file) => !file.isDirectory())
    .map((file) => file.name)
    .filter((name) =>
      ['.jpg', '.jpeg', '.png', '.gif'].includes(
        path.extname(name).toLowerCase()
      )
    );

  return files;
}

ipcMain.handle(
  'read-directory',
  async (event, directoryPath, includeSubdirectories = false) => {
    try {
      console.log('receiving read-directory ipcMain.handle', directoryPath);

      const files = await readDirectory(directoryPath, includeSubdirectories);

      // Map Dirent objects to file paths
      const fileList = files.map((file) => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: path.join(directoryPath, file.name), // Add the full file path
      }));

      console.log('read-directory returning files: ', fileList);
      return fileList;
    } catch (error) {
      console.error('An error occurred while reading directory: ', error);
      throw error;
    }
  }
);

ipcMain.handle('generate-url-list', async (event, settings) => {
  console.log('ipcMain.handle(generate-url-list)');
  const urlList = await urlListGenerator.generateUrlList(settings);
  mainWindow.webContents.send('url-list-generated', urlList);
  return urlList;
});

ipcMain.on('start-crawl', async (event, settings, urlList) => {
  try {
    // Start the screenshot taking process
    await screenshotTaker.startCrawl(settings, urlList, mainWindow);

    // Assuming the directory where screenshots are saved is accessible via settings.directory
    const currentDir = settings.directory;
    const previousDir = findPreviousDir(currentDir);
    if (previousDir) {
      // Perform the comparison
      const totalDifferences = await imageCompare.compareScreenshotSets(
        currentDir,
        previousDir
      );
      // Send the comparison results back to the renderer process
      event.sender.send('comparison-complete', totalDifferences);
    } else {
      console.log('No previous directory found for comparison.');
      event.sender.send(
        'comparison-skipped',
        'No previous directory found for comparison.'
      );
    }
  } catch (error) {
    console.error('Error during crawl or comparison:', error);
    event.sender.send('crawl-error', error.message);
  }
});

function findPreviousDir(currentDir) {
  const parentDir = path.dirname(currentDir);
  // List all directories within the parent directory
  const dirs = fs.readdirSync(parentDir).filter((f) => {
    const dirPath = path.join(parentDir, f);
    return fs.statSync(dirPath).isDirectory();
  });

  // Filter directories based on the date and time pattern in their names and sort them
  const sortedDirs = dirs
    .filter((dirName) => /\d{4}-\d{2}-\d{2}-\d{6}$/.test(dirName)) // Look for directories ending with the date-time pattern
    .sort((a, b) => {
      // Extract timestamps from directory names for comparison
      const timeStampA = a
        .match(/(\d{4}-\d{2}-\d{2}-\d{6})$/)[0]
        .replace(/-/g, ':')
        .replace(/:/g, (m, i) => (i === 2 ? ' ' : i === 8 ? '.' : ':'));
      const timeStampB = b
        .match(/(\d{4}-\d{2}-\d{2}-\d{6})$/)[0]
        .replace(/-/g, ':')
        .replace(/:/g, (m, i) => (i === 2 ? ' ' : i === 8 ? '.' : ':'));
      return new Date(timeStampB) - new Date(timeStampA);
    });

  // Find the index of the current directory
  const currentIndex = sortedDirs.indexOf(path.basename(currentDir));

  // Return the previous directory if it exists
  return currentIndex >= 0 && currentIndex + 1 < sortedDirs.length
    ? path.join(parentDir, sortedDirs[currentIndex + 1])
    : null;
}

ipcMain.handle(
  'compare-screenshots',
  async (event, { currentDir, previousDir }) => {
    console.log('Starting comparison...');
    try {
      const totalDifferences = await imageCompare.compareScreenshotSets(
        currentDir,
        previousDir
      );
      console.log(`Total differences found: ${totalDifferences}`);

      // Comparison images are saved in a 'diffs' subfolder within currentDir
      console.log('Reading diffs directory...');
      const diffsDir = path.join(currentDir, 'diffs');
      console.log(`Reading from diffs directory: ${diffsDir}`);

      const files = await readDirectory(diffsDir);
      console.log(`readDirectory returned:`, files); // Log what readDirectory is returning

      // Filter out directories and keep only image file paths
      console.log(`Filtering image paths...`);
      const imagePaths = files
        .filter((file) => !file.isDirectory())
        .map((file) => path.join(diffsDir, file.name)); // Construct the full path
      console.log(`Filtered image paths: ${imagePaths}`);

      return {
        success: true,
        totalDifferences,
        comparisonImagePaths: imagePaths,
      };
    } catch (error) {
      console.error('Error comparing screenshots:', error);
      return { success: false, error: error.message };
    }
  }
);
