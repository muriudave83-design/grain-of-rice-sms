import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/dashboard", authenticate, (req, res) => {
  res.json({
    message: "Welcome to the protected dashboard!",
    user: (req as any).user,
  });
});

export default router;
