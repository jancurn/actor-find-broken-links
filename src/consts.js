export const DEFAULT_VIEWPORT = {
    width: 1200,
    height: 900,
};

export const STATUS_CODES = {
    OK: 200,
    REDIRECTION: 300,
    NOT_MODIFIED: 304,
}

export const EMAIL_NOTIFICATION_ACTOR_ID = 'apify/send-mail';

export const NAVIGATION_TIMEOUT = 120;

/** 
 * If we allow request retrying when crawling subdomains, we might not
 * retry the request at all when we reach maxPages limit.
 */
export const MAX_REQUEST_RETRIES = {
    WITH_SUBDOMAINS: 5,
    WITHOUT_SUBDOMAINS: 5,
}

export const BASE_URL_LABEL = 'BASE_URL';
export const URL_PREFIX_REGEX = /.*\:\/\/(www.)?/;

export const OUTPUT_COLORS = {
    DEFAULT_LINK: '#90EE90',
    UNCRAWLED_LINK: '#F0E68C',
    BROKEN_LINK: '#DD6766',
    INVALID_FRAGMENT: '#FEA95E'
};