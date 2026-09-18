const CHUNK_RELOAD_KEY = "safety-board-chunk-reload";

function isChunkLoadFailure(value: unknown) {
  const message =
    value instanceof Error ? value.message :
    typeof value === "string" ? value :
    typeof (value as any)?.message === "string" ? (value as any).message :
    "";
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Load failed/i.test(message);
}

function recoverFromStaleChunk(value: unknown) {
  if (!isChunkLoadFailure(value)) return false;
  try {
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
    if (alreadyReloaded) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {}
  window.location.reload();
  return true;
}

export function installChunkRecovery() {
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (recoverFromStaleChunk(event.reason)) event.preventDefault();
  };
  const onError = (event: ErrorEvent) => {
    recoverFromStaleChunk(event.error || event.message);
  };
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("error", onError);
  window.addEventListener("pageshow", () => {
    try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch {}
  }, { once: true });
  return () => {
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("error", onError);
  };
}
