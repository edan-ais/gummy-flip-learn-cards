import { describe, expect, it, beforeEach } from "vitest";
import { peekPendingUpload, setPendingUpload, takePendingUpload } from "./pending-upload";

describe("pending upload handoff", () => {
  beforeEach(() => setPendingUpload(null));

  it("keeps the upload until it is taken once", () => {
    const f = new File(["photosynthesis notes"], "notes.txt", { type: "text/plain" });
    setPendingUpload({ files: [f], text: "pasted notes", courseName: "Science" });
    expect(peekPendingUpload()?.courseName).toBe("Science");
    const taken = takePendingUpload();
    expect(taken?.files[0].name).toBe("notes.txt");
    expect(taken?.text).toBe("pasted notes");
    expect(takePendingUpload()).toBeNull();
  });

  it("clears when set to null", () => {
    setPendingUpload({ files: [] });
    setPendingUpload(null);
    expect(takePendingUpload()).toBeNull();
  });
});
