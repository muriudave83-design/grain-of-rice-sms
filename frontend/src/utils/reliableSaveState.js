export const SAVE_STATUS = Object.freeze({
  CLEAN: "Clean",
  UNSAVED: "Unsaved",
  SAVING: "Saving",
  SAVED: "Saved",
  FAILED: "Failed",
  CONFLICT: "Conflict",
});

export const unresolvedSaveStatuses = new Set([
  SAVE_STATUS.UNSAVED,
  SAVE_STATUS.SAVING,
  SAVE_STATUS.FAILED,
  SAVE_STATUS.CONFLICT,
]);

export function editSaveField(previous, serverValue, draftValue) {
  return {
    serverValue: previous?.serverValue ?? serverValue ?? null,
    draftValue,
    status: SAVE_STATUS.UNSAVED,
    error: null,
    sequence: (previous?.sequence ?? 0) + 1,
  };
}

export function beginSave(previous, serverValue) {
  const sequence = (previous?.sequence ?? 0) + 1;
  return {
    serverValue: previous?.serverValue ?? serverValue ?? null,
    draftValue: previous?.draftValue ?? String(serverValue ?? ""),
    status: SAVE_STATUS.SAVING,
    error: null,
    sequence,
  };
}

export function finishSave(previous, sequence, serverValue) {
  if (!previous || previous.sequence !== sequence) return previous;
  return { ...previous, serverValue, draftValue: String(serverValue ?? ""), status: SAVE_STATUS.SAVED, error: null };
}

export function acknowledgeTokenizedSave(previous, sequence, serverValue, serverToken) {
  if (!previous || previous.sequence < sequence) return previous;
  if (previous.sequence === sequence) {
    return {
      ...finishSave(previous, sequence, serverValue),
      serverToken,
    };
  }
  return {
    ...previous,
    serverValue,
    serverToken,
  };
}

export function failSave(previous, sequence, error, conflict = false, serverValue) {
  if (!previous || previous.sequence !== sequence) return previous;
  return {
    ...previous,
    ...(serverValue !== undefined ? { authoritativeValue: serverValue } : {}),
    status: conflict ? SAVE_STATUS.CONFLICT : SAVE_STATUS.FAILED,
    error,
  };
}

export function acceptAuthoritativeValue(previous, serverValue, serverToken) {
  return {
    ...previous,
    serverValue,
    draftValue: String(serverValue ?? ""),
    ...(serverToken !== undefined ? { serverToken } : {}),
    authoritativeValue: undefined,
    authoritativeToken: undefined,
    status: SAVE_STATUS.SAVED,
    error: null,
    sequence: (previous?.sequence ?? 0) + 1,
  };
}

export function beginConfirmedOverwrite(previous, serverValue, serverToken) {
  if (previous?.status !== SAVE_STATUS.CONFLICT) return previous;
  return {
    ...previous,
    serverValue,
    ...(serverToken !== undefined ? { serverToken } : {}),
    authoritativeValue: undefined,
    authoritativeToken: undefined,
    status: SAVE_STATUS.SAVING,
    error: null,
    sequence: previous.sequence + 1,
  };
}

export function hasUnresolvedSaves(fields) {
  return Object.values(fields).some((field) => unresolvedSaveStatuses.has(field.status));
}

export function mayLeaveWithUnresolved(fields, confirmFn = globalThis.confirm) {
  return !hasUnresolvedSaves(fields) || confirmFn("Some changes are not safely saved. Leave and discard those drafts?");
}
