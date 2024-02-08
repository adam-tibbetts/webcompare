const { dir, error } = require('console');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

document
  .getElementById('generateUrlListButton')
  .addEventListener('click', () => {
    const settings = {
      baseUrl: document.getElementById('baseUrl').value,
      depth: document.getElementById('depth').value,
      directory: window.selectedDirectory,
    };
    console.log('renderer.js got a click from generateUrlListButton');
    ipcRenderer
      .invoke('generate-url-list', settings)
      .then((urlList) => {
        // Assuming urlList is an array of URLs
        const ulElement = document.getElementById('url-list');
        ulElement.innerHTML = ''; // Clear existing list items if necessary

        // Create a list item for each URL and append it to the ul element
        urlList.forEach((url) => {
          const li = document.createElement('li');
          li.textContent = url;
          ulElement.appendChild(li);
        });
      })
      .catch((error) => {
        // Handle the error, possibly by showing an error message to the user
        console.error('Error generating URL list:', error);
      });
  });

document.getElementById('settings-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const settings = {
    baseUrl: document.getElementById('baseUrl').value,
    directory: window.selectedDirectory,
  };

  const urlList = Array.from(document.querySelectorAll('#url-list li')).map(
    (li) => li.textContent
  );

  ipcRenderer.send('start-crawl', settings, urlList);
});

ipcRenderer.on('url-list-generated', (event, urlList) => {
  const list = document.getElementById('url-list');
  list.innerHTML = urlList.map((url) => `<li>${url}</li>`).join('');

  document.getElementById('startCrawlButton').disabled = false;
});

ipcRenderer.on('screenshot-saved', (event, screenshotPath) => {
  const list = document.getElementById('image-list');
  const listItem = document.createElement('div');
  const image = document.createElement('img');

  image.src = screenshotPath; // Set the source of the image to the screenshot path
  image.alt = 'Screenshot'; // Set an alt text for the image
  image.style.width = '100px'; // Optional: Set a width for the image if you want to resize it
  image.style.height = 'auto'; // Optional: Keep the aspect ratio

  listItem.appendChild(image); // Append the image to the list item
  list.appendChild(listItem); // Append the list item to the list
});

document
  .getElementById('select-directory')
  .addEventListener('click', async () => {
    console.log('Get directory handler in renderer.js clicked.');
    const parentDirectory = await ipcRenderer.invoke('select-directory');
    if (parentDirectory) {
      console.log('if (parentDirectory) evaluated true');
      window.selectedDirectory = parentDirectory; // Store the selected directory path
      document.getElementById(
        'selected-directory-display'
      ).textContent = `Selected Directory: ${parentDirectory}`;
      displayAllSites(parentDirectory);
    }
  });

async function displayAllSites(parentDirectory) {
  console.log('displayAllSites, ', parentDirectory);

  const sitesContainer = document.getElementById('sites-container');
  sitesContainer.innerHTML = ''; // Clear previous content

  try {
    // Get all entries in the parent directory
    const entries = await ipcRenderer.invoke(
      'read-directory',
      parentDirectory,
      false
    );
    console.log('Parent directory entries:', entries);

    // Filter out files and keep only directories
    const siteDirectories = entries.filter((entry) => entry.isDirectory);
    console.log('Site directories:', siteDirectories);

    for (const directory of siteDirectories) {
      const siteName = directory.name;
      console.log('Processing site:', siteName);

      try {
        // Read all entries in the directory
        const directoryEntries = await ipcRenderer.invoke(
          'read-directory',
          path.join(parentDirectory, siteName),
          false
        );
        console.log(`Entries for ${siteName}:`, directoryEntries);

        // Filter out directories and map to file paths
        const imageFiles = directoryEntries
          .filter((entry) => !entry.isDirectory)
          .map((entry) => path.join(parentDirectory, siteName, entry.name));

        console.log(`Image files for ${siteName}:`, imageFiles);

        if (imageFiles.length > 0) {
          displayImagesWithHeading(parentDirectory, imageFiles, siteName);
        } else {
          console.log(`No images found in ${siteName}`);
        }
      } catch (error) {
        console.log(
          'An error occurred while reading directory for site:',
          siteName,
          error
        );
        continue; // Skip to the next iteration of the loop
      }
    }
  } catch (error) {
    console.log('An error occurred while reading parent directory:', error);
  }
}

function displayImagesWithHeading(siteDirectory, imageFiles, siteName) {
  // Create a new section for this site
  const siteSection = document.createElement('section');
  siteSection.id = `site-${siteName}`;

  const siteHeading = document.createElement('h3');
  siteHeading.textContent = siteName;
  siteSection.appendChild(siteHeading);

  const imageListDiv = document.createElement('div');
  imageListDiv.className = 'image-list'; // Use a class for styling all image lists

  for (const filePath of imageFiles) {
    const imgElement = document.createElement('img');
    imgElement.src = `file://${filePath}`; // Set the full file path using the file:// protocol
    imgElement.alt = 'Screenshot';

    imageListDiv.appendChild(imgElement);
  }

  siteSection.appendChild(imageListDiv); // Append the div to the parent section

  document.getElementById('sites-container').appendChild(siteSection);
}

async function displayImages(siteDirectory, imageFiles, siteSection) {
  console.log('dipslayImages', siteDirectory);

  const imageListDiv = document.createElement('div');
  imageListDiv.className = 'image-list'; // Use a class for styling all image lists

  for (const file of imageFiles) {
    const imgElement = document.createElement('img');
    imgElement.src = `file://${path.join(siteDirectory, file)}`;
    imgElement.alt = 'Screenshot';

    imageListDiv.appendChild(imgElement);
  }

  siteSection.appendChild(imageListDiv); // Append the div to the parent section
}
