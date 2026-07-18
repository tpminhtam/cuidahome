import Anthropic from "@anthropic-ai/sdk";
import { chromium, Page } from "playwright";
import { getClient, MODEL, noKeyResponse } from "@/lib/anthropic";
import { getDB, persist, uid } from "@/lib/db";
import { composePortalMessage } from "@/lib/portalBody";
import { PortalRun } from "@/lib/types";

export const maxDuration = 300;

const W = 1280;
const H = 800;
const MAX_ITERS = 24;

// computer-use tool versions, newest first (fallback if the API rejects one)
const CU_VERSIONS: { type: string; beta: string }[] = [
  { type: "computer_20251124", beta: "computer-use-2025-11-24" },
  { type: "computer_20250124", beta: "computer-use-2025-01-24" },
];

function mapKey(spec: string): string {
  const parts = spec.split("+").map((s) => s.trim());
  const mods: Record<string, string> = { ctrl: "Control", control: "Control", alt: "Alt", shift: "Shift", cmd: "Meta", super: "Meta", meta: "Meta" };
  const keys: Record<string, string> = {
    return: "Enter", enter: "Enter", tab: "Tab", escape: "Escape", esc: "Escape",
    backspace: "Backspace", back_space: "Backspace", delete: "Delete", space: "Space",
    page_down: "PageDown", page_up: "PageUp", home: "Home", end: "End",
    up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
  };
  return parts
    .map((p) => mods[p.toLowerCase()] ?? keys[p.toLowerCase()] ?? (p.length === 1 ? p : p[0].toUpperCase() + p.slice(1)))
    .join("+");
}

async function execAction(page: Page, input: Record<string, unknown>): Promise<string> {
  const action = input.action as string;
  const coord = (input.coordinate as [number, number]) ?? null;
  switch (action) {
    case "screenshot":
      return "screenshot taken";
    case "left_click":
      if (coord) await page.mouse.click(coord[0], coord[1]);
      return `clicked (${coord?.join(",")})`;
    case "double_click":
      if (coord) await page.mouse.dblclick(coord[0], coord[1]);
      return `double-clicked (${coord?.join(",")})`;
    case "right_click":
      if (coord) await page.mouse.click(coord[0], coord[1], { button: "right" });
      return "right-clicked";
    case "mouse_move":
      if (coord) await page.mouse.move(coord[0], coord[1]);
      return "moved";
    case "type":
      await page.keyboard.insertText(String(input.text ?? ""));
      return `typed ${String(input.text ?? "").length} chars`;
    case "key":
      await page.keyboard.press(mapKey(String(input.text ?? "Enter")));
      return `pressed ${input.text}`;
    case "scroll": {
      const dir = String(input.scroll_direction ?? "down");
      const amt = Number(input.scroll_amount ?? 3) * 120;
      if (coord) await page.mouse.move(coord[0], coord[1]);
      await page.mouse.wheel(dir === "left" ? -amt : dir === "right" ? amt : 0, dir === "up" ? -amt : dir === "down" ? amt : 0);
      return `scrolled ${dir}`;
    }
    case "left_click_drag": {
      const start = (input.start_coordinate as [number, number]) ?? coord;
      const end = coord;
      if (start && end) {
        await page.mouse.move(start[0], start[1]);
        await page.mouse.down();
        await page.mouse.move(end[0], end[1], { steps: 8 });
        await page.mouse.up();
      }
      return "dragged";
    }
    case "wait":
      await page.waitForTimeout(Math.min(Number(input.duration ?? 1) * 1000, 3000));
      return "waited";
    default:
      return `ERROR: action "${action}" not supported in this environment — use click/type/key/scroll/screenshot`;
  }
}

async function runAgent(runId: string) {
  const db = getDB();
  const run = db.portalRuns.find((r) => r.id === runId)!;
  const step = (action: string, detail?: string) => {
    run.steps.push({ i: run.steps.length + 1, action, detail, ts: new Date().toISOString() });
    persist();
  };

  const msg = composePortalMessage(db);
  if (!msg) {
    run.state = "error";
    run.error = "Generate the pre-visit report first.";
    persist();
    return;
  }
  const outboxBefore = db.portalOutbox.length;

  const client = getClient();
  step("starting browser", "Chromium 1280×800, visible window");
  const browser = await chromium.launch({ headless: false, args: [`--window-size=${W},${H + 90}`, "--window-position=60,40"] });
  try {
    const context = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await context.newPage();
    await page.goto("http://localhost:3000/portal", { waitUntil: "networkidle" });
    step("opened portal", "bayview patient portal login");

    const shot = async () => (await page.screenshot({ type: "png" })).toString("base64");

    const task = `You are operating a web browser (screenshots + mouse/keyboard) to send a pre-visit summary through a patient portal on behalf of the caregiver. Work efficiently — every action costs time.

STEPS:
1. Sign in: email "maria.alvarez@example.com", password "cuida2026".
2. Open Messages, then start a New message.
3. To: select "Dr. Sarah Kim — Primary Care".
4. Subject: type exactly: ${msg.subject}
5. Message: click the message box, then in ONE type action enter the FULL text between <body> tags, verbatim:
<body>
${msg.body}
</body>
6. Click "Send message" and confirm the message appears in the list with status Sent.

Rules: use the exact text provided (never alter clinical content). Type into a field only after clicking it. If a dropdown is involved, click it and choose the option by clicking it. When you can see the sent message in the Messages list, you are done — reply "SENT" and stop.`;

    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: [
          { type: "text", text: task },
          { type: "image", source: { type: "base64", media_type: "image/png", data: await shot() } },
        ],
      },
    ];

    let cu = CU_VERSIONS[0];
    for (let iter = 0; iter < MAX_ITERS; iter++) {
      let res: Anthropic.Beta.BetaMessage;
      try {
        res = await client.beta.messages.create({
          model: MODEL,
          max_tokens: 2000,
          betas: [cu.beta],
          tools: [{ type: cu.type as never, name: "computer", display_width_px: W, display_height_px: H }],
          messages,
        });
      } catch (e) {
        const msg400 = e instanceof Error ? e.message : String(e);
        if (cu === CU_VERSIONS[0] && /tool|beta|version|invalid/i.test(msg400)) {
          cu = CU_VERSIONS[1];
          step("switching computer-use tool version", cu.type);
          iter--;
          continue;
        }
        throw e;
      }

      messages.push({ role: "assistant", content: res.content });
      const narration = res.content.filter((b) => b.type === "text").map((b) => (b.type === "text" ? b.text : "")).join(" ").trim();
      const toolUses = res.content.filter((b) => b.type === "tool_use");

      if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
        step("agent finished", narration.slice(0, 160));
        break;
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const input = tu.input as Record<string, unknown>;
        let outcome: string;
        try {
          outcome = await execAction(page, input);
        } catch (e) {
          outcome = `ERROR: ${e instanceof Error ? e.message : e}`;
        }
        step(`${input.action}${input.coordinate ? ` (${(input.coordinate as number[]).join(",")})` : ""}`, narration ? narration.slice(0, 120) : undefined);
        await page.waitForTimeout(450);
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: [
            { type: "text", text: outcome },
            { type: "image", source: { type: "base64", media_type: "image/png", data: await shot() } },
          ],
        });
      }
      messages.push({ role: "user", content: results });
    }

    await page.waitForTimeout(800);
    const outboxAfter = getDB().portalOutbox.length;
    if (outboxAfter > outboxBefore) {
      run.state = "done";
      step("verified", "message is in the portal outbox ✓ (leaving the browser open for the demo)");
    } else {
      run.state = "error";
      run.error = "The agent finished but no message landed in the outbox — check the browser window.";
    }
    persist();
    // Keep the browser window open briefly so the audience sees the sent state.
    await page.waitForTimeout(8000);
  } catch (e) {
    run.state = "error";
    run.error = e instanceof Error ? e.message : String(e);
    persist();
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function GET() {
  const db = getDB();
  return Response.json({ run: db.portalRuns[db.portalRuns.length - 1] ?? null });
}

export async function POST() {
  try {
    getClient();
  } catch {
    return noKeyResponse();
  }
  const db = getDB();
  if (!db.reports.length) {
    return Response.json({ error: "no_report", message: "Generate the pre-visit report first." }, { status: 400 });
  }
  const run: PortalRun = { id: uid("run"), state: "running", steps: [], startedAt: new Date().toISOString() };
  db.portalRuns = [run];
  persist();
  runAgent(run.id); // fire and forget — client polls GET
  return Response.json({ started: true, runId: run.id });
}
