const Apify = require('apify');
const _ = require('underscore');
const { getPageRecord } = require('./page-handler');
const { sendEmailNotification } = require('./notification');
const { normalizeUrl, setDefaultViewport, getResults, saveResults, getBrokenLinks, saveRecordToDataset } = require('./tools');
const { NAVIGATION_TIMEOUT, MAX_REQUEST_RETRIES } = require('./consts');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');
    const { maxConcurrency, notificationEmails, saveOnlyBrokenLinks } = input;

    log.info(`Input: ${JSON.stringify(input, null, 2)}`);

    const baseUrl = normalizeUrl(input.baseUrl);

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: baseUrl });

    const purlBase = new Apify.PseudoUrl(`${baseUrl}[(|/.*)]`);

    const records = await Apify.getValue('RECORDS') || [];
    Apify.events.on('persistState', async () => { await Apify.setValue('RECORDS', records); });

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        maxConcurrency,
        maxRequestsPerCrawl: input.maxPages,
        maxRequestRetries: MAX_REQUEST_RETRIES,
        browserPoolOptions: {
            preLaunchHooks: [setDefaultViewport]
        },
        navigationTimeoutSecs: NAVIGATION_TIMEOUT,
        handlePageFunction: async (context) => {
            const record = await getPageRecord(context, purlBase);
            await saveRecordToDataset(record, saveOnlyBrokenLinks);
            records.push(record);
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            const url = normalizeUrl(request.url);
            log.info(`Page failed ${request.retryCount + 1} times, giving up: ${url}`);

            const record = {
                url,
                httpStatus: null,
                errorMessage: _.last(request.errorMessages) || 'Unknown error',
            };

            await Apify.pushData(record);
            records.push(record);
        },
    });

    log.info(`Starting crawl of ${baseUrl}`);
    await crawler.run();
    log.info('Crawling finished, processing results...');
    
    const results = await getResults(baseUrl, records);
    await saveResults(results, baseUrl);

    const brokenLinks = getBrokenLinks(results);
    if (brokenLinks.length && notificationEmails && notificationEmails.length) {
        await sendEmailNotification(brokenLinks, notificationEmails);
    }

    log.info('\nDone.');
});
