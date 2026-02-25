"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingAssignments = exports.getParentGradebook = exports.getGradebook = exports.submitAssessment = exports.setStudentScore = exports.createAssessment = void 0;
const client_1 = require("../prisma/client");
const client_2 = require("@prisma/client");
const missingAssignments_1 = require("../utils/missingAssignments");
/**
 * Create an assessment (DRAFT only)
 */
const createAssessment = async (req, res) => {
    try {
        console.log("BODY:", req.body);
        console.log("USER:", req.user);
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { subjectId, classId, termId, title, type, date, maxScore, weight, categoryId, } = req.body;
        // ✅ Required field validation
        if (!subjectId ||
            !classId ||
            !termId ||
            !title ||
            !type || // 🔥 REQUIRED
            !date ||
            !maxScore ||
            !categoryId) {
            return res.status(400).json({
                error: "Missing required fields",
            });
        }
        // Default weight to 0 if not provided
        const safeWeight = weight ?? 0;
        if (safeWeight < 0) {
            return res.status(400).json({
                error: "Weight cannot be negative",
            });
        }
        // ✅ Check total weight limit
        const existing = await client_1.prisma.assessment.aggregate({
            where: { subjectId, termId, classId },
            _sum: { weight: true },
        });
        const currentWeight = existing._sum.weight ?? 0;
        if (currentWeight + safeWeight > 1) {
            return res.status(400).json({
                error: `Weight limit exceeded. Current: ${currentWeight}, Adding: ${safeWeight}`,
            });
        }
        const assessment = await client_1.prisma.assessment.create({
            data: {
                subjectId: Number(subjectId),
                classId: Number(classId),
                termId: Number(termId),
                title,
                type, // ✅ Now guaranteed to exist
                date: new Date(date),
                maxScore: Number(maxScore),
                weight: safeWeight,
                status: client_2.AssessmentStatus.DRAFT,
                categoryId: Number(categoryId),
            },
        });
        res.json(assessment);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create assessment" });
    }
};
exports.createAssessment = createAssessment;
/**
 * Record a student's score (ONLY if assessment is DRAFT)
 */
const setStudentScore = async (req, res) => {
    try {
        const { assessmentId, studentId, score } = req.body;
        const assessment = await client_1.prisma.assessment.findUnique({
            where: { id: assessmentId },
        });
        if (!assessment) {
            return res.status(404).json({ error: "Assessment not found" });
        }
        if (assessment.status !== client_2.AssessmentStatus.DRAFT) {
            return res.status(409).json({
                error: "Assessment is submitted and cannot be modified",
            });
        }
        const record = await client_1.prisma.assessmentScore.upsert({
            where: {
                assessmentId_studentId: { assessmentId, studentId },
            },
            update: { score },
            create: { assessmentId, studentId, score },
        });
        await recalculateFinalGrade(studentId, assessmentId);
        res.json(record);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to set score" });
    }
};
exports.setStudentScore = setStudentScore;
/**
 * Submit assessment (LOCKS IT) — Teacher only, ownership enforced
 */
const submitAssessment = async (req, res) => {
    try {
        const assessmentId = Number(req.params.id);
        const teacherId = req.user.id;
        const assessment = await client_1.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                subject: true,
            },
        });
        if (!assessment) {
            return res.status(404).json({ message: "Assessment not found" });
        }
        console.log("❌ Authorization failed");
        if (assessment.subject.teacherId !== teacherId) {
            return res.status(403).json({ message: "Not authorized" });
        }
        if (assessment.status !== client_2.AssessmentStatus.DRAFT) {
            return res
                .status(400)
                .json({ message: "Assessment already submitted" });
        }
        await client_1.prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                status: client_2.AssessmentStatus.SUBMITTED,
            },
        });
        return res.json({ message: "Assessment submitted successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit assessment" });
    }
};
exports.submitAssessment = submitAssessment;
/**
 * Recalculate final grade (SAFE — only reads)
 */
const recalculateFinalGrade = async (studentId, assessmentId) => {
    const assessment = await client_1.prisma.assessment.findUnique({
        where: { id: assessmentId },
    });
    if (!assessment)
        return;
    const subjectId = assessment.subjectId;
    const termId = assessment.termId;
    const scores = await client_1.prisma.assessmentScore.findMany({
        where: {
            studentId,
            assessment: { subjectId },
        },
        include: { assessment: true },
    });
    let finalScore = 0;
    for (const record of scores) {
        if (!record.assessment.maxScore)
            continue;
        const percent = record.score / record.assessment.maxScore;
        finalScore += percent * record.assessment.weight;
    }
    await client_1.prisma.grade.upsert({
        where: {
            studentId_subjectId_termId: {
                studentId,
                subjectId,
                termId,
            },
        },
        update: {
            total: finalScore,
            average: finalScore,
        },
        create: {
            studentId,
            subjectId,
            termId,
            total: finalScore,
            average: finalScore,
        },
    });
};
/**
 * Teacher gradebook
 */
const getGradebook = async (req, res) => {
    const { subjectId } = req.params;
    const assessments = await client_1.prisma.assessment.findMany({
        where: { subjectId: Number(subjectId) },
        include: {
            scores: { include: { student: true } },
        },
        orderBy: { createdAt: "asc" },
    });
    res.json(assessments);
};
exports.getGradebook = getGradebook;
/**
 * Parent gradebook
 */
const getParentGradebook = async (req, res) => {
    const { studentId } = req.params;
    const assessments = await client_1.prisma.assessment.findMany({
        where: {
            scores: { some: { studentId: Number(studentId) } },
            status: client_2.AssessmentStatus.SUBMITTED,
        },
        include: {
            scores: { where: { studentId: Number(studentId) } },
        },
    });
    res.json(assessments);
};
exports.getParentGradebook = getParentGradebook;
/**
 * Missing assignments
 */
const getMissingAssignments = async (req, res) => {
    const { studentId } = req.params;
    const missing = await (0, missingAssignments_1.getMissingAssignmentsForStudent)(Number(studentId));
    res.json(missing);
};
exports.getMissingAssignments = getMissingAssignments;
