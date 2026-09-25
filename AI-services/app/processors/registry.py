from __future__ import annotations

from app.schemas import DocumentProcessingRequest, ProcessingResult
from .factory import ProcessorFactory


class ProcessorRegistry:
    def process(self, request: DocumentProcessingRequest, content: bytes) -> ProcessingResult:
        processor = ProcessorFactory.create(request)
        return processor.process(request, content)
