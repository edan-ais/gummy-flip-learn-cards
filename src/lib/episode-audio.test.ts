import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ charge: vi.fn(), refund: vi.fn(), ai: vi.fn(), speech: vi.fn(), sign: vi.fn(), upload: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./ai/gateway.server", () => ({ aiText: mocks.ai, speech: mocks.speech, chunkText: (text: string) => [text] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: mocks.refund,
  storage: { from: () => ({ createSignedUrls: mocks.sign, upload: mocks.upload }) },
} }));

import { episodeAudio } from "./study.functions";

type Row = { id: string; exam_id: string; section_id: string; status: string; storage_paths: string[]; audio_urls: string[]; title: string; detail: string };
const call = episodeAudio as unknown as (input: { data: { podcastId: string }; context: { supabase: unknown; userId: string } }) => Promise<{ urls: string[] }>;

function setup(paths: string[] = []) {
  const row: Row = { id: "episode", exam_id: "exam", section_id: "chapter", status: paths.length ? "ready" : "empty", storage_paths: paths, audio_urls: [], title: "Science", detail: "Atoms" };
  const client = {
    rpc: mocks.charge,
    from: (table: string) => {
      let update: Partial<Row> | undefined;
      let claim = false;
      let requiresEmpty = false;
      const builder = {
        select: () => builder,
        update: (value: Partial<Row>) => { update = value; return builder; },
        eq: (column: string) => { if (column === "storage_paths" || column === "audio_urls") requiresEmpty = true; return builder; },
        neq: () => { claim = true; return builder; },
        order: async () => ({ data: [{ q: "What is an atom?", a: "A unit of matter." }] }),
        single: async () => ({ data: table === "exams" ? { owner_id: "student" } : { ...row } }),
        maybeSingle: async () => {
          if (claim && (row.status === "generating" || (requiresEmpty && (row.storage_paths.length > 0 || row.audio_urls.length > 0)))) return { data: null, error: null };
          Object.assign(row, update);
          return { data: { id: row.id }, error: null };
        },
        then: (resolve: (value: { error: null }) => unknown) => { Object.assign(row, update); resolve({ error: null }); },
      };
      return builder;
    },
  };
  return { row, run: () => call({ data: { podcastId: row.id }, context: { supabase: client, userId: "student" } }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.charge.mockResolvedValue({ error: null });
  mocks.refund.mockResolvedValue({ error: null });
  mocks.sign.mockResolvedValue({ data: [{ signedUrl: "saved.wav" }] });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.ai.mockResolvedValue("A science lesson");
  mocks.speech.mockImplementation(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); return new Uint8Array([1, 2]); });
});

it("replays a completed episode without charging or generating", async () => {
  expect(await setup(["episodes/saved.wav"]).run()).toEqual({ urls: ["saved.wav"] });
  expect(mocks.charge).not.toHaveBeenCalled();
  expect(mocks.ai).not.toHaveBeenCalled();
});

it("locks simultaneous creation so only one request spends three BrainBucks", async () => {
  const { run, row } = setup();
  const results = await Promise.allSettled([run(), run()]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(mocks.charge).toHaveBeenCalledTimes(1);
  expect(mocks.charge).toHaveBeenCalledWith("spend_gems", { _cost: 3, _reason: "Abstract episode" });
  expect(mocks.ai).toHaveBeenCalledTimes(1);
  expect(row.status).toBe("ready");
});

it("releases the lock and refunds three BrainBucks if generation fails", async () => {
  mocks.ai.mockRejectedValueOnce(new Error("AI unavailable"));
  const { run, row } = setup();
  await expect(run()).rejects.toThrow("AI unavailable");
  expect(row.status).toBe("empty");
  expect(mocks.refund).toHaveBeenCalledTimes(1);
  expect(mocks.refund).toHaveBeenCalledWith("credit_gems", expect.objectContaining({ _amount: 3, _user: "student" }));
});

it("does not credit free BrainBucks when the initial spend is rejected", async () => {
  mocks.charge.mockResolvedValueOnce({ error: { message: "NOT_ENOUGH_GEMS" } });
  const { run, row } = setup();
  await expect(run()).rejects.toThrow("NOT_ENOUGH_GEMS");
  expect(row.status).toBe("empty");
  expect(mocks.refund).not.toHaveBeenCalled();
  expect(mocks.ai).not.toHaveBeenCalled();
});