import express from "express"
import { PrismaClient } from "@prisma/client"
import { markAllPresent, markAttendance, startAfternoonAttendance } from "../controllers/attendance/markAttendance.controller"
import { statusesByPeriod, summarizeCurrentAttendance } from "../services/attendance/attendanceDomain"
import { getAttendanceReport } from "../controllers/attendance.controller"

// 🔐 AUTH & RBAC
import { authenticate } from "../middlewares/authMiddleware"
import { requireRole } from "../middlewares/rolesMiddleware"
import { Role } from "@prisma/client"

const router = express.Router()
const prisma = new PrismaClient()

/*
🔒 GLOBAL PROTECTION (APPLIES TO ALL ROUTES BELOW)
Only authenticated ADMIN users can access anything in this file
*/
router.use(authenticate)
router.use(requireRole([Role.ADMIN, Role.ATTENDANCE_OFFICER]))

/* Attendance-scoped class discovery; does not grant class-management access. */
router.get("/classes", async (_req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { isArchived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return res.json(classes)
  } catch (error) {
    console.error("Failed to load attendance report classes", error)
    return res.status(500).json({ message: "Failed to load classes" })
  }
})

/*
Admin Attendance Summary
GET /admin/attendance/summary
*/
router.get("/summary", async (req, res) => {
  try {
    const selectedDate = req.query.date as string | undefined
    const requestedTermId = Number(req.query.termId)
    const termId = Number.isInteger(requestedTermId) ? requestedTermId : undefined

    const today = selectedDate
      ? new Date(selectedDate)
      : new Date()

    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const totalStudents = await prisma.student.count({
      where: { isArchived: false },
    })

    const todayEntries = await prisma.attendanceEntry.findMany({
      where: {
        session: {
          date: {
            gte: today,
            lt: tomorrow
          },
          ...(termId !== undefined ? { termId } : {}),
        },
        student: { isArchived: false },
      },
      select: {
        studentId: true,
        status: true,
        period: true,
        session: { select: { date: true } },
      }
    })

    const byStudent = new Map<number, typeof todayEntries>()
    todayEntries.forEach(entry => byStudent.set(entry.studentId, [...(byStudent.get(entry.studentId) ?? []), entry]))

    let present = 0
    let absent = 0
    let completed = 0

    byStudent.forEach(entries => {
      const daily = summarizeCurrentAttendance(entries)
      if (daily.absent) absent++
      else if (daily.present) present++
      if (daily.completed) completed++
    })

    const attendanceRate =
      totalStudents > 0 && completed === totalStudents
        ? ((present / totalStudents) * 100).toFixed(1)
        : null

    res.json({
      totalStudents,
      present,
      absent,
      attendanceRate
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: "Failed to load attendance summary"
    })
  }
})

/*
Admin Attendance by Class
GET /admin/attendance/by-class
*/
router.get("/by-class", async (req, res) => {
  try {
    const selectedDate = req.query.date as string | undefined
    const requestedTermId = Number(req.query.termId)
    const termId = Number.isInteger(requestedTermId) ? requestedTermId : undefined

    const today = selectedDate
      ? new Date(selectedDate)
      : new Date()

    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const classes = await prisma.class.findMany({
      where: {
        isArchived: false,
      },

      include: {
        students: {
          where: { isArchived: false },
          include: {
            attendanceEntries: {
              where: {
                session: {
                  date: { gte: today, lt: tomorrow },
                  ...(termId !== undefined ? { termId } : {}),
                },
              },
              include: {
                session: true
              }
            }
          }
        }
      }
    })

    const result = classes.map(cls => {
      const students = cls.students

      let present = 0
      let absent = 0
      let late = 0
      let completed = 0

      students.forEach(student => {
        const entries = student.attendanceEntries
        const daily = summarizeCurrentAttendance(entries)
        if (daily.absent) absent++
        else if (daily.present) present++
        if (daily.completed) completed++
        if (entries.some(entry => entry.status === "LATE")) late++
      })

      const totalStudents = students.length
      const notMarked = totalStudents - (present + absent)

      return {
        classId: cls.id,
        className: cls.name,
        totalStudents,
        present,
        absent,
        late,
        notMarked,
        attendanceRate:
          totalStudents === 0 || completed !== totalStudents
            ? null
            : Math.round((present / totalStudents) * 100),
      }
    })

    res.json(result)

  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: "Failed to load attendance by class"
    })
  }
})

/*
Admin Class Attendance (DETAIL VIEW)
GET /admin/attendance/class/:classId
*/
router.get("/class/:classId", async (req, res) => {
  try {
    const classId = parseInt(req.params.classId)
    const selectedDate = req.query.date as string | undefined

    const today = selectedDate
      ? new Date(selectedDate)
      : new Date()

    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const session = await prisma.attendanceSession.findFirst({
      where: { classId, date: { gte: today, lt: tomorrow } },
      select: { id: true },
      orderBy: { id: "desc" },
    })
    const sessionIds = session ? [session.id] : []

    const students = await prisma.student.findMany({
      where: {
        classId: classId,
        isArchived: false,
      },
      include: {
        user: true,
        attendanceEntries: {
          where: { attendanceSessionId: { in: sessionIds } },
          include: {
            session: true
          }
        }
      }
    })

    const result = students.map(student => {
      const statuses = statusesByPeriod(student.attendanceEntries.map((entry) => ({
        period: entry.period,
        status: entry.status,
      })))

      return {
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        ...statuses,
      }
    })

    res.json({
      students: result,
      afternoonInitialized: result.some((student) => student.afternoonStatus !== null),
      legacyOnly: result.some((student) => student.legacyStatus !== null) &&
        !result.some((student) => student.morningStatus !== null || student.afternoonStatus !== null),
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: "Failed to load class attendance"
    })
  }
})

/*
Admin Mark Attendance
POST /admin/attendance/mark
*/
router.post("/mark", markAttendance)
router.post("/mark-all", markAllPresent)
router.post("/class/:classId/start-afternoon", startAfternoonAttendance)

/*
Admin Attendance Report
GET /admin/attendance/report
*/
router.get("/report", getAttendanceReport)

export default router
