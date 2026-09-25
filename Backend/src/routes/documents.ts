import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware";
import {
  getUploadUrl,
  createDocumentRecord,
  listDocuments,
  getDocument,
  deleteDocument,
  proxyUpload,
} from "../controllers/document.controller";

// multer is CJS; require it to avoid interop issues during ts-node-dev runtime
const multer = require("multer");

const router = Router();

// Generate a presigned upload URL
router.post("/upload-url", authMiddleware, getUploadUrl);

// After uploading to S3, create metadata record
router.post("/", authMiddleware, createDocumentRecord);

// Dev-only: proxy upload to bypass CORS in local environments
// Ensure memory storage so uploaded file is available as `file.buffer`
const upload = multer({ storage: multer.memoryStorage() });
router.post("/proxy", authMiddleware, upload.single("file"), proxyUpload);

router.get("/", authMiddleware, listDocuments);
router.get("/:id", authMiddleware, getDocument);
router.delete("/:id", authMiddleware, deleteDocument);

export default router;
