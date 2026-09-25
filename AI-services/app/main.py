from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import ssl

try:
    import certifi
except ImportError:  # pragma: no cover - fallback for environments without certifi
    certifi = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    import httpx
except ImportError:  # pragma: no cover - fallback for restricted environments
    httpx = None

try:
    import uvicorn
    from fastapi import FastAPI, HTTPException
except ImportError:  # pragma: no cover - fallback for restricted environments
    uvicorn = None
    FastAPI = None
    HTTPException = None

from app.processors.registry import ProcessorRegistry
from app.schemas import DocumentProcessingRequest, ProcessingResult
from app.services.s3_service import S3Service

registry = ProcessorRegistry()
s3_service = S3Service()
logger = logging.getLogger("sphereai.processing")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def _build_ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        try:
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            pass
    return ssl.create_default_context()


SSL_CONTEXT = _build_ssl_context()


def _download_content(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "SphereAI-processor"})
    try:
        with urlopen(request, context=SSL_CONTEXT, timeout=30) as response:
            return response.read()
    except Exception:
        try:
            unverified_context = ssl._create_unverified_context()
            with urlopen(request, context=unverified_context, timeout=30) as response:
                return response.read()
        except Exception:
            completed = subprocess.run(
                ["curl", "-k", "-L", "-sS", url],
                check=True,
                capture_output=True,
                text=False,
            )
            return completed.stdout

if FastAPI is not None:
    app = FastAPI(title="SphereAI Document Processing Service", version="0.1.0")

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"status": "ok", "service": "sphereai-document-processing"}

    @app.post("/process", response_model=ProcessingResult)
    async def process_document(request: DocumentProcessingRequest) -> ProcessingResult:
        if not request.downloadUrl and not request.s3Key:
            raise HTTPException(status_code=400, detail="Either downloadUrl or s3Key must be provided")

        started_at = time.time()
        logger.info("processing_started", extra={"document_id": request.documentId, "mime_type": request.mimeType, "file_name": request.fileName})

        content = b""
        if request.downloadUrl:
            if httpx is not None:
                async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                    response = await client.get(request.downloadUrl)
                    response.raise_for_status()
                    content = response.content
            else:
                content = _download_content(request.downloadUrl)
        elif request.s3Key and request.bucketName:
            try:
                content = s3_service.download_from_s3(request.bucketName, request.s3Key)
            except Exception as exc:
                logger.exception("s3_download_failed", extra={"document_id": request.documentId, "bucket": request.bucketName, "key": request.s3Key, "error": str(exc)})
                raise HTTPException(status_code=502, detail=f"Failed to download input from S3: {exc}") from exc

        try:
            result = registry.process(request, content)
            logger.info(
                "processing_completed",
                extra={
                    "document_id": request.documentId,
                    "processor": result.processor,
                    "duration_ms": round((time.time() - started_at) * 1000, 2),
                },
            )
            return result
        except ValueError as exc:
            logger.exception("processing_failed", extra={"document_id": request.documentId, "error": str(exc)})
            raise HTTPException(status_code=422, detail=str(exc)) from exc
else:
    app = None


class DocumentProcessingHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if urlparse(self.path).path == "/health":
            self._send_json(HTTPStatus.OK, {"status": "ok", "service": "sphereai-document-processing"})
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"detail": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if urlparse(self.path).path != "/process":
            self._send_json(HTTPStatus.NOT_FOUND, {"detail": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(length) if length else b"{}"
            body = json.loads(payload.decode("utf-8"))
            request = DocumentProcessingRequest(**body)
        except Exception as exc:  # pragma: no cover - defensive path
            self._send_json(HTTPStatus.BAD_REQUEST, {"detail": f"Invalid request body: {exc}"})
            return

        if not request.downloadUrl and not request.s3Key:
            self._send_json(HTTPStatus.BAD_REQUEST, {"detail": "Either downloadUrl or s3Key must be provided"})
            return

        content = b""
        if request.downloadUrl:
            try:
                content = _download_content(request.downloadUrl)
            except Exception as exc:  # pragma: no cover - defensive path
                self._send_json(HTTPStatus.BAD_GATEWAY, {"detail": f"Failed to download input: {exc}"})
                return
        elif request.s3Key and request.bucketName:
            try:
                content = s3_service.download_from_s3(request.bucketName, request.s3Key)
            except Exception as exc:  # pragma: no cover - defensive path
                self._send_json(HTTPStatus.BAD_GATEWAY, {"detail": f"Failed to download input from S3: {exc}"})
                return

        try:
            result = registry.process(request, content)
        except ValueError as exc:
            self._send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"detail": str(exc)})
            return

        self._send_json(HTTPStatus.OK, self._serialize_result(result))

    def _serialize_result(self, result: ProcessingResult) -> dict[str, Any]:
        if hasattr(result, "model_dump"):
            return result.model_dump()
        return result.__dict__

    def _send_json(self, status: HTTPStatus, payload: Any) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def run_server(host: str = "127.0.0.1", port: int = 8001) -> None:
    server = ThreadingHTTPServer((host, port), DocumentProcessingHandler)
    print(f"SphereAI document processing service listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
