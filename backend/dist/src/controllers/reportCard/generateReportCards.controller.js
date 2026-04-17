"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportCards = generateReportCards;
const client_1 = require("../../prisma/client");
const client_2 = require("@prisma/client");
const gradeInput_service_1 = require("../../services/reportCard/gradeInput.service");
/**
 * POST /report-cards/generate
 */
async function generateReportCards(req, res) {
    try {
        const { termId, classId, options } = req.body ?? {};
        const strict = options?.strict === true;
        const force = options?.force === true;
        if (!termId || !classId) {
            return res
                .status(400)
                .json({ message: "termId and classId are required" });
        }
        /* ----------------------------------------------------
           1️⃣ Validate term
        ---------------------------------------------------- */
        const term = await client_1.prisma.term.findUnique({
            where: { id: Number(termId) },
        });
        if (!term) {
            return res.status(400).json({ message: "Invalid termId" });
        }
        /* ----------------------------------------------------
           2️⃣ Validate class
        ---------------------------------------------------- */
        const klass = await client_1.prisma.class.findUnique({
            where: { id: Number(classId) },
        });
        if (!klass) {
            return res.status(400).json({ message: "Invalid classId" });
        }
        /* ----------------------------------------------------
           3️⃣ Resolve students via AssessmentScore
        ---------------------------------------------------- */
        const scores = await client_1.prisma.assessmentScore.findMany({
            where: {
                assessment: {
                    classId: Number(classId),
                    termId: Number(termId),
                },
            },
            select: { studentId: true },
            distinct: ["studentId"],
        });
        if (scores.length === 0) {
            return res.status(400).json({
                message: "No students with assessments found for this class & term",
            });
        }
        const studentIds = scores.map(s => s.studentId);
        /* ----------------------------------------------------
           4️⃣ Force / conflict handling
        ---------------------------------------------------- */
        if (force) {
            await client_1.prisma.reportCard.deleteMany({
                where: {
                    termId: Number(termId),
                    classId: Number(classId),
                    status: client_2.ReportCardStatus.GENERATED,
                },
            });
        }
        else {
            const existingDrafts = await client_1.prisma.reportCard.count({
                where: {
                    termId: Number(termId),
                    classId: Number(classId),
                    status: client_2.ReportCardStatus.GENERATED,
                },
            });
            if (existingDrafts > 0) {
                return res.status(409).json({
                    message: "Draft report cards already exist. Use options.force=true to regenerate.",
                });
            }
        }
        const warnings = [];
        const createdReportCardIds = [];
        /* ----------------------------------------------------
           5️⃣ Main transaction
        ---------------------------------------------------- */
        await client_1.prisma.$transaction(async (tx) => {
            for (const studentId of studentIds) {
                const gradeInputs = await (0, gradeInput_service_1.fetchGradeInputs)(studentId, Number(termId), Number(classId));
                const subjectsMap = new Map();
                for (const input of gradeInputs) {
                    const sid = Number(input.subjectId);
                    if (!subjectsMap.has(sid))
                        subjectsMap.set(sid, []);
                    subjectsMap.get(sid).push(input);
                }
                const subjectFinals = {};
                for (const [subjectId, inputs] of subjectsMap.entries()) {
                    const result = (0, gradeInput_service_1.computeSubjectFinalScore)(inputs);
                    const teacherId = inputs[0]?.teacherId;
                    if (!teacherId) {
                        warnings.push({
                            studentId,
                            subjectId,
                            reason: "missing teacher assignment",
                        });
                        if (strict)
                            continue;
                    }
                    subjectFinals[subjectId] = {
                        total: result.finalScore,
                        average: result.finalScore,
                        missingScores: result.missingScores,
                        status: result.status,
                        teacherId,
                    };
                    if (result.missingScores) {
                        warnings.push({
                            studentId,
                            subjectId,
                            reason: "missing scores",
                        });
                        if (strict) {
                            subjectFinals[subjectId].status = "incomplete";
                        }
                    }
                }
                /* ------------------------------------------------
                   🔧 ADAPTER for legacy computeStudentTotals
                ------------------------------------------------ */
                const subjectFinalsForTotals = {};
                for (const [subjectId, entry] of Object.entries(subjectFinals)) {
                    subjectFinalsForTotals[Number(subjectId)] = {
                        finalScore: entry.total,
                        status: entry.status,
                        missingScores: entry.missingScores,
                    };
                }
                const totals = (0, gradeInput_service_1.computeStudentTotals)(subjectFinalsForTotals);
                const hasIncomplete = Object.values(subjectFinals).some(s => s.status === "incomplete");
                if (strict && hasIncomplete) {
                    warnings.push({
                        studentId,
                        reason: "strict mode: incomplete subjects; skipped",
                    });
                    continue;
                }
                /* ------------------------------------------------
                   Create ReportCard
                ------------------------------------------------ */
                const reportCard = await tx.reportCard.create({
                    data: {
                        studentId,
                        termId: Number(termId),
                        classId: Number(classId),
                        total: totals.total ?? 0,
                        average: totals.average ?? 0,
                        status: client_2.ReportCardStatus.GENERATED,
                    },
                });
                createdReportCardIds.push(reportCard.id);
                /* ------------------------------------------------
                   Create Subject Entries
                ------------------------------------------------ */
                for (const [subjectId, entry] of Object.entries(subjectFinals)) {
                    await tx.reportCardSubjectEntry.create({
                        data: {
                            reportCardId: reportCard.id,
                            subjectId: Number(subjectId),
                            total: entry.total ?? 0,
                            average: entry.average ?? 0,
                        },
                    });
                }
            }
            /* ------------------------------------------------
               6️⃣ Dense ranking
            ------------------------------------------------ */
            const reportCards = await tx.reportCard.findMany({
                where: {
                    termId: Number(termId),
                    classId: Number(classId),
                    status: client_2.ReportCardStatus.GENERATED,
                },
                select: {
                    id: true,
                    total: true,
                    average: true,
                    studentId: true,
                },
            });
            reportCards.sort((a, b) => {
                if ((b.total ?? 0) !== (a.total ?? 0)) {
                    return (b.total ?? 0) - (a.total ?? 0);
                }
                if ((b.average ?? 0) !== (a.average ?? 0)) {
                    return (b.average ?? 0) - (a.average ?? 0);
                }
                return a.studentId - b.studentId;
            });
            let lastScore = null;
            for (const rc of reportCards) {
                if (lastScore === null || rc.total !== lastScore) {
                    lastScore = rc.total;
                }
            }
        });
        return res.status(201).json({
            message: "Report cards generated successfully",
            termId: Number(termId),
            classId: Number(classId),
            createdCount: createdReportCardIds.length,
            warnings,
        });
    }
    catch (error) {
        console.error("generateReportCards error:", error);
        return res.status(500).json({
            message: "An error occurred while generating report cards",
            error: error.message,
        });
    }
}
