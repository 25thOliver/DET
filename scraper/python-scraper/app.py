from flask import Flask, request, jsonify
from bs4 import BeautifulSoup
import requests
import time
import io
from pdfminer.high_level import extract_text

app = Flask(__name__)


# -------------------------
# Helpers
# -------------------------

def safe_request(url, retries=3, delay=3):
    """Fetch URL with retry + timeout."""
    for i in range(retries):
        try:
            return requests.get(
                url,
                timeout=25,
                headers={"User-Agent": "Mozilla/5.0"}
            )
        except requests.RequestException as e:
            if i < retries - 1:
                time.sleep(delay)
            else:
                raise e


def chunk_text_by_headings(soup, max_chars=8000):
    """Split content into sections grouped by headings."""
    sections = []
    current_heading = "Introduction"
    current_content = []

    for elem in soup.find_all(["h1", "h2", "h3", "p", "li"]):
        if elem.name in ["h1", "h2", "h3"]:
            if current_content:
                text = " ".join(current_content).strip()
                if text:
                    sections.append({"heading": current_heading, "content": text})
                current_content = []
            current_heading = elem.get_text(" ", strip=True)
        else:
            text = elem.get_text(" ", strip=True)
            if text:
                current_content.append(text)

    if current_content:
        sections.append({"heading": current_heading, "content": " ".join(current_content)})

    final_sections = []
    for sec in sections:
        content = sec["content"]
        if len(content) > max_chars:
            parts = [content[i:i+max_chars] for i in range(0, len(content), max_chars)]
            for idx, part in enumerate(parts, 1):
                final_sections.append({"heading": f"{sec['heading']} (Part {idx})", "content": part})
        else:
            final_sections.append(sec)

    return final_sections


def extract_pdf_text(url):
    """Download and extract text from a PDF."""
    try:
        r = safe_request(url)
        with io.BytesIO(r.content) as f:
            text = extract_text(f)
        return [{"heading": "PDF Content", "content": text}]
    except Exception as e:
        return [{"heading": "Error", "content": f"Failed to parse PDF: {e}"}]


def scrape_html(url):
    """Scrape HTML and return structured sections + links."""
    r = safe_request(url)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    sections = chunk_text_by_headings(soup)

    related_links = []
    pdf_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.endswith(".pdf"):
            if href.startswith("http"):
                pdf_links.append(href)
            else:
                pdf_links.append(url.rstrip("/") + "/" + href.lstrip("/"))
        elif href.startswith("http"):
            related_links.append(href)

    return soup, sections, related_links, pdf_links


# -------------------------
# API Routes
# -------------------------

@app.route("/scrape", methods=["POST"])
def scrape():
    data = request.get_json()
    url = data.get("url")

    try:
        soup, sections, related_links, pdf_links = scrape_html(url)

        # If no meaningful sections but PDFs are present → parse PDFs
        if len(sections) < 2 and pdf_links:
            pdf_sections = []
            for pdf in pdf_links:
                pdf_sections.extend(extract_pdf_text(pdf))
            sections.extend(pdf_sections)

        return jsonify({
            "title": soup.title.string if soup and soup.title else "Privacy Policy",
            "sections": sections,
            "related_links": related_links + pdf_links,
            "metadata": {
                "scraper_used": "python",
                "status": "success"
            }
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "metadata": {"scraper_used": "python", "status": "fail"}
        }), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "python scraper running"})


# -------------------------
# Entrypoint
# -------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6001)
