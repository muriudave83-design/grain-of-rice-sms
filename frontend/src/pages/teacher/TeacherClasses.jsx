import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get("/teacher/subjects");
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
      setSubjects([]);
    }
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
        Select a class & subject to manage assignments and grades
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
              onClick={() => navigate(`/teacher/gradebook/${ts.id}`)}
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#111827",
                cursor: "pointer",
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
              <h3 style={{ margin: 0 }}>
                {ts.class?.name || "Class"}
              </h3>

              <p style={{ marginTop: "5px", color: "#9ca3af" }}>
                {ts.subject?.name || "Subject"}
              </p>

              <p
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Click to manage assignments & grades
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}