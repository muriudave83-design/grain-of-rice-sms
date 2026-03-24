import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(
        "/admin/users?role=TEACHER"
      );

      setTeachers(res.data);
    } catch (err) {
      setError("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await apiClient.post(
        "/admin/users/teacher",
        form
      );

      setForm({ name: "", email: "", password: "" });
      fetchTeachers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create teacher"
      );
    }
  };

  // ✅ SAFE DELETE (ARCHIVE TEACHER)
  const handleDeleteTeacher = async (id) => {
    if (!window.confirm("Archive this teacher?")) return;

    try {
      await apiClient.patch(`/admin/users/${id}/archive`);

      // update UI instantly
      setTeachers((prev) =>
        prev.filter((t) => t.id !== id)
      );
    } catch (err) {
      console.error("Failed to archive teacher", err);
      alert(
        err.response?.data?.message ||
          "Failed to archive teacher"
      );
    }
  };

  if (loading) return <div>Loading teachers...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Teachers
      </h1>

      {/* Create Teacher Form */}
      <form
        onSubmit={handleCreate}
        className="bg-white p-4 rounded shadow mb-6 max-w-md"
      >
        <h2 className="text-lg font-semibold mb-3">
          Add Teacher
        </h2>

        <input
          type="text"
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 mb-2"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 mb-2"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Temporary password"
          value={form.password}
          onChange={handleChange}
          className="w-full border p-2 mb-3"
          required
        />

        {error && (
          <div className="text-red-600 text-sm mb-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Teacher
        </button>
      </form>

      {/* Teachers Table */}
      <div className="bg-white rounded shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.name}</td>
                <td className="p-3">{t.email}</td>
                <td className="p-3">
                  {new Date(
                    t.createdAt
                  ).toLocaleDateString()}
                </td>

                <td className="p-3">
                  <button
                    onClick={() =>
                      handleDeleteTeacher(t.id)
                    }
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}

            {teachers.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="p-4 text-center text-gray-500"
                >
                  No teachers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}