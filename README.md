# Multi-Agent Roundtable

Multi-Agent Roundtable is a local-first React and Express app for structured multi-agent discussions, especially for ambiguous relationship, emotional, and interpersonal questions where there may be no single correct answer. A user enters a question, chooses a discussion template, gets 3-5 generated agents, runs a multi-round discussion, receives a moderator summary, and exports the session as Markdown, JSON, or PDF.

The app keeps a mock provider for static demos, and now supports DeepSeek live mode through a local backend. API keys stay in `.env` and are never sent to the browser.

## Features

- Three-pane product layout: editable agents, live discussion transcript, and session controls.
- Agent fields: name, role, system prompt, model label, temperature, speaking style, and enabled toggle.
- Templates: Relationship Reflection, Emotional Clarity, Conflict Mediation, Brainstorming, Debate, Peer Review, and Investment Committee.
- Relationship agent library with preset perspectives such as Empathic Listener, Rational Analyst, NVC Needs Translator, Boundary Coach, Attachment Lens, CBT Reframer, and Repair Planner.
- Live user interjections during a running discussion; later agents receive the added context in the shared transcript.
- Speaking orders: fixed, deterministic random, and moderator-called.
- Themes: Warm Family, Work Mode, and Tech Vision, with generated local PNG assets.
- Provider modes: Mock demo and DeepSeek live through the local Express API.
- Token and cost tracking, preferring real provider usage when available.
- Exports: Markdown, JSON, and client-side PDF.
- Tests for template generation, speaking order, moderator summary, exports, and an App-level interaction path.

## Tech Stack

- Vite
- React
- TypeScript
- Express
- Vitest
- lucide-react
- jsPDF, dynamically loaded only when exporting PDF

## Local Development

```powershell
npm install
Copy-Item .env.example .env
npm run dev:all
```

Add your local DeepSeek key to `.env` before using DeepSeek live mode:

```bash
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
API_PORT=3001
```

`npm run dev:all` starts:

- Frontend: `http://127.0.0.1:5173`
- API backend: `http://127.0.0.1:3001`

Mock demo mode works without `.env`. DeepSeek live mode requires the backend and `DEEPSEEK_API_KEY`.

## Validation

```bash
npm run test:run
npm run build
```

`npm run build` regenerates the local PNG assets before compiling the static site.

## GitHub Pages

The repository includes `.github/workflows/pages.yml` for optional static demo publishing. GitHub Pages can run the mock demo only. DeepSeek live mode requires the local Express API or another backend proxy because secrets must not be committed or exposed to browser code.

The app uses relative Vite asset paths, so it can run under a repository subpath without committing secrets or runtime configuration.

## LLM Provider Boundary

The frontend uses the `LlmProvider` interface. `createMockProvider` streams deterministic demo text. `createServerProvider` calls the local Express API, which converts each agent turn into a DeepSeek `/chat/completions` request with:

- `system`: current agent identity, role, system prompt, speaking style, and roundtable rules.
- `user`: original question, active agents, latest message, visible transcript, and round/turn metadata.
- `stream: true`
- `stream_options.include_usage: true`
- `thinking.type: disabled`

The group-chat model is sequential: one API call per speaking agent, each later agent receives the visible transcript so far, and the moderator receives the final transcript.

## Relationship Reflection Boundary

The relationship and emotional templates are designed for reflection, perspective-taking, and communication planning. They are not therapy, diagnosis, legal advice, or emergency support. If a transcript suggests self-harm, abuse, coercion, or immediate danger, agents are instructed to prioritize real-world safety and recommend trusted human or emergency support.

The first preset agent library is inspired by public communication and therapy-adjacent frameworks such as Nonviolent Communication, CBT-style thought-feeling-behavior mapping, relationship conflict management, and attachment-informed emotion work. Presets are method-oriented personas, not impersonations of real experts.

## Completion Log

- 2026-07-07: Implemented the initial GitHub Pages-ready Multi-Agent Roundtable app with mock streaming, editable agents, three themes, local PNG assets, Markdown/JSON/PDF export, tests, and deployment workflow.
- 2026-07-07: Added selectable visual discussion scenes with a roundtable stage, per-agent speech bubbles, active/last speaker status, mobile-first scene ordering, and export metadata for the selected scene.
- 2026-07-07: Refined the roundtable scene toward a Stanford small-town style with map tiles, roads, small buildings, and a central plaza table; added visible agent count controls for adding, removing, and deleting agents.
- 2026-07-08: Upgraded the app to local full-stack DeepSeek live mode with Express SSE endpoints, provider mode switching, safe `.env` secrets, prompt/payload tests, and retained mock fallback.
- 2026-07-08: Reoriented the default experience toward relationship and emotional reflection, added relationship-specific templates and preset agents, and added live user interjections that route into later agent turns.
