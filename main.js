const { app, BrowserWindow, ipcMain } = require('electron');
const urlListGenerator = require('./urlListGenerator');
const screenshotTaker = require('./screenshotTaker');
const fs = require('fs');
const path = require('path');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile("index.html");
}

app.whenReady().then(createWindow);

ipcMain.handle("select-directory", selectDirectory);
ipcMain.handle("generate-url-list", generateUrlList);
ipcMain.handle("start-crawl", startCrawl);


// Implement the read-directory handler
ipcMain.handle('read-directory', async (event, directoryPath) => {
    const files = await fs.promises.readdir(directoryPath);
    return files.filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/));
});

// Update the require statements to use the new modules
ipcMain.on('generate-url-list', async (event, settings) => {
    const urlList = await urlListGenerator.generateUrlList(settings, event);
});

ipcMain.on('start-crawl', async (event, settings, urlList) => {
    await screenshotTaker.startCrawl(settings, urlList, mainWindow);
});