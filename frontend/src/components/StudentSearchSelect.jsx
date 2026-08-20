import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 8;

function studentLabel(student) {
  const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
  return student.admissionNo ? `${name} (${student.admissionNo})` : name;
}

export default function StudentSearchSelect({
  students,
  value,
  onChange,
  placeholder = "Search by name or student number",
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedStudent = students.find(
    (student) => String(student.id) === String(value),
  );

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students.slice(0, MAX_RESULTS);

    return students
      .filter((student) => {
        const searchableText = [
          student.firstName,
          student.lastName,
          [student.firstName, student.lastName].filter(Boolean).join(" "),
          student.admissionNo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .slice(0, MAX_RESULTS);
  }, [query, students]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  const selectStudent = (student) => {
    onChange(String(student.id));
    setQuery("");
    setIsOpen(false);
  };

  const clearSelection = () => {
    onChange("");
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0 sm:w-72">
      {selectedStudent ? (
        <div className="flex min-h-10 items-center gap-2 rounded border bg-white px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm">
            {studentLabel(selectedStudent)}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="shrink-0 text-sm font-medium text-blue-700 hover:text-blue-900 disabled:text-gray-400"
          >
            Clear / change
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="w-full rounded border bg-white p-2 disabled:bg-gray-100"
            aria-label={placeholder}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />

          {isOpen && (
            <div
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border bg-white shadow-lg"
            >
              {matches.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">
                  No students found
                </p>
              ) : (
                matches.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => selectStudent(student)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    {studentLabel(student)}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
