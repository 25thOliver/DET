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
        if not section.content.strip():
            results.append({"heading": section.heading, "summary": ""})
            continue

        try:
            summary = summarizer(
                section.content,
                max_length=120,
                min_length=30,
                do_sample=False
            )[0]["summary_text"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        results.append({
            "heading": section.heading,
            "summary": summary
        })

    return {"summaries": results}
