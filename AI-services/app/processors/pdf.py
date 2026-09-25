from __future__ import annotations

from io import BytesIO

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - fallback for environments without pypdf
    PdfReader = None

from app.schemas import DocumentProcessingRequest, ProcessingResult
from .base import BaseProcessor


class PdfProcessor(BaseProcessor):
    name = "pdf"
    mime_types = ("application/pdf",)

    def process(self, request: DocumentProcessingRequest, content: bytes) -> ProcessingResult:
        if PdfReader is None:
            return self.build_result(
                request,
                extracted_text="",
                processor=self.name,
                warnings=["PDF extraction dependency not installed; returning empty result"],
                metadata={"error": "pypdf unavailable"},
            )

        try:
            reader = PdfReader(BytesIO(content))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(page for page in pages if page).strip()
            return self.build_result(
                request,
                extracted_text=text,
                processor=self.name,
                metadata={"pages": len(reader.pages)},
            )
        except Exception as exc:  # pragma: no cover - defensive path
            return self.build_result(
                request,
                extracted_text="",
                processor=self.name,
                warnings=[f"PDF extraction failed: {exc}"],
                metadata={"error": str(exc)},
            )
