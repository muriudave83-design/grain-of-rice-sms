import { useEffect, useState } from "react";

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
      const res = await fetch(
        "http://localhost:5000/api/admin/users?role=TEACHER",
        { credentials: "include" }
      );

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json();
      setTeachers(data);
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
      const res = await fetch(
        "http://localhost:5000/api/admin/users/teacher",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to create teacher");
        return;
      }

      setForm({ name: "", email: "", password: "" });
      fetchTeachers();
    } catch (err) {
      setError("Server error");
    }
  };

  if (loading) return <div>Loading teachers...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Teachers</h1>

      {/* Create Teacher Form */}
      <form
        onSubmit={handleCreate}
        className="bg-white p-4 rounded shadow mb-6 max-w-md"
      >
        <h2 className="text-lg font-semibold mb-3">Add Teacher</h2>

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
          <div className="text-red-600 text-sm mb-2">{error}</div>
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
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.name}</td>
                <td className="p-3">{t.email}</td>
                <td className="p-3">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
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
