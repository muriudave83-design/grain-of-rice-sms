import { useEffect, useState } from "react"

function AttendanceAnalytics() {

  const [summary, setSummary] = useState(null)
  const [absentStudents, setAbsentStudents] = useState([])

  useEffect(() => {
    fetchSummary()
    fetchAbsentStudents()
  }, [])

  async function fetchSummary() {

    try {

      const response = await fetch(
        "http://localhost:5000/api/admin/attendance/summary"
      )

      const data = await response.json()

      setSummary(data)

    } catch (error) {

      console.error("Failed to load attendance summary", error)

    }

  }

  async function fetchAbsentStudents() {

    try {

      const response = await fetch(
        "http://localhost:5000/api/admin/attendance/absent-today"
      )

      const data = await response.json()

      setAbsentStudents(data)

    } catch (error) {

      console.error("Failed to load absent students", error)

    }

  }

  if (!summary) {
    return <div>Loading attendance analytics...</div>
  }

  return (

    <div style={{ padding: "20px" }}>

      <h1>Attendance Analytics</h1>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "20px",
        marginTop: "20px"
      }}>

        <div style={cardStyle}>
          <h3>Total Students</h3>
          <p>{summary.totalStudents}</p>
        </div>

        <div style={cardStyle}>
          <h3>Present Today</h3>
          <p>{summary.present}</p>
        </div>

        <div style={cardStyle}>
          <h3>Absent Today</h3>
          <p>{summary.absent}</p>
        </div>

        <div style={cardStyle}>
          <h3>Attendance Rate</h3>
          <p>{summary.attendanceRate}%</p>
        </div>

      </div>

      <h2 style={{ marginTop: "40px" }}>Absent Students Today</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "10px"
        }}
      >

        <thead>

          <tr style={{ background: "#f5f5f5" }}>
            <th style={tableCell}>Student Name</th>
            <th style={tableCell}>Grade</th>
            <th style={tableCell}>Status</th>
          </tr>

        </thead>

        <tbody>

        {absentStudents.length === 0 ? (

            <tr>
            <td style={tableCell} colSpan="3">
                No students absent today 🎉
            </td>
            </tr>

        ) : (

            absentStudents.map((student, index) => (

            <tr key={index}>

                <td style={tableCell}>{student.studentName}</td>
                <td style={tableCell}>{student.grade}</td>
                <td style={tableCell}>{student.status}</td>

            </tr>

            ))

        )}

        </tbody>

      </table>

    </div>
  )
}

const cardStyle = {
  border: "1px solid #ddd",
  padding: "20px",
  borderRadius: "8px",
  background: "#fff"
}

const tableCell = {
  border: "1px solid #ddd",
  padding: "10px",
  textAlign: "left"
}

export default AttendanceAnalytics