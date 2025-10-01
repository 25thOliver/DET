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
      executablePath: "/usr/bin/chromium", // works with Debian's chromium
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const data = await page.evaluate(() => {
      const sections = [];
      const elements = document.querySelectorAll("h1, h2, h3, p");
      let currentSection = { heading: null, content: "" };
      const seenHeadings = new Set();

      elements.forEach((el) => {
        if (["H1", "H2", "H3"].includes(el.tagName)) {
          // Push last section if valid
          if (currentSection.heading && currentSection.content) {
            sections.push(currentSection);
          }
          const headingText = el.innerText.trim();
          if (headingText && !seenHeadings.has(headingText)) {
            seenHeadings.add(headingText);
            currentSection = { heading: headingText, content: "" };
          } else {
            currentSection = { heading: null, content: "" }; // skip dup/empty
          }
        } else if (el.tagName === "P" && currentSection.heading) {
          const text = el.innerText.trim();
          if (text) {
            currentSection.content += " " + text;
          }
        }
      });

      // Push the final section if valid
      if (currentSection.heading && currentSection.content) {
        sections.push(currentSection);
      }

      // Collect privacy-related links (dedup + cap at 50)
      const relatedLinks = Array.from(document.querySelectorAll("a"))
        .map((a) => a.href)
        .filter((href) => /(privacy|cookie|terms|policy)/i.test(href))
        .slice(0, 50);

      return {
        title: document.title || "Untitled",
        sections,
        related_links: [...new Set(relatedLinks)],
      };
    });

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
