import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Prisma, Role } from "@prisma/client";
import { ReportCardStatus } from "@prisma/client";
import { loadReportAttendance } from "../services/attendance/reportAttendance.service";
import {
  loadAuthoritativeReportResults,
  summarizeCompleteReport,
} from "../services/authoritativeReport.service";
import { presentOfficialReportCardSnapshot } from "../services/reportCardSnapshotPresentation.service";

const router = Router();

// 🔥 GLOBAL DEBUG (CONFIRMS FILE IS USED)
console.log("🔥 reportCardReadRoutes.ts LOADED");

/**
 * ============================================================
 * TEACHER — COMPUTED REPORT CARDS (🔥 FIXED ENGINE)
 * ============================================================
 */
router.get(
  "/teacher/:classId/:term",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    console.log("🔥 NEW REPORT LOGIC RUNNING");
    console.log("PARAMS:", req.params);

    try {
      const classId = Number(req.params.classId);

      const termParam = req.params.term;

      if (Array.isArray(termParam)) {
        return res.status(400).json({
          message: "Invalid term parameter",
        });
      }

      const termName = termParam;

      if (Number.isNaN(classId)) {
        return res.status(400).json({
          message: "Invalid classId",
        });
      }

      const assigned = await prisma.teacherSubject.findFirst({
        where: { teacherId: req.user!.id, classId, isActive: true },
        select: { id: true },
      });
      if (!assigned) {
        return res.status(403).json({ message: "Not assigned to this class" });
      }

      const term = await prisma.term.findFirst({
        where: /^\d+$/.test(termName)
          ? { id: Number(termName), classId }
          : { classId, name: { equals: termName.replace(/^term\s*/i, "Term ").trim(), mode: "insensitive" } },
      });

      if (!term) {
        return res.status(404).json({
          message: "Term not found",
        });
      }

      const students = await prisma.student.findMany({
        where: {
          classId,
          isArchived: false,
        },
        include: {
          user: true,
        },
      });

      const { resultsByStudent } = await loadAuthoritativeReportResults(prisma, {
        classId,
        termId: term.id,
        studentIds: students.map((student) => student.id),
        requestingTeacherId: req.user!.id,
      });
      const attendanceByStudent = await loadReportAttendance(prisma, {
        classId,
        termId: term.id,
        startDate: term.startDate,
        endDate: term.endDate,
        studentIds: students.map((student) => student.id),
      });

      const report = await Promise.all(
        students.map(async (student) => {
          const authoritativeSubjects = resultsByStudent.get(student.id) ?? [];
          const summary = summarizeCompleteReport(authoritativeSubjects);
          const subjects = authoritativeSubjects.map((subject) => ({
            subject: subject.subjectName,
            subjectId: subject.subjectId,
            average: subject.finalGrade,
            grade: subject.grade,
            gradeDescription: subject.gradeDescription,
            completenessState: subject.completenessState,
            configurationWarnings: subject.configurationWarnings,
          }));

          // ✅ FIXED ATTENDANCE DATA
          const attendance = attendanceByStudent.get(student.id)!;
          const { present, absent, late, attendanceRate } = attendance;

          return {
            studentId: student.id,

            name:
              student.user?.name ||
              `${student.firstName} ${student.lastName}`,

            subjects,
            overallAverage: summary.average,
            summary,

            present,
            absent,
            late,
            attendanceRate,
            attendanceState: attendance.state,
            attendanceDraftDays: attendance.draftDays,
            attendanceIncompleteDays: attendance.incomplete,
          };
        })
      );

      return res.json(report);

    } catch (err) {
      console.error("🔥 REPORT CARD ERROR:", err);

      return res.status(500).json({
        message: "Failed to load report cards",
      });
    }
  }
);

/**
 * ============================================================
 * TEACHER — PUBLISH REPORT CARDS
 * ============================================================
 */
router.post(
  "/teacher/:classId/:term/publish",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    try {
      const classId = Number(req.params.classId);
      const termParam = req.params.term;

      if (Number.isNaN(classId)) {
        return res.status(400).json({
          message: "Invalid classId",
        });
      }

      if (Array.isArray(termParam)) {
        return res.status(400).json({
          message: "Invalid term parameter",
        });
      }

      const assigned = await prisma.teacherSubject.findFirst({
        where: { teacherId: req.user!.id, classId, isActive: true },
        select: { id: true },
      });
      if (!assigned) {
        return res.status(403).json({ message: "Active teacher assignment required" });
      }

      const term = await prisma.term.findFirst({
        where: /^\d+$/.test(termParam)
          ? { id: Number(termParam), classId }
          : { classId, name: { equals: termParam.replace(/^term\s*/i, "Term ").trim(), mode: "insensitive" } },
      });

      if (!term) {
        return res.status(404).json({
          message: "Term not found",
        });
      }

      const publishedCount = await prisma.$transaction(async (tx) => {
        const students = await tx.student.findMany({
          where: { classId, isArchived: false },
          select: { id: true },
        });
        const { resultsByStudent } = await loadAuthoritativeReportResults(tx, {
          classId,
          termId: term.id,
          studentIds: students.map((student) => student.id),
        });
        const snapshots = await tx.reportCard.findMany({
          where: { classId, termId: term.id, status: ReportCardStatus.GENERATED },
          include: { subjects: true },
        });
        const byStudent = new Map(snapshots.map((snapshot) => [snapshot.studentId, snapshot]));
        for (const student of students) {
          const subjects = resultsByStudent.get(student.id) ?? [];
          const summary = summarizeCompleteReport(subjects);
          const snapshot = byStudent.get(student.id);
          const matches = summary.isComplete && snapshot &&
            snapshot.subjects.length === subjects.length &&
            subjects.every((subject) => snapshot.subjects.some((entry) =>
              entry.subjectId === subject.subjectId && subject.finalGrade !== null &&
              Math.abs(entry.average - subject.finalGrade) < 0.05
            ));
          if (!matches) throw new Error(`REPORT_NOT_READY:${student.id}`);
        }
        const update = await tx.reportCard.updateMany({
          where: { classId, termId: term.id, status: ReportCardStatus.GENERATED },
          data: { status: ReportCardStatus.PUBLISHED, publishedAt: new Date() },
        });
        return update.count;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return res.json({
        message: "Report cards published successfully",
        updated: publishedCount,
      });

    } catch (err) {
      console.error("❌ PUBLISH ERROR:", err);

      if ((err as Error).message.startsWith("REPORT_NOT_READY:")) {
        return res.status(422).json({
          message: "Every active student must have a complete, current generated report before publication",
        });
      }
      if ((err as { code?: string }).code === "P2034") {
        return res.status(409).json({ message: "Report data changed during publication; refresh and try again" });
      }
      return res.status(500).json({ message: "Failed to publish report cards" });
    }
  }
);

/**
 * ============================================================
 * STUDENT — VIEW OWN REPORT CARD
 * ============================================================
 */
router.get(
  "/me",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const user = req.user!;

    const student = await prisma.student.findFirst({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student record not found",
      });
    }

    const termIdRaw = req.query.termId;

    if (typeof termIdRaw !== "string") {
      return res.status(400).json({
        message: "termId is required",
      });
    }

    const termId = Number(termIdRaw);

    if (Number.isNaN(termId)) {
      return res.status(400).json({
        message: "Invalid termId",
      });
    }

    const reportCard =
      await prisma.reportCard.findUnique({
        where: {
          studentId_termId: {
            studentId: student.id,
            termId,
          },
        },
        include: {
          subjects: {
            include: {
              subject: true,
            },
          },
          term: true,
          class: true,
        },
      });

    if (
      !reportCard ||
      reportCard.status !==
        ReportCardStatus.PUBLISHED
    ) {
      return res.status(404).json({
        message: "Report card not available",
      });
    }

    res.json(await presentOfficialReportCardSnapshot(prisma, reportCard));
  }
);

/**
 * ============================================================
 * PARENT — VIEW CHILDREN REPORT CARDS
 * ============================================================
 */
router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  async (req, res) => {
    const parent = await prisma.parent.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!parent) {
      return res.json([]);
    }

    const links =
      await prisma.parentStudent.findMany({
        where: {
          parentId: parent.id,
        },
        select: {
          studentId: true,
        },
      });

    if (links.length === 0) {
      return res.json([]);
    }

    const studentIds = links.map(
      (l) => l.studentId
    );

    const reportCards =
      await prisma.reportCard.findMany({
        where: {
          studentId: {
            in: studentIds,
          },
          status:
            ReportCardStatus.PUBLISHED,
        },
        include: {
          student: true,
          class: true,
          term: true,
        },
      });

    res.json(reportCards);
  }
);

router.get(
  "/student",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.id, isArchived: false },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ message: "Student record not found" });
    const reportCards = await prisma.reportCard.findMany({
      where: { studentId: student.id, status: ReportCardStatus.PUBLISHED },
      include: { term: true, class: true, subjects: true },
      orderBy: { generatedAt: "desc" },
    });
    return res.json(await Promise.all(reportCards.map((reportCard) =>
      presentOfficialReportCardSnapshot(prisma, reportCard)
    )));
  },
);

/** Published immutable snapshot used by the parent report-card screen. */
router.get(
  "/student/:studentId/term/:termId",
  authenticate,
  requireRole([Role.ADMIN, Role.PARENT, Role.STUDENT]),
  async (req, res) => {
    const studentId = Number(req.params.studentId);
    const termId = Number(req.params.termId);
    if (!Number.isInteger(studentId) || !Number.isInteger(termId)) {
      return res.status(400).json({ message: "Invalid student or term" });
    }

    if (req.user!.role === Role.PARENT) {
      const linked = await prisma.parentStudent.findFirst({
        where: { studentId, parent: { userId: req.user!.id } },
        select: { id: true },
      });
      if (!linked) return res.status(403).json({ message: "Not allowed to view this report card" });
    } else if (req.user!.role === Role.STUDENT) {
      const owned = await prisma.student.findFirst({
        where: { id: studentId, userId: req.user!.id },
        select: { id: true },
      });
      if (!owned) return res.status(403).json({ message: "Not allowed to view this report card" });
    }

    const reportCard = await prisma.reportCard.findFirst({
      where: { studentId, termId, status: ReportCardStatus.PUBLISHED },
      include: {
        student: true,
        class: true,
        term: true,
        subjects: { include: { subject: true }, orderBy: { subject: { name: "asc" } } },
      },
    });
    if (!reportCard) return res.status(404).json({ message: "Report card not available" });
    const attendance = (await loadReportAttendance(prisma, {
      classId: reportCard.classId,
      termId: reportCard.termId,
      startDate: reportCard.term.startDate,
      endDate: reportCard.term.endDate,
      studentIds: [reportCard.studentId],
    })).get(reportCard.studentId)!;
    return res.json({
      ...await presentOfficialReportCardSnapshot(prisma, reportCard),
      attendancePresent: attendance.present,
      attendanceAbsent: attendance.absent,
      attendanceLate: attendance.late,
    });
  },
);

/**
 * ============================================================
 * ADMIN / PARENT — VIEW REPORT CARD BY ID
 * ============================================================
 */
router.get(
  "/:id",
  authenticate,
  requireRole([Role.ADMIN, Role.PARENT]),
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid report card id",
      });
    }

    const reportCard =
      await prisma.reportCard.findUnique({
        where: {
          id,
        },
        include: {
          subjects: {
            include: {
              subject: true,
            },
          },
          student: true,
          class: true,
          term: true,
        },
      });

    if (
      !reportCard ||
      reportCard.status !==
        ReportCardStatus.PUBLISHED
    ) {
      return res.status(404).json({
        message: "Report card not available",
      });
    }

    if (req.user!.role === Role.PARENT) {
      const parent = await prisma.parent.findUnique({
        where: { userId: req.user!.id },
        select: { id: true },
      });
      if (!parent) {
        return res.status(403).json({ message: "Parent profile is not linked" });
      }
      const link =
        await prisma.parentStudent.findFirst({
          where: {
            parentId: parent.id,
            studentId:
              reportCard.studentId,
          },
        });

      if (!link) {
        return res.status(403).json({
          message:
            "You are not allowed to view this report card",
        });
      }
    }

    res.json(await presentOfficialReportCardSnapshot(prisma, reportCard));
  }
);

export { router as reportCardReadRoutes };
