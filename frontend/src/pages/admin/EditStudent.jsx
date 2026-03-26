import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    admissionNo: "",
    parentId: "",
    classId: "",
  });

  const [loading, setLoading] = useState(true);

  // ✅ FETCH ALL REQUIRED DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, parentsRes, classesRes] = await Promise.all([
          apiClient.get(`/admin/students/${id}`),
          apiClient.get(`/admin/users?role=PARENT`),
          apiClient.get(`/admin/classes`),
        ]);

        const studentData = studentRes.data;

        setStudent(studentData);
        setParents(parentsRes.data || []);
        setClasses(classesRes.data || []);

        setForm({
          firstName: studentData.firstName || "",
          lastName: studentData.lastName || "",
          admissionNo: studentData.admissionNo || "",
          parentId: studentData.parentId || "",
          classId: studentData.classId || "",
        });

      } catch (err) {
        console.error("Failed to load data", err);
        alert("Failed to load student");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ✅ HANDLE SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await apiClient.put(`/admin/students/${id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        admissionNo: form.admissionNo,
        parentId: form.parentId ? Number(form.parentId) : null,
        classId: form.classId ? Number(form.classId) : null,
      });

      alert("Student updated successfully");

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

        {/* ✅ CLASS SELECT */}
        <select
          className="w-full p-2 border rounded"
          value={form.classId}
          onChange={(e) =>
            setForm({ ...form, classId: e.target.value })
          }
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* ✅ PARENT SELECT */}
        <select
          className="w-full p-2 border rounded"
          value={form.parentId}
          onChange={(e) =>
            setForm({ ...form, parentId: e.target.value })
          }
        >
          <option value="">Select Parent</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

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