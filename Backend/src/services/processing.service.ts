import prisma from "./prisma.service";
import { getSignedDownloadUrl } from "./s3.service";

const PROCESSING_SERVICE_URL = process.env.DOCUMENT_PROCESSING_SERVICE_URL || "http://127.0.0.1:8001";

export interface ProcessingRequestPayload {
  documentId?: string;
  userId?: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  s3Key?: string;
  bucketName?: string;
  downloadUrl?: string;
}

export async function triggerDocumentProcessing(payload: ProcessingRequestPayload) {
  const documentId = payload.documentId;
  console.log("[processing] Starting processing for document", { documentId, fileName: payload.fileName, mimeType: payload.mimeType, s3Key: payload.s3Key });

  if (documentId) {
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: "processing",
          processingStartedAt: new Date(),
          processingError: null,
        },
      });
      console.log("[processing] Marked document as processing", { documentId });
    } catch (error) {
      console.error("[processing] Failed to mark document as processing:", error);
    }
  }

  try {
    const processingPayload: ProcessingRequestPayload & { downloadUrl?: string; source: string } = {
      ...payload,
      source: "node-backend",
    };

    if (!processingPayload.downloadUrl && processingPayload.s3Key) {
      const bucketName = processingPayload.bucketName || process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || process.env.BUCKET;
      try {
        processingPayload.downloadUrl = await getSignedDownloadUrl(processingPayload.s3Key, 900, bucketName || undefined);
      } catch (downloadError: any) {
        console.error("Failed to create signed download URL for processing request:", downloadError?.message || downloadError);
      }
    }

    console.log("[processing] Calling AI service", { url: `${PROCESSING_SERVICE_URL}/process`, documentId, s3Key: processingPayload.s3Key });
    const response = await fetch(`${PROCESSING_SERVICE_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(processingPayload),
    });

    const result = await response.json().catch(() => null);
    console.log("[processing] AI service response", { documentId, status: response.status, result });

    if (!response.ok) {
      const message = result?.detail || result?.message || `Processing service returned ${response.status}`;
      throw new Error(message);
    }

    if (documentId) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            processingStatus: result?.status === "processed" ? "completed" : "failed",
            processor: result?.processor || null,
            extractedText: result?.extractedText || null,
            processingError: result?.warnings?.length ? result.warnings.join("; ") : null,
            processedAt: new Date(),
          },
        });
        console.log("[processing] Updated document with processing result", { documentId, processor: result?.processor, extractedTextLength: result?.extractedText?.length || 0 });
      } catch (updateError) {
        console.error("[processing] Failed to update document with processing result:", updateError);
      }
    }

    return result;
  } catch (error: any) {
    console.error("[processing] Document processing request failed:", error?.message || error);

    if (documentId) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            processingStatus: "failed",
            processingError: error?.message || "Processing failed",
            processedAt: new Date(),
          },
        });
        console.log("[processing] Marked document as failed", { documentId });
      } catch (dbError) {
        console.error("[processing] Failed to mark document as failed:", dbError);
      }
    }

    return null;
  }
}
