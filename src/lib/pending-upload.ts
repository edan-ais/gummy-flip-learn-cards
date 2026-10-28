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
