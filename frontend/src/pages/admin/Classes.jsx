import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // -----------------------------
  // Fetch classes
  // -----------------------------
  async function fetchClasses() {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get("/admin/classes");
      setClasses(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Error loading classes"
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Create class
  // -----------------------------
  async function handleCreateClass(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/admin/classes", { name });

      setName("");
      await fetchClasses();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Error creating class"
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetchClasses();
  }, []);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Classes</h1>

      {/* Create Class */}
      <form
        onSubmit={handleCreateClass}
        className="bg-white border rounded-lg p-4 space-y-3 max-w-md"
      >
        <h2 className="font-medium text-gray-900">Create Class</h2>

        <input
          type="text"
          placeholder="e.g. Grade 1 A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />

        <button
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {submitting ? "Creating..." : "Create Class"}
        </button>

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </form>

      {/* Classes List */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-medium text-gray-900 mb-3">
          Existing Classes
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading classes...</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No classes created yet.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Created</th>
                <th className="text-left py-2">Students</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className="border-b last:border-0">
                  <td className="py-2">{cls.name}</td>
                  <td className="py-2 text-gray-500">
                    {new Date(cls.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <Link
                      to={`/dashboard/admin/classes/${cls.id}/students`}
                      className="text-yellow-400 underline text-sm"
                    >
                      View students
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
