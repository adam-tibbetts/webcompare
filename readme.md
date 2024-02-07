# WebCompare

WebCompare is an Electron application designed to help users monitor changes on websites by taking screenshots and comparing them with previous versions. This tool is particularly useful for web developers, QA engineers, and content managers who need to ensure that their websites are functioning correctly after updates, or to simply track visual changes over time.

## Features

- **Screenshot Capture**: Automatically grab screenshots of specified websites.
- **Algorithmic Comparison**: Compare the latest screenshots with a previous set using an image comparison algorithm.
- **Change Detection**: Highlight differences and detect changes or breaks on the site.
- **Flexible Scheduling**: Set up periodic captures to keep track of changes over time.
- **Notification System**: Receive alerts when significant changes are detected.
- **Cross-Platform Support**: Works on Windows, macOS, and Linux.

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
2. Enter the URL of the website you want to monitor.
3. Configure the capture settings (e.g., frequency, resolution).
4. Set up comparison parameters and thresholds for change detection.
5. Start the monitoring process.

The application will take care of the rest, capturing screenshots at the configured intervals and comparing them to detect any changes.

## Building the Application

To build the application for production, run the following command:

```bash
npm run build
```

This will generate a distributable version of the app for your platform.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

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
