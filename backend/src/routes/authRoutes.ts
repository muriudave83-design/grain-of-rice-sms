import { Router } from "express";
import {
  registerUser,
  loginUser,
  changePassword,
} from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// ======================================================
// AUTH — REGISTER
// POST /api/auth/register
// ======================================================
router.post("/register", registerUser);

// ======================================================
// AUTH — LOGIN
// POST /api/auth/login
// ======================================================
router.post("/login", loginUser);

// ======================================================
// AUTH — CURRENT USER
// GET /api/auth/me
// ======================================================
router.get("/me", authenticate, (req, res) => {
  return res.json(req.user);
});

// ======================================================
// AUTH — CHANGE PASSWORD
// PATCH /api/auth/change-password
// ======================================================
router.patch(
  "/change-password",
  changePassword
);

export default router;
