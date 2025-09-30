import express from "express";
import dotenv from "dotenv";
import scrapeRouter from "./routes/scrape.js";

dotenv.config();
const app = express();

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "API is running" });
});

// Scrape routes
app.use("/api", scrapeRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
