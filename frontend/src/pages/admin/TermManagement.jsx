import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;
export default function TermManagement() {
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);

  const SYSTEM_TERMS = [
    "Term 1",
    "Term 2",
    "Term 3",
  ];

  const [form, setForm] = useState({
    name: "",
    academicYear: "",
    startDate: "",
    endDate: "",
    classId: "",
  });

  const [editingTerm, setEditingTerm] =
    useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    academicYear: "",
    startDate: "",
    endDate: "",
  });
  const [startPreview, setStartPreview] = useState(null);
  const [startConfirmation, setStartConfirmation] = useState("");
  const [startBusy, setStartBusy] = useState(false);

  async function fetchTerms() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/terms`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setTerms(data);
      } else {
        console.error("Invalid terms response:", data);
        setTerms([]);
      }
    } catch (err) {
      console.error(err);
      setTerms([]);
    }
  }

  async function fetchClasses() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/admin/classes`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setClasses(data);
      } else {
        console.error("Invalid classes response:", data);
        setClasses([]);
      }
    } catch (err) {
      console.error(err);
      setClasses([]);
    }
  }

  async function createTerm() {
    try {
      const token = localStorage.getItem("token");

      const validation = await fetch(
          `${API_URL}/terms/validate?classId=${form.classId}&term=${form.name}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const validationData = await validation.json();

      if (validationData.status === "locked") {
        alert(validationData.message);
        return;
      }

      const res = await fetch(`${API_URL}/terms`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,

          ...(form.classId && {
            classId: Number(form.classId),
          }),
        }),
      });

      const data = await res.json();

      if (data.status === "missing") {
        alert(data.message);
      }

      if (!res.ok) {
        alert(data.message || "Failed to create term");
        return;
      }

      setForm({
        name: "",
        academicYear: "",
        startDate: "",
        endDate: "",
        classId: "",
      });

      fetchTerms();
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTerm(id, updates) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/terms/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...updates,

          ...(updates.classId && {
            classId: Number(updates.classId),
          }),
        }),
      });

      const data = await res.json();

      console.log("UPDATE RESPONSE:", data);

      if (!res.ok) {
        alert(data.message || "Failed to update term");
        return;
      }

      alert("Term updated successfully");

      fetchTerms();
    } catch (err) {
      console.error(err);
      alert("Update crashed");
    }
  }

  async function toggleLock(id) {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${API_URL}/terms/${id}/lock`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchTerms();
    } catch (err) {
      console.error(err);
    }
  }

async function openDeletePreview(id) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/terms/${id}/delete-preview`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to preview term deletion");
      return;
    }
    setDeletePreview(data);
    setDeleteConfirmation("");
  } catch (err) {
    console.error(err);
    alert("Failed to preview term deletion");
  }
}

async function deleteTermData() {
  if (!deletePreview || deleteConfirmation !== deletePreview.confirmation) return;
  try {
    setDeleteBusy(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/terms/${deletePreview.term.id}/with-data`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmation: deleteConfirmation }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Term deletion rolled back");
      return;
    }
    alert(data.message);
    setDeletePreview(null);
    setDeleteConfirmation("");
    fetchTerms();
  } catch (err) {
    console.error(err);
    alert("Term deletion rolled back");
  } finally {
    setDeleteBusy(false);
  }
}

async function previewNewTerm() {
  try {
    setStartBusy(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/terms/start-new-term/preview`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(schoolForm),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to preview new Term");
      return;
    }
    setStartPreview(data);
    setStartConfirmation("");
  } catch (err) {
    console.error(err);
    alert("Failed to preview new Term");
  } finally {
    setStartBusy(false);
  }
}

async function startNewTerm() {
  if (!startPreview || startConfirmation !== startPreview.confirmation) return;
  try {
    setStartBusy(true);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/terms/start-new-term`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...schoolForm, confirmation: startConfirmation }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Start New Term rolled back");
      return;
    }
    alert(data.message);
    setStartPreview(null);
    setStartConfirmation("");
    setSchoolForm({ name: "", academicYear: "", startDate: "", endDate: "" });
    fetchTerms();
  } catch (err) {
    console.error(err);
    alert("Start New Term rolled back");
  } finally {
    setStartBusy(false);
  }
}

  useEffect(() => {
    fetchTerms();
    fetchClasses();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Academic Terms
      </h1>

      <p className="text-sm text-gray-600 mb-4">
        Terms are class-specific. Creating a term for one class does not configure it for any other class.
      </p>

      <section className="border-2 border-indigo-200 bg-indigo-50 rounded p-5 mb-8">
        <h2 className="text-xl font-bold">Start New Term for All Active Classes</h2>
        <p className="text-sm text-gray-600 mb-4">
          Preview and create one class-specific Term for every active class. Archived classes and exact duplicates are skipped.
        </p>
        <div className="grid md:grid-cols-4 gap-4">
          <label className="text-sm font-medium">Term
            <select
              className="border p-2 w-full mt-1"
              value={schoolForm.name}
              onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })}
            >
              <option value="">Select Term</option>
              {SYSTEM_TERMS.map((term) => <option key={term} value={term}>{term}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Academic Year
            <input
              className="border p-2 w-full mt-1"
              placeholder="2026 or 2026/2027"
              value={schoolForm.academicYear}
              onChange={(event) => setSchoolForm({ ...schoolForm, academicYear: event.target.value })}
            />
          </label>
          <label className="text-sm font-medium">Start Date
            <input
              type="date"
              className="border p-2 w-full mt-1"
              value={schoolForm.startDate}
              onChange={(event) => setSchoolForm({ ...schoolForm, startDate: event.target.value })}
            />
          </label>
          <label className="text-sm font-medium">End Date
            <input
              type="date"
              className="border p-2 w-full mt-1"
              value={schoolForm.endDate}
              onChange={(event) => setSchoolForm({ ...schoolForm, endDate: event.target.value })}
            />
          </label>
        </div>
        <button
          onClick={previewNewTerm}
          disabled={startBusy}
          className="mt-4 bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {startBusy ? "Checking..." : "Preview All Active Classes"}
        </button>
      </section>

      <h2 className="text-xl font-bold mb-2">Create Term for One Class</h2>
      <p className="text-sm text-gray-600 mb-4">Use this for a new class, special program, or one missing class Term.</p>

      <div className="grid grid-cols-5 gap-4 mb-4">
        <label className="text-sm font-medium">
          Term
        <select
          className="border p-2 w-full mt-1"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        >
          <option value="">
            Select Term
          </option>

          {SYSTEM_TERMS.map((term) => (
            <option
              key={term}
              value={term}
            >
              {term}
            </option>
          ))}
        </select>
        </label>

        <label className="text-sm font-medium">
          Academic Year
        <input
          className="border p-2 w-full mt-1"
          placeholder="Academic Year"
          value={form.academicYear}
          onChange={(e) =>
            setForm({
              ...form,
              academicYear: e.target.value,
            })
          }
        />
        </label>

        <label className="text-sm font-medium">
          Start Date
        <input
          type="date"
          className="border p-2 w-full mt-1"
          value={form.startDate}
          onChange={(e) =>
            setForm({
              ...form,
              startDate: e.target.value,
            })
          }
        />
        </label>

        <label className="text-sm font-medium">
          End Date
        <input
          type="date"
          className="border p-2 w-full mt-1"
          value={form.endDate}
          onChange={(e) =>
            setForm({
              ...form,
              endDate: e.target.value,
            })
          }
        />
        </label>

        <label className="text-sm font-medium">
          Class
        <select
          className="border p-2 w-full mt-1"
          value={form.classId}
          onChange={(e) =>
            setForm({
              ...form,
              classId: e.target.value,
            })
          }
        >
          <option value="">
            Select Class
          </option>

          {classes.map((cls) => (
            <option
              key={cls.id}
              value={cls.id}
            >
              {cls.name}
            </option>
          ))}
        </select>
        </label>
      </div>

      <button
        onClick={createTerm}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Create Term
      </button>

      <div className="mt-8 border rounded bg-white">
        {terms.map((t) => (
          <div
            key={t.id}
            className="border-b p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold">
                {t.name} — {t.academicYear}
              </div>

              <div className="text-sm text-gray-500">
                Start:{" "}
                {t.startDate
                  ? new Date(
                      t.startDate
                    ).toLocaleDateString()
                  : "N/A"}
              </div>

              <div className="text-sm text-gray-500">
                End:{" "}
                {t.endDate
                  ? new Date(
                      t.endDate
                    ).toLocaleDateString()
                  : "N/A"}
              </div>

              <div className="text-sm text-gray-500">
                Class:{" "}
                {t.class?.name || t.classId}
              </div>

              <div className="text-sm">
                {t.isLocked ? (
                  <span className="text-red-600 font-semibold">
                    Locked
                  </span>
                ) : (
                  <span className="text-green-600 font-semibold">
                    Active
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {/* EDIT */}
              <button
                onClick={() =>
                  setEditingTerm({
                    ...t,
                    startDate: t.startDate
                      ? t.startDate.split(
                          "T"
                        )[0]
                      : "",
                    endDate: t.endDate
                      ? t.endDate.split(
                          "T"
                        )[0]
                      : "",
                  })
                }
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Edit
              </button>

              {/* LOCK / ARCHIVE */}
              <button
                onClick={() =>
                  toggleLock(t.id)
                }
                className={`px-3 py-1 rounded text-white ${
                  t.isLocked
                    ? "bg-green-600"
                    : "bg-yellow-600"
                }`}
              >
                {t.isLocked
                  ? "Unlock"
                  : "Archive"}
              </button>

              {/* DELETE */}
              <button
                onClick={() =>
                  openDeletePreview(t.id)
                }
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete Term Data
              </button>
            </div>
          </div>
        ))}
      </div>

      {startPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-xl font-bold">Start {startPreview.proposal.name} — {startPreview.proposal.academicYear}</h2>
            <p>Permanent school data and historical Term data are unaffected.</p>
            <div>
              <h3 className="font-semibold text-green-700">Will create ({startPreview.totalCreate})</h3>
              <p className="text-sm">{startPreview.willCreate.map((item) => item.className).join(", ") || "None"}</p>
            </div>
            <div>
              <h3 className="font-semibold">Exact duplicates skipped ({startPreview.totalSkip})</h3>
              <p className="text-sm">{startPreview.skipped.map((item) => item.className).join(", ") || "None"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-600">Archived classes excluded ({startPreview.archivedClassesExcluded.length})</h3>
              <p className="text-sm">{startPreview.archivedClassesExcluded.map((item) => item.className).join(", ") || "None"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-red-700">Conflicts ({startPreview.totalConflicts})</h3>
              {startPreview.conflicts.length ? (
                <ul className="text-sm list-disc pl-5">
                  {startPreview.conflicts.map((item) => <li key={item.classId}>{item.className}: {item.reason}</li>)}
                </ul>
              ) : <p className="text-sm">None</p>}
            </div>
            {startPreview.totalConflicts > 0 && (
              <p className="bg-red-50 border border-red-300 p-3 rounded text-red-800">
                Resolve these conflicts by editing or deleting the existing class Term, then preview again. Nothing can be created yet.
              </p>
            )}
            <label className="block font-medium">
              Type <span className="font-bold">{startPreview.confirmation}</span> to confirm
              <input
                className="border p-2 w-full mt-1"
                value={startConfirmation}
                onChange={(event) => setStartConfirmation(event.target.value)}
                disabled={startPreview.totalConflicts > 0}
                autoComplete="off"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setStartPreview(null); setStartConfirmation(""); }}
                disabled={startBusy}
                className="border px-4 py-2 rounded"
              >Cancel</button>
              <button
                onClick={startNewTerm}
                disabled={startBusy || startPreview.totalConflicts > 0 || startConfirmation !== startPreview.confirmation}
                className="bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >{startBusy ? "Starting..." : `Start ${startPreview.proposal.name}`}</button>
            </div>
          </div>
        </div>
      )}

      {deletePreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-xl font-bold text-red-700">Permanently Delete Term Data</h2>
            <p>
              Delete {deletePreview.term.name} for {deletePreview.term.class.name} ({deletePreview.term.academicYear})?
            </p>
            <p className="font-semibold">
              This permanently deletes only records explicitly attached to this Term. This cannot be undone.
            </p>
            <div>
              <h3 className="font-semibold">Will delete</h3>
              <ul className="grid grid-cols-2 gap-x-4 text-sm">
                {Object.entries(deletePreview.willDelete).map(([name, count]) => (
                  <li key={name}>{name}: {count}</li>
                ))}
              </ul>
              <p className="mt-2 font-semibold">Total related records: {deletePreview.totalRelatedRecords}</p>
            </div>
            <div>
              <h3 className="font-semibold text-green-700">Will preserve</h3>
              <p className="text-sm">{deletePreview.willPreserve.join(", ")}</p>
              <p className="text-sm">{deletePreview.financialData}</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-700">Unresolved / not owned (preserved)</h3>
              <ul className="text-sm">
                {Object.entries(deletePreview.unresolvedNotOwned).map(([name, count]) => (
                  <li key={name}>{name}: {count}</li>
                ))}
              </ul>
            </div>
            <label className="block font-medium">
              Type <span className="font-bold">{deletePreview.confirmation}</span> to confirm
              <input
                className="border p-2 w-full mt-1"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeletePreview(null); setDeleteConfirmation(""); }}
                disabled={deleteBusy}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={deleteTermData}
                disabled={deleteBusy || deleteConfirmation !== deletePreview.confirmation}
                className="bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                {deleteBusy ? "Deleting..." : "Delete Term and Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTerm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-[400px] space-y-4">
            <h2 className="text-xl font-bold">
              Edit Term
            </h2>

            <select
              className="border p-2 w-full"
              value={editingTerm.name}
              onChange={(e) =>
                setEditingTerm({
                  ...editingTerm,
                  name: e.target.value,
                })
              }
            >
              {SYSTEM_TERMS.map((term) => (
                <option
                  key={term}
                  value={term}
                >
                  {term}
                </option>
              ))}
            </select>

            <input
              className="border p-2 w-full"
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
              className="border p-2 w-full"
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
              className="border p-2 w-full"
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

            <select
              className="border p-2 w-full"
              value={
                editingTerm.classId || ""
              }
              onChange={(e) =>
                setEditingTerm({
                  ...editingTerm,
                  classId:
                    e.target.value,
                })
              }
            >
              <option value="">
                Select Class
              </option>

              {classes.map((cls) => (
                <option
                  key={cls.id}
                  value={cls.id}
                >
                  {cls.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setEditingTerm(null)
                }
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await updateTerm(
                    editingTerm.id,
                    {
                      name:
                        editingTerm.name,
                      academicYear:
                        editingTerm.academicYear,
                      startDate:
                        editingTerm.startDate,
                      endDate:
                        editingTerm.endDate,
                      classId:
                        editingTerm.classId,
                    }
                  );

                  setEditingTerm(null);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
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
