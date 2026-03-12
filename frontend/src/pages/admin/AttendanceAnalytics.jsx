import { useEffect, useState } from "react"

const API_BASE = import.meta.env.VITE_API_URL

// Helper to fetch from attendance endpoints
const attendanceFetch = async (endpoint) => {
  const response = await fetch(`${API_BASE}/admin/attendance/${endpoint}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
  }
  return response.json()
}

function AttendanceAnalytics() {
  const [summary, setSummary] = useState(null)
  const [absentStudents, setAbsentStudents] = useState([])

  useEffect(() => {
    fetchSummary()
    fetchAbsentStudents()
  }, [])

  async function fetchSummary() {
    try {
      const data = await attendanceFetch("summary")
      setSummary(data)
    } catch (error) {
      console.error("Failed to load attendance summary", error)
    }
  }

  async function fetchAbsentStudents() {
    try {
      const data = await attendanceFetch("absent-today")
      setAbsentStudents(data)
    } catch (error) {
      console.error("Failed to load absent students", error)
    }
  }

  if (!summary) return <div>Loading attendance analytics...</div>

  return (
    <div style={{ padding: "20px" }}>
      <h1>Attendance Analytics</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "20px",
        }}
      >
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
          marginTop: "10px",
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
  background: "#fff",
}

const tableCell = {
  border: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
}

export default AttendanceAnalytics