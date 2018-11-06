const _ = require('underscore');
const Apify = require('apify');
const utils = require('apify-shared/utilities');

// This function normalizes the URL and removes the #fragment
const normalizeUrl = (url) => {
    const nurl = utils.normalizeUrl(url);
    if (nurl) return nurl;

    const index = url.indexOf('#');
    if (index > 0) return url.substring(0, index);

    return url;
};

Apify.main(async () => {
    // Fetch input
    const input = await Apify.getValue('INPUT');
    console.log('Input:');
    console.dir(input);

    const baseUrl = normalizeUrl(input.baseUrl);

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: baseUrl });

    const purlBase = new Apify.PseudoUrl(`${baseUrl}[(|/.*)]`);

    console.log(`Starting crawl of ${baseUrl}`);

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        maxRequestsPerCrawl: input.maxPages,
        maxRequestRetries: 2,
        launchPuppeteerFunction: async () => Apify.launchPuppeteer({
            defaultViewport: {
                width: 1200,
                height: 900,
            },
        }),
        handlePageFunction: async ({ request, page, response }) => {
            const url = normalizeUrl(request.url);
            console.log(`Analysing page: ${url}`);

            const record = {
                url,
                isBaseWebsite: false,
                httpStatus: response.status(),
                title: await page.title(),
                linkUrls: null,
                anchors: null,
            };

            // If we're on the base website, find links to new pages and enqueue them
            if (purlBase.matches(url)) {
                record.isBaseWebsite = true;
                // console.log(`[${url}] Enqueuing links`);
                const infos = await Apify.utils.puppeteer.enqueueLinks(page, 'a', requestQueue);
                let links = _.map(infos, (info) => info.request.url).sort();
                record.linkUrls = _.uniq(links, true);
            }

            // Find all HTML element IDs and <a name="xxx"> anchors,
            // basically anything that can be addressed by #fragment
            record.anchors = await page.evaluate(() => {
                const anchors = [];
                document.querySelectorAll('body a[name]').forEach((elem) => {
                    const name = elem.getAttribute('name');
                    if (name) anchors.push(name);
                });
                document.querySelectorAll('body [id]').forEach((elem) => {
                    const id = elem.getAttribute('id');
                    if (id) anchors.push(id);
                });
                return anchors;
            });
            record.anchors.sort();
            record.anchors = _.uniq(record.anchors, true);

            // Save results
            await Apify.pushData(record);
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            const url = normalizeUrl(request.url);
            console.log(`[${url}] failed too many times`);

            await Apify.pushData({
                url,
                httpStatus: null,
                errorMessage: _.last(request.errorMessages) || 'Unkown error',
            });
        },
    });

    await crawler.run();

    console.log('Crawling finished, processing results...');

    // Create a look-up table for normalized URL->record,
    // and also create a look-up table in record.anchorsDict for anchor->true
    const urlToRecord = {};
    const dataset = await Apify.openDataset();
    await dataset.forEach(async (record) => {
        urlToRecord[record.url] = record;
        record.anchorsDict = {};
        record.anchors.forEach((anchor) => {
            record.anchorsDict[anchor] = true;
        })
    });

    // Array of normalized URLs to process
    const pendingUrls = [
        normalizeUrl(input.baseUrl),
    ];
    // Dictionary of finished URLs. Key is normalized URL, value true if URL was already processed
    const doneUrls = {};
    const results = [];

    while (pendingUrls.length > 0) {
        const url = pendingUrls.shift();
        console.log(`Processing result: ${url}`);

        // Only process each URL once
        if (doneUrls[url]) continue;
        doneUrls[url] = true;

        const record = urlToRecord[url];

        const result = {
            url,
            title: record.title,
            links: [],
        };
        results.push(result);

        for (let linkUrl of record.linkUrls) {
            const linkNurl = normalizeUrl(linkUrl);

            // Get fragment from URL
            const index = linkUrl.indexOf('#');
            const fragment = index > 0 ? linkUrl.substring(index+1) : '';

            const link = {
                url: linkUrl,
                normalizedUrl: linkNurl,
                fragment,
                httpStatus: null,
                fragmentFound: false,
            };

            const record = urlToRecord[linkNurl];
            if (!record) {
                // Page was not crawled at all...
                result.links.push(link);
                continue;
            }

            link.httpStatus = record.httpStatus;
            link.fragmentValid = !fragment || !!record.anchorsDict[fragment];
            result.links.push(link);

            // If the linked page is from the base website, add it to the processing queue
            if (record.isBaseWebsite && !doneUrls[linkNurl]) {
                pendingUrls.push(linkNurl);
            }
        }
    }

    // Save final results
    await Apify.setValue('OUTPUT.json', results)

    // TODO: Generate HTML report
});
