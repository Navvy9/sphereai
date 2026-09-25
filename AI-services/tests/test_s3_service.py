import tempfile
import unittest
from unittest.mock import MagicMock, patch

import app.services.s3_service as s3_service_module
from app.services.s3_service import S3Service


class S3ServiceTests(unittest.TestCase):
    @patch.object(s3_service_module, "boto3")
    def test_download_from_s3_uses_bucket_and_key(self, mock_boto3):
        mock_client = MagicMock()
        mock_response = {"Body": MagicMock(read=MagicMock(return_value=b"hello-from-s3"))}
        mock_client.get_object.return_value = mock_response
        mock_boto3.client.return_value = mock_client

        service = S3Service(base_dir=tempfile.gettempdir())
        content = service.download_from_s3("demo-bucket", "docs/hello.txt")

        self.assertEqual(content, b"hello-from-s3")
        mock_boto3.client.assert_called_once()
        mock_client.get_object.assert_called_once_with(Bucket="demo-bucket", Key="docs/hello.txt")


if __name__ == "__main__":
    unittest.main()
