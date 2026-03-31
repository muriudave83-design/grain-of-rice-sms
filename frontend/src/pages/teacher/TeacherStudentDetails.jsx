import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherStudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("ASSIGNMENT");
  const [maxScore, setMaxScore] = useState(100);

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

  const handleCreate = async () => {
    try {
      await api.post(`/teacher/student/${id}/assignment`, {
        title,
        type,
        maxScore,
      });

      setShowModal(false);
      setTitle("");
      setType("ASSIGNMENT");
      setMaxScore(100);

      fetchData();
    } catch (err) {
      console.error(err);
    }
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
      <button onClick={() => navigate(-1)} style={backBtn}>
        ← Back
      </button>

      <div style={breadcrumb}>
        Teacher / Classes / Students /{" "}
        <span style={{ color: "#111", fontWeight: 600 }}>
          Gradebook
        </span>
      </div>

      <div style={header}>
        <div>
          <h2 style={title}>Student Performance</h2>
          <p style={subtitle}>
            Detailed assignment scores and insights
          </p>
        </div>

        <button style={createBtn} onClick={() => setShowModal(true)}>
          + Create Assignment
        </button>

        {data.length > 0 && (
          <div style={floatingBadge}>Avg: {average}</div>
        )}
      </div>
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

                    <td style={td}>
                      <div style={scoreRow}>
                        <span
                          style={{
                            ...scoreBadge,
                            backgroundColor: getScoreColor(score),
                          }}
                        >
                          {score}
                        </span>

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

      {showModal && (
        <div style={modalOverlay}>
          <div style={modal}>
            <h3>Create Assignment</h3>

            <input
              style={input}
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <select
              style={input}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PROJECT">Project</option>
              <option value="TEST">Test</option>
            </select>

            <input
              style={input}
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />

            <div style={modalActions}>
              <button style={createBtn} onClick={handleCreate}>
                Create
              </button>
              <button style={cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}