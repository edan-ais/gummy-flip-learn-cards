import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, type ModelMessage } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id";

const BASE = "https://ai.gateway.lovable.dev/v1";
export const TEXT_MODEL = "openai/gpt-6-astra";
const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
const STT_MODEL = "openai/gpt-transcribe";

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("AI is not configured.");
  return k;
}

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function friendly(status: number, fallback: string) {
  if (status === 402) return "Out of AI credits. Add credits in Settings → Plans & credits, then try again.";
  if (status === 429) return "The AI is busy right now. Wait a minute and try again.";
  if (status === 403) return "AI access is blocked for this workspace.";
  return fallback;
}

function provider() {
  const k = key();
  const run = createLovableAiGatewayRunIdFetch();
  return createOpenAI({
    baseURL: BASE,
    apiKey: k,
    headers: { "Lovable-API-Key": k, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: run.fetch,
  });
}

const opts = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
} as const;

function wrap(e: unknown): never {
  const status = (e as { statusCode?: number })?.statusCode ?? 500;
  console.error("AI error", e);
  throw new AiError(friendly(status, "The AI could not finish this. Try again."), status);
}

export async function aiText(instructions: string, messages: ModelMessage[]) {
  try {
    const r = streamText({ model: provider().responses(TEXT_MODEL), instructions, messages, providerOptions: opts });
    const text = await r.text;
    if (!text.trim()) throw new AiError("The AI returned nothing for this file.", 422);
    return text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    wrap(e);
  }
}

export async function aiObject<T>(instructions: string, messages: ModelMessage[], schema: z.ZodType<T>) {
  try {
    const r = streamText({
      model: provider().responses(TEXT_MODEL),
      instructions,
      messages,
      providerOptions: opts,
      output: Output.object({ schema }),
    });
    return (await r.output) as T;
  } catch (e) {
    wrap(e);
  }
}

/** Returns a complete WAV file for the text. */
export async function speech(text: string) {
  const res = await fetch(`${BASE}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
      stream_format: "audio",
    }),
  });
  if (!res.ok) {
    console.error("TTS", res.status, await res.text());
    throw new AiError(friendly(res.status, "Could not create audio. Try again."), res.status);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function transcribe(bytes: Uint8Array, mime: string) {
  const fd = new FormData();
  const ext = mime.includes("mp4") ? "m4a" : mime.includes("wav") ? "wav" : "webm";
  fd.append("file", new Blob([bytes], { type: mime }), `note.${ext}`);
  fd.append("model", STT_MODEL);
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: fd,
  });
  if (!res.ok) {
    console.error("STT", res.status, await res.text());
    throw new AiError(friendly(res.status, "Could not understand the recording. Try again."), res.status);
  }
  const j = (await res.json()) as { text?: string };
  return j.text ?? "";
}

export function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Split long text into speakable chunks on paragraph/sentence boundaries. */
export function chunkText(text: string, max = 900) {
  const parts = text.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + " " + p).length > max && cur) {
      out.push(cur.trim());
      cur = p;
    } else cur += " " + p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
