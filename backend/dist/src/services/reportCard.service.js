"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportCardsForClass = generateReportCardsForClass;
const client_1 = require("../prisma/client");
async function generateReportCardsForClass({ classId, termId, }) {
    console.log("🚀 REPORT CARD GENERATION STARTED", { classId, termId });
    return client_1.prisma.$transaction(async (tx) => {
        /**
         * 1. Fetch students in class
         */
        const students = await tx.student.findMany({
            where: { classId },
            select: { id: true },
        });
        console.log("👩‍🎓 STUDENTS IN CLASS:", students.length);
        if (students.length === 0) {
            console.log("⚠️ No students found for class");
            return { generated: 0 };
        }
        const studentIds = students.map((s) => s.id);
        /**
         * 2. Fetch grades
         */
        const grades = await tx.grade.findMany({
            where: {
                studentId: { in: studentIds },
                termId,
            },
        });
        console.log("📊 GRADES FOUND:", grades.length);
        if (grades.length === 0) {
            console.log("⚠️ No grades found for report card generation");
            return { generated: 0 };
        }
        /**
         * 3. Group grades per student
         */
        const gradesByStudent = new Map();
        for (const g of grades) {
            if (!gradesByStudent.has(g.studentId)) {
                gradesByStudent.set(g.studentId, []);
            }
            gradesByStudent.get(g.studentId).push(g);
        }
        let generatedCount = 0;
        /**
         * 4. Generate report cards
         */
        for (const student of students) {
            const studentGrades = gradesByStudent.get(student.id);
            if (!studentGrades || studentGrades.length === 0) {
                console.log(`⚠️ Student ${student.id} has no grades`);
                continue;
            }
            /**
             * Check existing report card
             */
            const existing = await tx.reportCard.findUnique({
                where: {
                    studentId_termId: {
                        studentId: student.id,
                        termId,
                    },
                },
            });
            if (existing && existing.status === "PUBLISHED") {
                console.log(`⚠️ Report card already published for student ${student.id}`);
                continue;
            }
            /**
             * Compute totals
             */
            const total = studentGrades.reduce((sum, g) => sum + g.total, 0);
            const average = total / studentGrades.length;
            /**
             * Upsert report card
             */
            const reportCard = await tx.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId: student.id,
                        termId,
                    },
                },
                update: {
                    total,
                    average,
                    status: "GENERATED",
                },
                create: {
                    studentId: student.id,
                    classId,
                    termId,
                    total,
                    average,
                    status: "GENERATED",
                },
            });
            /**
             * Remove old subject entries
             */
            await tx.reportCardSubjectEntry.deleteMany({
                where: { reportCardId: reportCard.id },
            });
            /**
             * Insert subject entries
             */
            await tx.reportCardSubjectEntry.createMany({
                data: studentGrades.map((g) => ({
                    reportCardId: reportCard.id,
                    subjectId: g.subjectId,
                    total: g.total,
                    average: g.average,
                })),
            });
            console.log(`✅ Report card generated for student ${student.id}`);
            generatedCount++;
        }
        console.log(`🎯 FINAL REPORT CARDS GENERATED: ${generatedCount}`);
        return { generated: generatedCount };
    });
}
