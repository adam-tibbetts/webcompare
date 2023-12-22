const { ipcRenderer } = require("electron");
const fs = require('fs');

document
    .getElementById("generateUrlListButton")
    .addEventListener("click", () => {
        const settings = {
            baseUrl: document.getElementById("baseUrl").value,
            depth: document.getElementById("depth").value,
            directory: window.selectedDirectory,
        };

        ipcRenderer.send("generate-url-list", settings);
    });

document
    .getElementById("settings-form")
    .addEventListener("submit", (event) => {
        event.preventDefault();

        const settings = {
            baseUrl: document.getElementById("baseUrl").value,
            directory: window.selectedDirectory,
        };

        const urlList = Array.from(
            document.querySelectorAll("#url-list li")
        ).map((li) => li.textContent);

        ipcRenderer.send("start-crawl", settings, urlList);
    });

ipcRenderer.on("screenshot-saved", (event, screenshotPath) => {
    const list = document.getElementById("screenshot-list");
    const listItem = document.createElement("li");
    listItem.textContent = `Screenshot saved at ${screenshotPath}`;
    list.appendChild(listItem);
});

document
    .getElementById("select-directory")
    .addEventListener("click", () => {
        ipcRenderer.send("select-directory");
    });

ipcRenderer.on("directory-selected", (event, directory) => {
    window.selectedDirectory = directory;
});

ipcRenderer.on("url-list-generated", (event, urlList) => {
    const list = document.getElementById("url-list");
    list.innerHTML = urlList.map((url) => `<li>${url}</li>`).join("");

    document.getElementById("startCrawlButton").disabled = false;
});


async function displayImages(directoryPath) {
    document.getElementById("images").innerHTML = '';  // Empty the div first
    
    const parentDirName = path.basename(path.dirname(directoryPath));
    directoryPath = path.join(directoryPath, parentDirName);  // Change the directoryPath to point directly to the subdirectory
    document.querySelector('h1').textContent = `Website: ${parentDirName}`;  // Set the heading text to the website name (folder name)
    
    const files = await fs.promises.readdir(directoryPath);
    
    for (const file of files) {
        if (!file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) continue; // Skip non-image files
            
        const imgElement = document.createElement('img');
        imgElement.src = path.join(directoryPath, file);
        document.getElementById("images").appendChild(imgElement);
    }
}
