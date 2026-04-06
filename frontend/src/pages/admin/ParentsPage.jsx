<div className="p-6">
  <div className="flex justify-between items-center mb-4">
    <h1 className="text-xl font-semibold">Parents</h1>

    <button
      onClick={() => navigate("/dashboard/admin/parents/new")}
      className="bg-blue-500 text-white px-4 py-2 rounded-lg"
    >
      + Add Parent
    </button>
  </div>

  <div className="bg-white border rounded-xl overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-gray-600">
        <tr>
          <th className="p-3 text-left">Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Children</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {parents.map(parent => (
          <tr key={parent.id} className="border-t">
            <td className="p-3">{parent.name}</td>
            <td>{parent.email}</td>
            <td>{parent.phone}</td>
            <td>{parent.students?.length || 0}</td>

            <td>
              <button
                onClick={() => navigate(`/dashboard/admin/parents/${parent.id}`)}
                className="text-blue-600"
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>