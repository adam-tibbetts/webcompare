const { app, BrowserWindow, ipcMain } = require('electron')
const crawl = require('./crawler')
const { dialog } = require('electron')

let mainWindow

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

ipcMain.on('crawl', async (event, settings) => {
  await crawl(settings)
})

ipcMain.on('screenshot-saved', (event, screenshotPath) => {
  mainWindow.webContents.send('screenshot-saved', screenshotPath)
})

ipcMain.on('select-directory', (event) => {
  const directory = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openDirectory']
  })

  if (directory) {
    event.reply('directory-selected', directory[0])
  }
})

ipcMain.on('generate-url-list', async (event, settings) => {
  const urlList = await crawl.generateUrlList(settings, event) // pass the event object to generateUrlList
})

ipcMain.on('start-crawl', async (event, settings, urlList) => {
  await crawl.startCrawl(settings, urlList, mainWindow)
})
