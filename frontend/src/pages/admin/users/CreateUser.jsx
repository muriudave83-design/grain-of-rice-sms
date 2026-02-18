import { useState } from "react";
import api from "@/services/apiClient";

export default function CreateUser() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    tempPassword: "",
    role: "TEACHER",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // ✅ CORRECT: no /api prefix when using apiClient
      const endpoint =
        form.role === "TEACHER"
          ? "/admin/users/teacher"
          : "/admin/users/parent";

      await api.post(endpoint, {
        name: form.name,
        email: form.email,
        tempPassword: form.tempPassword,
      });

      setMessage(`${form.role} account created successfully`);
      setForm({
        name: "",
        email: "",
        tempPassword: "",
        role: "TEACHER",
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white p-6 rounded-lg shadow border">
      <h2 className="text-2xl font-semibold mb-2 text-gray-900">
        Create User Account
      </h2>

      <p className="text-sm text-gray-600 mb-6">
        Create a <strong>Teacher</strong> or <strong>Parent</strong> account.
        The user will be required to change their password on first login.
      </p>

      {message && (
        <div className="mb-4 rounded bg-green-50 text-green-700 px-4 py-2">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-4 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
          >
            <option value="TEACHER">Teacher</option>
            <option value="PARENT">Parent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Temporary Password
          </label>
          <input
            name="tempPassword"
            value={form.tempPassword}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          {loading
            ? "Creating account..."
            : `Create ${form.role} Account`}
        </button>
      </form>
    </div>
  );
}
