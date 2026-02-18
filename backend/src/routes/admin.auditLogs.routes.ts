import { Router } from "express";
import { getAuditLogs } from "../controllers/admin.auditLogs.controller";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";

const router = Router();

/**
 * GET /admin/audit-logs
 * Admin-only audit log read access
 */
router.get(
  "/audit-logs",
  authenticate,
  requireRole(["ADMIN"]),
  getAuditLogs
);

export default router;
