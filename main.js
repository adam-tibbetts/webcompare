const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const urlListGenerator = require('./crawler/urlListGenerator');
const screenshotTaker = require('./crawler/screenshotTaker');
const fs = require('fs');
const path = require('path');
const util = require('util');

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
}

app.whenReady().then(createWindow);

async function selectDirectory() {
  const directory = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openDirectory'],
  });

  if (directory) {
    return directory[0]; // Return the selected directory path
  }
  return null; // Return null if no directory was selected
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

ipcMain.handle('read-directory', async (event, directoryPath, includeSubdirectories = false) => {
  try {
    console.log('receiving read-directory ipcMain.handle', directoryPath);
    
    const files = await readDirectory(directoryPath, includeSubdirectories);
    
    // Map Dirent objects to file paths
    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.join(directoryPath, file.name) // Add the full file path
    }));
    
    console.log('read-directory returning files: ', fileList);
    return fileList;
  } catch (error) {
    console.error('An error occurred while reading directory: ', error);
    throw error;
  }
});



ipcMain.handle('generate-url-list', async (event, settings) => {
  console.log('ipcMain.handle(generate-url-list)');
  const urlList = await urlListGenerator.generateUrlList(settings);
  mainWindow.webContents.send('url-list-generated', urlList);
  return urlList;
});

ipcMain.on('start-crawl', async (event, settings, urlList) => {
  try {
    await screenshotTaker.startCrawl(settings, urlList, mainWindow);
  } catch (error) {
    console.error('Error during crawl:', error);
    // Optionally, you can send an error message back to the renderer process
    event.sender.send('crawl-error', error.message);
  }
});
