"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentsByClass = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getStudentsByClass = async (req, res) => {
    try {
        const classId = Number(req.params.id);
        const students = await prisma_1.default.student.findMany({
            where: {
                classId: classId,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNo: true,
            }
        });
        res.json(students);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch students" });
    }
};
exports.getStudentsByClass = getStudentsByClass;
