"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const router = (0, express_1.Router)();
/**
 * GET /api/admin/classes/:classId/students
 * Returns all students in a specific class
 */
router.get("/classes/:classId/students", async (req, res) => {
    const classId = Number(req.params.classId);
    if (Number.isNaN(classId)) {
        return res.status(400).json({ message: "Invalid classId" });
    }
    try {
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            orderBy: { firstName: "asc" },
            include: {
                class: true,
                parentLinks: {
                    include: { parent: true },
                },
            },
        });
        res.json(students);
    }
    catch (err) {
        console.error("Failed to fetch class students:", err);
        res.status(500).json({ message: "Failed to fetch students" });
    }
});
exports.default = router;
