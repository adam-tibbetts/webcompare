const puppeteer = require('puppeteer')
const { ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')



module.exports.startCrawl = async function startCrawl (
  settings,
  urlList,
  mainWindow
) {
  const websiteName = new URL(settings.baseUrl).hostname
  const screenshotDirectory = path.join(settings.directory, websiteName)

  if (!fs.existsSync(screenshotDirectory)) {
    fs.mkdirSync(screenshotDirectory)
  }

  const browser = await puppeteer.launch({ headless: 'new' })

  for (const url of urlList) {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'load' }) // wait for 'load' event

    await page.setViewport({
      width: 1600,
      height: 900,
      deviceScaleFactor: 1
    })

    // Inject a script to scroll down the page in small increments
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        let totalHeight = 0
        const distance = 100
        var timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight
          window.scrollBy(0, distance)
          totalHeight += distance

          if (totalHeight >= scrollHeight) {
            clearInterval(timer)
            resolve()
          }
        }, 100)
      })
    })

    const screenshotPath = path.join(
      screenshotDirectory,
      `${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`
    )
    await page.screenshot({ path: screenshotPath, fullPage: true })
    mainWindow.webContents.send('screenshot-saved', screenshotPath) // Changed this line

    await page.close()
  }

  await browser.close()
}
