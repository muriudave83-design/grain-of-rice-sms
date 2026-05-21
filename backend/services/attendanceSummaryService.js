// services/attendanceSummaryService.js

const Attendance = require("../models/Attendance");

async function getStudentAttendanceSummary(studentId, term, academicYear) {
  const records = await Attendance.find({
    student: studentId,
    term,
    academicYear,
  });

  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  const absent = records.filter(r => r.status === "absent").length;

  const percentage = total === 0 ? null : Math.round((present / total) * 100);

  return {
    present,
    absent,
    total,
    percentage,
  };
}

module.exports = {
  getStudentAttendanceSummary,
};