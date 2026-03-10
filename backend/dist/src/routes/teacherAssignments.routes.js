"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
router.get("/teacher/assignments", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const teacherId = req.user.id;
        const assignments = await client_1.prisma.teacherSubject.findMany({
            where: {
                teacherId: teacherId,
            },
            include: {
                subject: true,
                class: true,
            },
        });
        res.json(assignments);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch teacher assignments",
        });
    }
});
exports.default = router;
