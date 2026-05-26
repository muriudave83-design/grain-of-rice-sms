"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentReport = exports.saveReportComment = void 0;
const client_1 = require("../prisma/client");
// ✅ Grade helper
const getGrade = (avg) => {
    if (avg >= 80)
        return "A";
    if (avg >= 70)
        return "B";
    if (avg >= 60)
        return "C";
    if (avg >= 50)
        return "D";
    return "F";
};
// 🔥 SAVE COMMENT
const saveReportComment = async (req, res) => {
    try {
        const { studentId, teacherSubjectId, comment } = req.body;
        if (!studentId || !teacherSubjectId) {
            return res.status(400).json({
                message: "Missing fields",
            });
        }
        await client_1.prisma.reportComment.upsert({
            where: {
                studentId_teacherSubjectId_termId: {
                    studentId: Number(studentId),
                    teacherSubjectId: Number(teacherSubjectId),
                    termId: 0
                },
            },
            update: {
                comment,
            },
            create: {
                studentId: Number(studentId),
                teacherSubjectId: Number(teacherSubjectId),
                termId: null,
                comment,
            },
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error("Save comment error:", err);
        res.status(500).json({
            message: "Something went wrong",
        });
    }
};
exports.saveReportComment = saveReportComment;
const getStudentReport = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await client_1.prisma.student.findUnique({
            where: {
                id: Number(studentId),
            },
            include: {
                class: true,
            },
        });
        if (!student) {
            return res.status(404).json({
                message: "Student not found",
            });
        }
        const studentsInClass = await client_1.prisma.student.findMany({
            where: {
                classId: student.classId,
            },
        });
        const subjects = await client_1.prisma.teacherSubject.findMany({
            where: {
                classId: student.classId,
            },
            include: {
                subject: true,
                assignments: {
                    include: {
                        scores: true,
                    },
                },
            },
        });
        const calculateStudentAverage = (studentId, assignments) => {
            let total = 0;
            let totalWeight = 0;
            assignments.forEach((a) => {
                const scoreObj = a.scores.find((s) => s.studentId === studentId);
                if (!scoreObj)
                    return;
                const weight = a.weight || 1;
                total += scoreObj.score * weight;
                totalWeight += weight;
            });
            return totalWeight > 0
                ? total / totalWeight
                : 0;
        };
        // 🔥 INCLUDE COMMENTS
        const report = await Promise.all(subjects.map(async (ts) => {
            const studentAverages = studentsInClass.map((s) => {
                const avg = calculateStudentAverage(s.id, ts.assignments);
                return {
                    studentId: s.id,
                    avg,
                };
            });
            studentAverages.sort((a, b) => b.avg - a.avg);
            const position = studentAverages.findIndex((s) => s.studentId === Number(studentId)) + 1;
            const current = studentAverages.find((s) => s.studentId === Number(studentId));
            const avg = current?.avg || 0;
            // ✅ FETCH COMMENT
            const existingComment = await client_1.prisma.reportComment.findUnique({
                where: {
                    studentId_teacherSubjectId_termId: {
                        studentId: Number(studentId),
                        teacherSubjectId: ts.id,
                        termId: 0
                    },
                },
            });
            return {
                teacherSubjectId: ts.id,
                subject: ts.subject.name,
                average: Number(avg.toFixed(1)),
                grade: getGrade(avg),
                position,
                totalStudents: studentAverages.length,
                comment: existingComment?.comment || "",
            };
        }));
        const overallAverages = studentsInClass.map((s) => {
            let total = 0;
            report.forEach((subj) => {
                const ts = subjects.find((t) => t.subject.name === subj.subject);
                const avg = calculateStudentAverage(s.id, ts?.assignments || []);
                total += avg;
            });
            const overall = subjects.length > 0
                ? total / subjects.length
                : 0;
            return {
                studentId: s.id,
                avg: overall,
            };
        });
        overallAverages.sort((a, b) => b.avg - a.avg);
        const overallPosition = overallAverages.findIndex((s) => s.studentId === Number(studentId)) + 1;
        res.json({
            studentId: student.id,
            student: `${student.firstName} ${student.lastName}`
                .replace(/\s+/g, " ")
                .trim(),
            class: student.class.name,
            subjects: report,
            overallPosition,
            totalStudents: overallAverages.length,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Error generating report",
        });
    }
};
exports.getStudentReport = getStudentReport;
