import { Puppeteer } from 'puppeteer';
import _ from 'underscore';

import { BASE_URL_LABEL } from './consts.js';
import { normalizeUrl } from './tools.js';

/**
 * Analyses the current page and creates the corresponding info record.
 * @param {any} context 
 * @returns {Promise<{
 *  url: string,
 *  isBaseWebsite: boolean,
 *  httpStatus: any,
 *  title: any,
 *  linkUrls: any,
 *  anchors: any[],
 * }>} page record
 */
export const getPageRecord = async ({ request, page, response }) => {
    const { userData: { label, referrer } } = request;

    const url = normalizeUrl(request.url);

    const record = {
        url,
        isBaseWebsite: false,
        httpStatus: response?.status(),
        title: await page?.title(),
        linkUrls: null,
        anchors: await getAnchors(page),
        referrer,
    };

    /* if (response.status() !== 200) {
        log.info('ALERT');
        console.dir(request);
        console.dir(record);
        console.dir(response);
    } */

    if (label === BASE_URL_LABEL) {
        record.isBaseWebsite = true;
    }

    return record;
};

export const getAndEnqueueLinkUrls = async ({ crawler: { requestQueue }, request, enqueueLinks }) => {
    const requests = (await enqueueLinks({
        strategy: 'all',
        selector: 'a',
        transformRequestFunction: (req) => {
            req.userData.referrer = request.url;
            return req;
        }
    })).processedRequests;

    return requests.map((req) => req.uniqueKey);
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
