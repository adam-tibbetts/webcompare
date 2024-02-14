const { dir, error } = require('console');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

document
  .getElementById('generateUrlListButton')
  .addEventListener('click', () => {
    document.getElementById('loading-spinner').style.display = 'block';
    const settings = {
      baseUrl: document.getElementById('baseUrl').value,
      depth: document.getElementById('depth').value,
      directory: window.selectedDirectory,
    };
    console.log('renderer.js got a click from generateUrlListButton');
    ipcRenderer
      .invoke('generate-url-list', settings)
      .then((urlList) => {
        document.getElementById('loading-spinner').style.display = 'none';
        const ulElement = document.getElementById('url-list');
        ulElement.innerHTML = ''; // Clear existing list items if necessary

        // Create a list item with a checkbox for each URL and append it to the ul element
        urlList.forEach((url, index) => {
          const li = document.createElement('li');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `url-checkbox-${index}`; // Unique ID for each checkbox
          checkbox.checked = true; // By default, all checkboxes are checked
          checkbox.classList.add('url-checkbox'); // Class for styling or selecting checkboxes

          const label = document.createElement('label');
          label.htmlFor = checkbox.id;
          label.textContent = url;
          label.style.marginLeft = '8px'; // Add some space between the checkbox and the label

          li.appendChild(checkbox);
          li.appendChild(label);
          ulElement.appendChild(li);
        });
      })
      .catch((error) => {
        // Handle the error, possibly by showing an error message to the user
        console.error('Error generating URL list:', error);
        document.getElementById('loading-spinner').style.display = 'none';
      });
  });

ipcRenderer.on('url-list-generated', (event, urlList) => {
  const list = document.getElementById('url-list');
  list.innerHTML = urlList.map((url) => `<li>${url}</li>`).join('');

  document.getElementById('startCrawlButton').disabled = false;
});

document.getElementById('settings-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const settings = {
    baseUrl: document.getElementById('baseUrl').value,
    directory: window.selectedDirectory,
  };

  // Get only the checked URLs
  const urlList = Array.from(
    document.querySelectorAll('#url-list li input:checked')
  ).map((checkbox) => checkbox.nextElementSibling.textContent);

  ipcRenderer.send('start-crawl', settings, urlList);
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
    console.log('Directory selection initiated.');
    try {
      const parentDirectory = await ipcRenderer.invoke('select-directory');
      console.log(`Directory selected: ${parentDirectory}`);

      if (parentDirectory) {
        console.log('Directory selection successful.');
        window.selectedDirectory = parentDirectory; // Store the selected directory path
        document.getElementById(
          'selected-directory-display'
        ).textContent = `Selected Directory: ${parentDirectory}`;
        displayAllSites(parentDirectory);
      } else {
        console.warn('No directory was selected.');
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  });

async function displayAllSites(parentDirectory) {
  console.log(`Displaying all sites for directory: ${parentDirectory}`);

  const sitesContainer = document.getElementById('sites-container');
  if (!sitesContainer) {
    console.error('Failed to find the sites-container element.');
    return;
  }

  sitesContainer.innerHTML = ''; // Clear previous content

  try {
    const entries = await ipcRenderer.invoke(
      'read-directory',
      parentDirectory,
      false
    );
    console.log(`Entries in ${parentDirectory}:`, entries);

    const siteDirectories = entries.filter((entry) => entry.isDirectory);
    console.log('Filtered site directories:', siteDirectories);

    if (siteDirectories.length === 0) {
      console.log('No directories found within the selected directory.');
    }

    for (const directory of siteDirectories) {
      console.log(`Processing directory: ${directory.name}`);
      try {
        const directoryEntries = await ipcRenderer.invoke(
          'read-directory',
          path.join(parentDirectory, directory.name),
          false
        );
        console.log(`Entries for ${directory.name}:`, directoryEntries);

        const imageFiles = directoryEntries
          .filter((entry) => !entry.isDirectory)
          .map((entry) =>
            path.join(parentDirectory, directory.name, entry.name)
          );
        console.log(`Image files for ${directory.name}:`, imageFiles);

        if (imageFiles.length > 0) {
          displayImagesWithHeading(parentDirectory, imageFiles, directory.name);
        } else {
          console.log(`No images found in ${directory.name}.`);
        }
      } catch (error) {
        console.error(`Error processing directory ${directory.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reading parent directory:', error);
  }
}

function displayImagesWithHeading(siteDirectory, imageFiles, siteName) {
  console.log(`Displaying images for site: ${siteName}`);
  const tabsContainer = document.getElementById('tabs-container'); // Container for tabs
  const sitesContainer = document.getElementById('sites-container'); // Container for content
  if (!tabsContainer || !sitesContainer) {
    console.error(
      'Failed to find the tabs-container or sites-container elements for displaying images.'
    );
    return;
  }

  // Use a regular expression to extract the date and time from the siteName
  // The format is assumed to be "example.com-YYYYMMDD-HHMMSS"
  const match = siteName
    .trim()
    .match(/-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})\d{2}$/);
  if (!match) {
    console.error('Failed to extract date and time from siteName:', siteName);
    return;
  }

  // Extracted parts are at indices 1 to 5 due to how match groups are ordered
  const [_, year, month, day, hour, minute] = match;
  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;
  const formattedDate = formatDateAndTime(date, time); // Assuming formatDateAndTime is a function you've defined elsewhere

  // Create tab
  const tabButton = document.createElement('button');
  tabButton.className = 'tab';
  tabButton.id = `tab-${siteName}`; // Assign a unique ID based on siteName
  tabButton.textContent = `${siteName.split('-')[0]} ${formattedDate}`;
  tabButton.onclick = function () {
    showTabContent(siteName);
  };

  // Append the tab to the tabs container
  tabsContainer.appendChild(tabButton);

  // Create content div for this site
  const contentDiv = document.createElement('div');
  contentDiv.id = `content-${siteName}`; // Ensure the ID matches the pattern used in the JavaScript logic
  contentDiv.className = 'tab-content';
  contentDiv.style.display = 'none'; // Hide content by default

  imageFiles.forEach((filePath) => {
    const imgElement = document.createElement('img');
    imgElement.src = `file://${filePath}`;
    imgElement.alt = 'Screenshot';
    contentDiv.appendChild(imgElement);
  });

  // Append content to the sites container
  sitesContainer.appendChild(contentDiv);
}

// Global array to track selected tabs
let selectedTabs = [];

function showTabContent(siteName) {
  const contentDivId = `content-${siteName}`;
  const tabButtonId = `tab-${siteName}`;
  const index = selectedTabs.indexOf(contentDivId);

  // Toggle the selection state of the tab
  if (index > -1) {
    // If the tab is already selected, deselect it
    selectedTabs.splice(index, 1);
    document.getElementById(tabButtonId).classList.remove('active');
  } else {
    // Add the tab to the selectedTabs array if not already selected
    if (!selectedTabs.includes(contentDivId)) {
      selectedTabs.push(contentDivId);
      document.getElementById(tabButtonId).classList.add('active');
    }
  }

  // Update the display of each tab content based on selection
  document.querySelectorAll('.tab-content').forEach((div) => {
    if (selectedTabs.includes(div.id)) {
      div.style.display = 'block'; // Show selected tab content
    } else {
      div.style.display = 'none'; // Hide unselected tab content
    }
  });

  // Adjust the layout based on the number of selected tabs
  const sitesContainer = document.getElementById('sites-container');
  if (selectedTabs.length === 2) {
    sitesContainer.classList.add('two-columns');
  } else {
    sitesContainer.classList.remove('two-columns');
  }
}

function formatDateAndTime(date, time) {
  console.log(`Formatting date and time from: ${date} ${time}`);
  try {
    // Split the date and time strings on their respective separators
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');

    // Create a new Date object using the extracted values
    const formattedDate = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:00`
    ).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    console.log(`Formatted date and time: ${formattedDate}`);
    return formattedDate;
  } catch (error) {
    console.error(
      `Error formatting date and time from ${date} ${time}:`,
      error
    );
    return `${date} ${time}`; // Return a fallback string in case of error
  }
}
