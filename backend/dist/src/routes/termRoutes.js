"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const rolesMiddleware_js_1 = require("../middlewares/rolesMiddleware.js");
const termController_js_1 = require("../controllers/termController.js");
const router = (0, express_1.Router)();
/**
 * GET /api/terms
 * Get all terms
 * Access: ADMIN only
 */
router.get("/", authMiddleware_js_1.authenticate, (0, rolesMiddleware_js_1.requireRole)(["ADMIN"]), termController_js_1.getTerms);
/**
 * POST /api/terms
 * Create new term
 * Access: ADMIN only
 */
router.post("/", authMiddleware_js_1.authenticate, (0, rolesMiddleware_js_1.requireRole)(["ADMIN"]), termController_js_1.createTerm);
exports.default = router;
