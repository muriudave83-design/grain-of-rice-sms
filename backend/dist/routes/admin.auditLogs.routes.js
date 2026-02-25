"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_auditLogs_controller_1 = require("../controllers/admin.auditLogs.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const router = (0, express_1.Router)();
/**
 * GET /admin/audit-logs
 * Admin-only audit log read access
 */
router.get("/audit-logs", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), admin_auditLogs_controller_1.getAuditLogs);
exports.default = router;
