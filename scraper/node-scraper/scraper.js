import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Scraper is alive 🕷️" });
});

app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/chromium"
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const data = await page.evaluate(() => {
      const sections = [];
      const elements = document.querySelectorAll("h1, h2, h3, p");
      let currentSection = { heading: null, content: "" };

      elements.forEach((el) => {
        if (["H1", "H2", "H3"].includes(el.tagName)) {
          if (currentSection.heading || currentSection.content) {
            sections.push(currentSection);
          }
          currentSection = { heading: el.innerText.trim(), content: "" };
        } else if (el.tagName === "P") {
          currentSection.content += " " + el.innerText.trim();
        }
      });

      if (currentSection.heading || currentSection.content) {
        sections.push(currentSection);
      }

      const relatedLinks = Array.from(document.querySelectorAll("a"))
        .map((a) => a.href)
        .filter((href) => /(privacy|cookie|terms|policy)/i.test(href));

      return {
        title: document.title,
        sections,
        related_links: [...new Set(relatedLinks)]
      };
    });

    await browser.close();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Scraper running on port ${PORT}`);
});
