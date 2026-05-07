import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AttendanceReport() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");

  // ✅ NEW STATES
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState([]);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await apiClient.get("/admin/classes");
        console.log("CLASSES RESPONSE:", res.data);

        setClasses(res.data || []);
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    };

    fetchClasses();
  }, []);

  // ✅ Fetch report (UPDATED)
  const fetchReport = async () => {
    if (!classId || !startDate || !endDate) {
      return alert("Please select class and date range");
    }

    try {
      setLoading(true);

      const res = await apiClient.get(
        `/admin/attendance/report?classId=${classId}&startDate=${startDate}&endDate=${endDate}`
      );

      setData(res.data.records || []);
      setSummary(res.data.summary || []);
    } catch (err) {
      console.error(err);
      alert("No report found for selected range");
      setData([]);
      setSummary([]); // ✅ reset summary
    } finally {
      setLoading(false);
    }
  };

  // ✅ Export CSV
  const exportCSV = () => {
    if (!data.length) return;

    const csv = [
      ["Student Name", "Admission No", "Status", "Date"],
      ...data.map((r) => [
        r.studentName,
        r.admissionNumber,
        r.status,
        new Date(r.date).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-report.csv";
    a.click();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>Attendance Report</h2>

      {/* 🔹 FILTER SECTION */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          style={{ padding: "8px" }}
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        {/* ✅ DATE RANGE INPUTS */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ padding: "8px" }}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ padding: "8px" }}
        />

        <button
          onClick={fetchReport}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "8px 16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Generate Report
        </button>

        <button
          onClick={exportCSV}
          style={{
            background: "#16a34a",
            color: "white",
            padding: "8px 16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>

      {/* 🔹 MAIN TABLE */}
      {loading ? (
        <p>Loading...</p>
      ) : data.length === 0 ? (
        <p>No absentee records found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Admission No</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>

            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{r.studentName}</td>
                  <td style={tdStyle}>{r.admissionNumber}</td>
                  <td style={{ ...tdStyle, color: "red", fontWeight: "bold" }}>
                    {r.status}
                  </td>
                  <td style={tdStyle}>
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔥 SUMMARY TABLE */}
      {summary.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3>Absentee Summary</h3>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Admission</th>
                <th style={thStyle}>Total Absent</th>
              </tr>
            </thead>

            <tbody>
              {summary.map((s, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{s.studentName}</td>
                  <td style={tdStyle}>{s.admissionNumber}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>
                    {s.totalAbsent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ✅ Styles
const thStyle = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};