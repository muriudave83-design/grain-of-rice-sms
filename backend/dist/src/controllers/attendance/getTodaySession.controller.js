"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodaySession = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const getTodaySession = async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const session = await prisma_1.default.attendanceSession.findFirst({
            where: {
                classId,
                date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });
        if (!session) {
            return res.status(404).json({ message: "No session today" });
        }
        return res.status(200).json(session);
    }
    catch (error) {
        console.error("Get today session error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getTodaySession = getTodaySession;
