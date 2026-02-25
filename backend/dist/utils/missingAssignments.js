"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingAssignmentsForStudent = void 0;
const client_1 = require("../prisma/client");
const getMissingAssignmentsForStudent = async (studentId) => {
    const enrollments = await client_1.prisma.enrollment.findMany({
        where: { studentId },
        include: { subject: true },
    });
    const missing = [];
    for (const enroll of enrollments) {
        const assessments = await client_1.prisma.assessment.findMany({
            where: {
                subjectId: enroll.subjectId,
                isPublished: true,
            },
        });
        for (const a of assessments) {
            const score = await client_1.prisma.assessmentScore.findUnique({
                where: {
                    assessmentId_studentId: {
                        assessmentId: a.id,
                        studentId,
                    },
                },
            });
            if (!score) {
                missing.push({
                    subject: enroll.subject.name,
                    assessmentTitle: a.title,
                    date: a.date,
                });
            }
        }
    }
    return missing;
};
exports.getMissingAssignmentsForStudent = getMissingAssignmentsForStudent;
