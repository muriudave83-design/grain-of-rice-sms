import express from "express"
import { PrismaClient } from "@prisma/client"
import { markAttendance } from "../controllers/attendance/markAttendance.controller"

const router = express.Router()
const prisma = new PrismaClient()

/*
Admin Attendance Summary
GET /admin/attendance/summary
*/
router.get("/summary", async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const totalStudents = await prisma.student.count()

    const todayEntries = await prisma.attendanceEntry.findMany({
      where: {
        session: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      },
      select: {
        studentId: true,
        status: true
      }
    })

    // ✅ Ensure unique students
    const studentStatusMap = new Map<number, string>()

    todayEntries.forEach(entry => {
      if (!studentStatusMap.has(entry.studentId)) {
        studentStatusMap.set(entry.studentId, entry.status)
      }
    })

    let present = 0
    let absent = 0

    studentStatusMap.forEach(status => {
      if (status === "PRESENT") present++
      if (status === "ABSENT") absent++
    })

    const attendanceRate =
      totalStudents > 0
        ? ((present / totalStudents) * 100).toFixed(1)
        : "0"

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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const classes = await prisma.class.findMany({
      include: {
        students: {
          include: {
            attendanceEntries: {
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

      students.forEach(student => {
        let status = "NOT_MARKED"

        for (const entry of [...student.attendanceEntries].reverse()) {
          const sessionDate = new Date(entry.session.date)

          if (sessionDate >= today && sessionDate < tomorrow) {
            status = entry.status
            break // ✅ stop after first valid entry
          }
        }

        if (status === "PRESENT") present++
        if (status === "ABSENT") absent++
      })

      const totalStudents = students.length
      const notMarked = totalStudents - (present + absent)

      return {
        classId: cls.id,
        className: cls.name,
        totalStudents,
        present,
        absent,
        notMarked,
        attendanceRate:
          totalStudents === 0
            ? 0
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const students = await prisma.student.findMany({
      where: {
        classId: classId
      },
      include: {
        user: true,
        attendanceEntries: {
          include: {
            session: true
          }
        }
      }
    })

    const result = students.map(student => {
      let status = "NOT_MARKED"

      for (const entry of [...student.attendanceEntries].reverse()) {
        const sessionDate = new Date(entry.session.date)

        if (sessionDate >= today && sessionDate < tomorrow) {
          status = entry.status
          break // ✅ prevent overwrite / duplicates
        }
      }

      return {
        studentId: student.id,
        name: student.user?.name || "Unknown",
        status
      }
    })

    res.json(result)

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

export default router