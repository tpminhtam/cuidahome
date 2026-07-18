import { NextRequest } from "next/server";

export const maxDuration = 60;

// Neural voice for the companion's spoken replies.
// ELEVENLABS_API_KEY (recommended; optional ELEVENLABS_VOICE_ID) or
// CARTESIA_API_KEY + CARTESIA_VOICE_ID. No key → 204 and the client falls
// back to the browser voice.
export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string; lang?: string };
  if (!text?.trim()) return new Response(null, { status: 204 });

  const eleven = process.env.ELEVENLABS_API_KEY;
  const cartesia = process.env.CARTESIA_API_KEY;

  try {
    if (eleven) {
      const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": eleven, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: "eleven_flash_v2_5", // low latency, multilingual (EN/ES/ZH)
          }),
        }
      );
      if (!res.ok) throw new Error(`elevenlabs ${res.status}`);
      return new Response(res.body, { headers: { "Content-Type": "audio/mpeg" } });
    }

    if (cartesia && process.env.CARTESIA_VOICE_ID) {
      const res = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "X-API-Key": cartesia,
          "Cartesia-Version": "2024-11-13",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "sonic-2",
          transcript: text,
          voice: { mode: "id", id: process.env.CARTESIA_VOICE_ID },
          output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 },
        }),
      });
      if (!res.ok) throw new Error(`cartesia ${res.status}`);
      return new Response(res.body, { headers: { "Content-Type": "audio/mpeg" } });
    }
  } catch {
    return new Response(null, { status: 204 }); // fall back to browser voice
  }
  return new Response(null, { status: 204 });
}
