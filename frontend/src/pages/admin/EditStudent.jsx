import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    admissionNo: "",
  });
  const [loading, setLoading] = useState(true);

  // ✅ Fetch student
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await apiClient.get(`/admin/students/${id}`);

        setStudent(res.data);

        setForm({
          firstName: res.data.firstName || "",
          lastName: res.data.lastName || "",
          admissionNo: res.data.admissionNo || "",
        });

      } catch (err) {
        console.error("Failed to fetch student", err);
        alert("Failed to load student");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  // ✅ Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await apiClient.put(`/admin/students/${id}`, form);

      alert("Student updated successfully");

      // ✅ go back to list
      navigate("/dashboard/admin/students");

    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update student");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  if (!student) return <div className="p-6">Student not found</div>;

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-semibold mb-4">
        Edit {student.firstName} {student.lastName}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          type="text"
          placeholder="First Name"
          className="w-full p-2 border rounded"
          value={form.firstName}
          onChange={(e) =>
            setForm({ ...form, firstName: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Last Name"
          className="w-full p-2 border rounded"
          value={form.lastName}
          onChange={(e) =>
            setForm({ ...form, lastName: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Admission No"
          className="w-full p-2 border rounded"
          value={form.admissionNo}
          onChange={(e) =>
            setForm({ ...form, admissionNo: e.target.value })
          }
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save Changes
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard/admin/students")}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}