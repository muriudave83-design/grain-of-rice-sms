"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const termController_1 = require("../controllers/termController");
const router = (0, express_1.Router)();
/**
 * GET /api/terms
 * Get all terms
 * Access: ADMIN + TEACHER
 */
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), termController_1.getTerms);
/**
 * POST /api/terms
 * Create new term
 * Access: ADMIN only
 */
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), termController_1.createTerm);
/**
 * VALIDATE TERM
 * GET /api/terms/validate
 */
router.get("/validate", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const classId = Number(req.query.classId);
        const name = String(req.query.term);
        const term = await client_1.prisma.term.findFirst({
            where: {
                classId,
                name,
            },
        });
        // TERM NOT CONFIGURED
        if (!term) {
            return res.json({
                status: "missing",
                message: "This term has not been configured yet.",
            });
        }
        // TERM LOCKED
        if (term.isLocked) {
            return res.json({
                status: "locked",
                message: "This term is locked.",
            });
        }
        // VALID
        return res.json({
            status: "valid",
            message: "Term is active.",
            term,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to validate term",
        });
    }
});
/**
 * PUT /api/terms/:id/lock
 * Toggle term lock
 * Access: ADMIN only
 */
router.put("/:id/lock", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), termController_1.toggleTermLock);
router.put("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), termController_1.updateTerm);
router.delete("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), termController_1.deleteTerm);
exports.default = router;
