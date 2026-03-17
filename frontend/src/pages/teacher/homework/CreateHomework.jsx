import { useState } from "react";
import API from "../../../api/apiClient";
import { useNavigate } from "react-router-dom";

export default function CreateHomework() {
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  const [form, setForm] = useState({
    title: "",
    classId: "",
    subjectId: "",
    termId: "",
    maxScore: 10,
    weight: 0.1,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.type === "number"
          ? Number(e.target.value)
          : e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.classId || !form.subjectId || !form.termId) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      await API.post("/assessments", {
        ...form,
        categoryId: 1,
        type: "HOMEWORK",
      });

      alert("Homework created successfully");

      navigate("/teacher/assessments");

    } catch (err) {
      console.error("❌ Create homework error:", err);
      alert("Error creating homework");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-600 mb-2">
        Teacher / Homework / Create
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/assessments")}
        className="mb-4 px-3 py-1 border rounded"
      >
        ← Back to Assessments
      </button>

      <h2 className="text-2xl font-semibold mb-4">
        Create Homework
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="title"
          placeholder="Homework Title"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="classId"
          placeholder="Class ID"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="subjectId"
          placeholder="Subject ID"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="termId"
          placeholder="Term ID"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="maxScore"
          type="number"
          placeholder="Max Score"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="weight"
          type="number"
          step="0.01"
          placeholder="Weight"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Creating..." : "Create Homework"}
        </button>
      </form>
    </div>
  );
}