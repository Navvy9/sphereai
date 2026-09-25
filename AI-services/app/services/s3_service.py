from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import BinaryIO, Optional
from urllib.request import Request, urlopen

try:
    import boto3
except ImportError:  # pragma: no cover - fallback for environments without boto3
    boto3 = None


class S3Service:
    """Small reusable S3 helper for downloading documents into temporary files or streams."""

    def __init__(self, base_dir: Optional[str] = None) -> None:
        self.base_dir = Path(base_dir or tempfile.gettempdir()) / "sphereai-docs"
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def download_from_s3(self, bucket_name: str, key: str) -> bytes:
        if not bucket_name or not key:
            raise ValueError("bucket_name and key are required")
        if boto3 is None:
            raise RuntimeError("boto3 is not installed")

        client = boto3.client(
            "s3",
            region_name=os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
        response = client.get_object(Bucket=bucket_name, Key=key)
        body = response.get("Body")
        if body is None:
            raise RuntimeError("S3 object body was empty")
        return body.read()

    def download_to_tempfile(self, download_url: str, *, suffix: str = "") -> Path:
        if not download_url:
            raise ValueError("download_url is required")

        with urlopen(Request(download_url, headers={"User-Agent": "SphereAI-processor"}), timeout=30) as response:
            content = response.read()

        temp_path = self.base_dir / f"{abs(hash(download_url))}{suffix}"
        temp_path.write_bytes(content)
        return temp_path

    def download_to_stream(self, download_url: str) -> BinaryIO:
        if not download_url:
            raise ValueError("download_url is required")

        response = urlopen(Request(download_url, headers={"User-Agent": "SphereAI-processor"}), timeout=30)
        return response
