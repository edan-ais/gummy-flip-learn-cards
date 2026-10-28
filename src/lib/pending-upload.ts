// Handoff from onboarding to the authenticated new-exam flow.
// A module singleton keeps picked File objects alive across client-side
// navigation (onboarding -> /auth -> /exams/new) without session storage,
// which cannot hold File blobs.
export type PendingUpload = {
  files: File[];
  text?: string;
  courseName?: string;
};

// Keep one browser-owned handoff even when route chunks load separate copies.
const browserState = () => {
  if (typeof window === "undefined") return null;
  const owner = window as Window & { studyLambPendingUpload?: { value: PendingUpload | null } };
  owner.studyLambPendingUpload ??= { value: null };
  return owner.studyLambPendingUpload;
};
let pending: PendingUpload | null = null;

export function setPendingUpload(p: PendingUpload | null) {
  const state = browserState();
  if (state) state.value = p;
  pending = p;
}

export function peekPendingUpload(): PendingUpload | null {
  const state = browserState();
  return state ? state.value : pending;
}

export function takePendingUpload(): PendingUpload | null {
  const p = peekPendingUpload();
  setPendingUpload(null);
  return p;
}

async function uploadDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("studylamb-onboarding", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("uploads");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function persistPendingUpload(value: PendingUpload | null) {
  setPendingUpload(value);
  const db = await uploadDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      const store = tx.objectStore("uploads");
      if (value) store.put(value, "pending");
      else store.delete("pending");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function restorePendingUpload(): Promise<PendingUpload | null> {
  const current = peekPendingUpload();
  if (current) return current;
  const db = await uploadDatabase();
  try {
    return await new Promise<PendingUpload | null>((resolve, reject) => {
      const request = db.transaction("uploads").objectStore("uploads").get("pending");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
