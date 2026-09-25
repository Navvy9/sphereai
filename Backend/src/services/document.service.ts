import prisma from "./prisma.service";

export const createDocument = async (data: {
  userId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  bucketName?: string;
  processingStatus?: string;
  processor?: string | null;
  extractedText?: string | null;
  processingError?: string | null;
  processingStartedAt?: Date | null;
  processedAt?: Date | null;
  uploadedAt?: Date;
}) => {
  return prisma.document.create({ data });
};

export const listDocumentsByUser = async (
  userId: string,
  options?: { page?: number; limit?: number }
) => {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(100, options?.limit || 20));
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    prisma.document.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.document.count({ where: { userId } }),
  ]);

  return { docs, total, page, limit };
};

export const getDocumentById = async (id: string) => {
  return prisma.document.findUnique({ where: { id } });
};

export const deleteDocumentById = async (id: string) => {
  return prisma.document.delete({ where: { id } });
};
