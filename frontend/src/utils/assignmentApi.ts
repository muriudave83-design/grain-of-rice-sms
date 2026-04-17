export const createAssignment = async (classId: number, data: any, token: string) => {
  const res = await fetch(`http://localhost:5000/api/teacher/class/${classId}/assignment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to create assignment");
  }

  return res.json();
};