# SphereAI Document Processing Service

This service handles document intelligence for SphereAI.

## Run locally

```bash
cd AI-services
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Supported flows

- Plain text and markdown files
- PDF text extraction
- Image OCR via Tesseract

The service is intentionally structured so embeddings, vector databases, and AI chat can be added as new processors or downstream services.
