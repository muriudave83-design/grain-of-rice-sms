"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportCards = generateReportCards;
const client_1 = require("../prisma/client");
const client_2 = require("@prisma/client");
async function generateReportCards(termId, classId) {
    const students = await client_1.prisma.student.findMany({
        where: { classId },
    });
    for (const student of students) {
        const reportCard = await client_1.prisma.reportCard.upsert({
            where: {
                studentId_termId: {
                    studentId: student.id,
                    termId: termId,
                },
            },
            update: {},
            create: {
                studentId: student.id,
                termId: termId,
                classId: classId,
                status: client_2.ReportCardStatus.GENERATED,
                average: 0,
                total: 0,
            },
        });
        const grades = await client_1.prisma.grade.findMany({
            where: {
                studentId: student.id,
                termId: termId,
            },
        });
        for (const grade of grades) {
            await client_1.prisma.reportCardSubjectEntry.upsert({
                where: {
                    reportCardId_subjectId: {
                        reportCardId: reportCard.id,
                        subjectId: grade.subjectId,
                    },
                },
                update: {
                    average: grade.average,
                    total: grade.total,
                },
                create: {
                    reportCardId: reportCard.id,
                    subjectId: grade.subjectId,
                    average: grade.average,
                    total: grade.total,
                },
            });
        }
        const entries = await client_1.prisma.reportCardSubjectEntry.findMany({
            where: { reportCardId: reportCard.id },
        });
        const total = entries.reduce((sum, e) => sum + (e.average ?? 0), 0);
        const average = entries.length > 0 ? total / entries.length : 0;
        await client_1.prisma.reportCard.update({
            where: { id: reportCard.id },
            data: {
                total,
                average,
                generatedAt: new Date(),
            },
        });
    }
}
