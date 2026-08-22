import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { formatGrade } from "../../utils/grading";
import { buildFinalGradesCsv, filenamePart } from "../../utils/finalGradesCsv";

export default function FinalGrades() {
  const { classId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const termIdRaw = searchParams.get("termId");
  const termId = termIdRaw ? Number(termIdRaw) : null;

  const [data, setData] = useState([]);
  const [terms, setTerms] = useState([]);
  const [className, setClassName] = useState(`Class ${classId}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setError("");
        const res = await apiClient.get(`/teacher/terms/${classId}`);
        const classTerms = res.data || [];
        setTerms(classTerms);

        if (classTerms.some((term) => term.id === termId)) return;

        if (classTerms.length === 0) {
          setError("No term is configured for this class. Contact an administrator.");
        } else if (classTerms.length === 1) {
          setSearchParams({ termId: String(classTerms[0].id) }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      } catch (err) {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load terms"
        );
      }
    };

    if (classId) fetchTerms();
  }, [classId, termId, setSearchParams]);

  useEffect(() => {
    const fetchClassName = async () => {
      try {
        const res = await apiClient.get("/teacher/classes");
        const selectedClass = (res.data || []).find(
          (entry) => entry.id === Number(classId)
        );
        if (selectedClass?.name) setClassName(selectedClass.name);
      } catch (err) {
        console.error("Failed to load class name:", err);
      }
    };

    fetchClassName();
  }, [classId]);

  useEffect(() => {
    if (!classId || !termId) {
      setData([]);
      return;
    }

    let cancelled = false;
    setData([]);

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.get(
          `/teacher/final-grades/${classId}?termId=${termId}`
        );
        if (!cancelled) setData(res.data || []);
      } catch (err) {
        console.error("Final Grades fetch error:", err);
        if (cancelled) return;
        setData([]);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load final grades"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [classId, termId]);

  useEffect(() => {
    setPublished(false);
  }, [termId]);

  const selectedTerm = terms.find((term) => term.id === termId);

  const handlePublish = async () => {
    if (!termId) return;

    try {
      setPublishing(true);
      setError("");
      await apiClient.post(`/teacher/final-grades/${classId}/publish`, { termId });
      setPublished(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to publish final grades"
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = () => {
    if (!termId || data.length === 0) return;

    const csv = buildFinalGradesCsv({ data, className, term: selectedTerm });
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePart(className)}-${filenamePart(selectedTerm?.name)}-final-grades.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateTranscripts = async () => {
    if (!termId) return;

    try {
      setGenerating(true);
      setError("");
      const res = await apiClient.post("/teacher/transcript/generate", {
        classId: Number(classId),
        termId,
      });
      const generated = res.data?.generated || 0;
      const existing = res.data?.existing || 0;
      window.alert(
        generated > 0
          ? `Generated ${generated} transcript${generated === 1 ? "" : "s"}.`
          : `${existing} transcript${existing === 1 ? "" : "s"} already existed; no snapshots were changed.`
      );
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to generate transcripts"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton />

      <h1 className="text-2xl font-bold mb-1">Final Grades</h1>
      <p className="text-sm text-gray-500 mb-4">Class: {className}</p>

      <select
        value={termId ?? ""}
        onChange={(event) => setSearchParams({ termId: event.target.value })}
        className="border px-3 py-2 mb-4"
      >
        <option value="" disabled>
          {terms.length > 1 ? "Select a term" : "Select term"}
        </option>
        {terms.map((term) => (
          <option key={term.id} value={term.id}>
            {term.name} — {term.academicYear}
          </option>
        ))}
      </select>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="mb-4">Loading...</p>}

      <div className="mb-4 flex gap-2">
        <button
          onClick={handlePublish}
          disabled={!termId || !selectedTerm || data.length === 0 || loading || publishing || published}
          className="bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {publishing ? "Publishing..." : published ? "Published" : "Publish Final Grades"}
        </button>
        <button
          onClick={handleExport}
          disabled={!termId || !selectedTerm || data.length === 0 || loading}
          className="bg-gray-200 disabled:text-gray-400 px-4 py-2 rounded"
        >
          Export CSV
        </button>
        <button
          onClick={handleGenerateTranscripts}
          disabled={!termId || !selectedTerm || data.length === 0 || loading || generating}
          className="bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {generating ? "Generating..." : "Generate Transcripts"}
        </button>
        <button
          onClick={() => navigate("/teacher/classes")}
          className="bg-gray-100 px-4 py-2 rounded"
        >
          Back to Classes
        </button>
      </div>

      {!termId ? (
        <p>Select a term to view final grades.</p>
      ) : !loading && data.length === 0 ? (
        <p>No students found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Student Name</th>
              <th style={thStyle}>Average (%)</th>
              <th style={thStyle}>Grade</th>
              <th style={thStyle}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.map((student, index) => {
              const grade = student.letter;
              const avg = student.average;
              return (
                <tr key={student.studentId} style={{ background: index % 2 === 0 ? "#f9f9f9" : "transparent" }}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>{student.name}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{avg == null ? "—" : `${avg.toFixed(1)}%`}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold", color: grade === "F" ? "red" : "black", textAlign: "center" }}>
                    {student.isComplete === false ? "Incomplete" : formatGrade(grade, "-")}
                  </td>
                  <td style={tdStyle}>{student.remarks ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  background: "#f5f5f5",
  padding: "10px",
  textAlign: "left",
  fontWeight: 600,
  borderBottom: "1px solid #ddd",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};
