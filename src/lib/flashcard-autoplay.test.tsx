import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useFlashcardSpeech } from "./flashcard-speech";

const { say, play, pause } = vi.hoisted(() => ({ say: vi.fn(), play: vi.fn(), pause: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => say }));
vi.mock("./study.functions", () => ({ speak: {} }));
vi.mock("./gems-client", () => ({ useGems: () => ({ refresh: vi.fn() }), useSpendGuard: () => ({ confirmSpend: async () => true, dialog: null }), actionError: vi.fn() }));

function setup() {
  play.mockResolvedValue(undefined);
  say.mockImplementation(async ({ data }) => ({ urls: data.quoteOnly ? [] : ["audio.wav"], texts: [data.text], cost: 0 }));
  vi.stubGlobal("Audio", class { play = play; pause = pause; playbackRate = 1; constructor(public src: string) {} });
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("automatically reads a question when flashcard audio is enabled", async () => {
  setup();
  const hook = renderHook(({ enabled }) => useFlashcardSpeech("Autoplay question", enabled, 1, "card:front"), { initialProps: { enabled: false } });
  expect(play).not.toHaveBeenCalled();
  hook.rerender({ enabled: true });
  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  hook.unmount();
});

it("automatically reads the answer on flip", async () => {
  setup();
  const hook = renderHook(({ text, key }) => useFlashcardSpeech(text, true, 1, key), { initialProps: { text: "Flip question", key: "flip:front" } });
  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  hook.rerender({ text: "Flip answer", key: "flip:back" });
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  expect(say).toHaveBeenCalledWith({ data: { text: "Flip answer" } });
  expect(pause).toHaveBeenCalled();
  hook.unmount();
});

it("reads the next card even when its question is identical and stops when disabled", async () => {
  setup();
  const hook = renderHook(({ key, enabled }) => useFlashcardSpeech("Repeated question", enabled, 1, key), { initialProps: { key: "one:front", enabled: true } });
  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  hook.rerender({ key: "two:front", enabled: true });
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  act(() => hook.rerender({ key: "two:front", enabled: false }));
  expect(pause).toHaveBeenCalled();
  expect(play).toHaveBeenCalledTimes(2);
  hook.unmount();
});