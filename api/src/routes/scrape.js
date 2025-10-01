import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // ----------------------------
    // Step 1: Try Python Scraper
    // ----------------------------
    let scrapeResponse;
    try {
      scrapeResponse = await axios.get(`http://scraper-python:6001/scrape`, {
        params: { url },
        timeout: 120000, // 2 minutes for heavy pages
      });
    } catch (err) {
      console.warn("⚠️ Python scraper request failed:", err.message);
    }

    let { title, sections, related_links } = scrapeResponse?.data || {
      title: null,
      sections: [],
      related_links: [],
    };

    // ----------------------------
    // Step 2: Fallback to Node if Python failed or empty
    // ----------------------------
    if (!sections || sections.length === 0) {
      console.log("🔄 Falling back to Node scraper...");
      try {
        const nodeResponse = await axios.get(`http://scraper-node:6000/scrape`, {
          params: { url },
          timeout: 120000,
        });
        title = nodeResponse.data.title;
        sections = nodeResponse.data.sections || [];
        related_links = nodeResponse.data.related_links || [];
      } catch (err) {
        console.error("❌ Node scraper also failed:", err.message);
        return res.status(500).json({
          error: "Both scrapers failed",
          details: err.message,
        });
      }
    }

    // ----------------------------
    // Step 3: Summarize with NLP
    // ----------------------------
    let summaries = [];
    try {
      const nlpResponse = await axios.post("http://nlp:5000/summarize", {
        sections,
      });
      summaries = nlpResponse.data.summaries || [];
    } catch (err) {
      console.warn("⚠️ NLP summarization failed:", err.message);
    }

    // Merge summaries
    const enrichedSections = sections.map((sec, idx) => ({
      ...sec,
      summary: summaries[idx]?.summary || "",
    }));

    // ----------------------------
    // Step 4: Return final result
    // ----------------------------
    res.json({
      title,
      sections: enrichedSections,
      related_links,
      metadata: {
        scraper_used: scrapeResponse?.data?.sections?.length ? "python" : "node",
        nlp_used: "distilbart-cnn-12-6",
        status: "success",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Scrape pipeline failed", details: err.message });
  }
});

export default router;
