import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { reportCardReadRoutes } from "./reportCardRoutes";

const router = Router();

// ✅ Mount report card routes
router.use("/", reportCardReadRoutes);

// Existing test route
router.get("/dashboard", authenticate, (req, res) => {
  res.json({
    message: "Welcome to the protected dashboard!",
    user: (req as any).user,
  });
});

export default router;