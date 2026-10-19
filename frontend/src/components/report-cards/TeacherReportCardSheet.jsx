import {
  displaySubjectComment,
  formatReportGrade,
  formatReportPercentage,
} from "../../utils/reportCardPresentation";

export default function TeacherReportCardSheet({
  student,
  className,
  termName,
  termId,
  commentSaveStates = {},
  onCommentChange,
  onCommentBlur,
  onCommentRetry,
  onCommentUseSaved,
  onCommentOverwrite,
}) {
  return (
    <article className="border p-6 rounded mb-6 print-card bg-white">
      <div className="report-card-header mb-4 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="School Logo"
          className="w-12 h-12 object-contain"
        />

        <div>
          <h2 className="text-xl font-bold">Grain of Rice Academy</h2>
          <p className="text-sm">Official Report Card</p>
        </div>
      </div>

      <div className="report-student-info mb-4">
        <p><strong>Student:</strong>{" "}{student.name}</p>
        <p><strong>Admission Number:</strong>{" "}{student.admissionNo || "—"}</p>
        <p><strong>Grade:</strong>{" "}{className}</p>
        <p><strong>Term:</strong>{" "}{termName}</p>
      </div>

      <hr className="report-card-divider my-3" />

      <div className="report-subject-table mb-4">
        <div className="report-subject-grid report-subject-header font-semibold border-b pb-2">
          <span>Subject</span>
          <span>Score</span>
          <span>Grade</span>
          <span>Teacher Comment</span>
        </div>

        {student.subjects.map((subject) => {
          const key = `${termId}-${student.studentId}-${subject.subjectId}`;
          const saveState = commentSaveStates[key];
          const displayedComment = saveState?.draftValue ?? subject.comment;
          const canEditComment = Boolean(
            subject.canEditComment && onCommentChange && onCommentBlur,
          );

          return (
            <div
              key={key}
              className="report-subject-grid report-subject-row py-2 border-b border-gray-100 items-start"
            >
              <span className="report-subject-name">{subject.subjectName}</span>

              <span className="report-score">
                {subject.finalGrade === null
                  ? "Incomplete"
                  : formatReportPercentage(subject.finalGrade)}
              </span>

              <span className="report-grade">
                {subject.finalGrade === null
                  ? "—"
                  : formatReportGrade(subject.letter, subject.gradeDescription)}
              </span>

              <div className="report-comment">
                {canEditComment ? (
                  <textarea
                    aria-label={`${subject.subjectName} teacher comment for ${student.name}`}
                    className="border w-full p-2 print-hidden"
                    value={displayedComment ?? ""}
                    placeholder="Add subject comment"
                    onChange={(event) => onCommentChange(key, event.target.value, subject)}
                    onBlur={(event) => onCommentBlur(subject, event.target.value)}
                  />
                ) : (
                  <p className="print-hidden whitespace-pre-wrap break-words text-gray-700">
                    {displaySubjectComment(displayedComment)}
                  </p>
                )}
                {saveState && (
                  <div className={`print-hidden text-xs ${saveState.status === "Failed" || saveState.status === "Conflict" ? "text-red-700" : "text-gray-600"}`}>
                    {saveState.status}
                    {saveState.error && <span className="ml-1">— {saveState.error}</span>}
                    {saveState.status === "Failed" && (
                      <button type="button" className="ml-2 underline" onClick={() => onCommentRetry(subject, saveState.draftValue)}>Retry</button>
                    )}
                    {saveState.status === "Conflict" && (
                      <span className="ml-2 space-x-2">
                        <button type="button" className="underline" onClick={() => onCommentUseSaved(subject)}>Use saved value</button>
                        <button type="button" className="underline" onClick={() => onCommentOverwrite(subject)}>Overwrite with my value</button>
                      </span>
                    )}
                  </div>
                )}
                <p className="print-only whitespace-pre-wrap break-words">
                  {displaySubjectComment(saveState?.status === "Saved" || !saveState ? displayedComment : saveState.serverValue)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <hr className="report-card-divider my-3" />

      <div className="report-attendance mt-4 border-t pt-3">
        <h3 className="font-bold mb-2">Attendance</h3>
        <p><strong>Present:</strong>{" "}{Number(student.present || 0)}</p>
        <p><strong>Absent:</strong>{" "}{Number(student.absent || 0)}</p>
        <p><strong>Late:</strong>{" "}{Number(student.late || 0)}</p>
        <p><strong>Attendance Rate:</strong>{" "}{student.attendanceRate ?? 0}%</p>
      </div>
    </article>
  );
}
