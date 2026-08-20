import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";
import { getGradeDescription } from "../utils/gradeDescriptions";

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

// 🔥 SAVE COMMENT
export const saveReportComment = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId, teacherSubjectId, termId, comment } = req.body;

    if (!studentId || !teacherSubjectId || !termId) {
      return res.status(400).json({
        message: "Missing fields",
      });
    }

    const teacherSubject = await prisma.teacherSubject.findFirst({
      where: { id: Number(teacherSubjectId), teacherId: req.user!.id },
      select: { classId: true },
    });
    if (!teacherSubject) {
      return res.status(403).json({ message: "Not authorized for this subject" });
    }

    const [student, term] = await Promise.all([
      prisma.student.findFirst({
        where: { id: Number(studentId), classId: teacherSubject.classId, isArchived: false },
        select: { id: true },
      }),
      prisma.term.findFirst({
        where: { id: Number(termId), classId: teacherSubject.classId },
        select: { id: true },
      }),
    ]);
    if (!student || !term) {
      return res.status(400).json({ message: "Student or term does not belong to this class" });
    }

    await prisma.reportComment.upsert({
      where: {
        studentId_teacherSubjectId_termId: {
          studentId: Number(studentId),
          teacherSubjectId: Number(teacherSubjectId),
          termId: Number(termId)
        },
      },

      update: {
        comment,
      },

      create: {
        studentId: Number(studentId),
        teacherSubjectId: Number(teacherSubjectId),
        termId: Number(termId),
        comment,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Save comment error:", err);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getStudentReport = async (
  req: Request,
  res: Response
) => {
  const { studentId } = req.params;

  try {
    const student = await prisma.student.findUnique({
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

    const user = req.user!;
    if (user.role === "STUDENT" && student.userId !== user.id) {
      return res.status(403).json({ message: "Not allowed to view this student" });
    }
    if (user.role === "TEACHER") {
      const assigned = await prisma.teacherSubject.findFirst({
        where: { teacherId: user.id, classId: student.classId },
        select: { id: true },
      });
      if (!assigned) return res.status(403).json({ message: "Not assigned to this class" });
    }
    if (user.role === "PARENT") {
      const linked = await prisma.parentStudent.findFirst({
        where: { studentId: student.id, parent: { userId: user.id } },
        select: { id: true },
      });
      if (!linked) return res.status(403).json({ message: "Not linked to this student" });
    }

    const studentsInClass =
      await prisma.student.findMany({
        where: {
          classId: student.classId,
        },
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

      return totalWeight > 0
        ? total / totalWeight
        : 0;
    };

    // 🔥 INCLUDE COMMENTS
    const report = await Promise.all(
      subjects.map(async (ts) => {
        const studentAverages =
          studentsInClass.map((s) => {
            const avg =
              calculateStudentAverage(
                s.id,
                ts.assignments
              );

            return {
              studentId: s.id,
              avg,
            };
          });

        studentAverages.sort(
          (a, b) => b.avg - a.avg
        );

        const position =
          studentAverages.findIndex(
            (s) =>
              s.studentId === Number(studentId)
          ) + 1;

        const current = studentAverages.find(
          (s) =>
            s.studentId === Number(studentId)
        );

        const avg = current?.avg || 0;

        // ✅ FETCH COMMENT
        const existingComment =
          await prisma.reportComment.findUnique({
            where: {
              studentId_teacherSubjectId_termId: {
                studentId: Number(studentId),
                teacherSubjectId: ts.id,
                termId: 0
              },
            },
          });

        const grade = getGrade(avg);
        return {
          teacherSubjectId: ts.id,
          subject: ts.subject.name,
          average: Number(avg.toFixed(1)),
          grade,
          gradeDescription: getGradeDescription(grade),
          position,
          totalStudents:
            studentAverages.length,
          comment:
            existingComment?.comment || "",
        };
      })
    );

    const overallAverages =
      studentsInClass.map((s) => {
        let total = 0;

        report.forEach((subj) => {
          const ts = subjects.find(
            (t) =>
              t.subject.name === subj.subject
          );

          const avg =
            calculateStudentAverage(
              s.id,
              ts?.assignments || []
            );

          total += avg;
        });

        const overall =
          subjects.length > 0
            ? total / subjects.length
            : 0;

        return {
          studentId: s.id,
          avg: overall,
        };
      });

    overallAverages.sort(
      (a, b) => b.avg - a.avg
    );

    const overallPosition =
      overallAverages.findIndex(
        (s) =>
          s.studentId === Number(studentId)
      ) + 1;

    res.json({
      studentId: student.id,

      student: `${student.firstName} ${student.lastName}`
        .replace(/\s+/g, " ")
        .trim(),

      class: student.class.name,

      subjects: report,

      overallPosition,

      totalStudents:
        overallAverages.length,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Error generating report",
    });
  }
};
