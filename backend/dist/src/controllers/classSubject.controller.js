"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClassSubject = exports.listClassSubjects = void 0;
const client_1 = require("../prisma/client");
/**
 * GET /api/admin/class-subjects
 * List all class-subject assignments
 */
const listClassSubjects = async (_req, res) => {
    try {
        const data = await client_1.prisma.classSubject.findMany({
            include: {
                class: true,
                subject: true,
            },
            orderBy: { id: "asc" },
        });
        res.json(data);
    }
    catch (err) {
        console.error("Failed to list class-subjects:", err);
        res.status(500).json({ message: "Failed to fetch assignments" });
    }
};
exports.listClassSubjects = listClassSubjects;
/**
 * POST /api/admin/class-subjects
 * Assign subject to class
 */
const createClassSubject = async (req, res) => {
    try {
        const { classId, subjectId } = req.body;
        if (!classId || !subjectId) {
            return res.status(400).json({ message: "Missing classId or subjectId" });
        }
        // Prevent duplicates
        const existing = await client_1.prisma.classSubject.findFirst({
            where: { classId, subjectId },
        });
        if (existing) {
            return res
                .status(409)
                .json({ message: "Subject already assigned to this class" });
        }
        const record = await client_1.prisma.classSubject.create({
            data: { classId, subjectId },
            include: {
                class: true,
                subject: true,
            },
        });
        res.status(201).json(record);
    }
    catch (err) {
        console.error("Failed to assign subject to class:", err);
        res.status(500).json({ message: "Failed to assign subject" });
    }
};
exports.createClassSubject = createClassSubject;
