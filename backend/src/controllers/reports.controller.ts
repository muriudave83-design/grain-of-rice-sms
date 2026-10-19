import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";
import { getGradeDescription, getLetterGrade } from "../utils/gradeDescriptions";
import {
  compareAndSetReportComment,
  hasRequiredPrecondition,
  lockCommentWriteScope,
  SavePreconditionError,
  validateLockedCommentScope,
} from "../services/optimisticSave.service";

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
  return getLetterGrade(avg) ?? "F";
};

// 🔥 SAVE COMMENT
export const saveReportComment = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId, teacherSubjectId, termId, comment, expectedUpdatedAt } = req.body;

    if (!studentId || !teacherSubjectId || !termId) {
      return res.status(400).json({
        message: "Missing fields",
      });
    }
    if (!hasRequiredPrecondition(req.body, "expectedUpdatedAt")) {
      return res.status(428).json({ message: "expectedUpdatedAt precondition is required" });
    }

    const saved = await prisma.$transaction(async (tx) => {
      validateLockedCommentScope(
        await lockCommentWriteScope(tx, Number(teacherSubjectId), Number(termId), Number(studentId)),
        req.user!.id,
      );
      return compareAndSetReportComment(tx, {
        studentId: Number(studentId),
        teacherSubjectId: Number(teacherSubjectId),
        termId: Number(termId),
        comment: String(comment ?? ""),
        expectedUpdatedAt: expectedUpdatedAt === null ? null : String(expectedUpdatedAt),
      });
    });

    res.json(saved);
  } catch (err) {
    if (err instanceof SavePreconditionError) {
      return res.status(err.status).json({ message: err.message, current: err.current });
    }
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
    if (student.classId === null || !student.class) {
      return res.status(409).json({ message: "Student has no current class" });
    }
    const classId = student.classId;

    const user = req.user!;
    if (user.role === "STUDENT" && student.userId !== user.id) {
      return res.status(403).json({ message: "Not allowed to view this student" });
    }
    if (user.role === "TEACHER") {
      const assigned = await prisma.teacherSubject.findFirst({
        where: { teacherId: user.id, classId, isActive: true },
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
          classId,
        },
      });

    const subjects: TeacherSubjectWithRelations[] =
      await prisma.teacherSubject.findMany({
        where: {
          classId,
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
          comment:
            existingComment?.comment || "",
          commentUpdatedAt: existingComment?.updatedAt?.toISOString() ?? null,
        };
      })
    );

    res.json({
      studentId: student.id,

      student: `${student.firstName} ${student.lastName}`
        .replace(/\s+/g, " ")
        .trim(),

      class: student.class.name,

      subjects: report,

    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Error generating report",
    });
  }
};
