"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFinalForStudentsBulk = exports.computeFinalForStudent = void 0;
const client_1 = require("../prisma/client");
/**
 * Compute final score for a student for a specific subject
 */
const computeFinalForStudent = async (studentId, subjectId) => {
    const assessments = await client_1.prisma.assessment.findMany({
        where: { subjectId, isPublished: true },
        orderBy: { date: "asc" },
    });
    const details = [];
    let finalScore = 0;
    for (const a of assessments) {
        const scoreRow = await client_1.prisma.assessmentScore.findUnique({
            where: {
                assessmentId_studentId: {
                    assessmentId: a.id,
                    studentId,
                },
            },
        });
        const score = scoreRow?.score ?? null;
        // ✅ FIXED (safe max handling)
        const max = Number(a.maxScore) || 100;
        const percent = score !== null
            ? Number(score) / max
            : null;
        const contribution = percent !== null ? percent * a.weight : 0;
        details.push({
            assessmentId: a.id,
            title: a.title,
            date: a.date,
            maxScore: a.maxScore,
            weight: a.weight,
            score,
            percent,
            contribution,
            missing: score === null,
        });
        finalScore += contribution;
    }
    return {
        finalScore,
        assessmentCount: assessments.length,
        details,
    };
};
exports.computeFinalForStudent = computeFinalForStudent;
/**
 * Bulk computation for multiple students
 */
const computeFinalForStudentsBulk = async (studentIds, subjectId) => {
    const assessments = await client_1.prisma.assessment.findMany({
        where: { subjectId, isPublished: true },
        orderBy: { date: "asc" },
    });
    const scores = await client_1.prisma.assessmentScore.findMany({
        where: {
            studentId: { in: studentIds },
            assessment: { subjectId },
        },
    });
    const scoreMap = new Map();
    for (const s of scores) {
        scoreMap.set(`${s.studentId}_${s.assessmentId}`, s.score);
    }
    const result = {};
    for (const studentId of studentIds) {
        let finalScore = 0;
        let missingCount = 0;
        const details = [];
        for (const a of assessments) {
            const key = `${studentId}_${a.id}`;
            const score = scoreMap.get(key) ?? null;
            // ✅ FIXED (same logic here)
            const max = Number(a.maxScore) || 100;
            const percent = score !== null
                ? Number(score) / max
                : null;
            const contribution = percent !== null ? percent * a.weight : 0;
            if (score === null)
                missingCount++;
            details.push({
                assessmentId: a.id,
                title: a.title,
                date: a.date,
                maxScore: a.maxScore,
                weight: a.weight,
                score,
                percent,
                contribution,
                missing: score === null,
            });
            finalScore += contribution;
        }
        result[studentId] = {
            finalScore,
            assessmentCount: assessments.length,
            missingCount,
            details,
        };
    }
    return result;
};
exports.computeFinalForStudentsBulk = computeFinalForStudentsBulk;
