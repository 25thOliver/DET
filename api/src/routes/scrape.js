import express from "express";
import axios from "axios";

const router = express.Router();

// Proxy request to scraper + NLP
router.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // Step 1: Scrape raw content
    const scrapeResponse = await axios.get(`http://scraper:6000/scrape`, {
      params: { url },
    });

    const { title, sections, related_links } = scrapeResponse.data;

    // Step 2: Summarize with NLP service
    const nlpResponse = await axios.post("http://nlp:5000/summarize", {
      sections,
    });

    const { summaries } = nlpResponse.data;

    // Step 3: Merge summaries back into sections
    const enrichedSections = sections.map((sec, idx) => ({
      ...sec,
      summary: summaries[idx]?.summary || "",
    }));

    // Step 4: Return everything with metadata
    res.json({
      title,
      sections: enrichedSections,
      related_links,
      metadata: {
        scraper_used: "python",
        nlp_used: "distilbart-cnn-12-6",
        status: "success",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
