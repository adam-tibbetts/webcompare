const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const urlListGenerator = require('./crawler/urlListGenerator')
const screenshotTaker = require('./crawler/screenshotTaker')
const fs = require('fs')
const path = require('path')

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

async function selectDirectory () {
  const directory = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openDirectory']
  })

  if (directory) {
    return directory[0] // Return the selected directory path
  }
  return null // Return null if no directory was selected
}

ipcMain.handle('select-directory', selectDirectory)

ipcMain.handle('read-directory', async (event, directoryPath) => {
  const files = await fs.promises.readdir(directoryPath)
  return files.filter((file) =>
    file.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)
  )
})

ipcMain.handle('generate-url-list', async (event, settings) => {
  console.log('ipcMain.handle(generate-url-list)')
  const urlList = await urlListGenerator.generateUrlList(settings)
  mainWindow.webContents.send('url-list-generated', urlList)
  return urlList
})

ipcMain.on('start-crawl', async (event, settings, urlList) => {
  try {
    await screenshotTaker.startCrawl(settings, urlList, mainWindow);
  } catch (error) {
    console.error('Error during crawl:', error);
    // Optionally, you can send an error message back to the renderer process
    event.sender.send('crawl-error', error.message);
  }
});
