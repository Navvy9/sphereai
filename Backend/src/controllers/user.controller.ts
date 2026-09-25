import { Request, Response } from "express";
import { updateUserByEmail } from "../services/user.service";

export const getProfile = (req: Request, res: Response) => {
  const anyReq = req as any;
  if (!anyReq.userRecord) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = anyReq.userRecord;
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  const anyReq = req as any;
  if (!anyReq.userRecord) {
    return res.status(404).json({ message: "User not found" });
  }

  const { name } = req.body;
  if (typeof name !== "string") {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const updated = await updateUserByEmail(anyReq.userRecord.email, {
      name,
    });
    return res.json(updated);
  } catch (err: any) {
    console.error("Failed to update user:", err?.message || err);
    return res.status(500).json({ message: "Failed to update user" });
  }
};
