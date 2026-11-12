const ENDPOINT = "/api/client-storage";
const SCOPE = "shared";
const MAX_VALUE_BYTES = 12 * 1024 * 1024;
const excludedKeyPatterns = [
  /^__clerk/i,
  /clerk/i,
  /token/i,
  /password/i,
  /secret/i,
  /^qadri-admin-session$/i,
  /^sidebar-state$/i,
  /^debug/i,
];

let installed = false;
let bootstrapping = false;
const pendingWrites = new Map<string, string>();
const pendingDeletes = new Set<string>();
let flushTimer: number | undefined;

function shouldPersist(key: string): boolean {
  return Boolean(key) && key.length <= 512 && !excludedKeyPatterns.some((pattern) => pattern.test(key));
}

function localEntries(): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !shouldPersist(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value === null || value.length > MAX_VALUE_BYTES) continue;
    entries.push({ key, value });
  }
  return entries;
}

async function fetchRemoteEntries(): Promise<Array<{ key: string; value: string }>> {
  const response = await fetch(`${ENDPOINT}?scope=${encodeURIComponent(SCOPE)}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Storage bootstrap failed with ${response.status}`);
  const body = (await response.json()) as { entries?: Array<{ key?: unknown; value?: unknown }> };
  return (body.entries ?? []).flatMap((entry) =>
    typeof entry.key === "string" && typeof entry.value === "string" && shouldPersist(entry.key)
      ? [{ key: entry.key, value: entry.value }]
      : [],
  );
}

async function uploadLocalEntries(entries: Array<{ key: string; value: string }>): Promise<void> {
  if (!entries.length) return;
  const response = await fetch(`${ENDPOINT}/bulk`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: SCOPE, entries }),
  });
  if (!response.ok) throw new Error(`Storage migration failed with ${response.status}`);
}

function scheduleFlush(): void {
  if (flushTimer !== undefined) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    void flushPendingWrites();
  }, 250);
}

async function flushPendingWrites(): Promise<void> {
  if (bootstrapping || (!pendingWrites.size && !pendingDeletes.size)) return;
  const writes = Array.from(pendingWrites.entries());
  const deletes = Array.from(pendingDeletes);
  pendingWrites.clear();
  pendingDeletes.clear();

  await Promise.all([
    ...writes.map(async ([key, value]) => {
      try {
        const response = await fetch(ENDPOINT, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: SCOPE, entry: { key, value } }),
        });
        if (!response.ok) throw new Error(String(response.status));
      } catch {
        pendingWrites.set(key, value);
      }
    }),
    ...deletes.map(async (key) => {
      try {
        const response = await fetch(`${ENDPOINT}?scope=${encodeURIComponent(SCOPE)}&key=${encodeURIComponent(key)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error(String(response.status));
      } catch {
        pendingDeletes.add(key);
      }
    }),
  ]);
  if (pendingWrites.size || pendingDeletes.size) scheduleFlush();
}

function installSyncHooks(): void {
  if (installed) return;
  installed = true;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function setItem(key: string, value: string): void {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && !bootstrapping && shouldPersist(key)) {
      pendingDeletes.delete(key);
      pendingWrites.set(key, value);
      scheduleFlush();
    }
  };
  Storage.prototype.removeItem = function removeItem(key: string): void {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && !bootstrapping && shouldPersist(key)) {
      pendingWrites.delete(key);
      pendingDeletes.add(key);
      scheduleFlush();
    }
  };
}

/** Load legacy browser data from Neon, migrating the first browser's data when Neon is empty. */
export async function bootstrapRemoteStorage(): Promise<void> {
  if (typeof window === "undefined" || bootstrapping) return;
  bootstrapping = true;
  try {
    const existingLocalEntries = localEntries();
    const remoteEntries = await fetchRemoteEntries();
    if (remoteEntries.length) {
      for (const entry of remoteEntries) window.localStorage.setItem(entry.key, entry.value);
      const remoteKeys = new Set(remoteEntries.map((entry) => entry.key));
      await uploadLocalEntries(existingLocalEntries.filter((entry) => !remoteKeys.has(entry.key)));
    } else {
      await uploadLocalEntries(existingLocalEntries);
    }
  } catch (error) {
    console.warn("Remote storage is temporarily unavailable; continuing with browser storage.", error);
  } finally {
    bootstrapping = false;
    installSyncHooks();
  }
}
