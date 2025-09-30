import express from "express";
import dotenv from "dotenv";
import scrapeRouter from "./routes/scrape.js"

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "API is running" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));

// Scrape endpoint
app.use("/api", scrapeRouter)