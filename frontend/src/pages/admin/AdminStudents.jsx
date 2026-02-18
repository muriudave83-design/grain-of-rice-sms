import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    parentId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const studentsRes = await apiClient.get("/admin/students");
      const classesRes = await apiClient.get("/admin/classes");
      const parentsRes = await apiClient.get("/admin/users?role=PARENT");

      setStudents(studentsRes.data || []);
      setClasses(classesRes.data || []);
      setParents(parentsRes.data || []);
    } catch (err) {
      console.error("Failed to load students data", err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  // ✅ FINAL CORRECT VERSION
  async function submitForm(e) {
    e.preventDefault();

    if (!form.classId) {
      alert("Please select a class");
      return;
    }

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        admissionNo: form.admissionNo.trim(),
        classId: Number(form.classId),
      };

      // only attach parentId if selected
      if (form.parentId) {
        payload.parentId = Number(form.parentId);
      }

      await apiClient.post("/admin/students", payload);

      setForm({
        firstName: "",
        lastName: "",
        admissionNo: "",
        classId: "",
        parentId: "",
      });

      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create student", err);
      alert(
        err?.response?.data?.message ||
        "Failed to create student"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Students</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          + Create Student
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Admission No</th>
              <th className="p-3 text-left">Class</th>
              <th className="p-3 text-left">Parent</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="p-4 text-center">
                  Loading…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No students yet
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="p-3">{s.admissionNo}</td>
                  <td className="p-3">{s.class?.name || "—"}</td>
                  <td className="p-3">{s.parent?.name || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <form
          onSubmit={submitForm}
          className="fixed inset-0 bg-black/30 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded w-96 space-y-4">
            <h2 className="text-lg font-semibold">Create Student</h2>

            <input
              required
              placeholder="First name"
              className="w-full p-2 border rounded"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: e.target.value })
              }
            />

            <input
              required
              placeholder="Last name"
              className="w-full p-2 border rounded"
              value={form.lastName}
              onChange={(e) =>
                setForm({ ...form, lastName: e.target.value })
              }
            />

            <input
              required
              placeholder="Admission number"
              className="w-full p-2 border rounded"
              value={form.admissionNo}
              onChange={(e) =>
                setForm({ ...form, admissionNo: e.target.value })
              }
            />

            <select
              required
              className="w-full p-2 border rounded"
              value={form.classId}
              onChange={(e) =>
                setForm({ ...form, classId: e.target.value })
              }
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-2 border rounded"
              value={form.parentId}
              onChange={(e) =>
                setForm({ ...form, parentId: e.target.value })
              }
            >
              <option value="">Link parent (optional)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
