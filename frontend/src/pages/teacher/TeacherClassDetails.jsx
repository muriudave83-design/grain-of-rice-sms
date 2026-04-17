import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function TeacherClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStudents();
  }, [id]);

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get(`/teacher/class/${id}/students`);
      setStudents(res.data || []);
    } catch (err) {
      console.error("FETCH STUDENTS ERROR:", err);
      setStudents([]);
    }
  };

  // 🔍 Filter students
  const filteredStudents = students.filter((student) => {
    const fullName =
      `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <div
      style={{
        padding: "30px",
        backgroundColor: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      {/* 🔙 Back Button */}
      <button
        onClick={() => navigate("/teacher/classes")}
        style={{
          marginBottom: "20px",
          background: "none",
          border: "none",
          color: "#2563eb",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ← Back to Classes
      </button>

      {/* 📘 Header */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, color: "#111827" }}>
          Class Students
        </h2>
        <p style={{ color: "#6b7280", marginTop: "5px" }}>
          Click a student to view details
        </p>
      </div>

      {/* 🔍 Search */}
      <input
        type="text"
        placeholder="Search students..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: "20px",
          padding: "10px",
          width: "100%",
          maxWidth: "400px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {/* 📋 Table */}
      {filteredStudents.length === 0 ? (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            textAlign: "center",
            color: "#888",
          }}
        >
          No students found
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#fff",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#1f2937", color: "#fff" }}>
                <th style={{ padding: "14px", textAlign: "left" }}>#</th>
                <th style={{ padding: "14px", textAlign: "left" }}>
                  Student Name
                </th>
                <th style={{ padding: "14px", textAlign: "left" }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student, index) => (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    navigate(`/teacher/student/${student.id}`)
                  }
                >
                  <td style={{ padding: "12px" }}>{index + 1}</td>

                  <td style={{ padding: "12px", fontWeight: "500" }}>
                    {student.firstName} {student.lastName}
                  </td>

                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/student/${student.id}`);
                      }}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      View
                    </button>
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