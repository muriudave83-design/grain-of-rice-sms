import { useEffect, useState } from "react";
import axios from "axios";

export default function Gradebook() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get("/api/gradebook?classId=1&subjectId=1&termId=1")
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!data) return <div className="p-4">Loading gradebook...</div>;

  return (
    <div className="p-4 overflow-x-auto">
      <h2 className="text-xl mb-4">Gradebook</h2>

      <table className="border border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-2">Student</th>

            {data.assessments.map((a) => (
              <th key={a.id} className="border p-2">
                {a.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.students.map((student) => (
            <tr key={student.id}>
              <td className="border p-2">{student.name}</td>

              {data.assessments.map((a) => {
                const score = data.scores.find(
                  (s) =>
                    s.studentId === student.id &&
                    s.assessmentId === a.id
                );

                return (
                  <td key={a.id} className="border p-2 text-center">
                    {score?.score ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}