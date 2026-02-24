import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get("/assignment-categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await apiClient.post("/assignment-categories", { name });
      setName("");
      fetchCategories();
    } catch (err) {
      console.error("Failed to create category", err);
    }
  };

  const handleWeightChange = (id, newWeight) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, weight: newWeight } : cat
      )
    );
  };

  const handleWeightSave = async (id, weight) => {
    try {
      await apiClient.put(`/assignment-categories/${id}`, {
        weight: Number(weight),
      });
    } catch (err) {
      console.error("Failed to update weight", err);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">
        Assignment Categories
      </h1>

      <form onSubmit={handleCreate} className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Category name (e.g. Exam)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2"
        >
          Create Category
        </button>
      </form>

      {categories.length === 0 ? (
        <p>No categories yet</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex justify-between items-center border p-2"
            >
              <span className="font-medium">
                {cat.name}
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={cat.weight}
                  onChange={(e) =>
                    handleWeightChange(cat.id, e.target.value)
                  }
                  onBlur={() =>
                    handleWeightSave(cat.id, cat.weight)
                  }
                  className="w-20 border p-1 text-center"
                />
                <span className="text-sm text-gray-500">
                  Weight
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}