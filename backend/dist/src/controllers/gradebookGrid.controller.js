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
        // 1️⃣ Assessments for class + subject (includes categoryId)
        const assessments = await client_1.prisma.assessment.findMany({
            where: { classId, subjectId },
            orderBy: { id: "asc" },
            select: {
                id: true,
                title: true,
                maxScore: true,
                status: true,
                categoryId: true,
            },
        });
        // 2️⃣ Fetch categories with weights
        const categories = await client_1.prisma.assignmentCategory.findMany({
            select: {
                id: true,
                weight: true,
            },
        });
        // 3️⃣ Build category weight lookup map
        const categoryWeightMap = {};
        for (const c of categories) {
            categoryWeightMap[c.id] = c.weight;
        }
        // 4️⃣ Students in class
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            orderBy: { firstName: "asc" },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });
        // 5️⃣ Scores
        const assessmentIds = assessments.map((a) => a.id);
        const scores = assessmentIds.length > 0
            ? await client_1.prisma.assessmentScore.findMany({
                where: {
                    assessmentId: { in: assessmentIds },
                },
                select: {
                    assessmentId: true,
                    studentId: true,
                    score: true,
                },
            })
            : [];
        // 6️⃣ Build score map
        const scoreMap = {};
        for (const s of scores) {
            if (!scoreMap[s.studentId]) {
                scoreMap[s.studentId] = {};
            }
            scoreMap[s.studentId][String(s.assessmentId)] = s.score;
        }
        // 7️⃣ Build rows (E2 — Weighted category grading using raw scores)
        const studentRows = students.map((student) => {
            const studentScores = scoreMap[student.id] || {};
            const categoryBuckets = {};
            // group scores per category
            for (const assessment of assessments) {
                const score = studentScores[String(assessment.id)];
                if (score != null &&
                    assessment.categoryId) {
                    // ✅ Use raw score (no normalization)
                    const value = score;
                    if (!categoryBuckets[assessment.categoryId]) {
                        categoryBuckets[assessment.categoryId] = [];
                    }
                    categoryBuckets[assessment.categoryId].push(value);
                }
            }
            // compute weighted average
            let weightedTotal = 0;
            let totalWeightUsed = 0;
            for (const categoryId of Object.keys(categoryBuckets)) {
                const parsedCategoryId = parseInt(categoryId, 10);
                const values = categoryBuckets[parsedCategoryId];
                const weight = categoryWeightMap[parsedCategoryId] ?? 1;
                const categoryAverage = values.reduce((a, b) => a + b, 0) / values.length;
                weightedTotal += categoryAverage * weight;
                totalWeightUsed += weight;
            }
            const average = totalWeightUsed > 0
                ? Number((weightedTotal / totalWeightUsed).toFixed(2))
                : null;
            // 🔎 DEBUG LOGS
            console.log("WEIGHT MAP:", categoryWeightMap);
            console.log("CATEGORY BUCKETS:", categoryBuckets);
            console.log("WEIGHTED TOTAL:", weightedTotal);
            console.log("TOTAL WEIGHT USED:", totalWeightUsed);
            console.log("FINAL AVERAGE:", average);
            const missingCount = assessments.length - Object.keys(studentScores).length;
            return {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                scores: studentScores,
                average,
                missingCount,
            };
        });
        res.json({
            assessments,
            students: studentRows,
        });
    }
    catch (err) {
        console.error("Failed to build gradebook grid:", err);
        res.status(500).json({
            message: "Failed to load gradebook",
        });
    }
};
exports.getGradebookGrid = getGradebookGrid;
