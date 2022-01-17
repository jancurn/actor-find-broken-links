const Apify = require('apify');
const _ = require('underscore');
const { getPageRecord } = require('./page-handler');
const { sendEmailNotification } = require('./notification');
const {
    normalizeUrl,
    setDefaultViewport,
    processPendingUrls,
    createUrlToRecordLookupTable,
    saveResults,
    getBrokenLinks
} = require('./tools');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');
    log.info(`Input: ${JSON.stringify(input, null, 2)}`);

    const baseUrl = normalizeUrl(input.baseUrl);

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: baseUrl });

    const purlBase = new Apify.PseudoUrl(`${baseUrl}[(|/.*)]`);

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        maxRequestsPerCrawl: input.maxPages,
        maxRequestRetries: 3,
        maxConcurrency: input.maxConcurrency,
        browserPoolOptions: {
            preLaunchHooks: [setDefaultViewport]
        },
        handlePageFunction: async (context) => {
            const record = await getPageRecord(context, purlBase)

            // Save result
            await Apify.pushData(record);
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            const url = normalizeUrl(request.url);
            log.info(`Page failed ${request.retryCount + 1} times, giving up: ${url}`);

            await Apify.pushData({
                url,
                httpStatus: null,
                errorMessage: _.last(request.errorMessages) || 'Unkown error',
            });
        },
    });

    log.info(`Starting crawl of ${baseUrl}`);
    await crawler.run();
    log.info('Crawling finished, processing results...');
    
    // Dictionary of finished URLs. Key is normalized URL, value true if URL was already processed
    const doneUrls = {};

    const results = [];
    const urlToRecord = await createUrlToRecordLookupTable();

    // Array of normalized URLs to process
    const pendingUrls = [baseUrl];
    processPendingUrls(pendingUrls, urlToRecord, doneUrls, results);

    await saveResults(results, baseUrl);

    const { notificationEmails } = input;
    const brokenLinks = getBrokenLinks(results);
    if (brokenLinks.length && notificationEmails && notificationEmails.length) {
        await sendEmailNotification(brokenLinks, notificationEmails);
    }

    log.info('\nDone.');
});
