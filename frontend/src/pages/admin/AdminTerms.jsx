import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/apiClient";

export default function AdminTerms() {
  const [terms, setTerms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchTerms();
  }, []);

  async function fetchTerms() {
    setLoading(true);
    try {
      const res = await api.get("/admin/terms");
      setTerms(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function submitForm(e) {
    e.preventDefault();

    await api.post("/admin/terms", form);

    setForm({ name: "", startDate: "", endDate: "" });
    setShowForm(false);
    fetchTerms();
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Academic Terms</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + Create Term
          </button>
        </div>

        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Start Date</th>
                <th className="p-3 text-left">End Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center">Loading…</td>
                </tr>
              ) : terms.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">
                    No terms created yet
                  </td>
                </tr>
              ) : (
                terms.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">{t.name}</td>
                    <td className="p-3">{t.startDate}</td>
                    <td className="p-3">{t.endDate}</td>
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
              <h2 className="text-lg font-semibold">Create Term</h2>

              <input
                required
                placeholder="Term name (e.g. Term 1 2026)"
                className="w-full p-2 border rounded"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                required
                type="date"
                className="w-full p-2 border rounded"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />

              <input
                required
                type="date"
                className="w-full p-2 border rounded"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />

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
    </AdminLayout>
  );
}
