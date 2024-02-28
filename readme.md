### This app is incomplete

# WebCompare

WebCompare is an Electron app that streamlines the process of tracking website changes. It grabs screenshots so you can compare them with past versions. Ideal for web developers, QA engineers, and content managers, it ensures updates haven't caused any issues.

## Current Features

- **Screenshot Capture**: Grab screenshots of specified websites.
- **Algorithmic Comparison**: Compare the latest screenshots with a previous set using pixelmatch.
- **Cross-Platform Support**: Works on Windows, macOS, and Linux.

## Planned Features

- **Change Detection**: Highlight differences and detect changes or breaks on the site.
- **Scheduled Screenshot Capture**: Periodically capture a set of screenshots.
- **Flexible Scheduling**: Set up periodic captures to keep track of changes over time.
- **Notification System**: Receive alerts when significant changes are detected.

## Screenshots

![Screenshot of webcompare's crawl url function](readme/Webcompare_Crawl.png?raw=true "Webcompare Crawl Section")

![Screenshot of compare section](readme/Webcompare_Differences.png?raw=true "Webcompare Compare Section")

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (which comes with [npm](http://npmjs.com/))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/adam-tibbetts/WebCompare.git
```

2. Navigate to the project directory:
```bash
cd WebCompare
```

3. Install the dependencies:
```bash
npm install
```

4. Start the application:
```bash
npm start
```

### Usage

1. Open the application.
2. Enter the URL of the website you want to monitor, and how many links to recursively follow.
3. Hit Generate URL List
4. Select which URLs you'd like to capture
5. Start crawling.
6. In the Compare Versions section, select the two tabs you'd like to compare
7. Hit Highlight Differences

## Building the Application

To build the application for production, run the following command:

```bash
npm run make
```

This will generate a distributable version of the app for your platform.

## Contributing

Feel free! Though be aware the app is changing rapidly, as it's very, very new.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the GPLv3 license. See `LICENSE` for more information.

## Contact

Adam Tibbetts - mail@adamtibbetts.com

Project Link: [https://github.com/adam-tibbetts/WebCompare](https://github.com/adam-tibbetts/WebCompare)

## Acknowledgements

- [Electron](https://www.electronjs.org/)
- [Node.js](https://nodejs.org/)
- [Puppeteer](https://github.com/puppeteer/puppeteer)
