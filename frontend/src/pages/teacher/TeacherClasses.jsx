import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../../services/apiClient";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get("/teacher/subjects");
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
      setSubjects([]);
    }
  };

  const openGradebook = (teacherSubject) => {
    if (!teacherSubject?.id) {
      toast.error("No gradebook assigned yet");
      return;
    }

    if (!teacherSubject?.id) {
      toast.error("No gradebook assigned yet");
      return;
    }

    navigate(`/teacher/gradebook/${teacherSubject.id}`);
  };

  const openFinalGrades = (teacherSubject) => {
    if (!teacherSubject?.classId) {
      toast.error("No class assigned yet");
      return;
    }

    navigate(
      `/teacher/final-grades/${teacherSubject.classId}?termId=1`
    );
  };

  return (
    <div
      style={{
        padding: "30px",
        minHeight: "100vh",
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <h2 style={{ marginBottom: "10px" }}>My Classes</h2>

      <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
        Select an action below
      </p>

      {subjects.length === 0 ? (
        <p>No subjects found</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          {subjects.map((ts) => (
            <div
              key={ts.id}
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#111827",
                border: "1px solid #1f2937",
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1f2937")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#111827")
              }
            >
              {/* CLASS INFO */}
              <h3 style={{ margin: 0 }}>
                {ts.class?.name || "Class"}
              </h3>

              <p style={{ marginTop: "5px", color: "#9ca3af" }}>
                {ts.subject?.name || "Subject"}
              </p>

              {/* DIVIDER */}
              <hr
                style={{
                  margin: "10px 0",
                  border: "0.5px solid #1f2937",
                }}
              />

              {/* ACTIONS */}
              <div style={{ marginTop: "10px" }}>
                {/* PRIMARY */}
                <button
                  onClick={() => openGradebook(ts)}
                  style={{
                    background: "#1976d2",
                    color: "white",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Open Gradebook
                </button>

                {/* SECONDARY */}
                <button
                  onClick={() => openFinalGrades(ts)}
                  style={{
                    marginLeft: "10px",
                    background: "#e5e7eb",
                    color: "#111827",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Final Grades
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}