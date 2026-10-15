import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../services/apiClient";

const emptyOptions = { subjects: [], terms: [], teacherSubjects: [] };

export default function Grades() {
  const [classes, setClasses] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherSubjectId, setTeacherSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [gradebook, setGradebook] = useState(null);
  const [classesLoading, setClassesLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [classesError, setClassesError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [gradebookError, setGradebookError] = useState("");
  const optionsRequestId = useRef(0);
  const gradebookRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    apiClient.get("/admin/gradebook/classes", { signal: controller.signal })
      .then(({ data }) => { if (current) setClasses(data); })
      .catch((requestError) => {
        if (current && requestError.code !== "ERR_CANCELED") {
          setClassesError(requestError.message || "Failed to load classes");
        }
      })
      .finally(() => { if (current) setClassesLoading(false); });
    return () => {
      current = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const requestId = ++optionsRequestId.current;
    setOptions(emptyOptions);
    setSubjectId("");
    setTeacherSubjectId("");
    setTermId("");
    setGradebook(null);
    setOptionsError("");
    setGradebookError("");
    setGradebookLoading(false);
    if (!classId) {
      setOptionsLoading(false);
      return () => controller.abort();
    }

    setOptionsLoading(true);
    apiClient.get(`/admin/gradebook/classes/${classId}/options`, { signal: controller.signal })
      .then(({ data }) => { if (current && optionsRequestId.current === requestId) setOptions(data); })
      .catch((requestError) => {
        if (current && optionsRequestId.current === requestId && requestError.code !== "ERR_CANCELED") {
          setOptionsError(requestError.message || "Failed to load gradebook options");
        }
      })
      .finally(() => { if (current && optionsRequestId.current === requestId) setOptionsLoading(false); });
    return () => {
      current = false;
      controller.abort();
    };
  }, [classId]);

  const teacherSubjects = useMemo(
    () => options.teacherSubjects.filter((item) => String(item.subjectId) === String(subjectId)),
    [options.teacherSubjects, subjectId],
  );

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const requestId = ++gradebookRequestId.current;
    setGradebook(null);
    setGradebookError("");
    if (!teacherSubjectId || !termId) {
      setGradebookLoading(false);
      return () => controller.abort();
    }

    setGradebookLoading(true);
    apiClient.get(`/admin/gradebook/teacher-subjects/${teacherSubjectId}`, {
      params: { termId },
      signal: controller.signal,
    })
      .then(({ data }) => { if (current && gradebookRequestId.current === requestId) setGradebook(data); })
      .catch((requestError) => {
        if (current && gradebookRequestId.current === requestId && requestError.code !== "ERR_CANCELED") {
          setGradebookError(requestError.message || "Failed to load gradebook");
        }
      })
      .finally(() => { if (current && gradebookRequestId.current === requestId) setGradebookLoading(false); });
    return () => {
      current = false;
      controller.abort();
    };
  }, [teacherSubjectId, termId]);

  const scoreFor = (assignment, studentId) =>
    assignment.scores.find((score) => score.studentId === studentId)?.score;
  const hasScores = gradebook?.assignments.some((assignment) => assignment.scores.length > 0);
  const loading = classesLoading || optionsLoading || gradebookLoading;
  const error = gradebookError || optionsError || classesError;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Administrator Gradebook</h1>
        <p className="mt-1 text-sm text-gray-600">
          Read-only view of legacy assignments and scores. Historical teacher ownership is preserved.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">
          Class
          <select className="mt-1 w-full rounded border p-2" value={classId} onChange={(event) => { optionsRequestId.current += 1; gradebookRequestId.current += 1; setClassId(event.target.value); setSubjectId(""); setTeacherSubjectId(""); setTermId(""); setGradebook(null); }}>
            <option value="">Select class</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Subject
          <select className="mt-1 w-full rounded border p-2" value={subjectId} disabled={!classId} onChange={(event) => { gradebookRequestId.current += 1; setSubjectId(event.target.value); setTeacherSubjectId(""); setTermId(""); setGradebook(null); setGradebookError(""); }}>
            <option value="">Select subject</option>
            {options.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Teacher assignment
          <select className="mt-1 w-full rounded border p-2" value={teacherSubjectId} disabled={!subjectId} onChange={(event) => { gradebookRequestId.current += 1; setTeacherSubjectId(event.target.value); setGradebook(null); setGradebookError(""); }}>
            <option value="">Select teacher assignment</option>
            {teacherSubjects.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} · {item.teacher.name} · {item.isActive ? "Active" : "Historical"}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Term
          <select className="mt-1 w-full rounded border p-2" value={termId} disabled={!classId} onChange={(event) => { gradebookRequestId.current += 1; setTermId(event.target.value); setGradebook(null); setGradebookError(""); }}>
            <option value="">Select term</option>
            {options.terms.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.academicYear}{item.isLocked ? " · Locked" : ""}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-sm text-gray-500">Loading gradebook…</p>}

      {!loading && teacherSubjectId && termId && gradebook?.assignments.length === 0 && (
        <div className="rounded-lg border border-dashed bg-gray-50 p-8 text-center text-gray-600">
          No legacy assignments exist for this exact teacher assignment and term, so there are no scores to display.
        </div>
      )}

      {!loading && gradebook?.assignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">TeacherSubject #{gradebook.teacherSubject.id}</span>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gradebook.teacherSubject.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
              {gradebook.teacherSubject.isActive ? "Active assignment" : "Historical assignment"}
            </span>
            <span className="text-gray-600">{gradebook.teacherSubject.teacher.name}</span>
          </div>

          {!hasScores && (
            <div className="rounded border border-dashed bg-gray-50 p-4 text-sm text-gray-600">
              These assignments do not have any scores yet.
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 p-3 text-left">Student</th>
                  {gradebook.assignments.map((assignment) => (
                    <th key={assignment.id} className="min-w-36 p-3 text-center">
                      <span className="block">{assignment.title}</span>
                      <span className="font-normal text-gray-500">Assignment #{assignment.id} · Max {assignment.maxPoints}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradebook.students.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="sticky left-0 bg-white p-3">
                      <span className="block font-medium">{student.firstName} {student.lastName}</span>
                      <span className="text-xs text-gray-500">{student.admissionNo}</span>
                    </td>
                    {gradebook.assignments.map((assignment) => {
                      const score = scoreFor(assignment, student.id);
                      return (
                        <td key={assignment.id} className="p-3 text-center">
                          {score === undefined ? <span className="text-gray-400">—</span> : <span>{score} / {assignment.maxPoints}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {gradebook.students.length === 0 && <p className="p-6 text-center text-gray-500">No active students are currently in this class.</p>}
          </div>
        </div>
      )}

      {!loading && !gradebook && !error && (
        <p className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          Select a class, subject, exact teacher assignment and term to view scores.
        </p>
      )}
    </div>
  );
}
