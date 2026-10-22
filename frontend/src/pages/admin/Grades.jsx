import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../services/apiClient";
import { eligibleApprovalAssignments as selectEligibleApprovalAssignments, filterApprovalAssignments } from "../../utils/reportPrintingApproval";

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
  const [printingApproval, setPrintingApproval] = useState(null);
  const [approvalClassFilter, setApprovalClassFilter] = useState("");
  const [approvalSubjectFilter, setApprovalSubjectFilter] = useState("");
  const [approvalTermFilter, setApprovalTermFilter] = useState("");
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([]);
  const [approvalBusy, setApprovalBusy] = useState(false);
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

  const loadPrintingApproval = useCallback(async () => {
    if (apiBase !== "/admin/gradebook") return;
    const { data } = await apiClient.get(`${apiBase}/report-printing-approval`);
    setPrintingApproval(data);
  }, [apiBase]);

  useEffect(() => {
    loadPrintingApproval().catch((requestError) => setClassesError(requestError?.response?.data?.message || "Failed to load report printing approval"));
  }, [loadPrintingApproval]);

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
  const approvalAssignments = useMemo(() => filterApprovalAssignments(printingApproval?.assignments || [], approvalClassFilter, approvalSubjectFilter, approvalTermFilter), [printingApproval, approvalClassFilter, approvalSubjectFilter, approvalTermFilter]);
  const approvalClasses = useMemo(() => [...new Map((printingApproval?.assignments || []).map((item) => [item.teacherSubject.classId, item.teacherSubject.class])).values()], [printingApproval]);
  const approvalSubjects = useMemo(() => [...new Map(approvalAssignments.map((item) => [item.teacherSubject.subjectId, item.teacherSubject.subject])).values()], [approvalAssignments]);
  const approvalTerms = useMemo(() => [...new Map((printingApproval?.assignments || []).map((item) => [item.termId, item.term])).values()], [printingApproval]);
  const eligibleApprovalAssignments = selectEligibleApprovalAssignments(approvalAssignments);
  const selectedApprovalSet = new Set(selectedApprovalIds);

  const approveSelected = async () => {
    if (!selectedApprovalIds.length || !globalThis.confirm(`Approve ${selectedApprovalIds.length} selected assignments for inclusion? Activation remains a separate step.`)) return;
    try {
      setApprovalBusy(true);
      await apiClient.post(`${apiBase}/report-printing-approval/include`, { assignmentIds: selectedApprovalIds });
      setSelectedApprovalIds([]);
      await loadPrintingApproval();
      globalThis.alert("Selected assignments were included. Activate each reviewed class/subject/term group when its review is complete.");
    } catch (requestError) {
      setGradebookError(requestError?.response?.data?.message || "Bulk approval failed safely; no partial result was reported");
    } finally {
      setApprovalBusy(false);
    }
  };

  const activateApprovalGroup = async (group) => {
    if (!globalThis.confirm(`Activate reviewed assignments for ${group.className} · ${group.subjectName} · ${group.term.name} ${group.term.academicYear}?`)) return;
    try {
      setApprovalBusy(true);
      await apiClient.post(`${apiBase}/contribution-scopes/activate`, { classId: group.classId, subjectId: group.subjectId, termId: group.termId });
      await loadPrintingApproval();
    } catch (requestError) {
      setGradebookError(requestError?.response?.data?.message || "Unable to activate reviewed assignments");
    } finally {
      setApprovalBusy(false);
    }
  };

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

      {apiBase === "/admin/gradebook" && printingApproval && (
        <section className="space-y-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Report Printing Approval</h2>
              <p className="text-sm text-gray-700">Select only verified assignments. Inclusion does not activate a report scope automatically.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="rounded bg-amber-100 px-2 py-1 font-semibold">Unreviewed: {printingApproval.totals.unreviewed}</span>
              <span className="rounded bg-green-100 px-2 py-1 font-semibold">Included: {printingApproval.totals.included}</span>
              <span className="rounded bg-gray-200 px-2 py-1">Excluded: {printingApproval.totals.excluded}</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="rounded border p-2" value={approvalClassFilter} onChange={(event) => { setApprovalClassFilter(event.target.value); setApprovalSubjectFilter(""); setSelectedApprovalIds([]); }}>
              <option value="">All classes</option>
              {approvalClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded border p-2" value={approvalSubjectFilter} onChange={(event) => { setApprovalSubjectFilter(event.target.value); setSelectedApprovalIds([]); }}>
              <option value="">All subjects</option>
              {approvalSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded border p-2" value={approvalTermFilter} onChange={(event) => { setApprovalTermFilter(event.target.value); setSelectedApprovalIds([]); }}>
              <option value="">All terms</option>
              {approvalTerms.map((item) => <option key={item.id} value={item.id}>{item.name} {item.academicYear}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded bg-gray-700 px-3 py-2 text-sm text-white" onClick={() => setSelectedApprovalIds(eligibleApprovalAssignments.map((item) => item.id))}>Select eligible in filter</button>
            <button type="button" className="rounded border bg-white px-3 py-2 text-sm" onClick={() => setSelectedApprovalIds([])}>Clear selection</button>
            <button type="button" disabled={!selectedApprovalIds.length || approvalBusy} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={approveSelected}>Approve Selected ({selectedApprovalIds.length})</button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {printingApproval.readiness.map((item) => <div key={`${item.classId}:${item.termId}`} className={`rounded border p-3 text-sm ${item.status === "READY_TO_PRINT" ? "border-green-300 bg-green-50" : item.status === "REQUIRED_MARKS_INCOMPLETE" ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
              <strong>{item.className}</strong> · {item.term.name} {item.term.academicYear}<br />
              {item.status === "READY_TO_PRINT" ? "Ready to print" : item.status === "REQUIRED_MARKS_INCOMPLETE" ? "Required marks incomplete" : "Assignment review pending"}
            </div>)}
          </div>
          <div className="space-y-2">
            {printingApproval.groups.filter((group) =>
              (!approvalClassFilter || String(group.classId) === approvalClassFilter) &&
              (!approvalSubjectFilter || String(group.subjectId) === approvalSubjectFilter) &&
              (!approvalTermFilter || String(group.termId) === approvalTermFilter) &&
              (group.unreviewed > 0 || group.mode === "REVIEWING")
            ).map((group) => <div key={`${group.classId}:${group.subjectId}:${group.termId}`} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm">
              <span><strong>{group.className} · {group.subjectName}</strong> · {group.term.name} {group.term.academicYear} · {group.unreviewed} unreviewed · {group.included} included</span>
              <button type="button" disabled={group.unreviewed > 0 || group.included === 0 || approvalBusy} className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-40" onClick={() => activateApprovalGroup(group)}>Activate reviewed set</button>
            </div>)}
          </div>
          <div className="max-h-96 overflow-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-100"><tr><th className="p-2">Select</th><th className="p-2 text-left">Class / Subject</th><th className="p-2 text-left">Assignment</th><th className="p-2 text-left">Teacher / Term</th><th className="p-2">Max</th><th className="p-2">Scores</th><th className="p-2">Status</th></tr></thead>
              <tbody>{approvalAssignments.map((assignment) => {
                const eligible = assignment.gradeContributionStatus === "UNREVIEWED" && assignment.safeToInclude;
                return <tr key={assignment.id} className={`border-t ${assignment.safetyWarnings.length ? "bg-amber-50" : ""}`}>
                  <td className="p-2 text-center"><input type="checkbox" disabled={!eligible} checked={selectedApprovalSet.has(assignment.id)} onChange={(event) => setSelectedApprovalIds((current) => event.target.checked ? [...current, assignment.id] : current.filter((id) => id !== assignment.id))} /></td>
                  <td className="p-2">{assignment.teacherSubject.class.name}<br /><span className="text-gray-600">{assignment.teacherSubject.subject.name}</span></td>
                  <td className="p-2">{assignment.title} <span className="text-gray-500">#{assignment.id}</span>{assignment.safetyWarnings.length > 0 && <div className="text-xs font-semibold text-amber-800">{assignment.safetyWarnings.join(", ")}</div>}</td>
                  <td className="p-2">{assignment.teacherSubject.teacher.name}<br /><span className="text-gray-600">{assignment.term.name} {assignment.term.academicYear}</span></td>
                  <td className="p-2 text-center">{assignment.maxPoints}</td><td className="p-2 text-center">{assignment.scoreCount}</td><td className="p-2 text-center font-medium">{assignment.gradeContributionStatus}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      )}

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
