import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, (req, res) => {
  const anyReq = req as any;
  if (!anyReq.userRecord) return res.status(404).json({ message: "User not found" });

  const user = anyReq.userRecord;
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  });
});

export default router;
