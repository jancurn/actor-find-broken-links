import { Actor, log } from 'apify';

import { EMAIL_NOTIFICATION_ACTOR_ID } from './consts.js';
import { generateHtmlReport } from './tools.js';

/**
 *
 * @param {any[]} results
 * @param {string} baseUrl
 * @param {string[]} emails
 */
export const sendEmailNotification = async (results, baseUrl, emails) => {
    const joinedEmails = emails.join(', ');

    const BROKEN_LINKS_ONLY = true;
    const html = generateHtmlReport(results, baseUrl, BROKEN_LINKS_ONLY);

    const emailActorInput = {
        to: joinedEmails,
        subject: 'Broken links notification',
        html,
    };

    log.info('Sending email notification...');
    await Actor.call(EMAIL_NOTIFICATION_ACTOR_ID, emailActorInput);
    log.info('Notification sent');
};
