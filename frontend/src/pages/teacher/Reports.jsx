import { useEffect, useState, useRef } from "react";
import apiClient from "../../services/apiClient";
import BackButton from "../../components/BackButton";

export default function Reports() {
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);

  const [loading, setLoading] = useState(false);
  const [savingMap, setSavingMap] = useState({});
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ✅ REAL TERM SYSTEM
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState(null);

  // 🆕 debounce timers
  const debounceTimers = useRef({});

  // 📚 LOAD TEACHER CLASSES
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await apiClient.get("/teacher/classes");
        setClasses(res.data);
      } catch (err) {
        console.error("Failed to fetch classes", err);
      }
    };

    fetchClasses();
  }, []);

  // ✅ LOAD TERMS (CRITICAL)
  useEffect(() => {
    const fetchTerms = async () => {
      if (!classId) return;

      try {
        const res = await apiClient.get(`/teacher/terms/${classId}`);
        setTerms(res.data);

        if (res.data.length > 0) {
          setTermId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load terms", err);
      }
    };

    fetchTerms();
  }, [classId]);

  // 🧾 FETCH REPORTS (TERM AWARE)
  const fetchReports = async (selectedClassId, termId) => {
    if (!selectedClassId || !termId) return;

    try {
      setLoading(true);
      setError("");

      const res = await apiClient.get(
        `/teacher/report/${selectedClassId}?termId=${termId}`
      );

      setReports(res.data);
      setFilteredReports(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // ✅ AUTO FETCH (TERM + CLASS)
  useEffect(() => {
    if (classId && termId) {
      fetchReports(classId, termId);
    }
  }, [classId, termId]);
    // 🔍 SEARCH FILTER
  useEffect(() => {
    if (!search) {
      setFilteredReports(reports);
    } else {
      const lower = search.toLowerCase();
      setFilteredReports(
        reports.filter((s) =>
          s.name.toLowerCase().includes(lower)
        )
      );
    }
  }, [search, reports]);

  // 🎨 GRADE COLOR
  const getGradeColor = (letter) => {
    switch (letter) {
      case "A":
        return "text-green-600";
      case "B":
        return "text-blue-600";
      case "C":
        return "text-yellow-600";
      case "D":
        return "text-orange-600";
      default:
        return "text-red-600";
    }
  };

  // ✍️ SAVE COMMENT (DEBOUNCED)
  const handleSaveComment = (
    studentId,
    teacherSubjectId,
    comment
  ) => {
    const key = `${studentId}-${teacherSubjectId}`;

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(async () => {
      try {
        setSavingMap((prev) => ({ ...prev, [key]: "saving" }));

        await apiClient.post("/teacher/report/comment", {
          studentId,
          teacherSubjectId,
          comment,
        });

        setSavingMap((prev) => ({ ...prev, [key]: "saved" }));

        setTimeout(() => {
          setSavingMap((prev) => ({ ...prev, [key]: "" }));
        }, 1500);
      } catch (err) {
        console.error(err);
        setSavingMap((prev) => ({ ...prev, [key]: "error" }));
      }
    }, 800);
  };

  // 📊 STUDENT AVERAGE
  const calculateOverall = (subjects) => {
    const valid = subjects.filter((s) => s.finalGrade > 0);
    if (valid.length === 0) return 0;

    const total = valid.reduce((sum, s) => sum + s.finalGrade, 0);
    return (total / valid.length).toFixed(1);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton />

      {/* 🆕 SCHOOL HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src="/logo.png"
          alt="School Logo"
          className="w-14 h-14 object-contain"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Grain of Rice SMS
          </h1>
          <p className="text-gray-500">Official Report Cards</p>
        </div>
      </div>

      {/* PAGE TITLE */}
      <h2 className="text-2xl font-semibold text-gray-800">
        📊 Report Cards
      </h2>

      {/* ✅ SHOW REAL TERM NAME */}
      <p className="text-gray-600 mb-4">
        {terms.find((t) => t.id === termId)?.name || ""}
      </p>

      {/* CONTROLS */}
      <div className="sticky top-0 bg-white z-10 pb-4 mb-6 border-b">
        <div className="flex flex-wrap gap-3 items-center">

          {/* CLASS */}
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || `Class ${c.id}`}
              </option>
            ))}
          </select>

          {/* ✅ FIXED TERM DROPDOWN */}
          <select
            value={termId ?? ""}
            onChange={(e) => setTermId(Number(e.target.value))}
            className="border px-3 py-2 rounded"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* SEARCH */}
          <input
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-60"
          />

          {/* PRINT */}
          <button
            onClick={() => window.print()}
            disabled={reports.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Print
          </button>
        </div>

        {error && (
          <p className="text-red-600 mt-2">{error}</p>
        )}
      </div>
            {/* STATES */}
      {loading && (
        <p className="text-gray-500">Generating reports...</p>
      )}

      {!loading && filteredReports.length === 0 && (
        <p className="text-gray-500">No reports found.</p>
      )}

      {/* REPORT CARDS */}
      <div className="space-y-8">
        {filteredReports.map((student) => {
          const overall = calculateOverall(student.subjects);

          return (
            <div
              key={student.studentId}
              className="report-card bg-white border rounded-xl shadow-sm p-6 print:shadow-none print:border-none"
            >
              {/* PRINT HEADER */}
              <div className="hidden print:block mb-4 border-b pb-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="logo"
                    className="w-10 h-10"
                  />
                  <div>
                    <h2 className="font-bold text-lg">
                      Grain of Rice SMS
                    </h2>
                    <p className="text-sm text-gray-500">
                      {terms.find((t) => t.id === termId)?.name} Report Card
                    </p>
                  </div>
                </div>
              </div>

              {/* STUDENT HEADER */}
              <div className="flex justify-between items-start mb-4 border-b pb-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {student.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {terms.find((t) => t.id === termId)?.name}
                  </p>
                </div>

                <div className="text-sm font-bold text-gray-600">
                  Overall:{" "}
                  <span className="text-blue-700">
                    {overall}
                  </span>
                </div>
              </div>

              {/* SUBJECTS */}
              <div className="space-y-5">
                {student.subjects.map((s) => {
                  const key = `${student.studentId}-${s.teacherSubjectId}`;
                  const status = savingMap[key];

                  return (
                    <div
                      key={s.teacherSubjectId}
                      className="border-b pb-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">
                          {s.subjectName}
                        </span>

                        <span
                          className={`text-sm font-semibold ${getGradeColor(
                            s.letter
                          )}`}
                        >
                          {s.finalGrade} ({s.letter})
                        </span>
                      </div>

                      <div className="relative">
                        <textarea
                          defaultValue={s.comment}
                          onChange={(e) =>
                            handleSaveComment(
                              student.studentId,
                              s.teacherSubjectId,
                              e.target.value
                            )
                          }
                          placeholder="Write teacher comment..."
                          className="border rounded p-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          rows={3}
                        />

                        {status && (
                          <span
                            className={`absolute right-2 top-2 text-xs ${
                              status === "saving"
                                ? "text-gray-500"
                                : status === "saved"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {status === "saving" && "Saving..."}
                            {status === "saved" && "Saved ✓"}
                            {status === "error" && "Error!"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* PRINT STYLES */}
      <style>
        {`
          @media print {
            body {
              background: white;
            }

            .report-card {
              page-break-inside: avoid;
              margin-bottom: 30px;
            }

            textarea {
              border: none !important;
              resize: none !important;
              padding: 0 !important;
              font-size: 14px;
            }

            button, select, input {
              display: none !important;
            }

            .print\\:block {
              display: block !important;
            }
          }
        `}
      </style>
    </div>
  );
}