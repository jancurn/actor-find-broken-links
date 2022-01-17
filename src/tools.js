const Apify = require('apify');
const _ = require('underscore');
const utils = require('apify-shared/utilities');
const { DEFAULT_VIEWPORT } = require("./consts");

const { utils: { log } } = Apify;

const setDefaultViewport = (_pageId, launchContext) => {
    launchContext.launchOptions.defaultViewport = DEFAULT_VIEWPORT;
};

/**
 * This function normalizes the URL and removes the #fragment.
 * @param {string} url 
 * @returns {string} normalized url
 */
const normalizeUrl = (url) => {
    const nurl = utils.normalizeUrl(url);
    if (nurl) return nurl;

    const index = url.indexOf('#');
    if (index > 0) return url.substring(0, index);

    return url;
};

/**
 * Updates doneUrls and results according to provided pendingUrls.
 * @param {string[]} pendingUrls
 * @param {any} urlToRecord
 * @param {any} doneUrls
 * @param {any[]} results
 */
const processPendingUrls = (pendingUrls, urlToRecord, doneUrls, results) => {
    while (pendingUrls.length > 0) {
        const url = pendingUrls.shift();

        // Only process each URL once
        if (doneUrls[url]) continue;

        doneUrls[url] = true;

        log.info(`Processing result: ${url}`);

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
                httpStatus: null,
                errorMessage: null,
                fragment,
                fragmentValid: false,
                crawled: false,
            };

            const record = urlToRecord[linkNurl];
            if (!record) {
                // Page was not crawled at all...
                result.links.push(link);
                continue;
            }

            link.crawled = true;
            link.httpStatus = record.httpStatus;
            link.errorMessage = record.errorMessage;
            link.fragmentValid = !fragment || !!record.anchorsDict[fragment];
            result.links.push(link);

            // If the linked page is from the base website, add it to the processing queue
            if (record.isBaseWebsite && !doneUrls[linkNurl]) {
                pendingUrls.push(linkNurl);
            }
        }
    }
};

/**
 * Creates a look-up table for normalized URL->record
 * and also creates a look-up table in record.anchorsDict for anchor->true
 * @returns urlToRecord look-up table
 */
const createUrlToRecordLookupTable = async () => {
    const urlToRecord = {};
    const dataset = await Apify.openDataset();

    await dataset.forEach(async (record) => {
        urlToRecord[record.url] = record;
        record.anchorsDict = {};

        _.each(record.anchors, (anchor) => {
            record.anchorsDict[anchor] = true;
        });
    });

    return urlToRecord;
};

/**
 * Saves results in JSON format into key value store.
 */
const saveResults = async (results, baseUrl) => {
    log.info('Saving results...');
    await Apify.setValue('OUTPUT', results);

    const html = generateHtmlReport(results, baseUrl);

    await Apify.setValue('OUTPUT.html', html, { contentType: 'text/html' });

    log.info(`HTML report was stored to:
    https://api.apify.com/v2/key-value-stores/${process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID}/records/OUTPUT.html?disableRedirect=1`);
};

/**
 * Generates html report from provided results.
 * @param {any[]} results
 * @param {string} baseUrl
 * @returns {string} Built html
 */
const generateHtmlReport = (results, baseUrl) => {
    let html = `
<html>
  <head>
    <title>Broken link report for ${baseUrl}</title>
    <style>
        body {
            font-family : Sans-serif;
        }
        th {
            text-align: left;
        }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <th>From</th>
        <th>To</th>
        <th>HTTP&nbsp;status</th>
        <th>Description</th>
      </tr>`;

    for (const result of results) {
        for (const link of result.links) {
            let color = 'lightgreen';
            let description = 'OK';
            if (!link.crawled) {
                color = '#F0E68C';
                description = 'Page not crawled';
            } else if (isLinkBroken(link)) {
                color = 'red';
                description = link.errorMessage ? `Error: ${link.errorMessage}` : 'Invalid HTTP status';
            } else if (!link.fragmentValid) {
                color = 'orange';
                description = 'URL fragment not found';
            }

            html += `<tr style="background-color: ${color}">
                <td><a href="${result.url}" target="_blank">${result.url}</a></td>
                <td><a href="${link.url}" target="_blank">${link.url}</a></td>
                <td>${link.httpStatus || ''}</td>
                <td>${description}</td>
            </tr>`;
        }
    }

    html += `
    </table>
  </body>
</html>`;

    return html;
};

const isLinkBroken = (link) => {
    const { crawled, errorMessage, httpStatus } = link;
    const invalidHttpStatus = !httpStatus || httpStatus < 200 || httpStatus >= 300
    return crawled && (errorMessage || invalidHttpStatus);
};

/**
 * Extracts broken links.
 * @param {any[]} results 
 * @returns {{
 *  link: string,
 *  baseUrl: string,
 * }[]} broken links
 */
const getBrokenLinks = (results) => {
    const brokenLinks = [];

    results.forEach((result) => {
        const { url, links } = result;
        links.forEach((link) => {
            if (isLinkBroken(link)) {
                brokenLinks.push({
                    link: link.url,
                    baseUrl: url,
                });
            }
        });
    });

    return brokenLinks;
};

module.exports = {
    setDefaultViewport,
    normalizeUrl,
    processPendingUrls,
    createUrlToRecordLookupTable,
    generateHtmlReport,
    saveResults,
    getBrokenLinks,
};