from __future__ import annotations

from io import BytesIO

try:
    from PIL import Image
    import pytesseract
except ImportError:  # pragma: no cover - fallback for environments without OCR deps
    Image = None
    pytesseract = None

from app.schemas import DocumentProcessingRequest, ProcessingResult
from .base import BaseProcessor


class ImageProcessor(BaseProcessor):
    name = "image"
    mime_types = (
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/tiff",
    )

    def process(self, request: DocumentProcessingRequest, content: bytes) -> ProcessingResult:
        if Image is None or pytesseract is None:
            return self.build_result(
                request,
                extracted_text="",
                processor=self.name,
                needs_ocr=True,
                warnings=["OCR dependencies not installed; returning empty result"],
                metadata={"error": "pillow/pytesseract unavailable"},
            )

        try:
            image = Image.open(BytesIO(content)).convert("RGB")
            text = pytesseract.image_to_string(image)
            needs_ocr = not bool(text.strip())
            return self.build_result(
                request,
                extracted_text=text.strip(),
                processor=self.name,
                needs_ocr=needs_ocr,
                ocr_applied=True,
                metadata={"ocrEngine": "tesseract"},
            )
        except Exception as exc:  # pragma: no cover - defensive path
            return self.build_result(
                request,
                extracted_text="",
                processor=self.name,
                needs_ocr=True,
                warnings=[f"OCR failed: {exc}"],
                metadata={"error": str(exc)},
            )
