const utils = require('apify-shared/utilities');
const { DEFAULT_VIEWPORT } = require("./consts");

exports.setDefaultViewport = (_pageId, launchContext) => {
    launchContext.launchOptions.defaultViewport = DEFAULT_VIEWPORT;
};

/**
 * This function normalizes the URL and removes the #fragment.
 * @param {string} url 
 * @returns {string} normalized url
 */
exports.normalizeUrl = (url) => {
    const nurl = utils.normalizeUrl(url);
    if (nurl) return nurl;

    const index = url.indexOf('#');
    if (index > 0) return url.substring(0, index);

    return url;
};