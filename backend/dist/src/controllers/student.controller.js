"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHealth = exports.getStudentDetails = exports.addContactLog = exports.getStudentTranscript = void 0;
const client_1 = require("../prisma/client");
// ✅ EXISTING FUNCTION (UNCHANGED)
const getStudentTranscript = async (req, res) => {
    const studentId = Number(req.params.id);
    try {
        const transcripts = await client_1.prisma.transcript.findMany({
            where: { studentId },
            include: {
                entries: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(transcripts);
    }
    catch (err) {
        console.error("FETCH TRANSCRIPT ERROR:", err);
        res.status(500).json({ message: "Failed to fetch transcript" });
    }
};
exports.getStudentTranscript = getStudentTranscript;
// ✅ NEW FUNCTION — ADD THIS
const addContactLog = async (req, res) => {
    const studentId = Number(req.params.id);
    const { message } = req.body;
    // 🔒 VALIDATION
    if (!message) {
        return res.status(400).json({
            message: "Message is required",
        });
    }
    try {
        const log = await client_1.prisma.parentContactLog.create({
            data: {
                studentId,
                message,
                createdAt: new Date(), // ✅ TIMESTAMP
            },
        });
        res.status(201).json(log);
    }
    catch (err) {
        console.error("ADD CONTACT LOG ERROR:", err);
        res.status(500).json({
            message: "Failed to add contact log",
        });
    }
};
exports.addContactLog = addContactLog;
// ✅ (OPTIONAL BUT IMPORTANT) — FETCH DETAILS WITH LOGS
const getStudentDetails = async (req, res) => {
    const studentId = Number(req.params.id);
    try {
        // attendance count
        const attendance = await client_1.prisma.attendanceEntry.count({
            where: {
                studentId,
                status: "ABSENT",
            },
        });
        const present = await client_1.prisma.attendanceEntry.count({
            where: {
                studentId,
                status: "PRESENT",
            },
        });
        // logs
        const logs = await client_1.prisma.parentContactLog.findMany({
            where: { studentId },
            orderBy: { createdAt: "desc" }, // 🔥 IMPORTANT
        });
        res.json({
            present,
            absent: attendance,
            logs,
        });
    }
    catch (err) {
        console.error("GET STUDENT DETAILS ERROR:", err);
        res.status(500).json({
            message: "Failed to fetch student details",
        });
    }
};
exports.getStudentDetails = getStudentDetails;
const updateHealth = async (req, res) => {
    const studentId = Number(req.params.id);
    const { healthNotes } = req.body;
    try {
        await client_1.prisma.student.update({
            where: { id: studentId },
            data: {
                healthNotes,
            },
        });
        res.json({ message: "Health notes updated" });
    }
    catch (err) {
        console.error("UPDATE HEALTH ERROR:", err);
        res.status(500).json({ message: "Failed to update health notes" });
    }
};
exports.updateHealth = updateHealth;
