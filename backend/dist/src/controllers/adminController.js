"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetUserPassword = exports.unlinkStudentFromParent = exports.linkStudentToParent = exports.archiveParent = exports.updateParent = exports.getParentById = exports.getParents = exports.createParent = exports.exportStudentsCSV = void 0;
const sync_1 = require("csv-stringify/sync");
const client_1 = require("../prisma/client");
/**
 * Export students as CSV
 */
const exportStudentsCSV = async (req, res) => {
    try {
        const students = await client_1.prisma.student.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNo: true,
                class: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { id: "asc" },
        });
        const records = students.map((s) => [
            s.id,
            s.firstName,
            s.lastName,
            s.admissionNo,
            s.class?.name ?? "",
        ]);
        const header = ["id", "firstName", "lastName", "admissionNo", "className"];
        const csv = (0, sync_1.stringify)([header, ...records]);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="students.csv"');
        res.send(csv);
    }
    catch (err) {
        console.error("exportStudentsCSV error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.exportStudentsCSV = exportStudentsCSV;
/**
 * ✅ Create Parent (NOW USES Parent TABLE)
 */
const createParent = async (req, res) => {
    console.log("🔥 CREATE PARENT BODY:", req.body);
    try {
        const { name, email, phone, address, city, relationship, notes } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name required" });
        }
        const newParent = await client_1.prisma.parent.create({
            data: {
                name,
                email,
                phone,
                address,
                city,
                relationship,
                notes,
            },
        });
        return res.status(201).json(newParent);
    }
    catch (error) {
        console.error("💥 CREATE PARENT ERROR:", error);
        return res.status(500).json({
            message: "Failed to create parent",
            error: error.message,
        });
    }
};
exports.createParent = createParent;
/**
 * ✅ GET ALL PARENTS (FIXED — USES JUNCTION + DEEP INCLUDE)
 */
const getParents = async (req, res) => {
    try {
        const parents = await client_1.prisma.parent.findMany({
            include: {
                students: {
                    include: {
                        student: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const formatted = parents.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone || "",
            address: p.address || "",
            city: p.city || "",
            relationship: p.relationship || "",
            notes: p.notes || "",
            childrenCount: p.students.length,
            children: p.students.map((ps) => ({
                id: ps.student.id,
                firstName: ps.student.firstName,
                lastName: ps.student.lastName,
            })),
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error("GET PARENTS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getParents = getParents;
/**
 * ✅ GET SINGLE PARENT
 */
const getParentById = async (req, res) => {
    try {
        const id = String(req.params.id);
        const parent = await client_1.prisma.parent.findUnique({
            where: { id },
            include: {
                students: {
                    include: {
                        student: true,
                    },
                },
            },
        });
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }
        res.json(parent);
    }
    catch (error) {
        console.error("GET PARENT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getParentById = getParentById;
/**
 * ✅ UPDATE PARENT
 */
const updateParent = async (req, res) => {
    try {
        const id = String(req.params.id);
        const { name, email, phone, address, city, relationship, notes } = req.body;
        const updated = await client_1.prisma.parent.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                city,
                relationship,
                notes,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("UPDATE PARENT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateParent = updateParent;
/**
 * ✅ ARCHIVE PARENT (SOFT DELETE STYLE)
 */
const archiveParent = async (req, res) => {
    try {
        const id = String(req.params.id);
        await client_1.prisma.parent.delete({
            where: { id },
        });
        res.json({ message: "Parent deleted" });
    }
    catch (error) {
        console.error("ARCHIVE ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.archiveParent = archiveParent;
/**
 * ✅ LINK STUDENT TO PARENT
 */
const linkStudentToParent = async (req, res) => {
    try {
        const { studentId, parentId } = req.body;
        if (!studentId || !parentId) {
            return res.status(400).json({ message: "studentId and parentId required" });
        }
        const existing = await client_1.prisma.parentStudent.findUnique({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId,
                },
            },
        });
        if (existing) {
            return res.status(400).json({ message: "Already linked" });
        }
        const link = await client_1.prisma.parentStudent.create({
            data: {
                parentId,
                studentId,
            },
        });
        res.status(201).json(link);
    }
    catch (error) {
        console.error("LINK ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.linkStudentToParent = linkStudentToParent;
/**
 * 🔥 NEW — UNLINK STUDENT FROM PARENT
 */
const unlinkStudentFromParent = async (req, res) => {
    try {
        const { parentId, studentId } = req.body;
        if (!parentId || !studentId) {
            return res.status(400).json({ message: "Missing parentId or studentId" });
        }
        await client_1.prisma.parentStudent.deleteMany({
            where: {
                parentId: String(parentId), // ✅ KEEP STRING
                studentId: Number(studentId), // ✅ STUDENT IS NUMBER
            },
        });
        return res.json({ message: "Student unlinked successfully" });
    }
    catch (error) {
        console.error("UNLINK ERROR:", error);
        return res.status(500).json({ message: "Failed to unlink student" });
    }
};
exports.unlinkStudentFromParent = unlinkStudentFromParent;
/**
 * ✅ Reset User Password (UNCHANGED)
 */
const resetUserPassword = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        await client_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: "123456",
                mustChangePassword: true,
            },
        });
        return res.json({ message: "Password reset" });
    }
    catch (err) {
        console.error("RESET PASSWORD ERROR:", err);
        return res.status(500).json({
            message: "Failed to reset password",
        });
    }
};
exports.resetUserPassword = resetUserPassword;
