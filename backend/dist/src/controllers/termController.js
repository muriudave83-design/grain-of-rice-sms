"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTerms = getTerms;
exports.createTerm = createTerm;
const client_1 = require("../prisma/client");
// GET /api/admin/terms
async function getTerms(req, res) {
    const terms = await client_1.prisma.term.findMany({
        orderBy: { startDate: "desc" },
    });
    res.json(terms);
}
// POST /api/admin/terms
async function createTerm(req, res) {
    const { name, startDate, endDate, academicYear, classId } = req.body;
    if (!name || !startDate || !endDate || !academicYear) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const term = await client_1.prisma.term.create({
        data: {
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            academicYear,
            classId: Number(classId), // ✅ ADD THIS
        },
    });
    res.status(201).json(term);
}
