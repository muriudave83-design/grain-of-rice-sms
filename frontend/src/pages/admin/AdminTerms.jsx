import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/apiClient";

export default function AdminTerms() {
  const [terms, setTerms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingTerm, setEditingTerm] =
    useState(null);

  const [form, setForm] = useState({
    name: "Term 1",
    academicYear: new Date()
      .getFullYear()
      .toString(),
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchTerms();
  }, []);

  async function fetchTerms() {
    setLoading(true);

    try {
      const res = await api.get(
        "/admin/terms"
      );

      if (Array.isArray(res.data)) {
        setTerms(res.data);
      } else {
        console.error(
          "Invalid terms response:",
          res.data
        );

        setTerms([]);
      }
    } catch (err) {
      console.error(
        "Failed to fetch terms:",
        err
      );

      setTerms([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitForm(e) {
    e.preventDefault();

    try {
      await api.post("/admin/terms", {
        ...form,
        startDate:
          form.startDate || null,
        endDate:
          form.endDate || null,
      });

      setForm({
        name: "Term 1",
        academicYear: new Date()
          .getFullYear()
          .toString(),
        startDate: "",
        endDate: "",
      });

      setShowForm(false);

      fetchTerms();
    } catch (err) {
      console.error(
        "Failed to create term:",
        err
      );

      alert(
        "Failed to create term. Please try again."
      );
    }
  }

  async function updateTerm(e) {
    e.preventDefault();

    try {
      await api.put(
        `/admin/terms/${editingTerm.id}`,
        {
          name: editingTerm.name,
          academicYear:
            editingTerm.academicYear,
          startDate:
            editingTerm.startDate ||
            null,
          endDate:
            editingTerm.endDate || null,
        }
      );

      setEditingTerm(null);

      fetchTerms();
    } catch (err) {
      console.error(
        "Failed to update term:",
        err
      );

      alert(
        "Failed to update term."
      );
    }
  }

  function formatDate(date) {
    if (!date) return "No date";

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) {
      return "Invalid date";
    }

    return parsed.toLocaleDateString();
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Academic Terms
          </h1>

          <button
            onClick={() =>
              setShowForm(true)
            }
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

                <th className="p-3 text-left">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-4 text-center"
                  >
                    Loading…
                  </td>
                </tr>
              ) : terms.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-4 text-center text-gray-500"
                  >
                    No terms created yet
                  </td>
                </tr>
              ) : (
                terms.map((term) => (
                  <tr
                    key={term.id}
                    className="border-t"
                  >
                    <td className="p-3">
                      <div>
                        <strong>
                          {term.name}
                        </strong>

                        <div
                          style={{
                            fontSize: "12px",
                            opacity: 0.8,
                          }}
                        >
                          {term.startDate
                            ? formatDate(
                                term.startDate
                              )
                            : "No start date"}
                          {" → "}
                          {term.endDate
                            ? formatDate(
                                term.endDate
                              )
                            : "No end date"}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      {term.academicYear}
                    </td>

                    <td className="p-3">
                      {formatDate(
                        term.startDate
                      )}
                    </td>

                    <td className="p-3">
                      {formatDate(
                        term.endDate
                      )}
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() =>
                          setEditingTerm({
                            ...term,
                            startDate:
                              term.startDate
                                ? term.startDate.split(
                                    "T"
                                  )[0]
                                : "",
                            endDate:
                              term.endDate
                                ? term.endDate.split(
                                    "T"
                                  )[0]
                                : "",
                          })
                        }
                        className="px-3 py-1 bg-gray-800 text-white rounded text-xs"
                      >
                        Edit
                      </button>
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

        {editingTerm && (
          <form
            onSubmit={updateTerm}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          >
            <div className="bg-white p-6 rounded w-96 space-y-4">
              <h2 className="text-lg font-semibold">
                Edit Term
              </h2>

              <select
                className="w-full p-2 border rounded"
                value={editingTerm.name}
                onChange={(e) =>
                  setEditingTerm({
                    ...editingTerm,
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
                value={
                  editingTerm.academicYear
                }
                onChange={(e) =>
                  setEditingTerm({
                    ...editingTerm,
                    academicYear:
                      e.target.value,
                  })
                }
              />

              <input
                type="date"
                className="w-full p-2 border rounded"
                value={
                  editingTerm.startDate ||
                  ""
                }
                onChange={(e) =>
                  setEditingTerm({
                    ...editingTerm,
                    startDate:
                      e.target.value,
                  })
                }
              />

              <input
                type="date"
                className="w-full p-2 border rounded"
                value={
                  editingTerm.endDate || ""
                }
                onChange={(e) =>
                  setEditingTerm({
                    ...editingTerm,
                    endDate:
                      e.target.value,
                  })
                }
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingTerm(null)
                  }
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}