import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    teacherId: "",
    subjectId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [teachersRes, subjectsRes, assignmentsRes] = await Promise.all([
        api.get("/admin/users?role=TEACHER"),
        api.get("/admin/subjects"),
        api.get("/admin/teacher-subjects"),
      ]);

      setTeachers(teachersRes.data);
      setSubjects(subjectsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (err) {
      console.error("Failed to load teacher-subject assignments", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitForm(e) {
    e.preventDefault();

    try {
      await api.post("/admin/teacher-subjects", form);
      setForm({ teacherId: "", subjectId: "" });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to assign subject to teacher", err);
      alert(err?.response?.data?.message || err?.message || "Failed to assign teacher");
    }
  }

  async function removeAssignment(a) {
    if (!confirm("Remove this assignment?")) return;

    try {
      await api.delete(`/admin/teacher-subjects/${a.id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to remove assignment", err);
      alert(err?.response?.data?.message || err?.message || "Failed to remove assignment");
    }
  }

  const filteredAssignments = assignments.filter((a) =>
    a.teacher.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Teacher Assignments</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + Assign Subject
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search teacher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        {/* Assignments Table */}
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Teacher</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Class</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    Loading assignments...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    No assignments found
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">{a.teacher.name}</td>
                    <td className="p-3">{a.subject.name}</td>
                    <td className="p-3">{a.subject.class.name}</td>
                    <td className="p-3">
                      <button
                        onClick={() => removeAssignment(a)}
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

        {/* Assignment Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
            <form
              onSubmit={submitForm}
              className="bg-white w-96 p-6 rounded shadow"
            >
              <h2 className="text-lg font-semibold mb-4">
                Assign Subject to Teacher
              </h2>

              <select
                required
                className="w-full mb-3 p-2 border rounded"
                value={form.teacherId}
                onChange={(e) =>
                  setForm({ ...form, teacherId: e.target.value })
                }
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                required
                className="w-full mb-4 p-2 border rounded"
                value={form.subjectId}
                onChange={(e) =>
                  setForm({ ...form, subjectId: e.target.value })
                }
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class.name})
                  </option>
                ))}
              </select>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1 text-sm border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
