import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherStudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/teacher/student/${id}/gradebook`);
      setData(res.data || []);
    } catch (err) {
      console.error(err);
      setData([]);
    }
  };

  // ✅ UPDATE SCORE API
  const updateScore = async (item) => {
    try {
      await api.put("/teacher/score", {
        assessmentId: item.assessmentId,
        studentId: Number(id),
        score: item.score,
      });
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // ✅ HANDLE INPUT CHANGE
  const handleScoreChange = (index, value) => {
    const updated = [...data];
    updated[index].score = Number(value);
    setData(updated);

    // auto-save
    updateScore(updated[index]);
  };

  // SAFE calculations
  const avgRaw =
    data.length > 0
      ? data.reduce((sum, item) => sum + (Number(item.score) || 0), 0) /
        data.length
      : 0;

  const average = avgRaw.toFixed(1);

  const getScoreColor = (score) => {
    if (score >= 80) return "#16a34a";
    if (score >= 65) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#dc2626";
  };

  const getGrade = (score) => {
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    if (score >= 40) return "D";
    return "F";
  };

  const topScore =
    data.length > 0
      ? Math.max(...data.map((d) => Number(d.score) || 0))
      : null;

  return (
    <div style={page}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        ← Back
      </button>

      {/* Breadcrumb */}
      <div style={breadcrumb}>
        Teacher / Classes / Students /{" "}
        <span style={{ color: "#111", fontWeight: 600 }}>
          Gradebook
        </span>
      </div>

      {/* Header */}
      <div style={header}>
        <div>
          <h2 style={titleStyle}>Student Performance</h2>
          <p style={subtitle}>
            Detailed assignment scores and insights
          </p>
        </div>

        {data.length > 0 && (
          <div style={floatingBadge}>Avg: {average}</div>
        )}
      </div>

      {/* Summary Cards */}
      {data.length > 0 && (
        <div style={cards}>
          <div style={card}>
            <div style={label}>Assignments</div>
            <div style={value}>{data.length}</div>
          </div>

          <div style={card}>
            <div style={label}>Average</div>
            <div style={{ ...value, color: getScoreColor(avgRaw) }}>
              {average}
            </div>
          </div>

          <div style={card}>
            <div style={label}>Grade</div>
            <div style={value}>{getGrade(avgRaw)}</div>
          </div>
        </div>
      )}

      {/* Table */}
      {data.length === 0 ? (
        <div style={empty}>No assignments found</div>
      ) : (
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr style={thead}>
                <th style={th}>#</th>
                <th style={th}>Assignment</th>
                <th style={th}>Score</th>
                <th style={th}>Grade</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item, index) => {
                const score = Number(item?.score ?? 0);
                const isTop = score === topScore;

                return (
                  <tr
                    key={index}
                    style={{
                      ...row,
                      backgroundColor: isTop ? "#ecfdf5" : "#fff",
                    }}
                  >
                    <td style={td}>{index + 1}</td>

                    <td style={{ ...td, fontWeight: 500 }}>
                      {item.title || "Untitled"}
                      {isTop && <span style={topBadge}>Top</span>}
                    </td>

                    {/* ✅ INLINE EDIT INPUT */}
                    <td style={td}>
                      <input
                        type="number"
                        value={score}
                        onChange={(e) =>
                          handleScoreChange(index, e.target.value)
                        }
                        style={{
                          width: "70px",
                          padding: "6px",
                          borderRadius: "6px",
                          border: "1px solid #ccc",
                          marginRight: "10px",
                        }}
                      />

                      <div style={progress}>
                        <div
                          style={{
                            width: `${Math.min(score, 100)}%`,
                            height: "100%",
                            backgroundColor: getScoreColor(score),
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </td>

                    <td style={td}>
                      <span style={gradeBadge}>
                        {getGrade(score)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* STYLES */

const page = {
  padding: "30px",
  background: "linear-gradient(to right, #eef2f7, #f8fafc)",
  minHeight: "100vh",
};

const backBtn = {
  marginBottom: "15px",
  padding: "10px 14px",
  backgroundColor: "#111827",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const breadcrumb = {
  marginBottom: "10px",
  fontSize: "14px",
  color: "#6b7280",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const titleStyle = { margin: 0, color: "#111827" };
const subtitle = { color: "#6b7280", marginTop: "5px" };

const floatingBadge = {
  backgroundColor: "#111827",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: "20px",
  fontSize: "13px",
};

const cards = {
  display: "flex",
  gap: "20px",
  marginBottom: "25px",
};

const card = {
  flex: 1,
  backgroundColor: "#fff",
  padding: "15px",
  borderRadius: "10px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
};

const label = { fontSize: "13px", color: "#6b7280" };
const value = { fontSize: "22px", fontWeight: "600" };

const tableWrapper = {
  borderRadius: "10px",
  overflow: "hidden",
  boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "#fff",
};

const thead = { backgroundColor: "#111827", color: "#fff" };
const th = { padding: "14px", textAlign: "left" };
const td = { padding: "12px", borderBottom: "1px solid #eee" };
const row = { transition: "0.2s" };

const gradeBadge = {
  padding: "5px 10px",
  borderRadius: "6px",
  backgroundColor: "#e5e7eb",
  fontWeight: "600",
};

const topBadge = {
  marginLeft: "10px",
  backgroundColor: "#10b981",
  color: "#fff",
  fontSize: "10px",
  padding: "3px 6px",
  borderRadius: "6px",
};

const progress = {
  width: "120px",
  height: "6px",
  backgroundColor: "#e5e7eb",
  borderRadius: "4px",
  overflow: "hidden",
};

const empty = {
  padding: "25px",
  backgroundColor: "#fff",
  borderRadius: "10px",
  textAlign: "center",
  color: "#6b7280",
};