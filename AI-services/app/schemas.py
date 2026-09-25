from typing import Any, Dict, List, Optional

try:
    from pydantic import BaseModel, Field
except ImportError:  # pragma: no cover - fallback for environments without pydantic
    class BaseModel:
        def __init__(self, **data):
            for key, value in data.items():
                setattr(self, key, value)

        def model_dump(self) -> Dict[str, Any]:
            return self.__dict__

    def Field(default_factory=None):
        if default_factory is None:
            return None
        return default_factory()


class DocumentProcessingRequest(BaseModel):
    documentId: Optional[str] = None
    userId: Optional[str] = None
    fileName: str
    originalFileName: str
    mimeType: str
    fileSize: int
    s3Key: Optional[str] = None
    bucketName: Optional[str] = None
    downloadUrl: Optional[str] = None
    source: str = "node-backend"


class ProcessingResult(BaseModel):
    documentId: Optional[str] = None
    userId: Optional[str] = None
    status: str
    processor: str
    mimeType: str
    fileName: str
    extractedText: Optional[str] = None
    textLength: int = 0
    needsOcr: bool = False
    ocrApplied: bool = False
    warnings: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
