from __future__ import annotations

from app.schemas import DocumentProcessingRequest
from .base import BaseProcessor
from .docx import DocxProcessor
from .image import ImageProcessor
from .pdf import PdfProcessor
from .text import TextProcessor


class ProcessorFactory:
    _processors: tuple[type[BaseProcessor], ...] = (
        PdfProcessor,
        ImageProcessor,
        DocxProcessor,
        TextProcessor,
    )

    @classmethod
    def create(cls, request: DocumentProcessingRequest) -> BaseProcessor:
        mime_type = request.mimeType or ""
        for processor_cls in cls._processors:
            processor = processor_cls()
            if processor.supports(mime_type):
                return processor

        if mime_type.startswith("image/"):
            return ImageProcessor()

        raise ValueError(f"Unsupported MIME type: {mime_type}")
