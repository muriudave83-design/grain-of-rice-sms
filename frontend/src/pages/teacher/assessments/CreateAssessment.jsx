import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function CreateAssessment() {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    title: "",
    teacherSubjectId: "",
    classId: "",
    subjectId: "",
    categoryId: "",
    maxScore: "",
    termId: "",
    date: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // LOAD ASSIGNMENTS + CATEGORIES
  useEffect(() => {
    async function loadAssignments() {
      try {
        setError(null);

        const res = await api.get("/teacher/assignments");
        setAssignments(res.data);

        if (res.data.length === 0) {
          setError("You are not assigned to teach any subjects.");
        }
      } catch (err) {
        setAssignments([]);
        setError(
          err.response?.data?.message ||
          "Failed to load teaching assignments."
        );
      }
    }

    async function fetchCategories() {
      try {
        const res = await api.get("/assignment-categories");
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to load categories");
      }
    }

    loadAssignments();
    fetchCategories();
  }, []);

  // FORM HANDLERS
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleAssignmentChange(e) {
    const teacherSubjectId = e.target.value;

    const assignment = assignments.find(
      (a) => a.id === Number(teacherSubjectId)
    );

    if (!assignment) return;

    setForm((prev) => ({
      ...prev,
      teacherSubjectId,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post("/assessments", {
        title: form.title,
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
        categoryId: Number(form.categoryId),
        termId: Number(form.termId),
        maxScore: Number(form.maxScore),
        date: form.date || null,
        type: "EXAM",
      });

      navigate("/teacher/assessments");

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "You are not allowed to create this assessment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-600 mb-2">
        Teacher / Assessments / Create
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/assessments")}
        className="mb-4 px-3 py-1 border rounded"
      >
        ← Back to Assessments
      </button>

      <h1 className="text-2xl font-semibold mb-6">
        Create Assessment
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-sm mb-1 font-medium">
            Teaching Assignment
          </label>

          <select
            required
            value={form.teacherSubjectId}
            onChange={handleAssignmentChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select assignment</option>

            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.subject.name} — {a.class.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">
            Category
          </label>

          <select
            name="categoryId"
            required
            value={form.categoryId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select category</option>

            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">
            Assessment Title
          </label>

          <input
            name="title"
            required
            value={form.title}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g Mid Term CAT 1"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">
            Total Marks
          </label>

          <input
            type="number"
            name="maxScore"
            min="1"
            required
            value={form.maxScore}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g 100"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">
            Term
          </label>

          <input
            type="number"
            name="termId"
            min="1"
            required
            value={form.termId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g 1"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">
            Date (optional)
          </label>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          disabled={
            loading ||
            !form.teacherSubjectId ||
            !form.categoryId
          }
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Assessment"}
        </button>

      </form>
    </div>
  );
}