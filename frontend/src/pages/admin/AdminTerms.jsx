import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/apiClient";

export default function AdminTerms() {
  const [terms, setTerms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "Term 1",
    academicYear: new Date().getFullYear().toString(),
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

    setForm({
      name: "Term 1",
      academicYear: new Date().getFullYear().toString(),
      startDate: "",
      endDate: "",
    });

    setShowForm(false);
    fetchTerms();
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Academic Terms
          </h1>

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
                <th className="p-3 text-left">
                  Term
                </th>

                <th className="p-3 text-left">
                  Academic Year
                </th>

                <th className="p-3 text-left">
                  Start Date
                </th>

                <th className="p-3 text-left">
                  End Date
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-4 text-center"
                  >
                    Loading…
                  </td>
                </tr>
              ) : terms.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-4 text-center text-gray-500"
                  >
                    No terms created yet
                  </td>
                </tr>
              ) : (
                terms
                  .filter(
                    (t) =>
                      (t.name === "Term 2" &&
                        String(
                          t.academicYear
                        ) === "2026") ||
                      (t.name === "Term 3" &&
                        String(
                          t.academicYear
                        ) === "2026") ||
                      (t.name === "Term 1" &&
                        String(
                          t.academicYear
                        ) === "2027")
                  )
                  .map((t) => (
                    <tr
                      key={t.id}
                      className="border-t"
                    >
                      <td className="p-3">
                        {t.name}
                      </td>

                      <td className="p-3">
                        {t.academicYear}
                      </td>

                      <td className="p-3">
                        {new Date(
                          t.startDate
                        ).toLocaleDateString()}
                      </td>

                      <td className="p-3">
                        {new Date(
                          t.endDate
                        ).toLocaleDateString()}
                      </td>
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
              <h2 className="text-lg font-semibold">
                Create Term
              </h2>

              <select
                className="w-full p-2 border rounded"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              >
                <option value="Term 1">
                  Term 1
                </option>

                <option value="Term 2">
                  Term 2
                </option>

                <option value="Term 3">
                  Term 3
                </option>
              </select>

              <input
                required
                type="number"
                placeholder="Academic Year"
                className="w-full p-2 border rounded"
                value={form.academicYear}
                onChange={(e) =>
                  setForm({
                    ...form,
                    academicYear:
                      e.target.value,
                  })
                }
              />

              <input
                required
                type="date"
                className="w-full p-2 border rounded"
                value={form.startDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    startDate:
                      e.target.value,
                  })
                }
              />

              <input
                required
                type="date"
                className="w-full p-2 border rounded"
                value={form.endDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    endDate:
                      e.target.value,
                  })
                }
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
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