"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const ownershipMiddleware_1 = require("../middlewares/ownershipMiddleware");
const student_controller_1 = require("../controllers/student.controller");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// ✅ TEST ROUTE (NO AUTH)
router.get("/test", (_req, res) => {
    res.json({ message: "student routes working ✅" });
});
// ✅ Student transcript route (TEMP: no ownership check)
router.get("/:id/transcript", authMiddleware_1.authenticate, student_controller_1.getStudentTranscript);
// Create student (Admin + Teacher)
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
        console.log("🔥 CREATE STUDENT ROUTE HIT");
        console.log("📦 RAW BODY:", req.body);
        let { firstName, lastName, classId, admissionNo, dob, userId } = req.body;
        // ✅ Normalize types (CRITICAL FIX)
        classId = classId ? Number(classId) : null;
        userId = userId ? Number(userId) : null;
        console.log("🔄 NORMALIZED:", {
            firstName,
            lastName,
            classId,
            admissionNo,
            dob,
            userId,
        });
        // ✅ VALIDATION (prevents 500 crashes)
        if (!firstName || !lastName) {
            return res.status(400).json({
                message: "firstName and lastName are required",
            });
        }
        if (!classId || isNaN(classId)) {
            return res.status(400).json({
                message: "Valid classId is required",
            });
        }
        if (!admissionNo) {
            return res.status(400).json({
                message: "admissionNo is required",
            });
        }
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                message: "Valid userId is required",
            });
        }
        // ✅ Check foreign keys BEFORE create (prevents Prisma crash)
        const existingClass = await prisma.class.findUnique({
            where: { id: classId },
        });
        if (!existingClass) {
            return res.status(400).json({
                message: "Class not found",
            });
        }
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!existingUser) {
            return res.status(400).json({
                message: "User not found",
            });
        }
        // ✅ Create student safely
        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                classId,
                admissionNo,
                dob: dob ? new Date(dob) : null,
                userId,
            },
        });
        console.log("✅ STUDENT CREATED:", student);
        res.status(201).json(student);
    }
    catch (err) {
        console.error("❌ CREATE STUDENT ERROR:");
        console.error("Message:", err.message);
        console.error("Meta:", err.meta);
        console.error("Stack:", err.stack);
        res.status(500).json({
            message: "Student creation failed",
            error: err.message,
            meta: err.meta || null,
        });
    }
});
// ✅ Get ALL students (EXCLUDES archived)
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            where: {
                isArchived: false,
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
                discipline: true,
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
// ✅ DELETE → ARCHIVE
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
// 🔥 GET STUDENT DETAILS (TERM AWARE)
router.get("/:id/details", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
        const studentId = Number(req.params.id);
        const termId = req.query.termId
            ? Number(req.query.termId)
            : null;
        if (Number.isNaN(studentId)) {
            return res.status(400).json({
                message: "Invalid student id",
            });
        }
        // ✅ ATTENDANCE (TERM AWARE)
        const attendance = await prisma.attendanceEntry.findMany({
            where: {
                studentId,
                ...(termId
                    ? {
                        session: {
                            termId,
                        },
                    }
                    : {}),
            },
            select: {
                status: true,
            },
        });
        const present = attendance.filter((a) => a.status === "PRESENT").length;
        const absent = attendance.filter((a) => a.status === "ABSENT").length;
        // ✅ PARENT LOGS
        const logs = await prisma.parentContactLog.findMany({
            where: { studentId },
            orderBy: {
                createdAt: "desc",
            },
        });
        // ✅ DISCIPLINE (TERM AWARE)
        const discipline = await prisma.discipline.findMany({
            where: {
                studentId,
                ...(termId
                    ? {
                        termId,
                    }
                    : {}),
            },
            include: {
                term: true,
            },
            orderBy: {
                date: "desc",
            },
        });
        // ✅ HEALTH NOTES
        const student = await prisma.student.findUnique({
            where: {
                id: studentId,
            },
            select: {
                healthNotes: true,
            },
        });
        // ✅ RESPONSE
        res.json({
            present,
            absent,
            logs,
            discipline,
            healthNotes: student?.healthNotes || "",
        });
    }
    catch (error) {
        console.error("DETAILS ERROR:", error);
        res.status(500).json({
            message: "Failed to load student details",
        });
    }
});
// ✅ UPDATE HEALTH NOTES (NEW ROUTE — RIGHT AFTER DETAILS)
router.put("/:id/health", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), student_controller_1.updateHealth);
// 🔥 ADD PARENT CONTACT LOG
router.post("/:id/contact-log", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN", "TEACHER"]), async (req, res) => {
    try {
        const studentId = Number(req.params.id);
        const { message } = req.body;
        if (Number.isNaN(studentId)) {
            return res.status(400).json({
                message: "Invalid student id",
            });
        }
        if (!message || message.trim() === "") {
            return res.status(400).json({
                message: "Message is required",
            });
        }
        const log = await prisma.parentContactLog.create({
            data: {
                studentId,
                message: message.trim(),
                createdAt: new Date(),
            },
        });
        res.status(201).json(log);
    }
    catch (error) {
        console.error("CREATE LOG ERROR:", error);
        res.status(500).json({
            message: "Failed to create contact log",
        });
    }
});
// 🔥 BULK CREATE STUDENTS FROM CSV
router.post("/bulk", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    const rows = req.body;
    if (!Array.isArray(rows)) {
        return res.status(400).json({
            message: "Invalid data format",
        });
    }
    let created = 0;
    let failed = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            let { firstName, lastName, admissionNo, className, parentName, } = row;
            // ✅ NORMALIZE INPUT
            firstName = firstName?.trim();
            lastName = lastName?.trim();
            admissionNo = admissionNo?.trim();
            className = className?.trim();
            parentName = parentName?.trim();
            // ✅ VALIDATION (aligned with system rules)
            if (!firstName || !admissionNo || !className) {
                failed++;
                errors.push({
                    row: i + 1,
                    message: "Missing required fields (firstName, admissionNo, className)",
                });
                continue;
            }
            // 🔥 NORMALIZE CLASS NAME (THE FIX)
            const normalizedClassName = className
                ?.trim()
                .toUpperCase()
                .replace(/\s+/g, " ")
                .replace(/GRADE(\d+)/, "GRADE $1");
            // 🔍 FIND CLASS USING NORMALIZED VALUE
            let cls = await prisma.class.findFirst({
                where: {
                    name: normalizedClassName,
                },
            });
            // ➕ AUTO-CREATE CLEAN CLASS NAME ONLY
            if (!cls) {
                cls = await prisma.class.create({
                    data: {
                        name: normalizedClassName,
                    },
                });
                console.log(`✅ Created new class: ${normalizedClassName}`);
            }
            // ✅ CHECK DUPLICATE ADMISSION NUMBER
            const existing = await prisma.student.findFirst({
                where: { admissionNo },
            });
            if (existing) {
                failed++;
                errors.push({
                    row: i + 1,
                    message: `Admission number already exists: ${admissionNo}`,
                });
                continue;
            }
            // ✅ OPTIONAL: FIND PARENT
            let parentId = null;
            if (parentName) {
                const parent = await prisma.parent.findFirst({
                    where: {
                        name: {
                            equals: parentName,
                            mode: "insensitive",
                        },
                    },
                });
                if (parent) {
                    parentId = parent.id;
                }
            }
            // ✅ CREATE STUDENT WITH CORRECT RELATION
            const student = await prisma.student.create({
                data: {
                    firstName,
                    lastName: lastName || "",
                    admissionNo,
                    classId: cls.id, // 🔥 THIS IS THE FIX
                },
            });
            // ✅ LINK PARENT
            if (parentId) {
                await prisma.parentStudent.create({
                    data: {
                        studentId: student.id,
                        parentId,
                    },
                });
            }
            created++;
        }
        catch (err) {
            failed++;
            errors.push({
                row: i + 1,
                message: err.message || "Unknown error",
            });
        }
    }
    return res.json({
        created,
        failed,
        errors,
    });
});
exports.default = router;
