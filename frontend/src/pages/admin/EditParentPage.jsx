import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function EditParentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchParent();
  }, [id]);

  const fetchParent = async () => {
    try {
      const res = await apiClient.get(`/admin/parents/${id}`);

      // ✅ Ensure safe structure (avoid overwriting with unexpected fields)
      setForm({
        name: res.data.name || "",
        email: res.data.email || "",
        phone: res.data.phone || "",
      });
    } catch (err) {
      console.error("Failed to fetch parent", err);
      alert("Failed to load parent");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      // ✅ Send only required fields
      await apiClient.put(`/admin/parents/${id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      navigate("/dashboard/admin/parents");
    } catch (err) {
      console.error("Failed to update parent", err);
      alert("Failed to update parent");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Are you sure you want to archive this parent?")) return;

    try {
      await apiClient.put(`/admin/parents/${id}/archive`);
      navigate("/dashboard/admin/parents");
    } catch (err) {
      console.error("Failed to archive parent", err);
      alert("Failed to archive parent");
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Reset password to default (123456)?")) return;

    try {
      await apiClient.put(`/admin/users/${id}/reset-password`);
      alert("Password reset to default: 123456");
    } catch (err) {
      console.error("Failed to reset password", err);
      alert("Failed to reset password");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-semibold mb-4">Edit Parent</h2>

      {/* 🔙 BACK BUTTON */}
      <button
        onClick={() => navigate("/dashboard/admin/parents")}
        className="mb-4 text-blue-500"
      >
        ← Back to Parents
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NAME */}
        <div>
          <label className="block text-sm font-medium">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full border p-2 rounded"
            required
          />
        </div>

        {/* EMAIL */}
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full border p-2 rounded"
          />
        </div>

        {/* PHONE */}
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full border p-2 rounded"
          />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 mt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Parent"}
          </button>

          <button
            type="button"
            onClick={handleArchive}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Archive
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            className="bg-yellow-500 text-black px-4 py-2 rounded"
          >
            Reset Password
          </button>
        </div>
      </form>
    </div>
  );
}