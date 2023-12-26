const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

// This function runs the recording process
async function recordPage(url, outputFile) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true,
        fps: 25,
        videoFrame: {
            width: 1920,
            height: 1080
        },
        aspectRatio: '16:9'
    });

    // Start recording
    await recorder.start(`${outputFile}`);

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    // You can add more puppeteer actions here if needed

    // Stop recording after a certain time or when a specific event occurs
    await new Promise(resolve => setTimeout(resolve, 10000)); // for example, wait for 10 seconds

    // Stop recording and close browser
    await recorder.stop();
    await browser.close();
}

// Get URL and output directory from command line arguments
const args = process.argv.slice(2);
const url = args[0];
const outputDir = args[1];

recordPage(url, outputDir)
    .then(() => console.log('Recording completed'))
    .catch(err => console.error('Recording failed:', err));
