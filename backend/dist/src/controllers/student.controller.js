"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentTranscript = void 0;
const client_1 = require("../prisma/client");
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
