// Handoff from onboarding to the authenticated new-exam flow.
// A module singleton keeps picked File objects alive across client-side
// navigation (onboarding -> /auth -> /exams/new) without session storage,
// which cannot hold File blobs.
export type PendingUpload = {
  files: File[];
  text?: string;
  courseName?: string;
};

let pending: PendingUpload | null = null;

export function setPendingUpload(p: PendingUpload | null) {
  pending = p;
}

export function peekPendingUpload(): PendingUpload | null {
  return pending;
}

export function takePendingUpload(): PendingUpload | null {
  const p = pending;
  pending = null;
  return p;
}
