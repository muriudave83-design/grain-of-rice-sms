import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [form, setForm] = useState({
    name: "",
    classTeacherId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        api.get("/admin/classes"),
        api.get("/admin/users?role=TEACHER"),
      ]);

      setClasses(classesRes.data);
      setTeachers(teachersRes.data);
    } catch (err) {
      console.error("Failed to load classes", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingClass(null);
    setForm({ name: "", classTeacherId: "" });
    setShowForm(true);
  }

  function openEdit(cls) {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      classTeacherId: cls.classTeacherId || "",
    });
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    try {
      if (editingClass) {
        await api.put(`/admin/classes/${editingClass.id}`, form);
      } else {
        await api.post("/admin/classes", form);
      }

      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save class", err);
    }
  }

  async function deleteClass(cls) {
    if (!confirm(`Delete class "${cls.name}"?`)) return;

    try {
      await api.delete(`/admin/classes/${cls.id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete class", err);
    }
  }

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Classes</h1>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + New Class
          </button>
        </div>

        <input
          type="text"
          placeholder="Search classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Class Name</th>
                <th className="p-3">Class Teacher</th>
                <th className="p-3 w-40">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                filtered.map((cls) => (
                  <tr key={cls.id} className="border-t">
                    <td className="p-3">{cls.name}</td>
                    <td className="p-3">
                      {cls.classTeacher?.name || (
                        <span className="text-gray-400 text-xs">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => openEdit(cls)}
                        className="text-blue-600 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteClass(cls)}
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
                {editingClass ? "Edit Class" : "Create Class"}
              </h2>

              <input
                required
                placeholder="Class name (e.g. Form 1A)"
                className="w-full mb-3 p-2 border rounded"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />

              <select
                className="w-full mb-4 p-2 border rounded"
                value={form.classTeacherId}
                onChange={(e) =>
                  setForm({ ...form, classTeacherId: e.target.value })
                }
              >
                <option value="">No class teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
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
