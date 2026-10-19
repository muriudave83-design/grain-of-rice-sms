import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { hasUnresolvedSaves } from "./reliableSaveState";

const MESSAGE = "Some changes are not safely saved. Leave and discard those drafts?";

export default function useUnsavedChangesGuard(fields, fieldsRef) {
  const blocker = useBlocker(hasUnresolvedSaves(fields));

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (globalThis.confirm(MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!hasUnresolvedSaves(fieldsRef.current)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [fieldsRef]);

  return useCallback(
    () => !hasUnresolvedSaves(fieldsRef.current) || globalThis.confirm(MESSAGE),
    [fieldsRef],
  );
}
