import os
import time
import json
import requests
from datetime import datetime

# -----------------------------
# CONFIG
# -----------------------------
API_ENDPOINT = "http://localhost:4000/api/scrape"
URLS = [
    "https://www.mozilla.org/en-US/privacy/",
    "https://www.facebook.com/privacy/policy",
    "https://policies.google.com/privacy",
    "https://www.apple.com/legal/privacy/en-ww/",
    "https://twitter.com/en/privacy",
    "https://www.microsoft.com/en-us/privacy"
]

# Timeout in seconds for each request
TIMEOUT = 300  # 5 minutes for heavy pages

# Output folder
OUTPUT_DIR = f"batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -----------------------------
# RUN BATCH TEST
# -----------------------------
results = []

for url in URLS:
    print(f"\n🔎 Testing: {url}")
    start_time = time.time()
    entry = {"url": url, "status": None, "duration_sec": None, "output_file": None}

    try:
        response = requests.get(API_ENDPOINT, params={"url": url}, timeout=TIMEOUT)
        duration = round(time.time() - start_time, 2)

        if response.status_code == 200:
            data = response.json()

            # Save result to file
            safe_name = url.replace("https://", "").replace("http://", "").replace("/", "_")
            output_file = os.path.join(OUTPUT_DIR, f"{safe_name}.json")

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            entry.update({"status": "success", "duration_sec": duration, "output_file": output_file})
            print(f"✅ Success in {duration}s → saved to {output_file}")
        else:
            entry.update({"status": f"HTTP {response.status_code}"})
            print(f"❌ Failed: HTTP {response.status_code}")

    except requests.exceptions.Timeout:
        entry.update({"status": "timeout"})
        print("⏳ Timeout reached")

    except Exception as e:
        entry.update({"status": f"error: {str(e)}"})
        print(f"❌ Error: {e}")

    results.append(entry)

# -----------------------------
# SAVE SUMMARY LOG
# -----------------------------
log_file = os.path.join(OUTPUT_DIR, "batch_summary.json")
with open(log_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"\n📑 Batch test complete. Summary saved to {log_file}")
