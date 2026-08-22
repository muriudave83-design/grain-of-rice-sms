import { Router } from "express";
console.log("🔥 ADMIN.STUDENTS.ROUTES FILE LOADED");

import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { archiveStudent, historyPagination, restoreStudent, transferStudent } from "../../services/studentLifecycle.service";

const router = Router();
router.use(authenticate, requireRole(["ADMIN"]));

/**
 * ✅ GET ACTIVE STUDENTS
 * GET /api/admin/students
 */
router.get("/students", async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        isArchived: false,
      },
      include: {
        class: true,
        parentLinks: {
          include: {
            parent: true,
          },
        },
        user: true,
      },
      orderBy: { id: "asc" },
    });

    const result = students.map((s) => ({
      ...s,
      parent: s.parentLinks[0]?.parent || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Failed to fetch students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

/**
 * ✅ NEW — GET SINGLE STUDENT (FIXED FOR PRISMA)
 * GET /api/admin/students/:id
 */
router.get("/students/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const student = await prisma.student.findFirst({
      where: {
        id,
        isArchived: false,
      },
      include: {
        class: true,
        parentLinks: {
          include: {
            parent: true,
          },
        },
        user: true,
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const result = {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      className: student.class?.name || "—",
      parent: student.parentLinks[0]?.parent || null,
    };

    res.json(result);
  } catch (err) {
    console.error("Fetch single student error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ GET ARCHIVED STUDENTS (FIXED ROUTE)
 * GET /api/admin/archived/students
 */
router.get("/archived/students", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const parts = search.split(/\s+/).filter(Boolean);
    const where: any = { isArchived: true, ...(search ? { OR: [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { admissionNo: { contains: search, mode: "insensitive" } },
      { AND: parts.map((part) => ({ OR: [{ firstName: { contains: part, mode: "insensitive" } }, { lastName: { contains: part, mode: "insensitive" } }] })) },
    ] } : {}) };
    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({ where, include: { class: true, classEnrollments: { orderBy: { id: "desc" }, take: 1 } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.student.count({ where }),
    ]);

    const result = students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`, // ✅ FIXED NAME
      admissionNo: s.admissionNo,
      classId: s.classId,
      className: s.classEnrollments[0]?.classNameSnapshot || s.class?.name || "—",
      archivedAt: s.archivedAt,
    }));

    res.json({ records: result, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error("Failed to fetch archived students:", err);
    res.status(500).json({ message: "Failed to fetch archived students" });
  }
});

router.get("/archived/students/:id", async (req, res) => {
  const student = await prisma.student.findFirst({ where: { id: Number(req.params.id), isArchived: true }, include: {
    class: true, classEnrollments: { include: { class: true }, orderBy: { id: "desc" } },
    parentLinks: { include: { parent: true } }, guardians: { include: { user: { select: { name: true, email: true } } } },
    _count: { select: { scores: true, assessmentScores: true, grades: true, reportComments: true, reportCards: true, transcripts: true, attendanceEntries: true, discipline: true, parentContactLogs: true, fees: true, invoices: true, sponsorships: true } },
  }});
  if (!student) return res.status(404).json({ message: "Archived student not found" });
  res.json(student);
});

const paged = (records: any[], total: number, page: number, pageSize: number) => ({ records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });

router.get("/archived/students/:id/history/:section", async (req, res) => {
  const studentId = Number(req.params.id); const { page, pageSize, skip } = historyPagination(req.query);
  const archived = await prisma.student.findFirst({ where: { id: studentId, isArchived: true }, select: { id: true } });
  if (!archived) return res.status(404).json({ message: "Archived student not found" });
  const termId = Number(req.query.termId) || undefined; const kind = String(req.query.kind || "");
  let model: any; let where: any; let include: any; let orderBy: any = { id: "desc" };
  switch (req.params.section) {
    case "attendance": model = prisma.attendanceEntry; where = { studentId, ...(termId ? { session: { termId } } : {}) }; include = { session: { include: { class: true, term: true } } }; orderBy = { session: { date: "desc" } }; break;
    case "discipline": model = prisma.discipline; where = { studentId, ...(termId ? { termId } : {}) }; include = { term: true, recordedBy: { select: { name: true, role: true } } }; orderBy = { date: "desc" }; break;
    case "report-cards": model = prisma.reportCard; where = { studentId, ...(termId ? { termId } : {}) }; include = { term: true, class: true, subjects: { include: { subject: true } } }; orderBy = { generatedAt: "desc" }; break;
    case "transcripts": model = prisma.transcript; where = { studentId, ...(termId ? { termId } : {}) }; include = { term: true, entries: true }; orderBy = { createdAt: "desc" }; break;
    case "academics":
      if (kind === "assessments") { model = prisma.assessmentScore; where = { studentId, ...(termId ? { assessment: { termId } } : {}) }; include = { assessment: { include: { term: true, subject: true, class: true } } }; }
      else if (kind === "grades") { model = prisma.grade; where = { studentId, ...(termId ? { termId } : {}) }; include = { term: { include: { class: true } }, subject: true }; }
      else if (kind === "comments") { model = prisma.reportComment; where = { studentId, ...(termId ? { termId } : {}) }; include = { term: true, teacherSubject: { include: { subject: true, class: true, teacher: { select: { name: true } } } } }; }
      else { model = prisma.score; where = { studentId, ...(termId ? { assignment: { termId } } : {}) }; include = { assignment: { include: { term: true, teacherSubject: { include: { subject: true, class: true } } } } }; } break;
    case "family": model = prisma.parentContactLog; where = { studentId }; include = undefined; orderBy = { createdAt: "desc" }; break;
    case "finance":
      if (kind === "invoices") { model = prisma.invoice; where = { studentId }; }
      else if (kind === "sponsorships") { model = prisma.sponsorship; where = { studentId }; include = { sponsor: true }; }
      else { model = prisma.fee; where = { studentId }; include = { payments: true }; } break;
    default: return res.status(404).json({ message: "History section not found" });
  }
  const [records, total] = await prisma.$transaction([model.findMany({ where, include, orderBy, skip, take: pageSize }), model.count({ where })]);
  res.json(paged(records, total, page, pageSize));
});

router.get("/archived/students/:id/terms", async (req, res) => {
  const studentId = Number(req.params.id);
  if (!await prisma.student.findFirst({ where: { id: studentId, isArchived: true }, select: { id: true } })) return res.status(404).json({ message: "Archived student not found" });
  const [grades, reports, transcripts, comments, discipline, attendance, scores, assessments] = await Promise.all([
    prisma.grade.findMany({ where: { studentId }, select: { termId: true } }), prisma.reportCard.findMany({ where: { studentId }, select: { termId: true } }), prisma.transcript.findMany({ where: { studentId }, select: { termId: true } }), prisma.reportComment.findMany({ where: { studentId, termId: { not: null } }, select: { termId: true } }), prisma.discipline.findMany({ where: { studentId, termId: { not: null } }, select: { termId: true } }), prisma.attendanceEntry.findMany({ where: { studentId, session: { termId: { not: null } } }, select: { session: { select: { termId: true } } } }), prisma.score.findMany({ where: { studentId }, select: { assignment: { select: { termId: true } } } }), prisma.assessmentScore.findMany({ where: { studentId }, select: { assessment: { select: { termId: true } } } }),
  ]);
  const ids = new Set<number>(); [...grades, ...reports, ...transcripts, ...comments, ...discipline].forEach((x) => { if (x.termId) ids.add(x.termId); }); attendance.forEach((x) => { if (x.session.termId) ids.add(x.session.termId); }); scores.forEach((x) => ids.add(x.assignment.termId)); assessments.forEach((x) => ids.add(x.assessment.termId));
  res.json(await prisma.term.findMany({ where: { id: { in: [...ids] } }, include: { class: { select: { name: true } } }, orderBy: [{ startDate: "desc" }, { id: "desc" }] }));
});

/**
 * ✅ CREATE STUDENT
 * POST /api/admin/students
 */
router.post("/students", async (req, res) => {
  console.log("🔥 ADMIN STUDENTS ROUTE HIT");

  try {
    let { firstName, lastName, admissionNo, classId, parentId } = req.body;

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    admissionNo = admissionNo?.trim();
    classId = Number(classId);
    parentId = typeof parentId === "string" && parentId.trim()
      ? parentId.trim()
      : null;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof admissionNo !== "string" ||
      Number.isNaN(classId)
    ) {
      return res.status(400).json({
        message: "Invalid or missing fields",
      });
    }

    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists || classExists.isArchived) {
      return res.status(404).json({ message: "Class not found." });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { admissionNo },
    });

    if (existingStudent) {
      return res.status(409).json({
        message: "Student with this admission number already exists.",
      });
    }

    const email = `${admissionNo.toLowerCase()}@student.school.com`;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Generated email already exists.",
      });
    }

    const defaultPassword = "student123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "STUDENT",
          name: `${firstName} ${lastName}`,
        },
      });

      const createdStudent = await tx.student.create({
        data: {
          firstName,
          lastName,
          admissionNo,
          classId,
          userId: user.id,
        },
      });
      await tx.studentClassEnrollment.create({ data: { studentId: createdStudent.id, classId, classNameSnapshot: classExists.name, startedAt: new Date(), status: "CURRENT", source: "ADMISSION" } });

      if (parentId) {
        await tx.parentStudent.create({
          data: {
            parentId,
            studentId: createdStudent.id,
          },
        });
      }

      return createdStudent;
    });

    res.json({
      message: "Student and login account created successfully.",
      student,
      login: {
        email,
        password: defaultPassword,
      },
    });

  } catch (err: any) {
    console.error("Create student error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Duplicate field detected.",
      });
    }

    res.status(500).json({
      message: "Failed to create student.",
    });
  }
});

/**
 * ✅ UPDATE STUDENT (FIXED — WITH PARENT LINKING)
 * PUT /api/admin/students/:id
 */
router.put("/students/:id", async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, admissionNo, classId, parentId } = req.body;

  try {
    const studentId = Number(id);

    const existing = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
    if (!existing) return res.status(404).json({ message: "Student not found" });
    if (classId && Number(classId) !== existing.classId) {
      await transferStudent(prisma, studentId, Number(classId));
    }

    // ✅ 1. Update student basic info
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        admissionNo,
      },
    });

    // ✅ 2. HANDLE PARENT RELATION (CRITICAL FIX)

    // Remove existing parent links
    await prisma.parentStudent.deleteMany({
      where: { studentId },
    });

    // Add new parent if provided
    if (parentId) {
      await prisma.parentStudent.create({
        data: {
          studentId,
          parentId: String(parentId),
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update student error:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
});
/**
 * ✅ ARCHIVE STUDENT (DELETE)
 * DELETE /api/admin/students/:id
 */
router.delete("/students/:id", async (req, res) => {
  try {
    await archiveStudent(prisma, Number(req.params.id));

    res.json({ message: "Student archived successfully" });
  } catch (err) {
    console.error("Archive failed:", err);
    res.status((err as any).status || 500).json({ error: (err as Error).message || "Failed to archive student" });
  }
});

/**
 * ✅ RESTORE STUDENT
 * PUT /api/admin/students/:id/restore
 */
router.put("/students/:id/restore", async (req, res) => {
  try {
    await restoreStudent(prisma, Number(req.params.id), Number(req.body.classId));

    res.json({ message: "Student restored" });
  } catch (err) {
    console.error("Restore failed:", err);
    res.status((err as any).status || 500).json({ error: (err as Error).message || "Restore failed" });
  }
});

/**
 * LINK USER
 */
router.post("/students/:studentId/link-user", async (req, res) => {
  const studentId = Number(req.params.studentId);
  const { userId } = req.body;

  if (Number.isNaN(studentId) || !userId) {
    return res.status(400).json({ message: "Invalid input" });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.role !== "STUDENT") {
    return res
      .status(400)
      .json({ message: "User must exist and have STUDENT role" });
  }

  if (student.userId) {
    return res
      .status(409)
      .json({ message: "Student already linked to a user" });
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { userId: user.id },
  });

  res.json({ message: "Student successfully linked to user" });
});

// ===============================
// TEACHERS ARCHIVE (SAFE ADD)
// ===============================

// Archive teacher
router.delete("/teachers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ message: "Teacher archived" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to archive teacher" });
  }
});

// Get archived teachers
router.get("/archived/teachers", async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        isArchived: true,
      },
    });

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

// Restore teacher
router.put("/teachers/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: false },
    });

    res.json({ message: "Teacher restored" });
  } catch (error) {
    res.status(500).json({ message: "Failed to restore teacher" });
  }
});

// ===============================
// PARENTS ARCHIVE (SAFE ADD)
// ===============================

// Archive parent
router.delete("/parents/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ message: "Parent archived" });
  } catch (error) {
    res.status(500).json({ message: "Failed to archive parent" });
  }
});

// Get archived parents
router.get("/archived/parents", async (req, res) => {
  try {
    const parents = await prisma.user.findMany({
      where: {
        role: "PARENT",
        isArchived: true,
      },
    });

    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch parents" });
  }
});

// Restore parent
router.put("/parents/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: false },
    });

    res.json({ message: "Parent restored" });
  } catch (error) {
    res.status(500).json({ message: "Failed to restore parent" });
  }
});

export default router;
