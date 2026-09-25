from __future__ import annotations

from app.schemas import DocumentProcessingRequest, ProcessingResult
from .base import BaseProcessor


class TextProcessor(BaseProcessor):
    name = "text"
    mime_types = (
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json",
        "application/xml",
        "application/javascript",
        "application/x-yaml",
    )

    def process(self, request: DocumentProcessingRequest, content: bytes) -> ProcessingResult:
        text = content.decode("utf-8", errors="ignore")
        return self.build_result(
            request,
            extracted_text=text,
            processor=self.name,
            metadata={"encoding": "utf-8"},
        )

    def extract_text(self, request: DocumentProcessingRequest, content: bytes) -> str | None:
        text = content.decode("utf-8", errors="ignore")
        return text or None
