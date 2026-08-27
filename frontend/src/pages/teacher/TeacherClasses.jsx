import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../../services/apiClient";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [teachingGroups, setTeachingGroups] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const [subjectResult, groupResult] = await Promise.allSettled([
        apiClient.get("/teacher/subjects"),
        apiClient.get("/teacher/teaching-groups"),
      ]);
      setSubjects(subjectResult.status === "fulfilled" ? subjectResult.value.data || [] : []);
      setTeachingGroups(groupResult.status === "fulfilled" ? groupResult.value.data || [] : []);
      if (subjectResult.status === "rejected") throw subjectResult.reason;
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
      `/teacher/final-grades/${teacherSubject.classId}`
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

      {teachingGroups.length > 0 && (
        <section style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "12px" }}>Combined Teaching Groups</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {teachingGroups.map((group) => (
              <div key={group.id} style={{ padding: "20px", borderRadius: "12px", background: "#172554", border: "1px solid #1d4ed8" }}>
                <h3>{group.name}</h3>
                <p style={{ color: "#bfdbfe" }}>Combined Classes: {group.classes.map((lane) => lane.classSubject.class.name).join(" + ")}</p>
                <button onClick={() => navigate(`/teacher/combined-gradebook/${group.id}`)} style={{ background: "#2563eb", color: "white", padding: "8px 12px", border: 0, borderRadius: "6px", cursor: "pointer" }}>Open Gradebook</button>
              </div>
            ))}
          </div>
        </section>
      )}

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
