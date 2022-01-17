const Apify = require('apify');
const { Puppeteer } = require('puppeteer');
const _ = require('underscore');
const { normalizeUrl } = require('./tools');

const { utils: { log, enqueueLinks } } = Apify;

/**
 * Analyses the current page and creates the corresponding info record.
 * @param {any} context 
 * @param {Apify.PseudoUrl} purlBase 
 * @returns 
 */
const getPageRecord = async ({ request, page, response, crawler: { requestQueue } }, purlBase) => {
    const url = normalizeUrl(request.url);
    log.info(`Analysing page: ${url}`);

    const record = {
        url,
        isBaseWebsite: false,
        httpStatus: response.status(),
        title: await page.title(),
        linkUrls: null,
        anchors: await getAnchors(page),
    };

    /* if (response.status() !== 200) {
        log.info('ALERT');
        console.dir(request);
        console.dir(record);
        console.dir(response);
    } */

    // If we're on the base website, find links to new pages and enqueue them
    if (purlBase.matches(url)) {
        record.isBaseWebsite = true;
        // log.info(`[${url}] Enqueuing links`);
        const infos = await enqueueLinks({
            page, 
            requestQueue,
            selector: 'a',
        });
        let links = _.map(infos, (info) => info.request.url).sort();
        record.linkUrls = _.uniq(links, true);
    }

    return record;
};

/**
 * Find all HTML element IDs and <a name="xxx"> anchors,
 * basically anything that can be addressed by #fragment
 * @param {Puppeteer.Page} page 
 * @returns {Promise<any[]>} unique anchors
 */
const getAnchors = async (page) => {
    const anchors = await page.evaluate(() => {
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

    const sortedAnchors = anchors.sort();
    const uniqueAnchors = _.uniq(sortedAnchors, true);

    return uniqueAnchors;
};

module.exports = {
    getPageRecord,
}