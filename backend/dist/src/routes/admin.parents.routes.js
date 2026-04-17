"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
/**
 * 👪 GET ALL PARENTS
 * GET /api/admin/parents
 */
router.get("/parents", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.getParents);
/**
 * 👪 CREATE PARENT
 * POST /api/admin/parents
 */
router.post("/parents", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.createParent);
/**
 * 👪 GET SINGLE PARENT
 */
router.get("/parents/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.getParentById);
/**
 * 👪 UPDATE PARENT
 */
router.put("/parents/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.updateParent);
/**
 * 👪 DELETE / ARCHIVE PARENT
 */
router.delete("/parents/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.archiveParent);
/**
 * 🔗 LINK STUDENT TO PARENT
 * POST /api/admin/link-student
 */
router.post("/link-student", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.linkStudentToParent);
/**
 * ❌ UNLINK STUDENT FROM PARENT (🔥 NEW)
 * DELETE /api/admin/unlink-student
 */
router.delete("/unlink-student", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.unlinkStudentFromParent);
exports.default = router;
