import React from "react";

export default function UserSearch({
  value,
  onChange,
  placeholder = "Search...",
}) {
  return (
    <div className="mb-6">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          px-4 py-2
          rounded-md
          border border-gray-300
          bg-white
          text-gray-800
          placeholder-gray-400
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      />
    </div>
  );
}