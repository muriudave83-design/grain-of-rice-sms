"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSponsorship = exports.updateSponsorship = exports.createSponsorship = exports.getSponsorships = void 0;
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
const getSponsorships = async (_req, res) => {
    const data = await prisma_1.default.sponsorship.findMany({
        include: {
            student: true,
            sponsor: true,
        },
    });
    res.json(data);
};
exports.getSponsorships = getSponsorships;
const createSponsorship = async (req, res) => {
    const { studentId, sponsorName, type } = req.body;
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    if (!studentId || !sponsorName || !type) {
        return res.status(400).json({ error: "Missing fields" });
    }
    // Always create a new sponsor
    const sponsor = await prisma_1.default.sponsor.create({
        data: { name: sponsorName },
    });
    const sponsorship = await prisma_1.default.sponsorship.create({
        data: {
            studentId: Number(studentId),
            sponsorId: sponsor.id,
            type,
        },
    });
    res.json(sponsorship);
};
exports.createSponsorship = createSponsorship;
// ✅ UPDATE SPONSORSHIP
const updateSponsorship = async (req, res) => {
    const id = Number(req.params.id);
    const { type } = req.body;
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    const data = await prisma_1.default.sponsorship.update({
        where: { id },
        data: { type },
    });
    res.json(data);
};
exports.updateSponsorship = updateSponsorship;
// 🔥 DELETE SPONSORSHIP
const deleteSponsorship = async (req, res) => {
    const id = Number(req.params.id);
    // 🔒 LOCK CHECK
    if (await checkSystemLock(res))
        return;
    try {
        await prisma_1.default.sponsorship.delete({
            where: { id },
        });
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete sponsorship" });
    }
};
exports.deleteSponsorship = deleteSponsorship;
