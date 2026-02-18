import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  // ✅ SINGLE-CLASS MODEL (schema-aligned)
  const [form, setForm] = useState({
    name: "",
    classId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        api.get("/admin/subjects"),
        api.get("/admin/classes"),
      ]);

      setSubjects(subjectsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error("Failed to load subjects", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingSubject(null);
    setForm({ name: "", classId: "" });
    setShowForm(true);
  }

  function openEdit(subject) {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      classId: subject.classId || "",
    });
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    try {
      const payload = {
        name: form.name,
        classId: form.classId,
      };

      if (editingSubject) {
        await api.put(`/admin/subjects/${editingSubject.id}`, payload);
      } else {
        await api.post("/admin/subjects", payload);
      }

      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save subject", err);
    }
  }

  async function deleteSubject(subject) {
    if (!confirm(`Delete subject "${subject.name}"?`)) return;

    try {
      await api.delete(`/admin/subjects/${subject.id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete subject", err);
    }
  }

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  function getClassName(classId) {
    return classes.find((c) => c.id === classId)?.name || "—";
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Subjects</h1>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + New Subject
          </button>
        </div>

        <input
          type="text"
          placeholder="Search subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Subject</th>
                <th className="p-3">Class</th>
                <th className="p-3 w-40">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">
                    Loading subjects...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">
                    No subjects found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3 text-xs">
                      {getClassName(s.classId)}
                    </td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-blue-600 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSubject(s)}
                        className="text-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
            <form
              onSubmit={submitForm}
              className="bg-white w-96 p-6 rounded shadow"
            >
              <h2 className="text-lg font-semibold mb-4">
                {editingSubject ? "Edit Subject" : "Create Subject"}
              </h2>

              <input
                required
                placeholder="Subject name (e.g. Mathematics)"
                className="w-full mb-4 p-2 border rounded"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />

              {/* ✅ SINGLE CLASS SELECT */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Class</p>
                <select
                  required
                  value={form.classId}
                  onChange={(e) =>
                    setForm({ ...form, classId: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  Save
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
