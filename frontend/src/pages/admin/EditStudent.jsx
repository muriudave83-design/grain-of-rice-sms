import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedParents, setSelectedParents] = useState([]);
  const [originalParents, setOriginalParents] = useState([]); // 🔥 NEW

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, parentsRes, classesRes] = await Promise.all([
          apiClient.get(`/admin/students/${id}`),
          apiClient.get(`/admin/parents`),
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
          classId: studentData.classId || "",
        });

        if (studentData.parents) {
          const parentIds = studentData.parents.map((p) => String(p.id));

          setSelectedParents(parentIds);
          setOriginalParents(parentIds); // 🔥 TRACK ORIGINAL
        }

      } catch (err) {
        console.error("Failed to load data", err);
        alert("Failed to load student");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      // ✅ Update student
      await apiClient.put(`/admin/students/${id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        admissionNo: form.admissionNo,
        classId: form.classId ? Number(form.classId) : null,
      });

      // 🔥 DETECT CHANGES
      const toAdd = selectedParents.filter(
        (id) => !originalParents.includes(id)
      );

      const toRemove = originalParents.filter(
        (id) => !selectedParents.includes(id)
      );

      console.log("TO ADD:", toAdd);
      console.log("TO REMOVE:", toRemove);

      // ✅ LINK NEW
      for (const parentId of toAdd) {
        try {
          await apiClient.post("/admin/link-student", {
            studentId: Number(id),
            parentId,
          });
        } catch (err) {
          console.warn("Link skipped:", parentId);
        }
      }

      // 🔥 UNLINK REMOVED
      for (const parentId of toRemove) {
        try {
          await apiClient.delete("/admin/unlink-student", {
            data: {
              studentId: Number(id),
              parentId,
            },
          });
        } catch (err) {
          console.warn("Unlink failed:", parentId);
        }
      }

      alert("Student updated successfully");
      navigate("/dashboard/admin/students");

    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!student) return <div className="p-6">Student not found</div>;

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-semibold mb-4">
        Edit {student.firstName} {student.lastName}
      </h2>

      <button
        onClick={() => navigate("/dashboard/admin/students")}
        className="mb-4 text-blue-500"
      >
        ← Back to Students
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-sm font-medium">First Name</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, firstName: e.target.value }))
            }
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, lastName: e.target.value }))
            }
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Admission Number</label>
          <input
            type="text"
            value={form.admissionNo}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, admissionNo: e.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Class</label>
          <select
            className="w-full p-2 border rounded"
            value={form.classId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, classId: e.target.value }))
            }
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Assign Parents
          </label>

          <select
            multiple
            className="w-full p-2 border rounded h-32"
            value={selectedParents}
            onChange={(e) => {
              const values = Array.from(
                e.target.selectedOptions,
                (opt) => opt.value
              );

              setSelectedParents(values);
            }}
          >
            {parents.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.email})
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-500 mt-1">
            Hold Ctrl (Windows) or Cmd (Mac) to select multiple
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {saving ? "Saving..." : "Save Changes"}
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