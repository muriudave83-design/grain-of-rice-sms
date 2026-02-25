"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradebookGrid = void 0;
const client_1 = require("../prisma/client");
const getGradebookGrid = async (req, res) => {
    try {
        const classId = Number(req.query.classId);
        const subjectId = Number(req.query.subjectId);
        if (!classId || !subjectId) {
            return res.status(400).json({
                message: "classId and subjectId required",
            });
        }
        // 1️⃣ Get assessments with category + weight
        const assessments = await client_1.prisma.assessment.findMany({
            where: { classId, subjectId },
            orderBy: { id: "asc" },
            include: {
                category: {
                    select: {
                        id: true,
                        weight: true,
                    },
                },
            },
        });
        // Normalize assessment data
        const normalizedAssessments = assessments.map((a) => ({
            id: a.id,
            title: a.title,
            maxScore: a.maxScore,
            categoryId: a.category?.id ?? 0,
            categoryWeight: a.category?.weight ?? 1, // default weight
        }));
        // 2️⃣ Get students in this class
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            orderBy: { firstName: "asc" },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });
        // 3️⃣ Get all scores for these assessments
        const assessmentIds = normalizedAssessments.map((a) => a.id);
        const scores = await client_1.prisma.assessmentScore.findMany({
            where: {
                assessmentId: { in: assessmentIds },
            },
            select: {
                assessmentId: true,
                studentId: true,
                score: true,
            },
        });
        // 4️⃣ Build score map: { studentId: { assessmentId: score } }
        const scoreMap = {};
        for (const s of scores) {
            if (!scoreMap[s.studentId]) {
                scoreMap[s.studentId] = {};
            }
            scoreMap[s.studentId][s.assessmentId] = s.score;
        }
        // 5️⃣ Build student rows with weighted averages
        const studentRows = students.map((student) => {
            const studentScores = scoreMap[student.id] || {};
            // Build category-based averages
            const categoryMap = {};
            // Loop through each assessment
            for (const assessment of normalizedAssessments) {
                const score = studentScores[assessment.id];
                if (score === undefined)
                    continue;
                const categoryId = assessment.categoryId;
                const weight = assessment.categoryWeight;
                if (!categoryMap[categoryId]) {
                    categoryMap[categoryId] = {
                        total: 0,
                        count: 0,
                        weight,
                    };
                }
                categoryMap[categoryId].total += score;
                categoryMap[categoryId].count += 1;
            }
            // Compute weighted average
            let weightedTotal = 0;
            let totalWeight = 0;
            for (const cat of Object.values(categoryMap)) {
                if (cat.count === 0)
                    continue;
                const avg = cat.total / cat.count;
                weightedTotal += avg * cat.weight;
                totalWeight += cat.weight;
            }
            const average = totalWeight > 0
                ? (weightedTotal / totalWeight).toFixed(1)
                : null;
            return {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                scores: studentScores,
                average,
            };
        });
        // 6️⃣ Return grid data
        return res.json({
            assessments: normalizedAssessments,
            students: studentRows,
        });
    }
    catch (err) {
        console.error("Failed to build gradebook grid:", err);
        return res.status(500).json({
            message: "Failed to load gradebook",
        });
    }
};
exports.getGradebookGrid = getGradebookGrid;
