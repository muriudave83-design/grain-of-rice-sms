import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

import UsersTabs from "../../components/admin/users/UsersTabs";
import TeachersPanel from "../../components/admin/users/TeachersPanel";
import ParentsPanel from "../../components/admin/users/ParentsPanel";
import StudentsPanel from "../../components/admin/users/StudentsPanel";

const ROLES = ["ADMIN", "TEACHER", "PARENT", "STUDENT"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ STUDENTS STATE
  const [students, setStudents] = useState([]);

  // ✅ DEBUG LOG
  useEffect(() => {
    console.log("Students data:", students);
  }, [students]);

  const [activeTab, setActiveTab] = useState("teachers");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "STUDENT",
    isActive: true,
  });

  // ✅ ROLE SEPARATION
  const teachers = users.filter((u) => u.role === "TEACHER");
  const parents = users.filter((u) => u.role === "PARENT");

  // ✅ TAB COUNTS
  const counts = {
    teachers: teachers.length,
    students: students.length,
    parents: parents.length,
  };

  // ✅ INITIAL LOAD
  useEffect(() => {
    fetchUsers();
    fetchStudents();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents() {
    try {
      const res = await apiClient.get("/students");
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to load students", err);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      role: "STUDENT",
      isActive: true,
    });
    setShowForm(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    try {
      if (editingUser) {
        await apiClient.put(`/admin/users/${editingUser.id}`, form);
      } else {
        await apiClient.post("/admin/users", form);
      }

      setShowForm(false);
      fetchUsers();
    } catch (err) {
      console.error("Failed to save user", err);
    }
  }

  async function toggleActive(user) {
    try {
      await apiClient.patch(`/admin/users/${user.id}/status`, {
        isActive: !user.isActive,
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          + New User
        </button>
      </div>

      <UsersTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
      />

      {activeTab === "teachers" && (
        <TeachersPanel
          teachers={teachers}
          onEdit={openEdit}
          onToggle={toggleActive}
        />
      )}

      {activeTab === "students" && (
        <StudentsPanel
          students={students}
          onEdit={openEdit}
          onToggle={toggleActive}
        />
      )}

      {activeTab === "parents" && (
        <ParentsPanel
          parents={parents}
          onEdit={openEdit}
          onToggle={toggleActive}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <form
            onSubmit={submitForm}
            className="bg-white w-96 p-6 rounded shadow"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editingUser ? "Edit User" : "Create User"}
            </h2>

            <input
              required
              placeholder="Full name"
              className="w-full mb-3 p-2 border rounded"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              required
              type="email"
              placeholder="Email"
              className="w-full mb-3 p-2 border rounded"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              disabled={!!editingUser}
            />

            <select
              className="w-full mb-4 p-2 border rounded"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
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
  );
}