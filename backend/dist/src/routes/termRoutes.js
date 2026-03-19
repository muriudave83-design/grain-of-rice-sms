"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const termController_1 = require("../controllers/termController");
const router = (0, express_1.Router)();
/**
 * GET /api/terms
 * Get all terms
 * Access: ADMIN only
 */
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), termController_1.getTerms);
/**
 * POST /api/terms
 * Create new term
 * Access: ADMIN only
 */
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), termController_1.createTerm);
exports.default = router;
