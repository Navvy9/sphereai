import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./user";
import documentsRoutes from "./documents";

const router = Router();

router.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to SphereAI Backend!" });
});

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/documents", documentsRoutes);

export default router;