import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { getSearchableActiveTeachers } from "../../utils/adminTeacherSubjectOptions";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // NEW
  const [search, setSearch] = useState("");
  const [editingSubject, setEditingSubject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [assigningSubject, setAssigningSubject] = useState(null);
  const [assignmentClasses, setAssignmentClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentNotice, setAssignmentNotice] = useState("");

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/admin/subjects?search=${encodeURIComponent(search)}`
      );

      setSubjects(res.data || []);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  }, [search]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      await apiClient.post("/admin/subjects", { name, code });

      setName("");
      setCode("");

      fetchSubjects();

      alert("Subject created successfully");
    } catch (err) {
      console.error("Failed to create subject", err);
      alert("Failed to create subject");
    }
  };

  // NEW
  const handleEdit = async () => {
    try {
      await apiClient.patch(`/admin/subjects/${editingSubject.id}`, {
        name: editName,
        code: editCode,
      });

      alert("Subject updated successfully");

      setEditingSubject(null);
      setEditName("");
      setEditCode("");

      fetchSubjects();
    } catch (err) {
      console.error("Failed to update subject", err);
      alert("Failed to update subject");
    }
  };

  // NEW
  const handleArchive = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this subject?"
    );

    if (!confirmed) return;

    try {
      await apiClient.patch(`/admin/subjects/${id}/archive`);

      alert("Subject archived successfully");

      fetchSubjects();
    } catch (err) {
      console.error("Failed to archive subject", err);
      alert("Failed to archive subject");
    }
  };

  const openAssignTeacher = async (subject) => {
    setAssigningSubject(subject);
    setAssignmentClasses([]);
    setTeachers([]);
    setSelectedClassId("");
    setSelectedTeacherId("");
    setTeacherSearch("");
    setAssignmentError("");
    setAssignmentLoading(true);
    try {
      const [classesResponse, teachersResponse] = await Promise.all([
        apiClient.get(`/admin/class-subjects/by-subject/${subject.id}`),
        apiClient.get("/admin/users?role=TEACHER"),
      ]);
      if (!Array.isArray(classesResponse.data)) throw new Error("Unexpected class response");
      setAssignmentClasses(classesResponse.data.filter((entry) => entry?.class));
      setTeachers(getSearchableActiveTeachers(teachersResponse.data));
    } catch (err) {
      console.error("Failed to prepare teacher assignment", err);
      setAssignmentError(err?.message || "Failed to load assignment options");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const closeAssignTeacher = () => {
    if (assignmentSubmitting) return;
    setAssigningSubject(null);
    setAssignmentError("");
  };

  const filteredTeachers = useMemo(
    () => getSearchableActiveTeachers(teachers, teacherSearch),
    [teachers, teacherSearch],
  );
  const selectedTeacher = teachers.find((teacher) => String(teacher.id) === selectedTeacherId);
  const selectedClass = assignmentClasses.find((entry) => String(entry.classId) === selectedClassId)?.class;

  const submitTeacherAssignment = async (event) => {
    event.preventDefault();
    if (!assigningSubject || !selectedClassId || !selectedTeacherId) return;
    setAssignmentSubmitting(true);
    setAssignmentError("");
    try {
      const response = await apiClient.post("/admin/teacher-subjects", {
        teacherId: Number(selectedTeacherId),
        subjectId: assigningSubject.id,
        classId: Number(selectedClassId),
      });
      setAssignmentNotice(response.data?.reactivated
        ? `${selectedTeacher?.name || "Teacher"}'s assignment was reactivated.`
        : `${selectedTeacher?.name || "Teacher"} assigned to ${assigningSubject.name} — ${selectedClass?.name || "class"}.`);
      setAssigningSubject(null);
      await fetchSubjects();
    } catch (err) {
      console.error("Failed to assign teacher", err);
      setAssignmentError(err?.message || "Failed to assign teacher");
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Subjects</h1>

      {assignmentNotice && (
        <div role="status" className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {assignmentNotice}
        </div>
      )}

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search subjects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 w-full mb-4"
      />

      {/* CREATE */}
      <form onSubmit={handleCreate} className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
          required
        />

        <input
          type="text"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border p-2 w-full"
          required
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create Subject
        </button>
      </form>

      {/* SUBJECTS */}
      {subjects.length === 0 ? (
        <p>No subjects found</p>
      ) : (
        <ul className="space-y-2">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 border p-3 rounded sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium">{s.name}</div>

                <div className="text-sm text-gray-500">
                  Code: {s.code ?? "-"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* WEIGHT */}
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={s.weight ?? 0}
                  className="w-20 border p-1 text-center"
                  onChange={(e) => {
                    const newWeight = e.target.value;

                    setSubjects((prev) =>
                      prev.map((cat) =>
                        cat.id === s.id
                          ? { ...cat, weight: newWeight }
                          : cat
                      )
                    );
                  }}
                  onBlur={async () => {
                    try {
                      await apiClient.put(
                        `/assignment-categories/${s.id}`,
                        { weight: Number(s.weight) }
                      );
                    } catch (err) {
                      console.error("Failed to update weight", err);
                    }
                  }}
                />

                <span className="text-sm text-gray-500">
                  Weight
                </span>

                {/* ASSIGN */}
                <button
                  onClick={() => openAssignTeacher(s)}
                  className="bg-gray-800 text-white px-3 py-1 text-sm rounded hover:bg-gray-700"
                >
                  Assign Teacher
                </button>

                {/* EDIT */}
                <button
                  onClick={() => {
                    setEditingSubject(s);
                    setEditName(s.name);
                    setEditCode(s.code || "");
                  }}
                  className="bg-blue-600 text-white px-3 py-1 text-sm rounded"
                >
                  Edit
                </button>

                {/* ARCHIVE */}
                <button
                  onClick={() => handleArchive(s.id)}
                  className="bg-red-600 text-white px-3 py-1 text-sm rounded"
                >
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {assigningSubject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="assign-teacher-title">
          <div className="mx-auto my-8 w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6">
            <h2 id="assign-teacher-title" className="text-lg font-semibold">Assign Teacher</h2>
            <p className="mt-1 text-sm font-medium text-gray-700">{assigningSubject.name}</p>

            {assignmentLoading ? (
              <p className="py-8 text-center text-sm text-gray-600">Loading classes and teachers…</p>
            ) : (
              <form onSubmit={submitTeacherAssignment} className="mt-5 space-y-4">
                {assignmentClasses.length === 0 && !assignmentError ? (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p>This subject is not assigned to any class yet. Configure it under Class Subject Assignment first.</p>
                    <Link to="/dashboard/admin/class-subjects" className="mt-2 inline-block font-medium underline">
                      Open Class Subject Assignment
                    </Link>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="assign-teacher-class" className="mb-1 block text-sm font-medium">Class</label>
                      <select id="assign-teacher-class" required value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="w-full rounded border p-2">
                        <option value="">Select class</option>
                        {assignmentClasses.map((entry) => <option key={entry.id} value={entry.classId}>{entry.class.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="assign-teacher-search" className="mb-1 block text-sm font-medium">Teacher</label>
                      <input id="assign-teacher-search" type="search" value={teacherSearch} onChange={(event) => setTeacherSearch(event.target.value)} placeholder="Search by name or email" className="w-full rounded border p-2" />
                      <div className="mt-2 max-h-44 overflow-y-auto rounded border">
                        {filteredTeachers.length === 0 ? <p className="p-3 text-sm text-gray-500">No active teachers found</p> : filteredTeachers.map((teacher) => (
                          <button key={teacher.id} type="button" onClick={() => setSelectedTeacherId(String(teacher.id))} className={`block w-full border-b p-3 text-left text-sm last:border-b-0 ${String(teacher.id) === selectedTeacherId ? "bg-blue-50 ring-1 ring-inset ring-blue-500" : "hover:bg-gray-50"}`}>
                            <span className="block font-medium">{teacher.name}</span>
                            <span className="block text-gray-500">{teacher.email || "No email"}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedTeacher && (
                      <div className="rounded bg-gray-50 p-3 text-sm">
                        <span className="block text-gray-500">Selected teacher</span>
                        <span className="block font-medium">{selectedTeacher.name}</span>
                        <span className="block text-gray-600">{selectedTeacher.email || "No email"}</span>
                      </div>
                    )}
                  </>
                )}

                {assignmentError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{assignmentError}</p>}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button type="button" onClick={closeAssignTeacher} disabled={assignmentSubmitting} className="rounded border px-4 py-2">Cancel</button>
                  {assignmentClasses.length > 0 && (
                    <button type="submit" disabled={!selectedClassId || !selectedTeacherId || assignmentSubmitting} className="rounded bg-gray-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400">
                      {assignmentSubmitting ? "Assigning…" : "Assign Teacher"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-96 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold">
              Edit Subject
            </h2>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border p-2 w-full"
              placeholder="Subject Name"
            />

            <input
              type="text"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="border p-2 w-full"
              placeholder="Code"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingSubject(null)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleEdit}
                className="bg-black text-white px-4 py-2 rounded"
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
