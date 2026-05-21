import { useEffect, useState } from "react";

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

  async function fetchTerms() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/terms", {
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

      const res = await fetch("/api/admin/classes", {
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
        `/api/terms/validate?classId=${form.classId}&term=${form.name}`,
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

      const res = await fetch("/api/terms", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          classId: Number(form.classId),
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

      await fetch(`/api/terms/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      fetchTerms();
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleLock(id) {
    try {
      const token = localStorage.getItem("token");

      await fetch(`/api/terms/${id}/lock`, {
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

  async function deleteTerm(id) {
    const confirmed = window.confirm(
      "Delete this term?"
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");

      await fetch(`/api/terms/${id}`, {
        method: "DELETE",
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

  useEffect(() => {
    fetchTerms();
    fetchClasses();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Academic Terms
      </h1>

      <div className="grid grid-cols-5 gap-4 mb-4">

        <select
          className="border p-2"
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

        <input
          className="border p-2"
          placeholder="Academic Year"
          value={form.academicYear}
          onChange={(e) =>
            setForm({
              ...form,
              academicYear: e.target.value,
            })
          }
        />

        <input
          type="date"
          className="border p-2"
          value={form.startDate}
          onChange={(e) =>
            setForm({
              ...form,
              startDate: e.target.value,
            })
          }
        />

        <input
          type="date"
          className="border p-2"
          value={form.endDate}
          onChange={(e) =>
            setForm({
              ...form,
              endDate: e.target.value,
            })
          }
        />

        <select
          className="border p-2"
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
                Class: {t.class?.name || t.classId}
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
                onClick={() => {
                  const newName = prompt(
                    "Edit term name",
                    t.name
                  );

                  if (!newName) return;

                  updateTerm(t.id, {
                    name: newName,
                  });
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Edit
              </button>

              {/* LOCK / ARCHIVE */}
              <button
                onClick={() => toggleLock(t.id)}
                className={`px-3 py-1 rounded text-white ${
                  t.isLocked
                    ? "bg-green-600"
                    : "bg-yellow-600"
                }`}
              >
                {t.isLocked ? "Unlock" : "Archive"}
              </button>

              {/* DELETE */}
              <button
                onClick={() => deleteTerm(t.id)}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}