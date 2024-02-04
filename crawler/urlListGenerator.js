const puppeteer = require("puppeteer");

module.exports.generateUrlList = async function generateUrlList(settings) {
    const visitedUrls = new Set();
    const queuedUrls = new Set();
    const baseUrl = settings.baseUrl;
    const baseDomain = new URL(baseUrl).hostname;
    const maxDepth = settings.depth;
    const queue = [{ url: baseUrl, depth: 0 }];
    const browser = await puppeteer.launch({ headless: true });
    let urlList = [];

    try {
        while (queue.length > 0) {
            const { url, depth } = queue.shift();

            if (visitedUrls.has(url) || depth >= maxDepth) {
                continue;
            }

            visitedUrls.add(url);

            const page = await browser.newPage();
            try {
                await page.goto(url, { waitUntil: "load" });
            } catch (error) {
                console.error(`Failed to load page: ${url}`, error);
                continue;
            }

            let links = [];
            try {
                links = await page.evaluate((baseDomain) => {
                    const uniqueLinks = new Set();
                    return Array.from(document.querySelectorAll("a"))
                        .filter((a) => a.href && a.href.trim() !== "")
                        .map((a) => new URL(a.href, window.location.href).href)
                        .filter((href) => {
                            return (
                                !href.startsWith("#") &&
                                (href.startsWith("http://") ||
                                    href.startsWith("https://")) &&
                                new URL(href).hostname === baseDomain &&
                                !uniqueLinks.has(href) &&
                                !href.endsWith("#")
                            );
                        });
                }, baseDomain);
            } catch (error) {
                console.error(`Failed to evaluate page: ${url}`, error);
            }

            links = links.filter(
                (href) => !visitedUrls.has(href) && !queuedUrls.has(href)
            );

            // Instead of pushing directly to urlList, add to a set to ensure uniqueness
            const urlSet = new Set(urlList);
            for (const link of links) {
                urlSet.add(link);
            }

            // Convert the set back to an array
            urlList = Array.from(urlSet);

            await page.close();

            for (const link of links) {
                if (!queuedUrls.has(link)) {
                    queue.push({ url: link, depth: depth + 1 });
                    queuedUrls.add(link);
                }
            }
        }
    } catch (error) {
        console.error("An error occurred during URL list generation:", error);
    } finally {
        await browser.close();
    }

    console.log("Final URL List: ", urlList);
    return urlList;
};
