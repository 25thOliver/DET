import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Node scraper is alive 🕷️" });
});

app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/chromium",
    });

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      locale: "en-US",
    });

    const navigateWithRetries = async (targetUrl, attempts = 2) => {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 120000 });
          // scroll to bottom to trigger lazy content
          await page.evaluate(async () => {
            await new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 800;
              const timer = setInterval(() => {
                const { scrollHeight } = document.body;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight - window.innerHeight) {
                  clearInterval(timer);
                  resolve(true);
                }
              }, 200);
            });
          });
          await page.waitForTimeout(500);
          return;
        } catch (e) {
          lastErr = e;
          if (i < attempts - 1) await page.waitForTimeout(1000);
        }
      }
      throw lastErr;
    };

    await navigateWithRetries(url);

    const extractContent = async () => {
      return page.evaluate(() => {
        const sections = [];
        const elements = document.querySelectorAll("h1, h2, h3, p, li");
        let currentHeading = "Introduction";
        let currentContent = [];

        elements.forEach((el) => {
          const tag = el.tagName;
          if (["H1", "H2", "H3"].includes(tag)) {
            if (currentContent.length) {
              const text = currentContent.join(" ").trim();
              if (text) sections.push({ heading: currentHeading, content: text });
              currentContent = [];
            }
            const headingText = el.innerText?.trim();
            if (headingText) currentHeading = headingText;
          } else if (["P", "LI"].includes(tag)) {
            const text = el.innerText?.trim();
            if (text) currentContent.push(text);
          }
        });

        if (currentContent.length) {
          const text = currentContent.join(" ").trim();
          if (text) sections.push({ heading: currentHeading, content: text });
        }

        const anchors = Array.from(document.querySelectorAll("a[href]"));
        const hrefs = anchors.map((a) => a.href).filter(Boolean);
        const pdfLinks = hrefs.filter((h) => /\.pdf($|\?)/i.test(h));
        const relatedLinks = hrefs.filter((h) => /(privacy|cookie|terms|policy)/i.test(h));

        return {
          title: document.title || "Privacy Policy",
          sections,
          related_links: Array.from(new Set(relatedLinks)).slice(0, 100),
          pdf_links: Array.from(new Set(pdfLinks)).slice(0, 100),
        };
      });
    };

    let data = await extractContent();

    // Fallback for Facebook: use printable mobile page if content empty
    if (new URL(url).hostname.includes("facebook.com") && (!data.sections || data.sections.length === 0)) {
      const printable = "https://mbasic.facebook.com/privacy/policy/printable/";
      await navigateWithRetries(printable);
      data = await extractContent();
    }

    await browser.close();
    res.json(data);
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: "Scraping failed", details: error.message });
  }
});

const PORT = process.env.PORT || 6000; // internal port = 6000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node scraper running on port ${PORT}`);
});
