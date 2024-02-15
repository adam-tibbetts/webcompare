const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const fs = require('fs').promises;
const path = require('path');

async function compareScreenshots(
  currentImagePath,
  previousImagePath,
  diffImagePath
) {
  let currentImg, previousImg;
  try {
    const currentImgData = await fs.readFile(currentImagePath);
    currentImg = PNG.sync.read(currentImgData);
    const previousImgData = await fs.readFile(previousImagePath);
    previousImg = PNG.sync.read(previousImgData);
  } catch (error) {
    console.error('Error reading images:', error);
    throw error; // Rethrow to handle it in the calling function
  }

  const { width, height } = currentImg;
  const diff = new PNG({ width, height });

  const diffCount = pixelmatch(
    currentImg.data,
    previousImg.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  try {
    await fs.writeFile(diffImagePath, PNG.sync.write(diff));
  } catch (error) {
    console.error('Error writing diff image:', error);
    throw error;
  }

  return diffCount;
}

async function compareScreenshotSets(currentDir, previousDir) {
  try {
    if (
      !(await fs.stat(currentDir)).isDirectory() ||
      !(await fs.stat(previousDir)).isDirectory()
    ) {
      console.error('One of the directories does not exist.');
      return;
    }
  } catch (error) {
    console.error('Error accessing directories:', error);
    return;
  }

  const diffDir = path.join(currentDir, 'diffs');
  try {
    if (!(await fs.stat(diffDir)).isDirectory()) {
      await fs.mkdir(diffDir);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(diffDir);
    } else {
      console.error('Error creating diff directory:', error);
      return;
    }
  }

  let currentFiles;
  try {
    currentFiles = (await fs.readdir(currentDir)).filter(
      (file) => path.extname(file).toLowerCase() === '.png'
    );
  } catch (error) {
    console.error('Error reading current directory:', error);
    return;
  }

  let totalDifferences = 0;
  for (const file of currentFiles) {
    const currentFilePath = path.join(currentDir, file);
    const previousFilePath = path.join(previousDir, file);
    const diffFilePath = path.join(diffDir, `diff-${file}`);

    try {
      if (await fs.stat(previousFilePath)) {
        const differences = await compareScreenshots(
          currentFilePath,
          previousFilePath,
          diffFilePath
        );
        console.log(`Compared ${file}: ${differences} differences`);
        totalDifferences += differences;
      } else {
        console.log(
          `No corresponding file found for ${file} in previous directory.`
        );
      }
    } catch (error) {
      console.error(`Error comparing ${file}:`, error);
    }
  }

  console.log(`Total differences: ${totalDifferences}`);
  return totalDifferences;
}

module.exports = { compareScreenshotSets };
