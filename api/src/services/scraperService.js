// src/services/scraperService.js
import axios from "axios";

export async function scrapeUrl(url) {
  try {
    // Try Python scraper first
    const pyRes = await axios.post("http://scraper-python:6001/scrape", { url });
    return {
      ...pyRes.data,
      metadata: {
        scraper_used: "python",
        status: "success",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.warn("[Fallback] Python scraper failed, trying Node…", err.message);
    try {
      const nodeRes = await axios.get("http://scraper-node:6002/scrape", {
        params: { url },
      });
      return {
        ...nodeRes.data,
        metadata: {
          scraper_used: "node",
          status: "success",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (nodeErr) {
      throw new Error(
        `Both scrapers failed. Python: ${err.message}, Node: ${nodeErr.message}`
      );
    }
  }
}
