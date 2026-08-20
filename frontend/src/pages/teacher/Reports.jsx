import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import BackButton from "../../components/BackButton";
import { formatGrade } from "../../utils/grading";

export default function Reports() {
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);

  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState(null);

  const [comments, setComments] = useState({});

  const saveComment = async (
    studentId,
    teacherSubjectId,
    value
  ) => {
    try {
      if (!teacherSubjectId) return;

      await apiClient.post(
        "/teacher/report/comment",
        {
          studentId,
          teacherSubjectId,
          termId,
          comment: value,
        }
      );

      setComments((prev) => ({
        ...prev,
        [studentId + "-" + teacherSubjectId]:
          value,
      }));
    } catch (err) {
      console.error(
        "SAVE COMMENT ERROR:",
        err.response?.data || err
      );
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to save comment"
      );
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 300);
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await apiClient.get(
          "/teacher/classes"
        );

        setClasses(res.data);
      } catch (err) {
        console.error(err);
        setTerms([]);
        setTermId(null);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load terms"
        );
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchTerms = async () => {
      if (!classId) return;

      try {
        const res = await apiClient.get(
          `/teacher/terms/${classId}`
        );

        setTerms(res.data || []);

        if (res.data.length > 0) {
          setTermId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTerms();
  }, [classId]);

  const handleGenerate = async () => {
    if (!classId || !termId) {
      alert("Select class and term");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("🚀 GENERATE CLICKED", {
        classId,
        termId,
      });

      const res = await apiClient.get(
        `/teacher/report/${classId}?termId=${termId}`
      );

      console.log(
        "📦 REPORT RESPONSE:",
        JSON.stringify(res.data, null, 2)
      );

      setReports(res.data);
      setFilteredReports(res.data);
    } catch (err) {
      console.error(
        "❌ GENERATE REPORT ERROR:",
        err.response?.data || err
      );

      setError("Failed to generate reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!search) {
      setFilteredReports(reports);
    } else {
      const lower = search.toLowerCase();

      setFilteredReports(
        reports.filter((r) =>
          r.name.toLowerCase().includes(lower)
        )
      );
    }
  }, [search, reports]);

  const selectedClassName =
    classes.find((c) => c.id == classId)
      ?.name || "";

  const selectedTermName =
    terms.find((t) => t.id === termId)
      ?.name || "";

  return (
    <div className="p-6 max-w-5xl mx-auto print-area">
      <BackButton />

      <div className="flex items-center gap-4 mb-6 print-hidden">
        <img
          src="/logo.png"
          alt="School Logo"
          className="w-14 h-14"
        />

        <div>
          <h1 className="text-3xl font-bold">
            Grain of Rice Academy
          </h1>

          <p>Official Report Cards</p>
        </div>
      </div>

      <div className="mb-4">
        <strong>Grade:</strong>{" "}
        {selectedClassName} <br />
        <strong>Term:</strong>{" "}
        {selectedTermName}
      </div>

      <div className="mb-6 flex gap-3 flex-wrap">
        <select
          value={classId}
          onChange={(e) =>
            setClassId(e.target.value)
          }
          className="border px-3 py-2"
        >
          <option value="">
            Select Class
          </option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || `Class ${c.id}`}
            </option>
          ))}
        </select>

        <select
          value={termId ?? ""}
          onChange={(e) =>
            setTermId(Number(e.target.value))
          }
          className="border px-3 py-2"
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (
              {t.startDate
                ? new Date(
                    t.startDate
                  ).toLocaleDateString()
                : "No start"}
              {" → "}
              {t.endDate
                ? new Date(
                    t.endDate
                  ).toLocaleDateString()
                : "No end"}
              )
            </option>
          ))}
        </select>

        <input
          placeholder="Search student..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="border px-3 py-2"
        />

        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-4 py-2"
        >
          Generate
        </button>

        <button
          onClick={handlePrint}
          disabled={
            filteredReports.length === 0 ||
            loading
          }
          className="bg-green-600 text-white px-4 py-2"
        >
          Print
        </button>
      </div>

      {loading && (
        <p>Generating reports...</p>
      )}

      {error && (
        <p className="text-red-600">
          {error}
        </p>
      )}

      {!loading &&
      filteredReports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <div>
          {filteredReports.map((student) => {

            console.log("🧠 FULL STUDENT:", student);

            return (
              <div
                key={student.studentId}
                className="border p-6 rounded mb-6 print-card bg-white"
              >
                {/* HEADER */}
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="School Logo"
                    className="w-12 h-12 object-contain"
                  />

                  <div>
                    <h2 className="text-xl font-bold">
                      Grain of Rice Academy
                    </h2>

                    <p className="text-sm">
                      Official Report Card
                    </p>
                  </div>
                </div>

                {/* STUDENT INFO */}
                <div className="mb-4">
                  <p>
                    <strong>Student:</strong>{" "}
                    {student.name}
                  </p>

                  <p>
                    <strong>Grade:</strong>{" "}
                    {selectedClassName}
                  </p>

                  <p>
                    <strong>Term:</strong>{" "}
                    {selectedTermName}
                  </p>
                </div>

                <hr className="my-3" />

                {/* SUBJECT TABLE */}
                <div className="mb-4">
                  <div className="grid grid-cols-3 font-semibold border-b pb-1">
                    <span>Subject</span>
                    <span>Score</span>
                    <span>Grade</span>
                  </div>

                  {student.subjects.map((sub) => {
                    const key =
                      student.studentId +
                      "-" +
                      sub.teacherSubjectId;

                    return (
                      <div
                        key={key}
                        className="grid grid-cols-3 py-1"
                      >
                        <span>
                          {sub.subjectName}
                        </span>

                        <span>
                          {sub.finalGrade}%
                        </span>

                        <span>{formatGrade(sub.letter)}</span>
                      </div>
                    );
                  })}
                </div>

                <hr className="my-3" />

                {/* ATTENDANCE */}
                <div className="mt-4 border-t pt-3">
                  <h3 className="font-bold mb-2">
                    Attendance
                  </h3>

                  <p>
                      <strong>Present:</strong>{" "}
                      {Number(student.present || 0)}
                    </p>

                    <p>
                      <strong>Absent:</strong>{" "}
                      {Number(student.absent || 0)}
                    </p>

                    <p>
                      <strong>Late:</strong>{" "}
                      {Number(student.late || 0)}
                    </p>
                  <p>
                    <strong>Attendance Rate:</strong>{" "}
                    {student.attendanceRate ?? 0}%
                  </p>
                </div>

                <hr className="my-3" />

                {/* COMMENTS */}
                <div>
                  <p className="font-semibold mb-1">
                    Comment:
                  </p>

                  {student.subjects.map((sub) => {
                    const key =
                      student.studentId +
                      "-" +
                      sub.teacherSubjectId;

                    return (
                      <textarea
                        key={key}
                        className="border w-full mt-1 p-1"
                        value={
                          comments[key] ||
                          sub.comment ||
                          ""
                        }
                        onChange={(e) => {
                          const val =
                            e.target.value;

                          setComments((prev) => ({
                            ...prev,
                            [key]: val,
                          }));
                        }}
                        onBlur={(e) =>
                          saveComment(
                            student.studentId,
                            sub.teacherSubjectId,
                            e.target.value
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
