import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateHomework() {
  const navigate = useNavigate();

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

    // Basic validation
    if (!form.title || !form.classId || !form.subjectId || !form.termId) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

    await axios.post("/api/assessments", {
    ...form,
    categoryId: 1,
    type: "HOMEWORK",
    });

      alert("Homework created successfully");

      navigate("/teacher/assessments");
    } catch (err) {
      console.error(err);
      alert("Error creating homework");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-2xl font-semibold mb-4">
        Create Homework
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <input
          name="title"
          placeholder="Homework Title"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* Class */}
        <input
          name="classId"
          placeholder="Class ID"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* Subject */}
        <input
          name="subjectId"
          placeholder="Subject ID"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* Term */}
        <input
          name="termId"
          placeholder="Term ID"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* Max Score */}
        <input
          name="maxScore"
          type="number"
          placeholder="Max Score (e.g. 10)"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* Weight */}
        <input
          name="weight"
          type="number"
          step="0.1"
          placeholder="Weight (e.g. 0.1)"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* Submit */}
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