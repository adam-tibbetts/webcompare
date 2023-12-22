const puppeteer = require('puppeteer')
const { ipcMain } = require('electron')

module.exports.generateUrlList = async function generateUrlList (
    settings,
    event
  ) {
    const visitedUrls = new Set()
    const queuedUrls = new Set()
    const baseUrl = settings.baseUrl
    const baseDomain = new URL(baseUrl).hostname
    const maxDepth = settings.depth
    const queue = [{ url: baseUrl, depth: 0 }]
    const browser = await puppeteer.launch({headless: 'new' })
    const urlList = []
  
    while (queue.length > 0) {
      const { url, depth } = queue.shift()
  
      if (visitedUrls.has(url) || depth >= maxDepth) {
        continue
      }
  
      visitedUrls.add(url)
  
      const page = await browser.newPage()
      try {
        await page.goto(url, { waitUntil: 'load' }) // wait for 'load' event
      } catch (error) {}
  
      let links = []
      try {
        links = await page.evaluate(() => {
          const baseDomain = new URL(window.location).hostname
          const uniqueLinks = new Set() // Create a set to store unique links
          return Array.from(document.querySelectorAll('a'))
            .filter((a) => a.href && a.href.trim() !== '')
            .map((a) => new URL(a.href, window.location.href).href)
            .filter(
              (href) =>
                !href.startsWith('#') && // filter out anchor links
                (href.startsWith('http://') ||
                  (href.startsWith('https://') &&
                    new URL(href).hostname === baseDomain)) // filter out non-http(s) URLs and URLs not on the same domain
            )
            .filter((href) => {
              if (!uniqueLinks.has(href)) {
                // Check if the link is already in the set
                uniqueLinks.add(href) // If not, add it to the set
                return true // Return true to include this link in the final result
              } else {
                return false // If the link is already in the set, return false to exclude it from the final result
              }
            })
            .filter((href) => !href.endsWith('#')) // filter out URLs ending with '#'
        }, baseUrl)
      } catch (error) {}
  
      urlList.push(...links)
  
      await page.close()
  
      for (const link of links) {
        // Only add links that are on the same domain as the base URL to the queue
        if (new URL(link).hostname === baseDomain && !queuedUrls.has(link)) {
          queue.push({ url: link, depth: depth + 1 })
          queuedUrls.add(link)
        }
      }
    }
  
    await browser.close()
  
    console.log('Final URL List: ', urlList)
    event.reply('url-list-generated', urlList)
  }