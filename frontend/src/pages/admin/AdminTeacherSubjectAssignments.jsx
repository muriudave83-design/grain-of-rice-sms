import { useEffect, useMemo, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminTeacherSubjectAssignments() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    teacherId: "",
    subjectId: "",
    classId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!form.classId) {
      setClassSubjects([]);
      return;
    }

    apiClient
      .get(`/admin/class-subjects/${form.classId}`)
      .then((res) => setClassSubjects(res.data || []))
      .catch(() => setClassSubjects([]));
  }, [form.classId]);

  async function fetchData() {
    setLoading(true);

    try {
      const [teachersRes, classesRes, assignmentsRes] =
        await Promise.all([
          apiClient.get("/admin/users?role=TEACHER"),
          apiClient.get("/admin/classes"),
          apiClient.get("/admin/teacher-subjects"),
        ]);

      setTeachers(teachersRes.data || []);
      setClasses(classesRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Prevent duplicate assignment
   */
  const duplicateAssignment = useMemo(() => {
    if (!form.teacherId || !form.subjectId || !form.classId) return null;

    return assignments.find(
      (a) =>
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

  /**
   * Remove assignment
   */
  async function removeAssignment(id) {
    if (!confirm("Remove this assignment?")) return;

    try {
      await apiClient.delete(`/admin/teacher-subjects/${id}`);

      // ✅ Safe local update
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to remove assignment", err);
      alert(err?.response?.data?.message || err?.message || "Failed to remove assignment");
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

          {/* Subject */}
          <select
            required
            className="p-2 border rounded"
            value={form.subjectId}
            onChange={(e) =>
              setForm({ ...form, subjectId: e.target.value })
            }
          >
            <option value="">Select subject</option>

            {classSubjects.map((entry) => entry.subject).filter(Boolean).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
        </div>

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

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Teacher</th>
              <th className="p-3 text-left">Subject</th>
              <th className="p-3 text-left">Grade</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="p-4 text-center">
                  Loading…
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
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

                  <td className="p-3 text-right">
                    <button
                      onClick={() => removeAssignment(a.id)}
                      className="text-red-600 text-xs"
                    >
                      Remove
                    </button>
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
