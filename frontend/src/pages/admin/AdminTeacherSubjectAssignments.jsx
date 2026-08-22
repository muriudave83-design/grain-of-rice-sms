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
      const [teachersRes, classesRes, assignmentsRes] =
        await Promise.all([
          apiClient.get("/admin/users?role=TEACHER"),
          apiClient.get("/admin/classes"),
          apiClient.get(`/admin/teacher-subjects${includeInactive ? "?includeInactive=true" : ""}`),
        ]);

      setTeachers(teachersRes.data || []);
      setClasses(classesRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

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
