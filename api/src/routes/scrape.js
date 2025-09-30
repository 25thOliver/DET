import express from "express";
import axios from "axios";

const router = express.Router();

// Proxy request to scraper
router.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // call scraper container internally
    const response = await axios.get(`http://scraper:6000/scrape`, {
      params: { url },
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
