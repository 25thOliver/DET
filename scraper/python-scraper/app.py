from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import trafilatura

app = FastAPI(title="Python Scraper Service")

class ScrapeRequest(BaseModel):
    url: str

@app.get("/health")
def health():
    return {"status": "Python scraper is alive 🕷️"}

@app.post("/scrape")
def scrape(req: ScrapeRequest):
    downloaded = trafilatura.fetch_url(req.url)
    if not downloaded:
        raise HTTPException(status_code=400, detail="Failed to fetch URL")

    text = trafilatura.extract(downloaded)
    if not text:
        raise HTTPException(status_code=400, detail="Failed to extract text")

    return {"url": req.url, "content": text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=6001, reload=False)
