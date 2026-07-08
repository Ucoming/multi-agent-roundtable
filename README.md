# Multi-Agent Roundtable

Multi-Agent Roundtable is a local-first React and Express app for structured multi-agent discussions, especially for ambiguous relationship, emotional, and interpersonal questions where there may be no single correct answer. A user enters a question, chooses a discussion template, gets 3-5 generated agents, runs a multi-round discussion, receives a moderator summary, and exports the session as Markdown, JSON, or PDF.

The app keeps a mock provider for static demos, and now supports DeepSeek live mode through a local backend. API keys stay in `.env` and are never sent to the browser.

## Features

- Three-pane product layout: conversation history on the left, live discussion transcript in the center, and controls on the right.
- Agent fields: name, role, system prompt, model label, temperature, speaking style, and enabled toggle.
- Topic spaces: Relationships & Feelings, and Philosophy & Thinking.
- Templates: Relationship Reflection, Emotional Clarity, Conflict Mediation, Dating Clarity, Philosophy Reflection, Brainstorming, Debate, Peer Review, and Investment Committee.
- Relationship agent library with preset perspectives such as Empathic Listener, Rational Analyst, NVC Needs Translator, Boundary Coach, Attachment Lens, CBT Reframer, and Repair Planner.
- Philosophy agent library with method-inspired lenses such as Contradiction & Practice Lens, Socratic Questioner, Stoic Examiner, Existential Mirror, Daoist Balance Reader, Material Conditions Lens, and Ethics Referee.
- Optional pre-roundtable needs clarifier that guides the user through 3 short rounds before turning unclear feelings into a roundtable-ready question and context summary.
- Live user interjections during a running discussion; later agents receive the added context in the shared transcript.
- ChatGPT-style right-side conversation history with browser-local auto-save, search, restore, delete, and new discussion controls.
- Safe GFM Markdown rendering for agent messages and moderator summaries, including lists, tables, quotes, inline code, and code blocks.
- Discussion language control for Chinese or English model output.
- Whole-table discussion brief for every turn, including common ground, tensions, open questions, and multiple prior reference points.
- Agent-specific attention filtering so the shared brief does not flatten each persona's role, theory lens, or speaking style.
- Deliberation protocol that requires later agents to respond to prior speakers with agreement, disagreement, or partial agreement instead of isolated turn-taking.
- Moderator theory connection that maps the user's problem and table discussion to relevant frameworks such as attachment theory, NVC, CBT, repair attempts, boundaries, decision theory, or cognitive bias lenses.
- Speaking orders: fixed, deterministic random, and moderator-called.
- Themes: Warm Family, Philosophy Study, Work Mode, and Tech Vision, with generated local PNG assets.
- Provider modes: Mock demo and DeepSeek live through the local Express API.
- Token and cost tracking, preferring real provider usage when available.
- Exports: Markdown, JSON, and client-side PDF.
- Tests for template generation, speaking order, moderator summary, exports, local session history, running-session switching, and App-level interaction paths.

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
- `user`: original question, active agents, current whole-table brief, visible transcript, and round/turn metadata.
- `stream: true`
- `stream_options.include_usage: true`
- `thinking.type: disabled`

The group-chat model is sequential at the API layer: one API call per speaking agent. It is not limited to the previous message. Each later agent receives the visible transcript plus a compact table brief with common ground, tensions, open questions, and several prior reference points. The table brief is treated as a shared compressed map, not a consensus. Each agent also receives an agent-specific attention filter derived from its role, system prompt, and speaking style.

Each live agent prompt now includes a deliberation contract: use Markdown, answer in the selected language, respond to the whole table state, name the prior speakers being addressed, state whether it agrees, disagrees, or partly agrees, and preserve unresolved disagreement when the question has no single correct answer. The moderator synthesis is asked to separate common ground, unresolved tension, multiple plausible outcomes, theory connections, next conversation moves, and safety or boundary notes. Theory connections must explain both fit and limits, and must not be framed as diagnosis or professional treatment advice.

The same provider boundary powers the pre-roundtable needs guide. Mock mode generates deterministic guidance locally. DeepSeek live mode uses `POST /api/needs-guide` with SSE streaming, fixed stages for story, feelings/needs, boundary/request, and a final Markdown needs summary. The final needs summary is stored as `preDiscussionContext`, included in roundtable prompts, and exported with the session.

## Relationship Reflection Boundary

The relationship and emotional templates are designed for reflection, perspective-taking, and communication planning. They are not therapy, diagnosis, legal advice, or emergency support. If a transcript suggests self-harm, abuse, coercion, or immediate danger, agents are instructed to prioritize real-world safety and recommend trusted human or emergency support.

The first preset agent library is inspired by public communication and therapy-adjacent frameworks such as Nonviolent Communication, CBT-style thought-feeling-behavior mapping, relationship conflict management, and attachment-informed emotion work. Presets are method-oriented personas, not impersonations of real experts.

## Agent Design Research

The richer relationship agents are built as method-inspired archetypes rather than celebrity or expert impersonations:

- Attachment and EFT-style work inspired `Attachment Radar`, which watches pursue-withdraw cycles, reassurance seeking, distancing, and secure alternatives.
- Gottman-style repair attempts and bids for connection inspired `Repair Attempt Coach`, which drafts softer starts and small repair lines.
- Esther Perel's work on intimacy, desire, aliveness, distance, and security inspired `Desire Distance Reader`.
- Imago dialogue inspired `Imago Mirror`, which mirrors, validates, and empathizes before judging.
- Five Love Languages inspired `Love Language Interpreter`, but the app treats it as a conversational heuristic rather than hard science.
- Chinese internet relationship-advice culture, including Lu Qi, Leng Ai, Mystery Method / pickup coaching, and paid recovery-consulting ecosystems, inspired two guarded agents: `Ethical Dating Coach` extracts only consent-based social confidence, while `PUA Risk Auditor` flags manipulation, coercion, false urgency, and paid-consulting traps.

The Philosophy & Thinking topic also uses method-inspired archetypes rather than impersonations:

- `Contradiction & Practice Lens` distills practice-first and contradiction-analysis methods associated with `On Practice` and `On Contradiction`, focusing on concrete conditions, principal contradictions, and action as the test of understanding.
- `Socratic Questioner`, `Stoic Examiner`, `Existential Mirror`, `Daoist Balance Reader`, `Pragmatist Experimentalist`, `Marxian Material Conditions Lens`, and `Ethics Referee` provide contrasting lenses for definitions, control, freedom, non-forcing, experiments, material constraints, and moral tradeoffs.
- These agents are not written as the historical philosophers themselves, and philosophy mode explicitly avoids propaganda, hagiography, and one-school certainty.

## Completion Log

- 2026-07-07: Implemented the initial GitHub Pages-ready Multi-Agent Roundtable app with mock streaming, editable agents, three themes, local PNG assets, Markdown/JSON/PDF export, tests, and deployment workflow.
- 2026-07-07: Added selectable visual discussion scenes with a roundtable stage, per-agent speech bubbles, active/last speaker status, mobile-first scene ordering, and export metadata for the selected scene.
- 2026-07-07: Refined the roundtable scene toward a Stanford small-town style with map tiles, roads, small buildings, and a central plaza table; added visible agent count controls for adding, removing, and deleting agents.
- 2026-07-08: Upgraded the app to local full-stack DeepSeek live mode with Express SSE endpoints, provider mode switching, safe `.env` secrets, prompt/payload tests, and retained mock fallback.
- 2026-07-08: Reoriented the default experience toward relationship and emotional reflection, added relationship-specific templates and preset agents, and added live user interjections that route into later agent turns.
- 2026-07-08: Added safe Markdown rendering, a Chinese/English discussion language selector, and a stronger disagreement-aware deliberation protocol for agent turns and moderator summaries.
- 2026-07-08: Expanded the default relationship agent design using public relationship frameworks and Chinese internet relationship-advice archetypes, adding more distinctive agents plus a Dating Clarity template and PUA/manipulation risk guardrails.
- 2026-07-08: Reworked turn routing from latest-message handoff to whole-table discussion briefs, with multi-speaker reference tracking in prompts, UI, exports, and tests.
- 2026-07-08: Added agent-specific attention filtering and required theory mapping in moderator summaries, so final outputs connect the user's situation to relevant frameworks without turning them into diagnoses.
- 2026-07-08: Added the pre-roundtable needs clarifier with 3-stage guided chat, mock and DeepSeek SSE providers, context handoff into roundtable prompts, and export support.
- 2026-07-08: Replaced the top-right visual style selector with a topic-space selector and added Philosophy & Thinking mode with philosophy-specific agents, prompt rules, theme, assets, and tests.
- 2026-07-08: Added browser-local session history with automatic save, restore, delete, and new discussion controls.
- 2026-07-08: Upgraded history into a ChatGPT-style sidebar with search, visible saved discussions, current-session highlighting, and safe switching from a running discussion.
- 2026-07-08: Redesigned the workspace into a cleaner left-history, center-discussion, right-controls layout, with agent editing embedded inside the controls panel.
- 2026-07-08: Restyled the central roundtable scene into an isometric pixel-art room with wood floor texture, diamond table, colored chairs, and blocky speech cards.
- 2026-07-08: Reworked the roundtable visual after Claude Code design review, replacing fixed chairs with per-agent seating, theme-aware scene colors, shorter speech previews, and a cleaner illustrated table composition.
