"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const ownershipMiddleware_1 = require("../middlewares/ownershipMiddleware");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Create student (Admin + Teacher)
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
        console.log("🔥 student route hit");
        console.log("📦 BODY:", req.body);
        const { firstName, lastName, classId, admissionNo, dob, userId } = req.body;
        // ✅ HARD VALIDATION (CRITICAL)
        if (!classId) {
            return res.status(400).json({ message: "classId is required" });
        }
        if (!admissionNo) {
            return res.status(400).json({ message: "admissionNo is required" });
        }
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                classId: Number(classId),
                admissionNo,
                dob: dob ? new Date(dob) : null,
                userId: Number(userId),
            },
        });
        res.status(201).json(student);
    }
    catch (err) {
        console.error("❌ ERROR:", err);
        res.status(500).json({
            message: err.message,
            meta: err.meta || null,
        });
    }
});
// ✅ Get ALL students (EXCLUDES archived)
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            where: {
                isArchived: false, // ✅ added
            },
            orderBy: { id: "asc" },
            include: {
                class: true,
                user: true,
                parentLinks: {
                    include: {
                        parent: true,
                    },
                },
            },
        });
        res.json(students);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
// ✅ Get ARCHIVED students
router.get("/archived", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            where: {
                isArchived: true,
            },
            include: {
                class: true,
            },
        });
        res.json(students);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch archived students" });
    }
});
// Get student (RBAC ownership check)
router.get("/:id", authMiddleware_1.authenticate, ownershipMiddleware_1.authorizeStudentAccess, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                class: true,
                user: true,
                parentLinks: {
                    include: {
                        parent: true,
                    },
                },
                guardians: { include: { user: true } },
                sponsorships: { include: { sponsor: true } },
                enrollments: { include: { subject: true } },
                grades: true,
                invoices: true,
                disciplines: true,
            },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json(student);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
// ✅ DELETE → ARCHIVE (safe delete)
router.delete("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        await prisma.student.update({
            where: { id: Number(req.params.id) },
            data: { isArchived: true },
        });
        res.json({ message: "Student archived" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to archive student" });
    }
});
// ✅ RESTORE student
router.put("/:id/restore", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        await prisma.student.update({
            where: { id: Number(req.params.id) },
            data: { isArchived: false },
        });
        res.json({ message: "Student restored" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Restore failed" });
    }
});
exports.default = router;
