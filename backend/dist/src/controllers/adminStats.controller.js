"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = void 0;
const client_1 = require("../prisma/client");
const getAdminStats = async (req, res) => {
    try {
        const students = await client_1.prisma.student.count();
        const teachers = await client_1.prisma.user.count({
            where: { role: "TEACHER" }
        });
        const parents = await client_1.prisma.user.count({
            where: { role: "PARENT" }
        });
        const classes = await client_1.prisma.class.count();
        res.json({
            students,
            teachers,
            parents,
            classes
        });
    }
    catch (err) {
        console.error("Admin stats error:", err);
        res.status(500).json({ message: "Failed to load stats" });
    }
};
exports.getAdminStats = getAdminStats;
