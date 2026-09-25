from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.schemas import DocumentProcessingRequest, ProcessingResult


class BaseProcessor(ABC):
    name: str = "base"
    mime_types: tuple[str, ...] = ()

    def supports(self, mime_type: str) -> bool:
        return mime_type in self.mime_types

    @abstractmethod
    def process(self, request: DocumentProcessingRequest, content: bytes) -> ProcessingResult:
        """Process a document and return structured extraction results."""

    def extract_text(self, request: DocumentProcessingRequest, content: bytes) -> Optional[str]:
        """Optional convenience hook for text extraction implementations."""
        return None

    def build_result(
        self,
        request: DocumentProcessingRequest,
        *,
        extracted_text: str | None,
        processor: str,
        needs_ocr: bool = False,
        ocr_applied: bool = False,
        warnings: list[str] | None = None,
        metadata: Dict[str, Any] | None = None,
        status: str = "processed",
    ) -> ProcessingResult:
        return ProcessingResult(
            documentId=request.documentId,
            userId=request.userId,
            status=status,
            processor=processor,
            mimeType=request.mimeType,
            fileName=request.fileName,
            extractedText=extracted_text or None,
            textLength=len(extracted_text or ""),
            needsOcr=needs_ocr,
            ocrApplied=ocr_applied,
            warnings=warnings or [],
            metadata=metadata or {},
        )
