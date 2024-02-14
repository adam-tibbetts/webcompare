const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

function compareScreenshots(
  currentImagePath,
  previousImagePath,
  diffImagePath
) {
  const currentImg = PNG.sync.read(fs.readFileSync(currentImagePath));
  const previousImg = PNG.sync.read(fs.readFileSync(previousImagePath));
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

  fs.writeFileSync(diffImagePath, PNG.sync.write(diff));

  return diffCount;
}

async function compareScreenshotSets(currentDir, previousDir) {
  // Ensure directories exist
  if (!fs.existsSync(currentDir) || !fs.existsSync(previousDir)) {
    console.error('One of the directories does not exist.');
    return;
  }

  // Create a directory for diffs
  const diffDir = path.join(currentDir, 'diffs');
  if (!fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir);
  }

  // Read the current directory to get a list of image files
  const currentFiles = fs
    .readdirSync(currentDir)
    .filter((file) => path.extname(file).toLowerCase() === '.png');

  let totalDifferences = 0;
  for (const file of currentFiles) {
    const currentFilePath = path.join(currentDir, file);
    const previousFilePath = path.join(previousDir, file);
    const diffFilePath = path.join(diffDir, `diff-${file}`);

    // Check if the corresponding file exists in the previous directory
    if (fs.existsSync(previousFilePath)) {
      const differences = compareScreenshots(
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
  }

  console.log(`Total differences: ${totalDifferences}`);
  return totalDifferences;
}

module.exports = { compareScreenshotSets };
