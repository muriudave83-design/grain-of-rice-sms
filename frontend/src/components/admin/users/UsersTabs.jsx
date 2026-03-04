import React from "react";

const tabs = [
  { key: "admins", label: "Admins" }, // ✅ Added
  { key: "teachers", label: "Teachers" },
  { key: "students", label: "Students" },
  { key: "parents", label: "Parents" },
];

export default function UsersTabs({
  activeTab,
  setActiveTab,
  counts = {},
}) {
  return (
    <div className="flex gap-4 border-b border-gray-700 mb-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;

        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              relative px-4 py-2 font-medium transition
              ${
                isActive
                  ? "text-yellow-400 border-b-2 border-yellow-400"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            {tab.label}

            <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded-full">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}