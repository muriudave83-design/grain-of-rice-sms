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
        const { firstName, lastName, classId, admissionNo, dob } = req.body;
        if (!classId) {
            return res.status(400).json({ message: "classId is required" });
        }
        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                classId: Number(classId),
                admissionNo,
                dob: dob ? new Date(dob) : null,
            },
        });
        res.status(201).json(student);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
// Get student (RBAC ownership check)
router.get("/:id", authMiddleware_1.authenticate, ownershipMiddleware_1.authorizeStudentAccess, async (req, res) => {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({
        where: { id },
        include: {
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
});
exports.default = router;
