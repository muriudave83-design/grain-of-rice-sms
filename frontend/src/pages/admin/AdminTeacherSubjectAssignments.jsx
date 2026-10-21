import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import { getAssignableClassSubjects } from "../../utils/adminTeacherSubjectOptions";

export default function AdminTeacherSubjectAssignments() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [handoverAssignments, setHandoverAssignments] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [handoverTerms, setHandoverTerms] = useState([]);
  const [handoverForm, setHandoverForm] = useState({ originalTeacherSubjectId: "", replacementTeacherSubjectId: "", termId: "", note: "" });

  const [form, setForm] = useState({
    teacherId: "",
    subjectId: "",
    classId: "",
  });

  useEffect(() => {
    if (!form.classId) {
      setClassSubjects([]);
      setSubjectsError("");
      setSubjectsLoading(false);
      return;
    }

    let cancelled = false;
    setClassSubjects([]);
    setSubjectsError("");
    setSubjectsLoading(true);

    apiClient.get(`/admin/class-subjects/${form.classId}`)
      .then((res) => {
        if (cancelled) return;
        setClassSubjects(getAssignableClassSubjects(res.data));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load subjects configured for class", err);
        setClassSubjects([]);
        setSubjectsError(err?.message || "Failed to load subjects for this class");
      })
      .finally(() => {
        if (!cancelled) setSubjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.classId]);

  const fetchData = useCallback(async (includeInactive = showInactive) => {
    setLoading(true);

    try {
      const [teachersRes, classesRes, assignmentsRes, allAssignmentsRes, handoversRes] =
        await Promise.all([
          apiClient.get("/admin/users?role=TEACHER"),
          apiClient.get("/admin/classes"),
          apiClient.get(`/admin/teacher-subjects${includeInactive ? "?includeInactive=true" : ""}`),
          apiClient.get("/admin/teacher-subjects?includeInactive=true"),
          apiClient.get("/admin/teacher-subject-handovers"),
        ]);

      setTeachers(teachersRes.data || []);
      setClasses(classesRes.data || []);
      setAssignments(assignmentsRes.data || []);
      setHandoverAssignments(allAssignmentsRes.data || []);
      setHandovers(handoversRes.data || []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  const originalHandoverAssignment = handoverAssignments.find((item) => String(item.id) === handoverForm.originalTeacherSubjectId);
  const replacementHandoverAssignments = originalHandoverAssignment
    ? handoverAssignments.filter((item) => item.isActive && item.id !== originalHandoverAssignment.id && item.teacher?.id !== originalHandoverAssignment.teacher?.id && item.class?.id === originalHandoverAssignment.class?.id && item.subject?.id === originalHandoverAssignment.subject?.id)
    : [];

  useEffect(() => {
    if (!originalHandoverAssignment?.class?.id) { setHandoverTerms([]); return; }
    apiClient.get(`/admin/gradebook/classes/${originalHandoverAssignment.class.id}/options`)
      .then((response) => setHandoverTerms(response.data?.terms || []))
      .catch(() => setHandoverTerms([]));
  }, [originalHandoverAssignment?.class?.id]);

  async function createHandover(event) {
    event.preventDefault();
    const replacement = replacementHandoverAssignments.find((item) => String(item.id) === handoverForm.replacementTeacherSubjectId);
    const term = handoverTerms.find((item) => String(item.id) === handoverForm.termId);
    if (!originalHandoverAssignment || !replacement || !term) return;
    const confirmed = confirm(`Create this exact handover?\n\nFrom: ${originalHandoverAssignment.teacher?.name}\nTo: ${replacement.teacher?.name}\nClass: ${originalHandoverAssignment.class?.name}\nSubject: ${originalHandoverAssignment.subject?.name}\nTerm: ${term.name} ${term.academicYear}\n\nNo other class, subject, or term will be authorized.`);
    if (!confirmed) return;
    try {
      await apiClient.post("/admin/teacher-subject-handovers", handoverForm);
      setHandoverForm({ originalTeacherSubjectId: "", replacementTeacherSubjectId: "", termId: "", note: "" });
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Failed to create handover");
    }
  }

  async function revokeHandover(handover) {
    if (!confirm(`Revoke ${handover.replacementTeacher?.name}'s handover access for ${handover.class?.name} ${handover.subject?.name}?`)) return;
    try {
      await apiClient.post(`/admin/teacher-subject-handovers/${handover.id}/revoke`);
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Failed to revoke handover");
    }
  }

  useEffect(() => {
    fetchData(showInactive);
  }, [fetchData, showInactive]);

  /**
   * Prevent duplicate assignment
   */
  const duplicateAssignment = useMemo(() => {
    if (!form.teacherId || !form.subjectId || !form.classId) return null;

    return assignments.find(
      (a) =>
        a.isActive &&
        String(a?.teacher?.id) === form.teacherId &&
        String(a?.subject?.id) === form.subjectId &&
        String(a?.class?.id) === form.classId
    );
  }, [form, assignments]);

  /**
   * Submit new assignment (FIXED)
   */
  async function submitAssignment(e) {
    e.preventDefault();

    try {
      await apiClient.post("/admin/teacher-subjects", form);

      // ✅ Reset form
      setForm({
        teacherId: "",
        subjectId: "",
        classId: "",
      });

      // ✅ ALWAYS refetch (prevents UI crash)
      await fetchData();
    } catch (err) {
      console.error("Failed to assign teacher", err);
      alert(err?.response?.data?.message || err?.message || "Failed to assign teacher");
    }
  }

  async function endAssignment(assignment) {
    if (!confirm("End this teacher assignment?\n\nThe teacher will no longer have current access to this class/subject.\n\nHistorical assignments, scores, comments and reports will remain unchanged.")) return;

    try {
      const response = await apiClient.patch(`/admin/teacher-subjects/${assignment.id}/deactivate`);
      alert(response.data?.message || "Teacher assignment ended successfully.");
      await fetchData();
    } catch (err) {
      console.error("Failed to end assignment", err);
      alert(err?.response?.data?.message || err?.message || "Failed to end teacher assignment");
    }
  }

  async function reactivateAssignment(assignment) {
    try {
      const response = await apiClient.patch(`/admin/teacher-subjects/${assignment.id}/reactivate`);
      alert(response.data?.message || "Teacher assignment reactivated.");
      await fetchData();
    } catch (err) {
      console.error("Failed to reactivate assignment", err);
      alert(err?.response?.data?.message || err?.message || "Failed to reactivate teacher assignment");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Teacher Subject Assignments
      </h1>

      <form
        onSubmit={submitAssignment}
        className="bg-white border rounded p-4 space-y-4"
      >
        <div className="grid grid-cols-3 gap-4">
          {/* Teacher */}
          <select
            required
            className="p-2 border rounded"
            value={form.teacherId}
            onChange={(e) =>
              setForm({ ...form, teacherId: e.target.value })
            }
          >
            <option value="">Select teacher</option>

            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} —{" "}
                {t.startDate
                  ? new Date(t.startDate).toLocaleDateString()
                  : "No start"}{" "}
                to{" "}
                {t.endDate
                  ? new Date(t.endDate).toLocaleDateString()
                  : "No end"}
              </option>
            ))}
          </select>

          {/* Class */}
          <select
            required
            className="p-2 border rounded"
            value={form.classId}
            onChange={(e) =>
              setForm({ ...form, classId: e.target.value, subjectId: "" })
            }
          >
            <option value="">Select Grade</option>

            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subject */}
          <select
            required
            className="p-2 border rounded"
            value={form.subjectId}
            disabled={!form.classId || subjectsLoading || classSubjects.length === 0}
            onChange={(e) =>
              setForm({ ...form, subjectId: e.target.value })
            }
          >
            <option value="">
              {!form.classId
                ? "Select class first"
                : subjectsLoading
                  ? "Loading subjects…"
                  : subjectsError
                    ? "Unable to load subjects"
                    : classSubjects.length === 0
                      ? "No subjects configured for this class"
                      : "Select subject"}
            </option>

            {classSubjects.map((entry) => entry.subject).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {subjectsError && (
          <p role="alert" className="text-sm text-red-600">{subjectsError}</p>
        )}
        {form.classId && !subjectsLoading && !subjectsError && classSubjects.length === 0 && (
          <p className="text-sm text-amber-700">
            No subjects are configured for this class. Configure them in Class Subject Assignment first.
          </p>
        )}

        {/* Duplicate warning */}
        {duplicateAssignment && (
          <p className="text-red-600 text-sm">
            This teacher is already assigned to that subject and grade.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={duplicateAssignment}
            className={`px-4 py-2 text-white rounded text-sm ${
              duplicateAssignment
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600"
            }`}
          >
            Assign
          </button>
        </div>
      </form>

      <section className="bg-white border rounded p-4 space-y-4">
        <div>
          <h2 className="font-semibold">Gradebook handovers</h2>
          <p className="text-sm text-gray-600">Grant term-specific access to an earlier teacher's assignments. Ownership and marks remain unchanged.</p>
        </div>
        <form onSubmit={createHandover} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select required className="p-2 border rounded" value={handoverForm.originalTeacherSubjectId} onChange={(event) => setHandoverForm({ ...handoverForm, originalTeacherSubjectId: event.target.value, replacementTeacherSubjectId: "", termId: "" })}>
            <option value="">Original teacher assignment</option>
            {handoverAssignments.map((item) => <option key={item.id} value={item.id}>{item.teacher?.name} — {item.class?.name} — {item.subject?.name}</option>)}
          </select>
          <select required className="p-2 border rounded" value={handoverForm.replacementTeacherSubjectId} disabled={!originalHandoverAssignment} onChange={(event) => setHandoverForm({ ...handoverForm, replacementTeacherSubjectId: event.target.value })}>
            <option value="">Replacement teacher</option>
            {replacementHandoverAssignments.map((item) => <option key={item.id} value={item.id}>{item.teacher?.name}</option>)}
          </select>
          <select required className="p-2 border rounded" value={handoverForm.termId} disabled={!originalHandoverAssignment} onChange={(event) => setHandoverForm({ ...handoverForm, termId: event.target.value })}>
            <option value="">Permitted term</option>
            {handoverTerms.map((item) => <option key={item.id} value={item.id}>{item.name} {item.academicYear}</option>)}
          </select>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" type="submit">Create handover</button>
        </form>
        <input className="w-full p-2 border rounded" placeholder="Administrative note (optional)" value={handoverForm.note} onChange={(event) => setHandoverForm({ ...handoverForm, note: event.target.value })} />
        <div className="space-y-2">
          {handovers.map((item) => <div key={item.id} className="flex items-center justify-between border-t pt-2 text-sm">
            <span>{item.originalTeacher?.name} → {item.replacementTeacher?.name} · {item.class?.name} · {item.subject?.name} · {item.term?.name} {item.term?.academicYear} · {item.isActive ? "Active" : "Revoked"}</span>
            {item.isActive && <button className="text-red-600" onClick={() => revokeHandover(item)}>Revoke</button>}
          </div>)}
        </div>
      </section>

      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Show inactive assignments
        </label>
      </div>

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Teacher</th>
              <th className="p-3 text-left">Subject</th>
              <th className="p-3 text-left">Grade</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-4 text-center">
                  Loading…
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No assignments yet
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">
                    {a?.teacher?.name || "—"}
                  </td>

                  <td className="p-3">
                    {a?.subject?.name || "—"}
                  </td>

                  <td className="p-3">
                    {a?.class?.name || "—"}
                  </td>

                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                      {a.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="p-3 text-right">
                    {a.isActive ? (
                      <button onClick={() => endAssignment(a)} className="text-red-600 text-xs">End Assignment</button>
                    ) : (
                      <button onClick={() => reactivateAssignment(a)} className="text-blue-600 text-xs">Reactivate</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
