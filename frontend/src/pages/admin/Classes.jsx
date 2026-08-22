import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Archived toggle
  const [showArchived, setShowArchived] =
    useState(false);

  // Modal state
  const [editingClass, setEditingClass] =
    useState(null);

  const [editName, setEditName] = useState("");
  const [deleteClass, setDeleteClass] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // -----------------------------
  // Fetch classes
  // -----------------------------
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get(
        "/admin/classes",
        {
          params: {
            includeArchived: showArchived,
          },
        }
      );

      setClasses(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Error loading classes"
      );
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  // -----------------------------
  // Create class
  // -----------------------------
  async function handleCreateClass(e) {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/admin/classes", {
        name,
      });

      setName("");
      await fetchClasses();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Error creating class"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // -----------------------------
  // Open edit modal
  // -----------------------------
  const openEditModal = (cls) => {
    setEditingClass(cls);
    setEditName(cls.name);
  };

  // -----------------------------
  // Save edit
  // -----------------------------
  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    try {
      await apiClient.put(
        `/admin/classes/${editingClass.id}`,
        {
          name: editName,
        }
      );

      setClasses((prev) =>
        prev.map((c) =>
          c.id === editingClass.id
            ? { ...c, name: editName }
            : c
        )
      );

      setEditingClass(null);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Update failed"
      );
    }
  };

  // -----------------------------
  // Delete class
  // -----------------------------
  const openDeleteModal = async (cls) => {
    setDeleteClass(cls);
    setDeletePreview(null);
    setDeleteConfirmation("");
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const response = await apiClient.get(`/admin/classes/${cls.id}/delete-preview`);
      setDeletePreview(response.data);
    } catch (err) {
      setDeleteError(err?.message || "Unable to preview class deletion");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteClass || !deletePreview?.allowDelete) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await apiClient.delete(`/admin/classes/${deleteClass.id}/with-data`, { data: { confirmation: deleteConfirmation } });
      setClasses((prev) => prev.filter((item) => item.id !== deleteClass.id));
      setDeleteClass(null);
    } catch (err) {
      setDeleteError(err?.message || "Permanent deletion failed");
      if (err?.response?.data?.preview) setDeletePreview(err.response.data.preview);
    } finally {
      setDeleteLoading(false);
    }
  };

  // -----------------------------
  // Archive class
  // -----------------------------
  const handleArchive = async (cls) => {
    if (!window.confirm("Archive this class?\n\nThe class will be removed from active school workflows, but students and historical academic records will be preserved."))
      return;
        try {
      await apiClient.patch(
        `/admin/classes/${cls.id}/archive`
      );

      setClasses((prev) =>
        prev.filter((c) => c.id !== cls.id)
      );
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Archive failed"
      );
    }
  };

  // ✅ Refresh when toggle changes
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Classes
      </h1>

      {/* Create Class */}
      <form
        onSubmit={handleCreateClass}
        className="bg-white border rounded-lg p-4 space-y-3 max-w-md"
      >
        <h2 className="font-medium text-gray-900">
          Create Class
        </h2>

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
          {submitting
            ? "Creating..."
            : "Create Class"}
        </button>

        {error && (
          <p className="text-sm text-red-600 mt-2">
            {error}
          </p>
        )}
      </form>

      {/* Classes List */}
      <div className="bg-white border rounded-lg p-4">
        {/* ✅ Toggle Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">
            Existing Classes
          </h2>

          <button
            onClick={() =>
              setShowArchived((prev) => !prev)
            }
            className="text-xs px-3 py-1 rounded border"
          >
            {showArchived
              ? "Hide Archived"
              : "View Archived"}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">
            Loading classes...
          </p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No classes created yet.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">
                  Name
                </th>

                <th className="text-left py-2">
                  Created
                </th>

                <th className="text-left py-2">
                  Students
                </th>

                <th className="text-left py-2">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {classes.map((cls) => (
                <tr
                  key={cls.id}
                  className="border-b last:border-0"
                >
                  <td className="py-2">
                    {cls.name}

                    {cls.isArchived && (
                      <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                        Archived
                      </span>
                    )}
                  </td>
                                    <td className="py-2 text-gray-500">
                    {new Date(
                      cls.createdAt
                    ).toLocaleDateString()}
                  </td>

                  <td className="py-2">
                    {cls.studentCount} students
                    <br />

                    <Link
                      to={`/dashboard/admin/classes/${cls.id}/students`}
                      className="text-yellow-500 underline text-xs"
                    >
                      View
                    </Link>
                  </td>

                  <td className="py-2 space-x-2">
                    <button
                      onClick={() =>
                        openEditModal(cls)
                      }
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                    >
                      Edit
                    </button>

                    {!cls.isArchived && (
                      <button
                        onClick={() =>
                          handleArchive(cls)
                        }
                        className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded"
                      >
                        Archive
                      </button>
                    )}

                    <button
                      onClick={() =>
                        openDeleteModal(cls)
                      }
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                    >
                      Delete Class Data
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteClass && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-class-title">
          <div className="mx-auto my-8 w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl sm:p-6">
            <h2 id="delete-class-title" className="text-xl font-semibold text-red-700">Permanently Delete Class</h2>
            <p className="mt-1 font-medium">{deleteClass.name}</p>
            {deleteLoading && !deletePreview ? <p className="py-8 text-center text-sm">Loading dependency preview…</p> : deletePreview && (
              <div className="mt-5 space-y-4 text-sm">
                <section><h3 className="font-semibold">BLOCKERS</h3><ul className="mt-1 list-disc pl-5">
                  {deletePreview.blockers.activeStudents > 0 && <li>This class still has {deletePreview.blockers.activeStudents} active student{deletePreview.blockers.activeStudents === 1 ? "" : "s"}. Move {deletePreview.blockers.activeStudents === 1 ? "the student" : "them"} to another class before deleting this class.</li>}
                  {deletePreview.blockers.archivedStudents > 0 && <li>{deletePreview.blockers.archivedStudents} archived student record{deletePreview.blockers.archivedStudents === 1 ? " remains" : "s remain"} attached and must be reassigned.</li>}
                  {deletePreview.blockers.activeTeacherAssignments > 0 && <li>End active teacher assignments before deleting this class.</li>}
                  {deletePreview.blockers.historicalTeacherAssignments > 0 && <li>Historical teacher assignment ownership remains; permanent deletion is unsafe.</li>}
                  {deletePreview.allowDelete && <li>None</li>}
                </ul></section>
                <section><h3 className="font-semibold">WILL DELETE</h3><ul className="mt-1 grid grid-cols-2 gap-x-4">
                  {Object.entries(deletePreview.willDelete).map(([label, count]) => <li key={label}>{label}: {count}</li>)}
                </ul></section>
                <section><h3 className="font-semibold">WILL PRESERVE</h3><ul className="mt-1 list-disc pl-5">{deletePreview.preserved.map((item) => <li key={item}>{item}</li>)}</ul></section>
                {deletePreview.allowDelete && <div><label htmlFor="delete-class-confirmation" className="mb-1 block font-medium">Type {deletePreview.confirmationPhrase} to confirm</label><input id="delete-class-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="w-full rounded border p-2" /></div>}
              </div>
            )}
            {deleteError && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={deleteLoading} onClick={() => setDeleteClass(null)} className="rounded border px-4 py-2">Cancel</button>
              <button type="button" disabled={!deletePreview?.allowDelete || deleteConfirmation !== deletePreview?.confirmationPhrase || deleteLoading} onClick={handlePermanentDelete} className="rounded bg-red-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400">{deleteLoading ? "Deleting…" : "Permanently Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">
              Edit Class
            </h2>

            <input
              value={editName}
              onChange={(e) =>
                setEditName(e.target.value)
              }
              className="w-full border px-3 py-2 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setEditingClass(null)
                }
                className="px-3 py-1 text-sm border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
