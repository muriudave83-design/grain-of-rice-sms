"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/dashboardRoutes.ts
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_1 = require("@prisma/client");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.get("/health", dashboardController_1.healthCheck);
// Teacher dashboard (teachers + admin allowed)
router.get("/teacher", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER]), dashboardController_1.teacherDashboard);
// Admin dashboard (admins only)
router.get("/admin", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), dashboardController_1.adminDashboard);
// Admin-only student list
router.get("/students", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), dashboardController_1.listAllStudents);
// Export students CSV (admin only)
router.get("/admin/export/students.csv", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), adminController_1.exportStudentsCSV);
// Subjects (publicish - any authenticated user can view)
router.get("/subjects", authMiddleware_1.authenticate, dashboardController_1.listAllSubjects);
exports.default = router;
