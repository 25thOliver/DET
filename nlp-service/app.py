from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline

# Init FastAPI
app = FastAPI(title="NLP Summarization Service")

# Load lightweight summarizer model once at startup
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

class Section(BaseModel):
    heading: str
    content: str

class SummarizeRequest(BaseModel):
    sections: list[Section]

@app.get("/health")
def health():
    return {"status": "NLP service is alive 🧠"}

@app.post("/summarize")
def summarize(request: SummarizeRequest):
    results = []
    for section in request.sections:
        content = section.content.strip()
        
        # Skip empty or very short content
        if not content or len(content) < 50:
            results.append({"heading": section.heading, "summary": content[:100] if content else ""})
            continue

        try:
            # Calculate appropriate min_length based on content length
            content_length = len(content.split())
            min_length = min(20, max(10, content_length // 4))
            max_length = min(100, max(30, content_length // 2))
            
            summary = summarizer(
                content,
                max_length=max_length,
                min_length=min_length,
                do_sample=False
            )[0]["summary_text"]
            
            # Ensure summary is meaningful
            if len(summary.strip()) < 10:
                summary = content[:100] + "..." if len(content) > 100 else content
                
        except Exception as e:
            # Fallback to truncated content if summarization fails
            summary = content[:100] + "..." if len(content) > 100 else content
            print(f"Summarization failed for '{section.heading}': {e}")

        results.append({
            "heading": section.heading,
            "summary": summary
        })

    return {"summaries": results}
