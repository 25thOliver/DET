import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ message: "Route is working" });
});

router.post("/scrape", async (req, res) => {
  console.log("🔍 Scrape request received:", req.body);
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // ----------------------------
    // Step 1: Try Python Scraper
    // ----------------------------
    let scrapeResponse;
    try {
      console.log("🔄 Calling Python scraper...");
      // Python scraper expects POST with JSON body on internal port 6000
      scrapeResponse = await axios.post(`http://scraper-python:6000/scrape`, {
        url,
      }, {
        timeout: 90000, // prefer faster fallback to Node
      });
      console.log("✅ Python scraper responded");
    } catch (err) {
      console.warn("⚠️ Python scraper request failed:", err.message);
    }

    let { title, sections, related_links, pdf_links } = scrapeResponse?.data || {
      title: null,
      sections: [],
      related_links: [],
      pdf_links: [],
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
        // Node scraper currently does not emit pdf_links; keep as []
        pdf_links = [];
      } catch (err) {
        console.error("❌ Node scraper also failed:", err.message);
        return res.status(500).json({
          error: "Both scrapers failed",
          details: err.message,
        });
      }
    }

    // ----------------------------
    // Step 3: Summarize with NLP (bounded)
    // ----------------------------
    const MAX_SECTIONS = 20; // cap count to avoid long processing
    const MAX_CHARS = 2000; // cap per section
    const boundedSections = (sections || []).slice(0, MAX_SECTIONS).map((s) => ({
      heading: s.heading,
      content: (s.content || "").slice(0, MAX_CHARS),
    }));

    let summaries = [];
    const shouldSkipNlp = (url || "").includes("policies.google.com");
    if (!shouldSkipNlp && boundedSections.length > 0) {
      try {
        console.log("🔄 Calling NLP service...");
        const nlpResponse = await axios.post("http://nlp:5000/summarize", {
          sections: boundedSections,
        }, { timeout: 30000 }); // 30 second timeout
        summaries = nlpResponse.data.summaries || [];
        console.log("✅ NLP service responded");
      } catch (err) {
        console.warn("⚠️ NLP summarization failed:", err.message);
      }
    } else {
      console.log("⏭️ Skipping NLP (shouldSkipNlp:", shouldSkipNlp, "sections:", boundedSections.length, ")");
    }

    // Merge summaries (align by index if present)
    const enrichedSections = sections.map((sec, idx) => ({
      ...sec,
      summary: summaries[idx]?.summary || "",
    }));

    // ----------------------------
    // Step 4: Return final result
    // ----------------------------
    // Combine related + pdf links for clients that expect a single list if desired
    const combinedRelated = Array.from(new Set([...(related_links || []), ...(pdf_links || [])]));

    res.json({
      title,
      sections: enrichedSections,
      related_links: combinedRelated,
      pdf_links,
      metadata: {
        scraper_used: (scrapeResponse && scrapeResponse.data && scrapeResponse.data.sections && scrapeResponse.data.sections.length) ? "python" : "node",
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