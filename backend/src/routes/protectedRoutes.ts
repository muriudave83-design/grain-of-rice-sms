import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { reportCardReadRoutes } from "./reportCardReadRoutes";

const router = Router();

// ✅ Namespace report routes properly
router.use("/report-cards", authenticate, reportCardReadRoutes);

// ✅ Protected dashboard test route
router.get("/dashboard", authenticate, (req, res) => {
  res.json({
    message: "Welcome to the protected dashboard!",
    user: (req as any).user,
  });
});

export default router;