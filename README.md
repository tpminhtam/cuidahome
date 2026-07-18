# CuidaHome 🏡

**Live UI preview:** https://tpminhtam.github.io/cuidahome/ *(static demo with sample data — the AI agents below run in the full app)*

**The care log that talks to the doctor.** Family caregivers speak for 30 seconds — CuidaHome structures the observations, watches for red flags, generates the physician-ready pre-visit summary, and then **sends it through the patient portal itself, with a computer-use agent.**

Built in one day at *The Future of Agentic AI in Healthcare* (Abridge × Anthropic × Lightspeed, Jul 18 2026), from a product spec written by a practicing geriatrician (On Lok PACE, dementia care) — this is the tool she wants for her own patients' families.

## The problem
~13M Americans provide unpaid dementia care (~31 hrs/week). They see everything — the dizziness after the new pill, the 2 AM wandering, the half-eaten meals — but at the visit it's "he's been… okay?" Physicians get low-signal input; trends get missed. Many caregiving families are multilingual: grandma logs in Spanish, the grandson answers in English.

## What we built today
- **🎙 Voice check-in (Claude agent):** the caregiver talks naturally (English or Spanish). Claude extracts every loggable fact into 9 structured categories (symptoms, BP, glucose, weight, meals, bowel, sleep, mood, activity/falls), asks one clarifying question when clinically needed, and raises red flags — grounded in the patient's med list and the last visit note (Abridge's synthetic FHIR patient). Spanish notes are stored with English clinical translations.
- **🚨 Alert engine:** configurable thresholds (per spec §2.1) evaluated server-side on every entry — hypotension on a new diuretic, hypoglycemia on new metformin, falls, choking, weight jumps.
- **💬 Care circle with live translation:** María writes in Spanish, Tam reads it in English — every message rendered in each member's language.
- **🩺 Pre-visit report:** deterministic trend math + Claude structured output → red flags first, one-liner headline, vitals sparklines, caregiver quotes, suggested questions. Printable.
- **🤖 Computer-use "send to portal":** the spec deferred portal integration to Phase 2 (Epic MyChart). Our agent does it *today* with zero integration: Claude computer-use opens the (fictional) Bayview Health patient portal in a real browser, logs in, composes a message to the PCP, pastes the summary, and hits Send — on screen, cursor moving.

## Run it
```bash
nvm use 22
npm install && npx playwright install chromium
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```
- App (phone frame): http://localhost:3000 — switch users (María/Tam) top-right
- Patient portal (computer-use target): http://localhost:3000/portal
- Demo data reseeds via `POST /api/reset`

## Demo path
1. Home → red-flag strip (near-fall, BP trending low since HCTZ started at last visit).
2. 🎙 Voice check-in (ES or EN): *"Papá se mareó otra vez… la presión 98 con 56…"* → watch structured entries + alerts appear.
3. Report → Generate → red flags + trends → **Send with the agent** → watch the browser drive the portal.
4. Portal Messages → the summary is in Dr. Kim's inbox.

## Stack
Next.js 16 · Claude Opus 4.8 (`claude-opus-4-8`, adaptive thinking, tool use, structured outputs, computer use `computer_20251124`) · Playwright · Web Speech API · JSON store (hackathon-grade).

**Safety posture:** logging + escalation only — the agent never diagnoses and never advises medication changes; urgent patterns route to 911/care-team language. Demo data is fully synthetic (Abridge/Synthea patient).

*Team: physician co-founder (MD, product/clinical — spec author) · Anuar (engineering) · spec: `../Product Spec.pdf` (CuidaHome)*
