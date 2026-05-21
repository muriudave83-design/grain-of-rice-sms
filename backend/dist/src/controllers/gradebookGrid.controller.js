"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradebookGrid = void 0;
const client_1 = require("../prisma/client");
const client_2 = require("@prisma/client");
const getGradebookGrid = async (req, res) => {
    try {
        const classId = Number(req.query.classId);
        const subjectId = Number(req.query.subjectId);
        const termId = Number(req.query.termId);
        if (!classId || !subjectId || !termId) {
            return res.status(400).json({
                message: "classId, subjectId and termId are required",
            });
        }
        // 1️⃣ Assessments for class + subject + term
        const assessments = await client_1.prisma.assessment.findMany({
            where: { classId, subjectId, termId },
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
                name: true,
            },
        });
        // 3️⃣ Students in class
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            orderBy: { firstName: "asc" },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });
        // 4️⃣ Scores
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
        // 5️⃣ Build score map
        const scoreMap = {};
        for (const s of scores) {
            if (!scoreMap[s.studentId]) {
                scoreMap[s.studentId] = {};
            }
            scoreMap[s.studentId][String(s.assessmentId)] = s.score;
        }
        // Filter only published assessments for missing count
        const activeAssessments = assessments.filter((a) => a.status === client_2.AssessmentStatus.SUBMITTED);
        // 6️⃣ Build rows
        const studentRows = students.map((student) => {
            const studentScores = scoreMap[student.id] || {};
            const categoryBuckets = {};
            // group normalized scores per category
            for (const assessment of assessments) {
                const score = studentScores[String(assessment.id)];
                if (score != null &&
                    assessment.categoryId &&
                    assessment.maxScore > 0) {
                    const value = score / assessment.maxScore;
                    if (!categoryBuckets[assessment.categoryId]) {
                        categoryBuckets[assessment.categoryId] = [];
                    }
                    categoryBuckets[assessment.categoryId].push(value);
                }
            }
            // ✅ NEW: compute weighted average (no inflation)
            let weightedTotal = 0;
            let activeWeightTotal = 0;
            const missingCategories = [];
            for (const category of categories) {
                const categoryId = category.id;
                const values = categoryBuckets[categoryId] || [];
                const weight = (category.weight ?? 0) / 100;
                if (!weight)
                    continue;
                // Ignore completely ungraded categories
                if (values.length === 0) {
                    missingCategories.push(categoryId);
                    continue;
                }
                const categoryAverage = values.reduce((a, b) => a + b, 0) / values.length;
                weightedTotal += categoryAverage * weight;
                activeWeightTotal += weight;
            }
            const average = activeWeightTotal > 0
                ? Number((weightedTotal / activeWeightTotal).toFixed(2))
                : null;
            // better missing count (only published)
            const missingCount = activeAssessments.length -
                activeAssessments.filter((a) => studentScores[String(a.id)] != null).length;
            return {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                scores: studentScores,
                average,
                missingCount,
                missingCategories, // 👈 NEW
            };
        });
        res.json({
            assessments,
            students: studentRows,
            categories,
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
