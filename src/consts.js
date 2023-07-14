exports.DEFAULT_VIEWPORT = {
    width: 1200,
    height: 900,
};

exports.STATUS_CODES = {
    OK: 200,
    REDIRECTION: 300,
    NOT_MODIFIED: 304,
}

exports.EMAIL_NOTIFICATION_ACTOR_ID = 'apify/send-mail';

exports.NAVIGATION_TIMEOUT = 120;

/** 
 * If we allow request retrying when crawling subdomains, we might not
 * retry the request at all when we reach maxPages limit.
 */
exports.MAX_REQUEST_RETRIES = {
    WITH_SUBDOMAINS: 3,
    WITHOUT_SUBDOMAINS: 3,
}

exports.BASE_URL_LABEL = 'BASE_URL';
exports.URL_PREFIX_REGEX = /.*\:\/\/(www.)?/;

exports.OUTPUT_COLORS = {
    DEFAULT_LINK: '#90EE90',
    UNCRAWLED_LINK: '#F0E68C',
    BROKEN_LINK: '#DD6766',
    INVALID_FRAGMENT: '#FEA95E'
};