const { dir, error } = require('console')
const { ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')

document
  .getElementById('generateUrlListButton')
  .addEventListener('click', () => {
    const settings = {
      baseUrl: document.getElementById('baseUrl').value,
      depth: document.getElementById('depth').value,
      directory: window.selectedDirectory
    }
    console.log('renderer.js got a click from generateUrlListButton')
    ipcRenderer
      .invoke('generate-url-list', settings)
      .then((urlList) => {
        // Assuming urlList is an array of URLs
        const ulElement = document.getElementById('url-list')
        ulElement.innerHTML = '' // Clear existing list items if necessary

        // Create a list item for each URL and append it to the ul element
        urlList.forEach((url) => {
          const li = document.createElement('li')
          li.textContent = url
          ulElement.appendChild(li)
        })
      })
      .catch((error) => {
        // Handle the error, possibly by showing an error message to the user
        console.error('Error generating URL list:', error)
      })
  })

document.getElementById('settings-form').addEventListener('submit', (event) => {
  event.preventDefault()

  const settings = {
    baseUrl: document.getElementById('baseUrl').value,
    directory: window.selectedDirectory
  }

  const urlList = Array.from(document.querySelectorAll('#url-list li')).map(
    (li) => li.textContent
  )

  ipcRenderer.send('start-crawl', settings, urlList)
})

ipcRenderer.on('url-list-generated', (event, urlList) => {
  const list = document.getElementById('url-list')
  list.innerHTML = urlList.map((url) => `<li>${url}</li>`).join('')

  document.getElementById('startCrawlButton').disabled = false
})

ipcRenderer.on('screenshot-saved', (event, screenshotPath) => {
  const list = document.getElementById('image-list')
  const listItem = document.createElement('div')
  const image = document.createElement('img')

  image.src = screenshotPath // Set the source of the image to the screenshot path
  image.alt = 'Screenshot' // Set an alt text for the image
  image.style.width = '100px' // Optional: Set a width for the image if you want to resize it
  image.style.height = 'auto' // Optional: Keep the aspect ratio

  listItem.appendChild(image) // Append the image to the list item
  list.appendChild(listItem) // Append the list item to the list
})

async function displayImages(siteDirectory) {
  const siteName = path.basename(siteDirectory);
  const files = await fs.promises.readdir(siteDirectory);

  // Create a new section for this site
  const siteSection = document.createElement('section');
  siteSection.id = `site-${siteName}`;

  const siteHeading = document.createElement('h3');
  siteHeading.textContent = siteName;
  siteSection.appendChild(siteHeading);

  const imageListDiv = document.createElement('div');
  imageListDiv.className = 'image-list'; // Use a class for styling all image lists

  for (const file of files) {
    if (!file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) continue; // Skip non-image files

    const imgElement = document.createElement('img');
    imgElement.src = path.join(siteDirectory, file);
    imgElement.alt = 'Screenshot';
    imgElement.style.width = '100px';
    imgElement.style.height = 'auto';

    imageListDiv.appendChild(imgElement);
  }

  siteSection.appendChild(imageListDiv);
  document.getElementById('sites-container').appendChild(siteSection);
}

async function displayAllSites(parentDirectory) {
  const sitesContainer = document.getElementById('sites-container');
  sitesContainer.innerHTML = ''; // Clear previous content

  // Use IPC to read the parent directory
  const siteDirectories = await ipcRenderer.invoke('read-directory', parentDirectory);
  for (const siteName of siteDirectories) {
    const sitePath = path.join(parentDirectory, siteName);
    // Use IPC to read the site directory
    const imageFiles = await ipcRenderer.invoke('read-directory', sitePath);
    displayImages(sitePath, imageFiles);
  }
}
