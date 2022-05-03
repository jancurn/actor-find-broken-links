## What does Broken Links Checker do?
Our Broken Links Checker is an easy-to-use SEO tool to help you keep your UX and SEO score healthy, improve your website ranking, and prevent link rot.

## How does it check for broken links?
Broken Link Checker can crawl any website and do all of the following:
- generate a report containing an inspection of **all links on the website** or **only broken links**
- scan **one or multiple websites** simultaneously
- easily check **domain and subdomains**
- identify **broken link fragments** 
- give you a neat **report in your email inbox** once the SEO inspection is complete
- initiate a **SEO check manually or automatically** thanks to our powerful scheduling system

## How much does it cost to run Broken Links Checker?
Using our basic plan, the scraper's run will cost you around  **USD 0.25 in Apify platform credits per 1,000 scraped results**. For more details about the plans we offer, platform credits and usage, see the  [platform pricing page](https://apify.com/pricing/actors).

## How to start Broken Links Checker
Broken Links Checker is highly adaptable to your SEO requests and can scan your web pages quickly and regularly. To check a  website for bad links, repeat the following steps:
1.  Click on *Try for free*.
2.  Add one or more website URLs to start the audit from.
4. Enable the *Save only broken links* button.
5. *Add your email address* to receive the full SEO report in your inbox.
6. Click *Run* and wait for the data to be collected.
7. Optional step: *Schedule* the tool to check the links automatically every month, week or specific time during the day.

For a more detailed instruction with visual aids of how to set up a broken links checker and why, see our [step-by-step tutorial](https://blog.apify.com/step-by-step-guide-to-using-broken-links-checker/) on checking for broken links. 

## What's happening under the hood?
Broken Links Checker will start the link check at a given URL and will crawl all linked pages under that website. So for example, if the crawler starts at ```https://www.example.com/something```, then it will also crawl linked pages such as:

```
https://www.example.com/something/index.html
https://www.example.com/something/else
https://www.example.com/something/even/more/deeper/file.html
```
On every checked page, the crawler will also analyze whether links to other pages are working or not. For example, if the page contains a link to `https://www.example.com/another/page#anchor`, the actor will open the inspected page ```https://www.example.com/another/page```, check whether it loads correctly and then it also check if it contains the `#anchor`. 

## Input options
If this actor is run on the [Apify platform](https://console.apify.com/), our user-friendly UI will help you configure all the necessary and optional parameters of this scraper before running it. Our Broken Links Checker recognizes the following input fields:

 **Website URL** 
The initial URL to start the broken links inspection from.

**Max pages** 
Use this field to set the maximum number of pages to be checked. If left empty, the number will be unlimited.
 
**Notification emails** 
Add the email address to receive a notification after the crawler discovers all broken links.

**Save only broken links** 
If set to `true`, you'll get only the broken links in the report. If set to `false`, the crawler will include into the report both broken and healthy links (not a CSV friendly option).
 
**Crawl subdomains**
If set to `true`, the crawler will search broken links not only on the main page but also in deeper subdomains.

For more technical details on the input, head over to the [Input tab](https://apify.com/jancurn/find-broken-links/input-schema).

### Input example
Here's an input example for checking the Apify Blog for bad links. We've enabled the crawler to check subdomains as well but limited the inspection to 1,000 pages. 
```json
    {
      "baseUrl": "https://blog.apify.com",
      "maxPages": 1000,
      "notificationEmails": [
        "your.email@apify.com"
      ],
      "saveOnlyBrokenLinks": true,
      "crawlSubdomains": true
    }
```
 
## Output
Once the links checker finishes the crawl, it will save a report of the broken links into your **key-value store**. You will find reports in two formats there:

-   `OUTPUT`  contains a machine-readable JSON report
-   `OUTPUT.html` contains an easy-to-read HTML report 

### Output example as JSON
Here's an example of dataset of a successful Broken Links Checker run. The error message is included in the report and can be found at the bottom of the example.
```json
[
  {
    "url": "https://blog.apify.com",
    "title": "Apify Blog: Web scraping and automation stories",
    "links": [
      {
        "url": "https://apify.com/",
        "normalizedUrl": "https://apify.com",
        "httpStatus": 200,
        "fragment": "",
        "fragmentValid": true,
        "crawled": true
      },
      {
        "url": "https://apify.com/about",
        "normalizedUrl": "https://apify.com/about",
        "httpStatus": 200,
        "fragment": "",
        "fragmentValid": true,
        "crawled": true
      },
      {
        "url": "https://apify.com/jobs",
        "normalizedUrl": "https://apify.com/jobs",
        "httpStatus": 200,
        "fragment": "",
        "fragmentValid": true,
        "crawled": true
      },
      {
        "url": "https://apify.com/web-scraping",
        "normalizedUrl": "https://apify.com/web-scraping",
        "httpStatus": null,
        "errorMessage": "Error: Navigation timed out after 120 seconds.\n    at handleRequestTimeout (/home/myuser/node_modules/apify/build/crawlers/crawler_utils.js:19:11)\n    at PuppeteerCrawler._handleNavigationTimeout (/home/myuser/node_modules/apify/build/crawlers/browser_crawler.js:418:54)\n    at PuppeteerCrawler._handleNavigation (/home/myuser/node_modules/apify/build/crawlers/browser_crawler.js:401:18)\n    at async PuppeteerCrawler._handleRequestFunction (/home/myuser/node_modules/apify/build/crawlers/browser_crawler.js:343:13)\n    at async wrap (/home/myuser/node_modules/@apify/timeout/index.js:73:27)",
        "fragment": "",
        "fragmentValid": true,
        "crawled": true
      },
...
```
## Other SEO audit tools 
You can find other free SEO tools in the [Related actors](https://apify.com/jancurn/find-broken-links/related-actors) tab: Web Page Analyzer, SEO Audit Tool, Google Search Results Scraper. You should also check out [5 powerful scrapers to add to your SEO tool kit](https://blog.apify.com/5-powerful-scrapers-to-add-to-your-seo-toolkit/).
