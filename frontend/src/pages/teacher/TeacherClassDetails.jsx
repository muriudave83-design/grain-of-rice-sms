import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  // ✅ NEW STATE (Phase 2)
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("ASSIGNMENT");
  const [maxScore, setMaxScore] = useState(100);

  useEffect(() => {
    fetchStudents();
  }, [id]);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/teacher/class/${id}/students`);
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setStudents([]);
    }
  };

  // ✅ CREATE ASSIGNMENT
  const handleCreate = async () => {
    try {
      await api.post(`/teacher/class/${id}/assignment`, {
        title,
        type,
        maxScore,
      });

      setTitle("");
      setType("ASSIGNMENT");
      setMaxScore(100);

      setShowModal(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
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
      {/* 🔙 Back Button (lighter style) */}
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

      {/* 📘 Header + Create Button */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#111827" }}>
            Class Students
          </h2>
          <p style={{ color: "#6b7280", marginTop: "5px" }}>
            Click a student to view details or create assignments
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 16px",
            backgroundColor: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          + Create Assignment
        </button>
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
                    transition: "background 0.2s",
                  }}
                  onClick={() =>
                    navigate(`/teacher/student/${student.id}`)
                  }
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f3f4f6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#fff")
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

      {/* ✅ MODAL */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "25px",
              borderRadius: "10px",
              width: "400px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>
              Create Assignment
            </h3>

            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PROJECT">Project</option>
              <option value="TEST">Test</option>
            </select>

            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "15px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCreate}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Create
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}