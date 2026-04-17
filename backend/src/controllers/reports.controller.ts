import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";

type TeacherSubjectWithRelations = Prisma.TeacherSubjectGetPayload<{
  include: {
    subject: true;
    assignments: {
      include: {
        scores: true;
      };
    };
  };
}>;

// ✅ Grade helper (UPDATED: uses F)
const getGrade = (avg: number) => {
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
};

export const getStudentReport = async (req: Request, res: Response) => {
  const { studentId } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: {
        class: true,
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // ✅ STEP 1 — GET ALL STUDENTS IN CLASS
    const studentsInClass = await prisma.student.findMany({
      where: { classId: student.classId },
    });

    const subjects: TeacherSubjectWithRelations[] =
      await prisma.teacherSubject.findMany({
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

    // ✅ STEP 2 — HELPER FUNCTION
    const calculateStudentAverage = (
      studentId: number,
      assignments: any[]
    ) => {
      let total = 0;
      let totalWeight = 0;

      assignments.forEach((a) => {
        const scoreObj = a.scores.find(
          (s: any) => s.studentId === studentId
        );

        if (!scoreObj) return;

        const weight = a.weight || 1;

        total += scoreObj.score * weight;
        totalWeight += weight;
      });

      return totalWeight > 0 ? total / totalWeight : 0;
    };

    // ✅ STEP 3 — SUBJECT RANKING
    const report = subjects.map((ts) => {
      // 1. Compute averages for ALL students
      const studentAverages = studentsInClass.map((s) => {
        const avg = calculateStudentAverage(s.id, ts.assignments);
        return {
          studentId: s.id,
          avg,
        };
      });

      // 2. Sort descending
      studentAverages.sort((a, b) => b.avg - a.avg);

      // 3. Find current student's position
      const position =
        studentAverages.findIndex(
          (s) => s.studentId === Number(studentId)
        ) + 1;

      // 4. Current student's avg
      const current = studentAverages.find(
        (s) => s.studentId === Number(studentId)
      );

      const avg = current?.avg || 0;

      return {
        subject: ts.subject.name,
        average: Number(avg.toFixed(1)),
        grade: getGrade(avg),
        position,
        totalStudents: studentAverages.length,
      };
    });

    // ✅ STEP 4 — OVERALL RANKING
    const overallAverages = studentsInClass.map((s) => {
      let total = 0;

      report.forEach((subj) => {
        const ts = subjects.find(
          (t) => t.subject.name === subj.subject
        );

        const avg = calculateStudentAverage(s.id, ts?.assignments || []);
        total += avg;
      });

      const overall =
        subjects.length > 0 ? total / subjects.length : 0;

      return {
        studentId: s.id,
        avg: overall,
      };
    });

    // 2. Sort
    overallAverages.sort((a, b) => b.avg - a.avg);

    // 3. Find position
    const overallPosition =
      overallAverages.findIndex(
        (s) => s.studentId === Number(studentId)
      ) + 1;

    // ✅ FINAL RESPONSE
    res.json({
      student: `${student.firstName} ${student.lastName}`
        .replace(/\s+/g, " ")
        .trim(),
      class: student.class.name,
      subjects: report,
      overallPosition,
      totalStudents: overallAverages.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating report" });
  }
};