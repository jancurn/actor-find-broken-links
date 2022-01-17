const Apify = require('apify');
const { EMAIL_NOTIFICATION_ACTOR_ID } = require('./consts');

const { utils: { log } } = Apify;

/**
 *
 * @param {{
 *  link: string,
 *  baseUrl: string,
 * }[]} brokenLinks
 * @param {string[]} emails
 */
const sendEmailNotification = async (brokenLinks, emails) => {
    const joinedEmails = emails.join(', ');

    const emailActorInput = {
        to: joinedEmails,
        subject: 'Broken links notification',
        text: buildNotificationBody(brokenLinks),
    };

    await Apify.call(EMAIL_NOTIFICATION_ACTOR_ID, emailActorInput);
};

/**
 *
 * @param {{
 *  link: string,
 *  baseUrl: string,
 * }[]} brokenLinks 
 * @returns {string} notification text
 */
const buildNotificationBody = (brokenLinks) => {
    let text = 'Broken links';

    const baseUrls = getBaseUrlsWithLinks(brokenLinks);

    Object.keys(baseUrls).forEach((baseUrl) => {
        const links = baseUrls[baseUrl];

        text += `\n\nDetected from ${baseUrl}:\n`;

        links.forEach((link) => {
            text += `\n${link}`;
        });
    })

    log.info('Sending email notification...');
    log.info(`${text}`);

    return text;
};

const getBaseUrlsWithLinks = (brokenLinks) => {
    const baseUrls = {};

    brokenLinks.forEach((brokenLink) => {
        const { link, baseUrl } = brokenLink;
        if (!baseUrls[baseUrl]) {
            baseUrls[baseUrl] = [];
        }

        baseUrls[baseUrl].push(link);
    });

    return baseUrls;
}

module.exports = {
    sendEmailNotification,
};
