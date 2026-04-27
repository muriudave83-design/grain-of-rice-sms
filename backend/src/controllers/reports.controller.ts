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

// ✅ Grade helper
const getGrade = (avg: number) => {
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
};

// 🔥 NEW: SAVE COMMENT
export const saveReportComment = async (req: Request, res: Response) => {
  try {
    const { studentId, teacherSubjectId, comment } = req.body;

    if (!studentId || !teacherSubjectId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await prisma.reportComment.upsert({
      where: {
        studentId_teacherSubjectId: {
          studentId: Number(studentId),
          teacherSubjectId: Number(teacherSubjectId),
        },
      },
      update: {
        comment,
      },
      create: {
        studentId: Number(studentId),
        teacherSubjectId: Number(teacherSubjectId),
        comment,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Save comment error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
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

    // 🔥 INCLUDE COMMENTS
    const report = await Promise.all(
      subjects.map(async (ts) => {
        const studentAverages = studentsInClass.map((s) => {
          const avg = calculateStudentAverage(s.id, ts.assignments);
          return {
            studentId: s.id,
            avg,
          };
        });

        studentAverages.sort((a, b) => b.avg - a.avg);

        const position =
          studentAverages.findIndex(
            (s) => s.studentId === Number(studentId)
          ) + 1;

        const current = studentAverages.find(
          (s) => s.studentId === Number(studentId)
        );

        const avg = current?.avg || 0;

        // ✅ FETCH COMMENT
        const existingComment = await prisma.reportComment.findUnique({
          where: {
            studentId_teacherSubjectId: {
              studentId: Number(studentId),
              teacherSubjectId: ts.id,
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
      })
    );

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

    overallAverages.sort((a, b) => b.avg - a.avg);

    const overallPosition =
      overallAverages.findIndex(
        (s) => s.studentId === Number(studentId)
      ) + 1;

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating report" });
  }
};