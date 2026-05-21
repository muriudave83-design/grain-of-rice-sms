"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDiscipline = exports.updateDiscipline = exports.addDiscipline = exports.getDiscipline = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// 🔒 GLOBAL LOCK CHECK
const checkSystemLock = async (res) => {
    const locked = await prisma_1.default.term.findFirst({
        where: { isLocked: true },
    });
    if (locked) {
        res.status(400).json({ message: "System locked" });
        return true;
    }
    return false;
};
const getDiscipline = async (req, res) => {
    const termId = Number(req.query.termId);
    const data = await prisma_1.default.discipline.findMany({
        where: termId
            ? {
                termId,
            }
            : undefined,
        include: {
            student: true,
            term: true,
        },
        orderBy: { date: "desc" },
    });
    res.json(data);
};
exports.getDiscipline = getDiscipline;
const addDiscipline = async (req, res) => {
    const { studentId, type, note, termId } = req.body;
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    if (!studentId || !type) {
        return res.status(400).json({ error: "Missing fields" });
    }
    const record = await prisma_1.default.discipline.create({
        data: {
            studentId: Number(studentId),
            type,
            notes: note || "",
            termId: termId ? Number(termId) : null,
        },
    });
    res.json(record);
};
exports.addDiscipline = addDiscipline;
// ✅ UPDATE DISCIPLINE
const updateDiscipline = async (req, res) => {
    const id = Number(req.params.id);
    const { type, note } = req.body;
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    const record = await prisma_1.default.discipline.update({
        where: { id },
        data: {
            type,
            notes: note || "",
        },
    });
    res.json(record);
};
exports.updateDiscipline = updateDiscipline;
// 🔥 DELETE DISCIPLINE
const deleteDiscipline = async (req, res) => {
    const id = Number(req.params.id);
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    try {
        await prisma_1.default.discipline.delete({
            where: { id },
        });
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete record" });
    }
};
exports.deleteDiscipline = deleteDiscipline;
