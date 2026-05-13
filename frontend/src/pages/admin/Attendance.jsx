import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

export default function Attendance() {
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [sessionId, setSessionId] = useState(null);

  // 🔐 Load token
  useEffect(() => {
    const t = localStorage.getItem("token");

    if (t) {
      setToken(t);
      console.log("✅ TOKEN FOUND");
    } else {
      console.log("❌ NO TOKEN FOUND");
    }
  }, []);

  // 📚 Load classes
  useEffect(() => {
    if (!token) return;

    fetch(`${API}/classes/admin/classes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("📚 CLASSES:", data);
        setClasses(data);
      })
      .catch((err) => {
        console.error("❌ Failed to load classes:", err);
      });
  }, [token]);

  // 👨‍🎓 Load students
  useEffect(() => {
    if (!selectedClass || !token) return;

    fetch(`${API}/classes/${selectedClass}/students`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("👨‍🎓 STUDENTS:", data);

        setStudents(data);

        const initial = {};

        data.forEach((s) => {
          initial[s.id] = "PRESENT";
        });

        setRecords(initial);
      })
      .catch((err) => {
        console.error("❌ Failed to load students:", err);
      });
  }, [selectedClass, token]);

  // 📝 Create session
  const createSession = async () => {
    try {
      const res = await fetch(`${API}/attendance/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: Number(selectedClass),
          date: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      console.log("✅ SESSION:", data);

      setSessionId(data.id);

      alert("Attendance session created");
    } catch (err) {
      console.error("❌ Session creation failed:", err);
    }
  };

  // ✅ Save attendance
  const saveAttendance = async () => {
    try {
      const payload = Object.entries(records).map(
        ([studentId, status]) => ({
          studentId: Number(studentId),
          status,
        })
      );

      const res = await fetch(
        `${API}/attendance/sessions/${sessionId}/records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            records: payload,
          }),
        }
      );

      const data = await res.json();

      console.log("✅ SAVE RESPONSE:", data);

      alert("Attendance saved");
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  };

  // 🚀 Submit session
  const submitSession = async () => {
    try {
      const res = await fetch(
        `${API}/attendance/sessions/${sessionId}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("✅ SUBMIT RESPONSE:", data);

      alert("Attendance submitted");
    } catch (err) {
      console.error("❌ Submit failed:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Attendance Dashboard
      </h1>

      {/* CLASS SELECT */}
      <div className="mb-4">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Class</option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* START SESSION */}
      {selectedClass && !sessionId && (
        <button
          onClick={createSession}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          Start Attendance
        </button>
      )}

      {/* STUDENTS */}
      {students.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">
            Students
          </h2>

          {students.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 mb-2"
            >
              <div className="w-64">
                {s.firstName} {s.lastName}
              </div>

              <select
                value={records[s.id]}
                onChange={(e) =>
                  setRecords({
                    ...records,
                    [s.id]: e.target.value,
                  })
                }
                className="border p-1 rounded"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          ))}

          {/* ACTIONS */}
          {sessionId && (
            <div className="flex gap-4 mt-6">
              <button
                onClick={saveAttendance}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save Attendance
              </button>

              <button
                onClick={submitSession}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Submit Attendance
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}