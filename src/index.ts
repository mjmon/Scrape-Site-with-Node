import axios from "axios";
import puppeteer from "puppeteer";

// Regular expressions for emails and phone numbers
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const phoneRegex =
  /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{0,4}/g;
// Social media links regex
const socialLinksRegex =
  /https?:\/\/(www\.)?(facebook|twitter|linkedin|instagram|tiktok)\.com\/[A-Za-z0-9._%+-]+/gi;

// Function to scrape emails and phone numbers from a given URL
async function scrapeContacts(url: string): Promise<{
  visitedUrls: string[];
  emails: string[];
  phoneNumbers: string[];
  socialLinks: string[];
}> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const visitedUrls = new Set<string>(); // To keep track of visited URLs
  const emails: Set<string> = new Set();
  const phoneNumbers: Set<string> = new Set();
  const socialLinks: Set<string> = new Set();

  // Recursive function to scrape a page and its subpages
  async function scrapePage(url: string) {
    if (visitedUrls.has(url)) return;
    visitedUrls.add(url);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const pageContent = await page.content();

      // Extract emails and phone numbers from the current page content
      const foundEmails = pageContent.match(emailRegex) || [];
      const foundPhoneNumbers = pageContent.match(phoneRegex) || [];
      const foundSocialLinks = pageContent.match(socialLinksRegex) || [];

      foundEmails.forEach((email) => emails.add(email));
      foundPhoneNumbers.forEach((number) => phoneNumbers.add(number));
      foundSocialLinks.forEach((link) => socialLinks.add(link));

      // Extract links to subroutes and scrape them
      //   const subrouteUrls = await page.evaluate(() => {
      //     const anchors = Array.from(document.querySelectorAll("a"));
      //     return anchors
      //       .map((anchor) => anchor.href)
      //       .filter((href) => href.startsWith(window.location.origin));
      //   });

      //   for (const subroute of subrouteUrls) {
      //     await scrapePage(subroute);
      //   }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);

      if (error instanceof Error) {
        console.error(`Error scraping ${url}:`, error);
        if (
          error.message.includes("ERR_ABORTED") ||
          error.message.includes("Navigation failed")
        ) {
          throw new Error(
            `Scraping not allowed or navigation failed for ${url}`
          );
        }
      } else {
        console.error(`Unexpected error scraping ${url}:`, error);
        throw new Error(`Unexpected error: ${String(error)}`);
      }
    }
  }

  // Check if the URL is valid before scraping
  try {
    await axios.get(url);
  } catch (error) {
    await browser.close();
    throw new Error(`Invalid URL or site does not exist: ${url}`);
  }

  // Start the scraping process from the given URL
  try {
    await scrapePage(url);
  } catch (error) {
    await browser.close();
    throw error; // Propagate the error if scraping fails
  }

  await browser.close();

  return {
    visitedUrls: Array.from(visitedUrls),
    emails: Array.from(emails),
    phoneNumbers: Array.from(phoneNumbers),
    socialLinks: Array.from(socialLinks),
  };
}

// Usage
(async () => {
  const args = process.argv.slice(2);
  const url = args[0];

  if (!url) {
    console.error("Please provide a URL as a command line argument.");
    process.exit(1);
  }

  const { visitedUrls, emails, socialLinks, phoneNumbers } =
    await scrapeContacts(url);

  console.log("visitedUrls:", visitedUrls);
  console.log("Emails found:", emails);
  console.log("socialLinks found:", socialLinks);
  console.log("Phone numbers found:", phoneNumbers);
})();
