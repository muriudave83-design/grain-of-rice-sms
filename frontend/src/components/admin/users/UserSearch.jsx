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
          rounded-lg
          bg-gray-900
          border border-gray-700
          text-white
          placeholder-gray-500
          focus:outline-none
          focus:ring-2
          focus:ring-yellow-500
          transition
        "
      />
    </div>
  );
}