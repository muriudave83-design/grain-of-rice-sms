import apiClient from "../services/apiClient";

export const createAssignment = async (classId: number, data: any) => {
  try {
    const res = await apiClient.post(
      `/teacher/class/${classId}/assignment`,
      data
    );

    return res.data;
  } catch (err) {
    console.error("Create assignment failed:", err);
    throw err;
  }
};