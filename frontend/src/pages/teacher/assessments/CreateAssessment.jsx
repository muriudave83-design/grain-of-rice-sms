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
    categoryId: null,
    maxScore: "",
    termId: "",
    date: "",
    type: "ASSIGNMENT",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // LOAD DATA
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

  // HANDLE ASSIGNMENT SELECT
  function handleAssignmentChange(e) {
    const teacherSubjectId = e.target.value;

    const assignment = assignments.find(
      (a) => a.id === Number(teacherSubjectId)
    );

    if (!assignment) return;

    // SAFE ACCESS (handles BOTH backend shapes)
    const classId =
      assignment.class?.id ?? assignment.classId;
    const subjectId =
      assignment.subject?.id ?? assignment.subjectId;

    setForm((prev) => ({
      ...prev,
      teacherSubjectId,
      classId,
      subjectId,
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // PARSE NUMBERS
    const parsedCategoryId = parseInt(form.categoryId, 10);
    const parsedTermId = parseInt(form.termId, 10);
    const parsedMaxScore = parseInt(form.maxScore, 10);
    const parsedClassId = parseInt(form.classId, 10);
    const parsedSubjectId = parseInt(form.subjectId, 10);

    // VALIDATION
    if (!form.teacherSubjectId) {
      setError("Please select class and subject");
      setLoading(false);
      return;
    }

    if (isNaN(parsedClassId) || isNaN(parsedSubjectId)) {
      setError("Invalid class or subject");
      setLoading(false);
      return;
    }

    if (isNaN(parsedCategoryId)) {
      setError("Please select a valid category");
      setLoading(false);
      return;
    }

    if (isNaN(parsedTermId)) {
      setError("Please enter a valid term");
      setLoading(false);
      return;
    }

    if (isNaN(parsedMaxScore)) {
      setError("Please enter valid total marks");
      setLoading(false);
      return;
    }

    // ✅ VALIDATE TYPE AGAINST ENUM
    const validTypes = ["EXAM", "TEST", "QUIZ", "ASSIGNMENT", "HOMEWORK"];
    if (!validTypes.includes(form.type)) {
      setError("Invalid assessment type selected");
      setLoading(false);
      return;
    }

    try {
      console.log("SENDING CLEAN:", {
        title: form.title,
        classId: parsedClassId,
        subjectId: parsedSubjectId,
        categoryId: parsedCategoryId,
        termId: parsedTermId,
        maxScore: parsedMaxScore,
        type: form.type,
      });

      await api.post("/assessments", {
        title: form.title,
        classId: parsedClassId,
        subjectId: parsedSubjectId,
        categoryId: parsedCategoryId,
        termId: parsedTermId,
        maxScore: parsedMaxScore,
        date: form.date || null,
        type: form.type,
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
      <div className="text-sm text-gray-600 mb-2">
        Teacher / Assessments / Create
      </div>

      <button
        onClick={() => navigate("/teacher/assessments")}
        className="mb-4 px-3 py-1 border rounded"
      >
        ← Back to Assessments
      </button>

      <h1 className="text-2xl font-semibold mb-6">
        Create Assignment
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Assignment */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Class & Subject
          </label>

          <select
            value={form.teacherSubjectId}
            onChange={handleAssignmentChange}
            required
            className="w-full border p-2 rounded"
          >
            <option value="">Select class & subject</option>

            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.subject?.name || "Unknown Subject"} —{" "}
                {a.class?.name || "Unknown Class"}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Category
          </label>

          <select
            name="categoryId"
            required
            value={form.categoryId || ""}
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

        {/* ✅ FIXED TYPE (ENUM SAFE) */}
        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="ASSIGNMENT">Assignment</option>
          <option value="TEST">Test</option>
          <option value="EXAM">Exam</option>
          <option value="QUIZ">Quiz</option>
          <option value="HOMEWORK">Homework</option>
        </select>

        {/* Title */}
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Assignment Title"
          required
        />

        {/* Max Score */}
        <input
          type="number"
          name="maxScore"
          value={form.maxScore}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Total Marks"
          required
        />

        {/* Term */}
        <input
          type="number"
          name="termId"
          value={form.termId}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Term"
          required
        />

        {/* Date */}
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <button
          disabled={
            loading ||
            !form.teacherSubjectId ||
            !form.categoryId
          }
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Creating..." : "Create Assignment"}
        </button>
      </form>
    </div>
  );
}