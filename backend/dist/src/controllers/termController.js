"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleTermLock = void 0;
exports.getTerms = getTerms;
exports.createTerm = createTerm;
exports.updateTerm = updateTerm;
exports.deleteTerm = deleteTerm;
const client_1 = require("../prisma/client");
// GET /api/admin/terms
async function getTerms(req, res) {
    try {
        const terms = await client_1.prisma.term.findMany({
            orderBy: { startDate: "desc" },
        });
        return res.json(terms);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch terms",
            error: error.message,
        });
    }
}
// POST /api/admin/terms
async function createTerm(req, res) {
    try {
        const { name, startDate, endDate, academicYear, classId } = req.body;
        if (!name || !startDate || !endDate || !academicYear) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        const term = await client_1.prisma.term.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                academicYear,
                classId: Number(classId),
            },
        });
        return res.status(201).json(term);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to create term",
            error: error.message,
        });
    }
}
// TOGGLE LOCK
const toggleTermLock = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const term = await client_1.prisma.term.findUnique({
            where: { id },
        });
        if (!term) {
            return res.status(404).json({
                message: "Term not found",
            });
        }
        const updated = await client_1.prisma.term.update({
            where: { id },
            data: {
                isLocked: !term.isLocked,
            },
        });
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to toggle term lock",
            error: error.message,
        });
    }
};
exports.toggleTermLock = toggleTermLock;
// UPDATE TERM
async function updateTerm(req, res) {
    try {
        const id = Number(req.params.id);
        const updated = await client_1.prisma.term.update({
            where: { id },
            data: req.body,
        });
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to update term",
            error: error.message,
        });
    }
}
// DELETE TERM
async function deleteTerm(req, res) {
    try {
        const id = Number(req.params.id);
        await client_1.prisma.term.delete({
            where: { id },
        });
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to delete term",
            error: error.message,
        });
    }
}
