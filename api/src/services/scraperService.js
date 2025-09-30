import axios from "axios";

const PYTHON_SCRAPER_URL = "http://scraper-python:7000/scrape";
const NODE_SCRAPER_URL = "http://scraper-node:6000/scrape";

export async function scrapeUrl(url) {
  try {
    // Try Python scraper first
    const pyResponse = await axios.post(PYTHON_SCRAPER_URL, { url });
    if (pyResponse.data.content && pyResponse.data.content.length > 500) {
      return { ...pyResponse.data, source: "python" };
    }

    // If Python fails or too short → fallback to Node scraper
    const nodeResponse = await axios.get(NODE_SCRAPER_URL, { params: { url } });
    return { ...nodeResponse.data, source: "node" };

  } catch (err) {
    // If Python throws error → try Node immediately
    try {
      const nodeResponse = await axios.get(NODE_SCRAPER_URL, { params: { url } });
      return { ...nodeResponse.data, source: "node" };
    } catch (nodeErr) {
      throw new Error(`Both scrapers failed: ${nodeErr.message}`);
    }
  }
}
