const PREFIX = "gor:report-comment-drafts:v1:";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

const storageFor = (storage) => storage ?? globalThis.sessionStorage;
const userKey = (userId) => `${PREFIX}${Number(userId)}`;
export const commentDraftId = ({ studentId, teacherSubjectId, subjectId, termId }) =>
  `${Number(termId)}:${Number(studentId)}:${Number(subjectId)}:${Number(teacherSubjectId)}`;

function readUserDrafts(userId, storage, now = Date.now()) {
  const target = storageFor(storage);
  try {
    const parsed = JSON.parse(target.getItem(userKey(userId)) || "{}");
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => entry && now - Number(entry.savedAt) <= MAX_AGE_MS));
  } catch {
    target.removeItem(userKey(userId));
    return {};
  }
}

export function saveCommentDraft(userId, identity, draft, storage, now = Date.now()) {
  const target = storageFor(storage);
  const drafts = readUserDrafts(userId, target, now);
  drafts[commentDraftId(identity)] = { ...identity, value: String(draft.value ?? ""), serverValue: String(draft.serverValue ?? ""), serverToken: draft.serverToken ?? null, savedAt: now };
  target.setItem(userKey(userId), JSON.stringify(drafts));
}

export function getCommentDraft(userId, identity, storage, now = Date.now()) {
  return readUserDrafts(userId, storage, now)[commentDraftId(identity)] ?? null;
}

export function removeCommentDraft(userId, identity, storage) {
  const target = storageFor(storage);
  const drafts = readUserDrafts(userId, target);
  delete drafts[commentDraftId(identity)];
  if (Object.keys(drafts).length) target.setItem(userKey(userId), JSON.stringify(drafts));
  else target.removeItem(userKey(userId));
}

export function clearUserCommentDrafts(userId, storage) {
  storageFor(storage).removeItem(userKey(userId));
}
