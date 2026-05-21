"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFee = exports.updateFee = exports.payFee = exports.createFee = exports.getFees = void 0;
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
const getFees = async (_req, res) => {
    const fees = await prisma_1.default.fee.findMany({
        include: { student: true },
        orderBy: {
            paid: "asc", // least paid first
        },
    });
    res.json(fees);
};
exports.getFees = getFees;
const createFee = async (req, res) => {
    console.log("🔥 CREATE FEE HIT");
    console.log("BODY:", req.body);
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    const { studentId, amount } = req.body;
    if (!studentId || !amount) {
        console.log("❌ Missing fields");
        return res.status(400).json({ error: "Missing fields" });
    }
    const fee = await prisma_1.default.fee.create({
        data: {
            studentId: Number(studentId),
            amount: Number(amount),
            paid: 0,
        },
    });
    console.log("✅ FEE CREATED:", fee);
    res.json(fee);
};
exports.createFee = createFee;
const payFee = async (req, res) => {
    const id = Number(req.params.id);
    const { amount } = req.body;
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }
    const fee = await prisma_1.default.fee.update({
        where: { id },
        data: {
            paid: { increment: Number(amount) },
        },
    });
    res.json(fee);
};
exports.payFee = payFee;
const updateFee = async (req, res) => {
    const id = Number(req.params.id);
    const { amount } = req.body;
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    const fee = await prisma_1.default.fee.update({
        where: { id },
        data: {
            amount: Number(amount),
        },
    });
    res.json(fee);
};
exports.updateFee = updateFee;
// 🔥 DELETE FEE
const deleteFee = async (req, res) => {
    const id = Number(req.params.id);
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    try {
        await prisma_1.default.fee.delete({
            where: { id },
        });
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete fee" });
    }
};
exports.deleteFee = deleteFee;
