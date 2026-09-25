import { Request, Response } from "express";
import { generateS3Key, getSignedUploadUrl, getSignedDownloadUrl, deleteObject, BUCKET } from "../services/s3.service";
import { createDocument, listDocumentsByUser, getDocumentById, deleteDocumentById } from "../services/document.service";
import { uploadBuffer } from "../services/s3.service";
import { triggerDocumentProcessing } from "../services/processing.service";

export const getUploadUrl = async (req: Request, res: Response) => {
  try {
    const anyReq = req as any;
    const user = anyReq.userRecord;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { originalFileName, mimeType, fileSize } = req.body;
    if (!originalFileName || !mimeType || typeof fileSize !== "number") {
      return res.status(400).json({ message: "Missing file metadata" });
    }

    const key = generateS3Key(user.id, originalFileName);
    const uploadUrl = await getSignedUploadUrl(key, 900);
    return res.json({ uploadUrl, key });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Failed to generate upload URL" });
  }
};

export const createDocumentRecord = async (req: Request, res: Response) => {
  try {
    const anyReq = req as any;
    const user = anyReq.userRecord;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { s3Key, originalFileName, mimeType, fileSize } = req.body;
    if (!s3Key || !originalFileName || !mimeType || typeof fileSize !== "number") {
      return res.status(400).json({ message: "Missing fields" });
    }

    const doc = await createDocument({
      userId: user.id,
      fileName: originalFileName,
      originalFileName,
      mimeType,
      fileSize,
      s3Key,
      bucketName: BUCKET || undefined,
      processingStatus: "queued",
    });

    await triggerDocumentProcessing({
      documentId: doc.id,
      userId: doc.userId,
      fileName: doc.fileName,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      s3Key: doc.s3Key,
      bucketName: doc.bucketName || BUCKET || undefined,
    });

    return res.status(201).json(doc);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create document record" });
  }
};

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const anyReq = req as any;
    const user = anyReq.userRecord;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const result = await listDocumentsByUser(user.id, { page, limit });
    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Failed to list documents" });
  }
};

export const getDocument = async (req: Request, res: Response) => {
  try {
    const anyReq = req as any;
    const user = anyReq.userRecord;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const doc = await getDocumentById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.userId !== user.id) return res.status(403).json({ message: "Forbidden" });

    const downloadUrl = await getSignedDownloadUrl(doc.s3Key, 900);
    return res.json({ ...doc, downloadUrl });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Failed to get document" });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const anyReq = req as any;
    const user = anyReq.userRecord;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id);
    const doc = await getDocumentById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.userId !== user.id) return res.status(403).json({ message: "Forbidden" });

    await deleteObject(doc.s3Key);
    await deleteDocumentById(id);

    return res.json({ message: "Deleted" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete document" });
  }
};

// Dev helper: proxy upload through backend to avoid CORS during local testing
export const proxyUpload = async (req: Request, res: Response) => {
  try {
    const anyReq = req as any;
    const user = anyReq.userRecord;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // multer stores file on req.file
    const file: any = (req as any).file;
    console.debug("proxyUpload invoked, file present:", !!file, "user:", user?.email);
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const key = generateS3Key(user.id, file.originalname);
    // uploadBuffer expects (key, buffer, contentType)
    console.debug("Uploading to S3 key:", key, "buffer length:", file.buffer?.length);
    await uploadBuffer(key, file.buffer, file.mimetype, BUCKET || undefined);

    const doc = await createDocument({
      userId: user.id,
      fileName: file.originalname,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      s3Key: key,
      bucketName: BUCKET || undefined,
      processingStatus: "queued",
    });

    await triggerDocumentProcessing({
      documentId: doc.id,
      userId: doc.userId,
      fileName: doc.fileName,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      s3Key: doc.s3Key,
      bucketName: doc.bucketName || BUCKET || undefined,
    });

    return res.status(201).json(doc);
  } catch (err: any) {
    console.error("Proxy upload error:", err?.stack || err);
    // Dev-only: return error details to help debugging (do not expose in production)
    const payload: any = { message: "Proxy upload failed" };
    if (process.env.NODE_ENV !== "production") {
      payload.error = err?.message || String(err);
      payload.stack = err?.stack;
    }
    return res.status(500).json(payload);
  }
};
