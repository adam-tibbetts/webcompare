const { dir, error } = require('console');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const themeMetaTag = document.querySelector('meta[name="xel-theme"]');

  // Check if the application is in dark mode at startup
  if (
    themeMetaTag.getAttribute('content') ===
    'node_modules/xel/themes/adwaita-dark.css'
  ) {
    themeToggle.setAttribute('toggled', ''); // Set the switch to dark mode
  } else {
    themeToggle.removeAttribute('toggled'); // Ensure the switch is in light mode
  }

  themeToggle.addEventListener('toggle', () => {
    console.log('Theme Toggle toggled');
    if (themeToggle.hasAttribute('toggled')) {
      themeMetaTag.setAttribute(
        'content',
        'node_modules/xel/themes/adwaita-dark.css'
      );
    } else {
      themeMetaTag.setAttribute(
        'content',
        'node_modules/xel/themes/adwaita.css'
      );
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const settingsMenuItem = document.getElementById('settingsMenuItem');
  const settingsDialog = document.getElementById('settingsDialog');
  const aboutMenuItem = document.getElementById('aboutMenuItem');
  const aboutDialog = document.getElementById('aboutDialog');
  const quitMenuItem = document.getElementById('quitMenuItem');

  settingsMenuItem.addEventListener('click', () => {
    settingsDialog
      .showModal()
      .then(() => {
        console.log('Dialog opened');
      })
      .catch((err) => {
        console.error('Error opening dialog: ', err);
      });
  });

  aboutMenuItem.addEventListener('click', () => {
    aboutDialog
      .showModal()
      .then(() => {
        console.log('About opened');
      })
      .catch((err) => {
        console.error('Error opening dialog: ', err);
      });
  });

  quitMenuItem.addEventListener('click', () => {
    ipcRenderer.send('quit-app');
  });
});

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

document
  .getElementById('startCrawlButton')
  .addEventListener('click', function () {
    // Gather settings from the form elements
    const settings = {
      baseUrl: document.getElementById('baseUrl').value,
      depth: document.getElementById('depth').value, // Ensure this was not omitted
      directory: window.selectedDirectory,
    };

    // Collect URLs from checked checkboxes
    const urlList = Array.from(
      document.querySelectorAll('#url-list li input:checked')
    ).map((checkbox) => checkbox.nextElementSibling.textContent);

    // Send the settings and URL list to the main process for crawling
    ipcRenderer.send('start-crawl', settings, urlList);
  });

ipcRenderer.on('screenshot-saved', (event, screenshotPath) => {
  const list = document.getElementById('image-list');
  const listItem = document.createElement('div');
  const image = document.createElement('img');

  image.src = screenshotPath;
  image.alt = 'Screenshot';
  image.style.width = '100px';
  image.style.height = 'auto';
  listItem.appendChild(image);
  list.appendChild(listItem);
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

ipcRenderer.on('set-working-directory', (event, workingDirectory) => {
  if (workingDirectory) {
    console.log('Received working directory:', workingDirectory);
    window.selectedDirectory = workingDirectory; // Store the selected directory path
    document.getElementById(
      'selected-directory-display'
    ).textContent = `Selected Directory: ${workingDirectory}`;
    displayAllSites(workingDirectory);
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
  const tabsContainer = document.getElementById('x-tabs'); // Container for tabs
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
  const tab = document.createElement('x-tab');
  tab.id = `tab-${siteName}`; // Assign a unique ID based on siteName

  // Create an x-label element
  const label = document.createElement('x-label');
  label.textContent = `${siteName.split('-')[0]} ${formattedDate}`;

  // Append the x-label to the x-tab
  tab.appendChild(label);

  tab.onclick = function () {
    showTabContent(siteName);
  };

  // Append the tab to the tabs container
  tabsContainer.appendChild(tab);

  // Create content div for this site
  const contentDiv = document.createElement('div');
  contentDiv.id = `content-${siteName}`; // Ensure the ID matches the pattern used in the JavaScript logic
  contentDiv.className = 'tab-content';
  contentDiv.style.display = 'none'; // Hide content by default. #FIXME: Redundant?

  imageFiles.forEach((filePath) => {
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('image-container');

    // Extract filename from filePath and determine if it's a diff image
    const filename = filePath.split('/').pop(); // Adjust according to your path separator if necessary
    const isDiffImage = filename.startsWith('diff-');
    const dataFilename = isDiffImage ? filename.substring(5) : filename; // Remove 'diff-' prefix for diff images

    // Set data-filename attribute for matching original and diff images
    imageContainer.setAttribute('data-filename', dataFilename);

    const imgElement = document.createElement('img');
    imgElement.src = `file://${filePath}`;
    imgElement.alt = 'Screenshot';
    imgElement.classList.add(isDiffImage ? 'diff-image' : 'original-image'); // Optionally differentiate styles

    imageContainer.appendChild(imgElement);
    contentDiv.appendChild(imageContainer);
  });
  // Append content to the sites container
  sitesContainer.appendChild(contentDiv);
}

let selectedTabs = []; // Tracks the IDs of selected tabs

function showTabContent(siteName) {
  const contentDivId = `content-${siteName}`;
  const tabButtonId = `tab-${siteName}`;
  const index = selectedTabs.indexOf(contentDivId);

  // Check if the tab is already selected
  if (index > -1) {
    // If the tab is already selected, deselect it
    selectedTabs.splice(index, 1);
    document.getElementById(tabButtonId).classList.remove('active');
  } else {
    // Add the tab to the selectedTabs array if not already selected
    // Ensure that no more than two tabs can be selected at any time
    if (selectedTabs.length < 2) {
      selectedTabs.push(contentDivId);
      document.getElementById(tabButtonId).classList.add('active');
    } else {
      // If trying to select a third tab, deselect the first selected tab
      const firstSelectedTabId = selectedTabs.shift(); // Remove and get the first element
      document
        .getElementById(firstSelectedTabId.replace('content-', 'tab-'))
        .classList.remove('active');

      // Now add the new selection
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
  // Enable compare button if two tabs are selected
  const compareButton = document.getElementById('compareScreenshotsButton');
  compareButton.disabled = selectedTabs.length !== 2;
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

document
  .getElementById('compareScreenshotsButton')
  .addEventListener('click', () => {
    if (selectedTabs.length === 2) {
      const [firstTabPath, secondTabPath] = selectedTabs.map((tabId) => {
        const siteName = tabId.replace('content-', '');
        return window.selectedDirectory + '/' + siteName;
      });

      const newerDir =
        firstTabPath > secondTabPath ? firstTabPath : secondTabPath;
      const olderDir =
        firstTabPath <= secondTabPath ? firstTabPath : secondTabPath;

      document.getElementById('loading-spinner-comparison').style.display =
        'block';

      ipcRenderer
        .invoke('compare-screenshots', {
          currentDir: newerDir,
          previousDir: olderDir,
        })
        .then(({ success, totalDifferences, error, comparisonImagePaths }) => {
          document.getElementById('loading-spinner-comparison').style.display =
            'none';

          if (
            Array.isArray(comparisonImagePaths) &&
            comparisonImagePaths.length > 0
          ) {
            comparisonImagePaths.forEach((comparisonImagePath) => {
              console.log('Attempting to display image:', comparisonImagePath);

              // Normalize the comparison image path for consistent comparison
              let normalizedComparisonPath = comparisonImagePath.replace(
                /\\/g,
                '/'
              );

              // Remove the '/diffs/diff-' part from the path to match the data-filename format
              let adjustedPathForComparison = normalizedComparisonPath.replace(
                '/diffs/diff-',
                '/'
              );

              // Find the appropriate container by checking if the adjusted path includes the container's data-filename
              const containers = document.querySelectorAll('.image-container');
              const container = Array.from(containers).find((container) => {
                // Normalize the container's data-filename path for consistent comparison
                let containerDataFilename = container
                  .getAttribute('data-filename')
                  .replace(/\\/g, '/');
                // Check if the adjusted comparison image path includes this container's data-filename
                return adjustedPathForComparison.includes(
                  containerDataFilename
                );
              });

              if (container) {
                console.log(
                  'Container for diff image to be added to: ',
                  container
                );
                // Create the <img> element for the comparison image
                const comparisonImg = document.createElement('img');
                comparisonImg.src = `file://${comparisonImagePath}`;
                comparisonImg.alt = 'Comparison Image';
                comparisonImg.classList.add('comparison-image');

                // Append the new <img> element to the found container
                container.appendChild(comparisonImg);

                console.log('Image appended to container:', comparisonImg);
              } else {
                console.error(
                  'Container not found for:',
                  adjustedPathForComparison
                );
              }
            });
          } else {
            console.warn('No comparison images to display.');
          }
        })
        .catch((error) => {
          document.getElementById('loading-spinner-comparison').style.display =
            'none';
          console.error('Error invoking compare-screenshots:', error);
        });
    }
  });
