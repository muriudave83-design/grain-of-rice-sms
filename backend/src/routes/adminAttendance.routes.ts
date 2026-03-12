import express from "express"
import { PrismaClient } from "@prisma/client"

const router = express.Router()
const prisma = new PrismaClient()

/*
Admin Attendance Summary
GET /admin/attendance/summary
*/
router.get("/summary", async (req, res) => {

  try {

    const today = new Date()
    today.setHours(0,0,0,0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const totalStudents = await prisma.student.count()

    const todayEntries = await prisma.attendanceEntry.findMany({
      where:{
        session:{
          date:{
            gte: today,
            lt: tomorrow
          }
        }
      },
      select:{
        studentId:true,
        status:true
      }
    })

    const presentStudents = new Set<number>()
    const absentStudents = new Set<number>()

    todayEntries.forEach(entry => {

      if(entry.status === "PRESENT"){
        presentStudents.add(entry.studentId)
      }

      if(entry.status === "ABSENT"){
        absentStudents.add(entry.studentId)
      }

    })

    const present = presentStudents.size
    const absent = absentStudents.size

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
      error:"Failed to load attendance summary"
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
    today.setHours(0,0,0,0)

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

      let present = 0
      let absent = 0

      cls.students.forEach(student => {

        student.attendanceEntries.forEach(entry => {

          const sessionDate = new Date(entry.session.date)

          if(sessionDate >= today && sessionDate < tomorrow){

            if(entry.status === "PRESENT") present++
            if(entry.status === "ABSENT") absent++

          }

        })

      })

      return {
        classId: cls.id,
        className: cls.name,
        totalStudents: cls.students.length,
        present,
        absent,
        attendanceRate:
          cls.students.length > 0
            ? Math.round((present / cls.students.length) * 100)
            : 0
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
Admin Attendance by Grade
GET /admin/attendance/by-grade
*/

router.get("/by-grade", async (req, res) => {

  try {

    const sessions = await prisma.attendanceSession.findMany({
      include: {
        class: true,
        entries: true
      }
    })

    const gradeStats: Record<string, { present: number; total: number }> = {}

    sessions.forEach(session => {

      const gradeName = session.class.name

      if (!gradeStats[gradeName]) {
        gradeStats[gradeName] = { present: 0, total: 0 }
      }

      session.entries.forEach(entry => {

        gradeStats[gradeName].total++

        if (entry.status === "PRESENT") {
          gradeStats[gradeName].present++
        }

      })

    })

    const result = Object.keys(gradeStats).map(grade => {

      const stats = gradeStats[grade]

      const rate =
        stats.total > 0
          ? Math.round((stats.present / stats.total) * 100)
          : 0

      return {
        grade,
        attendanceRate: rate
      }

    })

    res.json(result)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: "Failed to load grade attendance"
    })

  }

})

/*
Admin Absent Students Today
GET /admin/attendance/absent-today
*/

router.get("/absent-today", async (req, res) => {

  try {

    const today = new Date()
    today.setHours(0,0,0,0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const absentEntries = await prisma.attendanceEntry.findMany({
      where: {
        status: "ABSENT",
        session: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      },
      include: {
        student: true,
        session: {
          include: {
            class: true
          }
        }
      }
    })

    const result = absentEntries.map(entry => {

      return {
        studentName: entry.student.firstName + " " + entry.student.lastName,
        grade: entry.session.class.name,
        status: entry.status
      }

    })

    res.json(result)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: "Failed to load absent students"
    })

  }

})

/*
Admin Class Attendance
GET /admin/attendance/class/:classId
*/

router.get("/class/:classId", async (req, res) => {

  try {

    const classId = Number(req.params.classId)

    const today = new Date()
    today.setHours(0,0,0,0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const students = await prisma.student.findMany({
      where: {
        classId: classId
      },
      include: {
        attendanceEntries: {
          include: {
            session: true
          }
        }
      }
    })

    const result = students.map(student => {

      const entry = student.attendanceEntries.find(e => {

        const sessionDate = new Date(e.session.date)

        return sessionDate >= today && sessionDate < tomorrow

      })

      return {
        studentId: student.id,
        studentName: student.firstName + " " + student.lastName,
        status: entry ? entry.status : "NOT MARKED"
      }

    })

    res.json(result)

  } catch (error) {

    console.error("Class attendance error:", error)

    res.status(500).json({
      error: "Failed to fetch class attendance"
    })

  }

})

export default router