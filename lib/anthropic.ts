import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "PASTE_KEY_HERE") {
    throw new Error("NO_API_KEY");
  }
  if (!client) client = new Anthropic();
  return client;
}

export function noKeyResponse() {
  return Response.json(
    { error: "no_key", message: "Add your Anthropic API key to .env.local (ANTHROPIC_API_KEY=...) and restart `npm run dev`." },
    { status: 503 }
  );
}
