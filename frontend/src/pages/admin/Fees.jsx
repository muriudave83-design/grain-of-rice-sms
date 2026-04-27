import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");

  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  // 🔒 LOCK STATE
  const [isLocked, setIsLocked] = useState(false);

  const fetchLock = async () => {
    try {
      const res = await apiClient.get("/terms");
      const locked = res.data.some((t) => t.isLocked);
      setIsLocked(locked);
    } catch (err) {
      console.error("Failed to fetch lock:", err);
    }
  };

  const fetchData = async () => {
    try {
      const feesRes = await apiClient.get("/fees");
      const studentsRes = await apiClient.get("/students");

      setFees(feesRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      console.error("Failed to fetch fees data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLock();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (isLocked) {
      alert("System locked");
      return;
    }

    if (!studentId || !amount) {
      alert("Fill all fields");
      return;
    }

    try {
      await apiClient.post("/fees", {
        studentId: Number(studentId),
        amount: Number(amount),
      });

      setStudentId("");
      setAmount("");
      alert("Fee created");

      fetchData();
    } catch (err) {
      console.error("Failed to create fee:", err);
      alert("Error creating fee");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Fees Management</h1>

      {/* CREATE FEE */}
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap gap-3 items-center"
      >
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="border p-2 rounded w-64"
          disabled={isLocked}
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} ({s.admissionNo})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Total Fee"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border p-2 rounded w-40"
          disabled={isLocked}
        />

        {isLocked ? (
          <span className="text-gray-400 px-4 py-2">Locked</span>
        ) : (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Add Fee
          </button>
        )}
      </form>
            {/* EMPTY STATE */}
      {fees.length === 0 ? (
        <p className="text-gray-500">No fees found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Student</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-left">Paid</th>
                <th className="p-2 text-left">Balance</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {fees.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">
                    {f.student?.firstName} ({f.student?.admissionNo})
                  </td>

                  {/* EDITABLE AMOUNT */}
                  <td className="p-2">
                    {editingId === f.id ? (
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="border p-1 w-20 rounded"
                        disabled={isLocked}
                      />
                    ) : (
                      f.amount
                    )}
                  </td>

                  <td className="p-2">{f.paid}</td>

                  <td className="p-2 font-medium">
                    {f.amount - f.paid}
                  </td>

                  <td className="p-2 flex gap-2 flex-wrap">
                    {/* EDIT */}
                    {isLocked ? (
                      <span className="text-gray-400">Locked</span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(f.id);
                          setEditAmount(f.amount);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                    )}

                    {/* SAVE EDIT */}
                    {editingId === f.id && !isLocked && (
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.put(`/fees/${f.id}`, {
                              amount: Number(editAmount),
                            });

                            setEditingId(null);
                            setEditAmount("");
                            fetchData();
                            alert("Updated");
                          } catch (err) {
                            console.error("Update failed:", err);
                            alert("Update failed");
                          }
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                    )}
                                        {/* PAY */}
                    {isLocked ? (
                      <span className="text-gray-400">Locked</span>
                    ) : payingId === f.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="border p-1 w-20 rounded"
                        />
                        <button
                          onClick={async () => {
                            if (!payAmount || Number(payAmount) <= 0) return;

                            try {
                              await apiClient.put(`/fees/${f.id}/pay`, {
                                amount: Number(payAmount),
                              });

                              setPayingId(null);
                              setPayAmount("");
                              fetchData();
                              alert("Payment added");
                            } catch (err) {
                              console.error("Payment failed:", err);
                              alert("Payment failed");
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPayingId(f.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Pay
                      </button>
                    )}

                    {/* DELETE */}
                    {isLocked ? (
                      <span className="text-gray-400">Locked</span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this fee?")) return;

                          try {
                            await apiClient.delete(`/fees/${f.id}`);
                            fetchData();
                            alert("Deleted");
                          } catch (err) {
                            console.error("Delete failed:", err);
                            alert("Delete failed");
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}