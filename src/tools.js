const Apify = require('apify');
const _ = require('underscore');
const utils = require('apify-shared/utilities');
const { DEFAULT_VIEWPORT, BASE_URL_LABEL, OUTPUT_COLORS, STATUS_CODES } = require("./consts");

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
 * Creates collection of results for the provided base url.
 * @param {string} baseUrl
 * @param {any[]} records
 * @returns {Promise<any[]>} built results
 */
const getResults = async (baseUrl, records) => {
    const results = [];

    // Dictionary of finished URLs. Key is normalized URL, value true if URL was already processed
    const doneUrls = {};

    const urlToRecord = await createUrlToRecordLookupTable(records);

    // Array of normalized URLs to process
    const pendingUrls = [baseUrl];

    while (pendingUrls.length > 0) {
        const url = pendingUrls.shift();

        // Only process each URL once
        if (doneUrls[url]) continue;

        doneUrls[url] = true;

        log.info(`Processing result: ${url}`);

        const record = urlToRecord[url];

        const result = {
            url,
            title: record ? record.title : null,
            links: [],
        };
        results.push(result);

        if (record && record.linkUrls) {
            for (let linkUrl of record.linkUrls) {
                const linkNurl = normalizeUrl(linkUrl);
    
                const link = createLink(linkUrl, linkNurl, urlToRecord);
                result.links.push(link);
    
                // If the linked page is from the base website, add it to the processing queue
                if (record.isBaseWebsite && !doneUrls[linkNurl]) {
                    pendingUrls.push(linkNurl);
                }
            }
        }
    }

    return results;
};

const createLink = (linkUrl, linkNurl, urlToRecord) => {
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
    if (record) {
        // Page was crawled
        link.crawled = true;
        link.httpStatus = record.httpStatus;
        link.errorMessage = record.errorMessage;
        link.fragmentValid = !fragment || !!record.anchorsDict[fragment];
    }

    return link;
}

/**
 * Creates a look-up table for normalized URL->record
 * and also creates a look-up table in record.anchorsDict for anchor->true
 * @param {any[]} records
 * @returns urlToRecord look-up table
 */
const createUrlToRecordLookupTable = async (records) => {
    const urlToRecord = {};

    records.forEach((record) => {
        const { url } = record;
        urlToRecord[url] = record;
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
 * 
 * @param {{
 *  url: string,
 *  isBaseWebsite: boolean,
 *  httpStatus: any,
 *  title: any,
 *  linkUrls: any,
 *  anchors: any[],
 * }} record
 * @returns {{
 *  url: string,
 *  isBaseWebsite: boolean,
 *  httpStatus: any,
 *  title: any,
 * }} csv friendly record
 */
const getCsvFriendlyRecord = (record) => {
    const { url, isBaseWebsite, httpStatus, title } = record;
    return { url, isBaseWebsite, httpStatus, title };
};

/**
 *
 * @param {{
 *  url: string,
 *  isBaseWebsite: boolean,
 *  httpStatus: any,
 *  title: any,
 *  linkUrls: any,
 *  anchors: any[],
 * }} record,
 * @param {boolean} saveOnlyBrokenLinks
 */
const saveRecordToDataset = async (record, saveOnlyBrokenLinks) => {
    const filteredRecord = saveOnlyBrokenLinks ? getCsvFriendlyRecord(record) : record;
    const { httpStatus } = filteredRecord;

    if (!saveOnlyBrokenLinks || (saveOnlyBrokenLinks && isErrorHttpStatus(httpStatus))) {
        await Apify.pushData(filteredRecord);
    }
};

const getBaseUrlRequest = (baseUrl) => {
    // Unique key needs to be specified explicitly as we've already enqueued linkUrls from their base url.
    const uniqueKey = `${baseUrl}_newBaseUrl`;

    return {
        url: baseUrl,
        userData: { label: BASE_URL_LABEL },
        uniqueKey,
    }
}

/**
 * Enqueues link urls to enable subdomain crawling.
 * @param {string[]} linkUrls 
 * @param {Apify.RequestQueue} requestQueue 
 */
const enqueueLinkUrls = async (linkUrls, requestQueue) => {
    log.info(`Enqueuing ${linkUrls.length} new base urls...`);

    for (const linkUrl of linkUrls) {
        const baseUrl = normalizeUrl(linkUrl);
        await requestQueue.addRequest(getBaseUrlRequest(baseUrl));
    }
};

const generateHtmlHeader = (baseUrl) => {
    return `
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
}

const generateHtmlFooter = () => {
    return `
    </table>
  </body>
</html>`;
}

/**
 * Generates html report from provided results.
 * @param {any[]} results
 * @param {string} baseUrl
 * @returns {string} Built html
 */
const generateHtmlReport = (results, baseUrl, brokenLinksOnly = false) => {
    let html = generateHtmlHeader(baseUrl);

    for (const result of results) {
        for (const link of result.links) {
            const { DEFAULT_LINK, BROKEN_LINK, INVALID_FRAGMENT, UNCRAWLED_LINK } = OUTPUT_COLORS;

            const isBrokenLink = isLinkBroken(link);
            if (!brokenLinksOnly || (brokenLinksOnly && isBrokenLink)) {
                let color = DEFAULT_LINK;
                let description = 'OK';
                if (!link.crawled) {
                    color = UNCRAWLED_LINK;
                    description = 'Page not crawled';
                } else if (isBrokenLink) {
                    color = BROKEN_LINK;
                    description = link.errorMessage ? `Error: ${link.errorMessage}` : 'Invalid HTTP status';
                } else if (!link.fragmentValid) {
                    color = INVALID_FRAGMENT;
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
    }

    html += generateHtmlFooter();

    return html;
};

const isErrorHttpStatus = (httpStatus) => {
    const { OK, REDIRECTION, NOT_MODIFIED } = STATUS_CODES;
    const isRedirection = httpStatus >= REDIRECTION && httpStatus !== NOT_MODIFIED;
    return !httpStatus || httpStatus < OK || isRedirection;
}

const isLinkBroken = (link) => {
    const { crawled, errorMessage, httpStatus } = link;
    return crawled && (errorMessage || isErrorHttpStatus(httpStatus));
};

/**
 * Extracts broken links.
 * @param {any[]} results 
 * @returns {{
 *  link: any,
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
                    link,
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
    getResults,
    generateHtmlReport,
    saveResults,
    saveRecordToDataset,
    getBrokenLinks,
    enqueueLinkUrls,
    getBaseUrlRequest,
};