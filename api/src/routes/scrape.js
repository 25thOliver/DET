// src/routes/scrape.js
import express from "express";
import { scrapeUrl } from "../services/scraperService.js";

const router = express.Router();

router.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const result = await scrapeUrl(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Failed to scrape",
      details: err.message,
    });
  }
});

export default router;
