const { app, BrowserWindow, ipcMain } = require("electron");
const crawl = require("./crawler");
const { dialog } = require("electron");

ipcMain.on("crawl", async (event, settings) => {
    await crawl(settings);
});

ipcMain.on("screenshot-saved", (event, screenshotPath) => {
    mainWindow.webContents.send("screenshot-saved", screenshotPath);
});

// ipcMain.on('select-directory', (event) => {
//   const directory = dialog.showOpenDialogSync(mainWindow, {
//     properties: ['openDirectory']
//   })

//   if (directory) {
//     event.reply('directory-selected', directory[0])
//   }
// })

