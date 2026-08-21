import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

const thStyle = { padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" };
const tdStyle = { padding: "10px", borderBottom: "1px solid #eee" };

export default function AttendanceReport() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get("/admin/attendance/classes")
      .then((response) => setClasses(response.data ?? []))
      .catch((error) => console.error("Failed to load classes", error));
  }, []);

  const resetReport = () => {
    setData([]);
    setSummary(null);
  };

  const fetchReport = async () => {
    if (!classId || !startDate || !endDate) {
      alert("Please select class and date range");
      return;
    }
    try {
      setLoading(true);
      const response = await apiClient.get("/admin/attendance/report", {
        params: { classId, startDate, endDate },
      });
      setData(response.data.records ?? []);
      setSummary(response.data.summary ?? null);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message ?? "Unable to generate attendance report");
      resetReport();
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data.length) return;
    const escapeCSV = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Student Name", "Admission No", "Date", "Daily Result", "Morning", "Afternoon", "Full-day Absent"],
      ...data.map((record) => [
        record.studentName,
        record.admissionNumber,
        String(record.date).slice(0, 10),
        record.status,
        record.morningStatus ?? record.legacyStatus ?? "",
        record.afternoonStatus ?? "",
        record.absentForDay ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const className = classes.find((schoolClass) => String(schoolClass.id) === classId)?.name ?? `class-${classId}`;
    const safeClassName = className.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
    link.href = url;
    link.download = `attendance-${safeClassName}-${startDate}-to-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>Attendance Report</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select
          value={classId}
          onChange={(event) => { setClassId(event.target.value); resetReport(); }}
          style={{ padding: "8px" }}
        >
          <option value="">Select Class</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(event) => { setStartDate(event.target.value); resetReport(); }}
          style={{ padding: "8px" }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => { setEndDate(event.target.value); resetReport(); }}
          style={{ padding: "8px" }}
        />
        <button onClick={fetchReport} style={{ background: "#2563eb", color: "white", padding: "8px 16px", border: "none" }}>
          Generate Report
        </button>
        <button
          onClick={exportCSV}
          disabled={!data.length}
          style={{ background: "#16a34a", color: "white", padding: "8px 16px", border: "none", cursor: data.length ? "pointer" : "not-allowed", opacity: data.length ? 1 : 0.5 }}
        >
          Export CSV
        </button>
      </div>

      {loading ? <p>Loading...</p> : data.length === 0 ? <p>No attendance records found.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Admission No</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Daily Result</th>
                <th style={thStyle}>Morning</th>
                <th style={thStyle}>Afternoon</th>
                <th style={thStyle}>Full-day Absent</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record) => (
                <tr key={`${record.studentId}-${record.date}`}>
                  <td style={tdStyle}>{record.studentName}</td>
                  <td style={tdStyle}>{record.admissionNumber}</td>
                  <td style={tdStyle}>{String(record.date).slice(0, 10)}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{record.status}</td>
                  <td style={tdStyle}>{record.morningStatus ?? record.legacyStatus ?? "—"}</td>
                  <td style={tdStyle}>{record.afternoonStatus ?? "—"}</td>
                  <td style={tdStyle}>{record.absentForDay ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <div style={{ marginTop: "30px" }}>
          <h3>Report Summary</h3>
          <p>
            Students {summary.totalStudents} · Student-days {summary.totalStudentDays} · Present {summary.present} · Absent {summary.absent} · Late {summary.late} · Excused {summary.excused} · Incomplete {summary.incomplete}
          </p>
        </div>
      )}
    </div>
  );
}
