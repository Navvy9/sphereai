import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware";
import { getProfile, updateProfile } from "../controllers/user.controller";

const router = Router();

router.get("/profile", authMiddleware, getProfile);
router.patch("/profile", authMiddleware, updateProfile);

export default router;
