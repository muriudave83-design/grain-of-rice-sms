import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function CreateParentPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    relationship: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    setLoading(true);
    await apiClient.post("/admin/parents", form);
    navigate("/dashboard/admin/parents");
  } catch (err) {
    console.error("❌ FULL ERROR:", err);
    console.log("👉 BACKEND RESPONSE:", err.response?.data);

    alert(err.response?.data?.message || "Failed to create parent");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Create Parent</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl p-6 space-y-4"
      >
        {/* BASIC INFO */}
        <input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* EXTRA DETAILS */}
        <input
          name="relationship"
          placeholder="Relationship (e.g. Mother, Father, Guardian)"
          value={form.relationship}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <textarea
          name="notes"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          rows={3}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Parent"}
        </button>
      </form>
    </div>
  );
}