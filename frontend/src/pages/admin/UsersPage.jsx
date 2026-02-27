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

  // Academic students (NOT used in Users tab identity management)
  const [students, setStudents] = useState([]);

  // Debug only (optional)
  useEffect(() => {
    console.log("Academic students data:", students);
  }, [students]);

  const [activeTab, setActiveTab] = useState("teachers");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "STUDENT",
    isActive: true,

    // Student-specific
    firstName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    dob: "",
    password: "",
  });

  // ✅ Identity role separation (CORRECT SOURCE)
  const teachers = users.filter((u) => u.role === "TEACHER");
  const parents = users.filter((u) => u.role === "PARENT");
  const studentUsers = users.filter((u) => u.role === "STUDENT");

  // ✅ Tab counts must use identity users
  const counts = {
    teachers: teachers.length,
    students: studentUsers.length,
    parents: parents.length,
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchStudents(); // optional, can be removed later
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

  // Academic students (NOT used in Users identity tab)
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

      // Student-specific
      firstName: "",
      lastName: "",
      admissionNo: "",
      classId: "",
      dob: "",
      password: "",
    });
    setShowForm(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "STUDENT",
      isActive: user.isActive ?? true,

      // Student-specific (left empty for edit unless implemented)
      firstName: "",
      lastName: "",
      admissionNo: "",
      classId: "",
      dob: "",
      password: "",
    });
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    try {
      if (editingUser) {
        await apiClient.put(`/admin/users/${editingUser.id}`, form);
      } else {
        if (form.role === "STUDENT") {
          await apiClient.post("/admin/users/student", {
            firstName: form.firstName,
            lastName: form.lastName,
            admissionNo: form.admissionNo,
            classId: Number(form.classId),
            dob: form.dob || null,
            email: form.email,
            password: form.password,
          });
        } else if (form.role === "TEACHER") {
          await apiClient.post("/admin/users/teacher", form);
        } else if (form.role === "PARENT") {
          await apiClient.post("/admin/users/parent", form);
        }
      }

      setShowForm(false);
      fetchUsers();
    } catch (err) {
      console.error("Failed to save user", err);
      alert(err?.response?.data?.message || "Failed to save user");
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
          students={studentUsers}
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

            {form.role === "STUDENT" && (
              <>
                <input
                  required
                  placeholder="First Name"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />

                <input
                  required
                  placeholder="Last Name"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />

                <input
                  required
                  placeholder="Admission Number"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.admissionNo}
                  onChange={(e) =>
                    setForm({ ...form, admissionNo: e.target.value })
                  }
                />

                <input
                  required
                  type="number"
                  placeholder="Class ID"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.classId}
                  onChange={(e) =>
                    setForm({ ...form, classId: e.target.value })
                  }
                />

                <input
                  type="date"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.dob}
                  onChange={(e) =>
                    setForm({ ...form, dob: e.target.value })
                  }
                />

                <input
                  required
                  type="password"
                  placeholder="Temporary Password"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </>
            )}

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