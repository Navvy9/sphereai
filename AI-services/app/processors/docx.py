from __future__ import annotations

from typing import Optional

try:
    from docx import Document as DocxDocument
except ImportError:  # pragma: no cover - fallback for envs without python-docx
    DocxDocument = None

from app.schemas import DocumentProcessingRequest, ProcessingResult
from .base import BaseProcessor


class DocxProcessor(BaseProcessor):
    name = "docx"
    mime_types = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    )

    def process(self, request: DocumentProcessingRequest, content: bytes) -> ProcessingResult:
        if DocxDocument is None:
            return self.build_result(
                request,
                extracted_text="",
                processor=self.name,
                warnings=["DOCX dependency not installed; returning empty result"],
                metadata={"error": "python-docx unavailable"},
            )

        try:
            import io

            document = DocxDocument(io.BytesIO(content))
            paragraphs = [p.text.strip() for p in document.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs)
            return self.build_result(
                request,
                extracted_text=text,
                processor=self.name,
                metadata={"paragraphs": len(paragraphs)},
            )
        except Exception as exc:  # pragma: no cover - defensive path
            return self.build_result(
                request,
                extracted_text="",
                processor=self.name,
                warnings=[f"DOCX extraction failed: {exc}"],
                metadata={"error": str(exc)},
            )

    def extract_text(self, request: DocumentProcessingRequest, content: bytes) -> Optional[str]:
        return self.process(request, content).extractedText
