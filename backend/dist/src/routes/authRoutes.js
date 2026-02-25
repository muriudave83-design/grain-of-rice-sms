"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// ======================================================
// AUTH — REGISTER
// POST /api/auth/register
// ======================================================
router.post("/register", authController_1.registerUser);
// ======================================================
// AUTH — LOGIN
// POST /api/auth/login
// ======================================================
router.post("/login", authController_1.loginUser);
// ======================================================
// AUTH — CURRENT USER
// GET /api/auth/me
// ======================================================
router.get("/me", authMiddleware_1.authenticate, (req, res) => {
    return res.json(req.user);
});
// ======================================================
// CHANGE PASSWORD
// POST /api/auth/change-password
// ======================================================
router.post("/change-password", authMiddleware_1.authenticate, authController_1.changePassword);
exports.default = router;
