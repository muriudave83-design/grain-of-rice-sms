import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/apiClient";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CREATE USER STATE
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  // FETCH USERS (WITH ROLE FILTER SUPPORT)
  const fetchUsers = async () => {
    try {
      setLoading(true);

      // 👇 READ ROLE FROM URL
      const params = new URLSearchParams(window.location.search);
      const role = params.get("role");

      // 👇 BUILD URL CONDITIONALLY
      const url = role
        ? `/admin/users?role=${role}`
        : `/admin/users`;

      const res = await api.get(url);

      setUsers(res.data);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // SUBMIT CREATE USER
  const submitCreate = async (e) => {
    e.preventDefault();

    try {
      await api.post("/admin/users", form);

      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "" });
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create user");
    }
  };

  // 👇 DETERMINE PAGE TITLE
  const currentRole = new URLSearchParams(window.location.search).get("role");

  const pageTitle =
    currentRole === "TEACHER"
      ? "Teachers"
      : currentRole === "PARENT"
      ? "Parents"
      : currentRole === "STUDENT"
      ? "Students"
      : "System Users";

  return (
    <AdminLayout>
      <div className="p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>

          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + Create User
          </button>
        </div>

        {/* USERS TABLE */}
        {loading ? (
          <div>Loading users...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Role</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* CREATE USER MODAL */}
        {showCreate && (
          <form
            onSubmit={submitCreate}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          >
            <div className="bg-white p-6 rounded w-96 space-y-3">
              <h2 className="font-semibold text-lg">Create User</h2>

              <input
                required
                placeholder="Full name"
                className="w-full p-2 border rounded"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />

              <input
                required
                type="email"
                placeholder="Email"
                className="w-full p-2 border rounded"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />

              <input
                required
                type="password"
                placeholder="Temporary password"
                className="w-full p-2 border rounded"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />

              <select
                required
                className="w-full p-2 border rounded"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value })
                }
              >
                <option value="">Select role</option>
                <option value="ADMIN">Admin</option>
                <option value="TEACHER">Teacher</option>
                <option value="PARENT">Parent</option>
                <option value="STUDENT">Student</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
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
    </AdminLayout>
  );
}
