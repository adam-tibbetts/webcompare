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

document.getElementById('select-directory').addEventListener('click', () => {
  ipcRenderer.invoke('select-directory').then((directory) => {
    if (directory) {
      window.selectedDirectory = directory
      document.getElementById(
        'selected-directory-display'
      ).textContent = `Selected Directory: ${directory}`
    }
  })
})

ipcRenderer.on('url-list-generated', (event, urlList) => {
  const list = document.getElementById('url-list')
  list.innerHTML = urlList.map((url) => `<li>${url}</li>`).join('')

  document.getElementById('startCrawlButton').disabled = false
})

ipcRenderer.on('screenshot-saved', (event, screenshotPath) => {
  const list = document.getElementById('image-list')
  const listItem = document.createElement('li')
  const image = document.createElement('img')

  image.src = screenshotPath // Set the source of the image to the screenshot path
  image.alt = 'Screenshot' // Set an alt text for the image
  image.style.width = '100px' // Optional: Set a width for the image if you want to resize it
  image.style.height = 'auto' // Optional: Keep the aspect ratio

  listItem.appendChild(image) // Append the image to the list item
  list.appendChild(listItem) // Append the list item to the list
})

async function displayImages (directoryPath) {
  document.getElementById('images').innerHTML = '' // Empty the div first

  const parentDirName = path.basename(path.dirname(directoryPath))
  directoryPath = path.join(directoryPath, parentDirName) // Change the directoryPath to point directly to the subdirectory
  document.querySelector('h1').textContent = `Website: ${parentDirName}` // Set the heading text to the website name (folder name)

  const files = await fs.promises.readdir(directoryPath)

  for (const file of files) {
    if (!file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) continue // Skip non-image files

    const imgElement = document.createElement('img')
    imgElement.src = path.join(directoryPath, file)
    document.getElementById('images').appendChild(imgElement)
  }
}
