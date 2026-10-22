import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../services/apiClient";

const emptyOptions = { subjects: [], terms: [], teacherSubjects: [] };

export default function Grades({
  apiBase = "/admin/gradebook",
  title = "Administrator Gradebook",
}) {
  const [classes, setClasses] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherSubjectId, setTeacherSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [gradebook, setGradebook] = useState(null);
  const [contributionReview, setContributionReview] = useState(null);
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
    apiClient.get(`${apiBase}/classes`, { signal: controller.signal })
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
  }, [apiBase]);

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
    apiClient.get(`${apiBase}/classes/${classId}/options`, { signal: controller.signal })
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
  }, [apiBase, classId]);

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
    apiClient.get(`${apiBase}/teacher-subjects/${teacherSubjectId}`, {
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
  }, [apiBase, teacherSubjectId, termId]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setContributionReview(null);
    if (!classId || !subjectId || !termId || apiBase !== "/admin/gradebook") return () => controller.abort();
    apiClient.get(`${apiBase}/contribution-scopes/status`, {
      params: { classId, subjectId, termId },
      signal: controller.signal,
    }).then(({ data }) => {
      if (current) setContributionReview(data);
    }).catch((requestError) => {
      if (current && requestError.code !== "ERR_CANCELED") {
        setGradebookError(requestError?.response?.data?.message || "Unable to load assignment inclusion review");
      }
    });
    return () => {
      current = false;
      controller.abort();
    };
  }, [apiBase, classId, subjectId, termId]);

  const scoreFor = (assignment, studentId) =>
    assignment.scores.find((score) => score.studentId === studentId)?.score;
  const hasScores = gradebook?.assignments.some((assignment) => assignment.scores.length > 0);
  const loading = classesLoading || optionsLoading || gradebookLoading;
  const error = gradebookError || optionsError || classesError;
  const needsContributionReview = contributionReview?.scope?.mode === "REVIEWING";

  const reviewAssignment = async (assignment, status) => {
    const note = status === "EXCLUDED" ? globalThis.prompt("Reason for excluding this assignment:") : globalThis.prompt("Review note (optional):", assignment.gradeContributionNote || "");
    if (note === null || (status === "EXCLUDED" && !note.trim())) return;
    const scoreCount = assignment.scoreCount ?? assignment.scores?.length ?? 0;
    if (status === "EXCLUDED" && scoreCount > 0 && !globalThis.confirm("Exclude this scored assignment from future final-grade calculations? Scores will be preserved.")) return;
    try {
      const { data } = await apiClient.patch(`${apiBase}/assignments/${assignment.id}/contribution`, {
        status, note, expectedReviewedAt: assignment.gradeContributionReviewedAt || null,
      });
      setGradebook((current) => current ? ({ ...current, assignments: current.assignments.map((item) => item.id === assignment.id ? { ...item, ...data, scores: item.scores } : item) }) : current);
      setContributionReview((current) => current ? ({
        ...current,
        scope: data.scope,
        assignments: current.assignments.map((item) => item.id === assignment.id ? {
          ...item,
          gradeContributionStatus: data.gradeContributionStatus,
          gradeContributionNote: data.gradeContributionNote,
          gradeContributionReviewedAt: data.gradeContributionReviewedAt,
        } : item),
      }) : current);
    } catch (requestError) {
      setGradebookError(requestError?.response?.data?.message || "Failed to review assignment");
    }
  };

  const activateScope = async () => {
    if (!globalThis.confirm("Activate reviewed assignment inclusion for this class, subject and term?")) return;
    try {
      const { data } = await apiClient.post(`${apiBase}/contribution-scopes/activate`, { classId: Number(classId), subjectId: Number(subjectId), termId: Number(termId) });
      setContributionReview((current) => current ? ({ ...current, scope: data }) : current);
      globalThis.alert("Explicit grade calculation activated for this class, subject and term.");
    } catch (requestError) {
      setGradebookError(requestError?.response?.data?.message || "Unable to activate reviewed assignments");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {apiBase === "/admin/gradebook"
            ? "Review report-card assignment inclusion across current and historical teachers. Scores and ownership are preserved."
            : "Read-only view of legacy assignments and scores. Historical teacher ownership is preserved."}
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

      {apiBase === "/admin/gradebook" && classId && subjectId && termId && needsContributionReview && (
        <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Report-card assignment inclusion</h2>
              <p className="text-sm text-gray-700">
                Scope: <strong>REVIEWING</strong>. Review every assignment below, then activate the reviewed set.
              </p>
            </div>
            <button type="button" className="rounded bg-blue-700 px-3 py-2 text-sm text-white" onClick={activateScope}>
              Activate reviewed set
            </button>
          </div>
          {contributionReview.assignments.length === 0 ? (
            <p className="text-sm text-gray-600">No assignments exist for this class, subject and term.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white text-sm">
                <thead><tr className="border-b"><th className="p-2 text-left">Assignment</th><th className="p-2 text-left">Owner</th><th className="p-2">Scores</th><th className="p-2">Status</th><th className="p-2">Review</th></tr></thead>
                <tbody>{contributionReview.assignments.map((assignment) => (
                  <tr className="border-b" key={assignment.id}>
                    <td className="p-2">{assignment.title} <span className="text-gray-500">#{assignment.id}</span></td>
                    <td className="p-2">{assignment.teacherSubject.teacher.name} <span className="text-gray-500">TS #{assignment.teacherSubjectId}</span></td>
                    <td className="p-2 text-center">{assignment.scoreCount}</td>
                    <td className="p-2 text-center font-medium">{assignment.gradeContributionStatus}</td>
                    <td className="p-2 text-center space-x-2">
                      <button type="button" className="underline" onClick={() => reviewAssignment(assignment, "INCLUDED")}>Include</button>
                      <button type="button" className="underline text-red-700" onClick={() => reviewAssignment(assignment, "EXCLUDED")}>Exclude</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

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
                      <span className="block font-normal">{assignment.gradeContributionStatus}</span>
                      <span className="mt-1 block space-x-1 font-normal">
                        <button type="button" className="underline" onClick={() => reviewAssignment(assignment, "INCLUDED")}>Include</button>
                        <button type="button" className="underline text-red-700" onClick={() => reviewAssignment(assignment, "EXCLUDED")}>Exclude</button>
                      </span>
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
