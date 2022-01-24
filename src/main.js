const Apify = require('apify');
const _ = require('underscore');
const { getPageRecord, getAndEnqueueLinkUrls } = require('./page-handler');
const { sendEmailNotification } = require('./notification');
const { normalizeUrl, getResults, saveResults, getBrokenLinks, saveRecordToDataset, getBaseUrlRequest, hasBaseDomain } = require('./tools');
const { NAVIGATION_TIMEOUT, MAX_REQUEST_RETRIES } = require('./consts');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');
    const { maxConcurrency, maxPages, notificationEmails, saveOnlyBrokenLinks, crawlSubdomains } = input;

    const baseUrl = normalizeUrl(input.baseUrl);

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest(getBaseUrlRequest(baseUrl));

    const records = await Apify.getValue('RECORDS') || [];
    Apify.events.on('persistState', async () => { await Apify.setValue('RECORDS', records); });

    const { WITH_SUBDOMAINS, WITHOUT_SUBDOMAINS } = MAX_REQUEST_RETRIES;
    const maxRequestRetries = crawlSubdomains ? WITH_SUBDOMAINS : WITHOUT_SUBDOMAINS;

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        maxConcurrency,
        maxRequestsPerCrawl: maxPages,
        maxRequestRetries,
        browserPoolOptions: {
            preLaunchHooks: [(_pageId, launchContext) => {
                launchContext.launchOptions.defaultViewport = DEFAULT_VIEWPORT;
            }]
        },
        navigationTimeoutSecs: NAVIGATION_TIMEOUT,
        handlePageFunction: async (context) => {
            const { request: { url } } = context;
            log.info(`Crawling page...`, { url });

            const record = await getPageRecord(context, crawlSubdomains);

            // If we're on the base website or we're allowed to crawl current subdomain, find links to new pages and enqueue them.
            const crawlCurrentSubdomain = crawlSubdomains && hasBaseDomain(baseUrl, url);
            if (record.isBaseWebsite || crawlCurrentSubdomain) {
                record.linkUrls = await getAndEnqueueLinkUrls(context);
            }

            await saveRecordToDataset(record, saveOnlyBrokenLinks);
            records.push(record);
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            const url = normalizeUrl(request.url);
            log.warning(`Page failed ${request.retryCount + 1} times, giving up: ${url}`);

            const record = {
                url,
                httpStatus: null,
                errorMessage: _.last(request.errorMessages) || 'Unknown error',
            };

            /**
             * Store record with failed request's errorMessage into the result as well.
             * There's a good chance it failed because the url is broken and the timeout
             * has exceeded while requesting this url. 
             */
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
        await sendEmailNotification(results, baseUrl, notificationEmails);
    }

    log.info('\nDone.');
});
