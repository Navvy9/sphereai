import unittest

from app.processors.factory import ProcessorFactory
from app.schemas import DocumentProcessingRequest


class ProcessorFactoryTests(unittest.TestCase):
    def test_routes_pdf_mime_to_pdf_processor(self) -> None:
        request = DocumentProcessingRequest(
            fileName="sample.pdf",
            originalFileName="sample.pdf",
            mimeType="application/pdf",
            fileSize=123,
        )
        processor = ProcessorFactory.create(request)
        self.assertEqual(processor.name, "pdf")

    def test_routes_docx_mime_to_docx_processor(self) -> None:
        request = DocumentProcessingRequest(
            fileName="sample.docx",
            originalFileName="sample.docx",
            mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileSize=123,
        )
        processor = ProcessorFactory.create(request)
        self.assertEqual(processor.name, "docx")

    def test_raises_for_unsupported_mime(self) -> None:
        request = DocumentProcessingRequest(
            fileName="sample.xyz",
            originalFileName="sample.xyz",
            mimeType="application/x-unknown",
            fileSize=123,
        )
        with self.assertRaises(ValueError):
            ProcessorFactory.create(request)


if __name__ == "__main__":
    unittest.main()
