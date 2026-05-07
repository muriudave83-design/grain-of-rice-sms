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

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeTab, setActiveTab] = useState("teachers");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "STUDENT",
    isActive: true,
    firstName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    dob: "",
    password: "",
  });

  const teachers = users.filter((u) => u.role === "TEACHER");
  const parents = users.filter((u) => u.role === "PARENT");
  const studentUsers = users.filter((u) => u.role === "STUDENT");
  const admins = users.filter((u) => u.role === "ADMIN");

  const counts = {
    admins: admins.length,
    teachers: teachers.length,
    students: studentUsers.length,
    parents: parents.length,
  };

  useEffect(() => {
    fetchUsers();
    fetchStudents();
    fetchClasses();
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

  async function fetchClasses() {
    try {
      const res = await apiClient.get("/admin/classes");
      setClasses(res.data);
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      role: "STUDENT",
      isActive: true,
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
      firstName: "",
      lastName: "",
      admissionNo: "",
      classId: "",
      dob: "",
      password: "", // 🚫 password NOT used in edit anymore
    });
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    console.log("🚀 SUBMIT FORM:", form);

    try {
      if (editingUser) {
        // 🚫 DO NOT send password on edit
        const { password, ...safeData } = form;

        await apiClient.put(
          `/admin/users/${editingUser.id}`,
          safeData
        );
      } else {
        // ✅ CREATE FLOW WITH FORCE PASSWORD CHANGE
        if (form.role === "STUDENT") {
          await apiClient.post("/admin/users/student", {
            name: `${form.firstName} ${form.lastName}`,
            firstName: form.firstName,
            lastName: form.lastName,
            admissionNo: form.admissionNo,
            classId: Number(form.classId),
            dob: form.dob || null,
            email: form.email,
            password: form.password,
            forcePasswordChange: true, // ✅ NEW
          });
        } else if (form.role === "TEACHER") {
          await apiClient.post("/admin/users/teacher", {
            name: form.name,
            email: form.email,
            password: form.password,
            forcePasswordChange: true, // ✅ NEW
          });
        } else if (form.role === "PARENT") {
          await apiClient.post("/admin/users/parent", {
            name: form.name,
            email: form.email,
            password: form.password,
            forcePasswordChange: true, // ✅ NEW
          });
        }
      }

      setShowForm(false);
      fetchUsers();
    } catch (err) {
      console.error("❌ CREATE USER ERROR FULL:", err);
      console.error("❌ RESPONSE DATA:", err?.response?.data);
      console.error("❌ STATUS:", err?.response?.status);

      alert(
        JSON.stringify(err?.response?.data, null, 2) ||
          err.message ||
          "Failed to save user"
      );
    }
  }
    async function handleArchive(userId) {
    if (!window.confirm("Are you sure you want to archive this user?"))
      return;

    try {
      await apiClient.patch(`/admin/users/${userId}/archive`);
      fetchUsers();
    } catch (err) {
      console.error("Archive failed", err);
      alert(err?.response?.data?.message || "Failed to archive user.");
    }
  }

  async function resetPassword(user) {
    if (!window.confirm(`Reset password for ${user.email}?`)) return;

    try {
      const res = await apiClient.patch(
        `/admin/users/${user.id}/reset-password`
      );

      alert(
        `Temporary Password:\n\n${res.data.temporaryPassword}\n\nUser will be required to change it on first login.`
      );
    } catch (err) {
      console.error("Reset failed", err);
      alert(err?.response?.data?.message || "Reset failed.");
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

      {activeTab === "admins" && (
        <TeachersPanel
          teachers={admins}
          onEdit={openEdit}
          onArchive={handleArchive}
          onReset={resetPassword}
        />
      )}

      {activeTab === "teachers" && (
        <TeachersPanel
          teachers={teachers}
          onEdit={openEdit}
          onArchive={handleArchive}
          onReset={resetPassword}
        />
      )}

      {activeTab === "students" && (
        <StudentsPanel
          students={studentUsers}
          onEdit={openEdit}
          onArchive={handleArchive}
          onReset={resetPassword}
        />
      )}

      {activeTab === "parents" && (
        <ParentsPanel
          parents={parents}
          onEdit={openEdit}
          onArchive={handleArchive}
          onReset={resetPassword}
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

            {/* FULL NAME (non-students) */}
            {form.role !== "STUDENT" && (
              <input
                required
                placeholder="Full name"
                className="w-full mb-3 p-2 border rounded"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            )}

            {/* EMAIL */}
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

            {/* 🔥 PASSWORD — ONLY ON CREATE */}
            {!editingUser && form.role !== "STUDENT" && (
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
            )}

            {/* ROLE */}
            <select
              className="w-full mb-3 p-2 border rounded"
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
                        {/* STUDENT FIELDS */}
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

                <select
                  required
                  className="w-full mb-3 p-2 border rounded"
                  value={form.classId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      classId: Number(e.target.value),
                    })
                  }
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="w-full mb-3 p-2 border rounded"
                  value={form.dob}
                  onChange={(e) =>
                    setForm({ ...form, dob: e.target.value })
                  }
                />

                {/* 🔥 PASSWORD — ONLY ON CREATE */}
                {!editingUser && (
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
                )}
              </>
            )}

            {/* ACTION BUTTONS */}
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