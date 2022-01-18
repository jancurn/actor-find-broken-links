const Apify = require('apify');
const { EMAIL_NOTIFICATION_ACTOR_ID } = require('./consts');
const { generateHtmlReport } = require('./tools');

const { utils: { log } } = Apify;

/**
 *
 * @param {any[]} results
 * @param {string} baseUrl
 * @param {string[]} emails
 */
const sendEmailNotification = async (results, baseUrl, emails) => {
    const joinedEmails = emails.join(', ');

    const BROKEN_LINKS_ONLY = true;
    const html = generateHtmlReport(results, baseUrl, BROKEN_LINKS_ONLY);

    const emailActorInput = {
        to: joinedEmails,
        subject: 'Broken links notification',
        html,
    };

    log.info('Sending email notification...');
    await Apify.call(EMAIL_NOTIFICATION_ACTOR_ID, emailActorInput);
    log.info('Notification sent');
};

module.exports = {
    sendEmailNotification,
};
