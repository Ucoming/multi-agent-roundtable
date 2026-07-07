# Multi-Agent Roundtable

Multi-Agent Roundtable is a static React app for structured simulated expert discussions. A user enters a question, chooses a discussion template, gets 3-5 generated agents, runs a multi-round mock-streaming discussion, receives a moderator summary, and exports the session as Markdown, JSON, or PDF.

The first release is GitHub Pages friendly: it works without API keys by default and keeps the LLM integration behind a provider interface.

## Features

- Three-pane product layout: editable agents, live discussion transcript, and session controls.
- Agent fields: name, role, system prompt, model label, temperature, speaking style, and enabled toggle.
- Templates: Brainstorming, Debate, Peer Review, and Investment Committee.
- Speaking orders: fixed, deterministic random, and moderator-called.
- Themes: Warm Family, Work Mode, and Tech Vision, with generated local PNG assets.
- Mock streaming provider for public demos with token and estimated cost tracking.
- Exports: Markdown, JSON, and client-side PDF.
- Tests for template generation, speaking order, moderator summary, exports, and an App-level interaction path.

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
- lucide-react
- jsPDF, dynamically loaded only when exporting PDF

## Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`.

## Validation

```bash
npm run test:run
npm run build
```

`npm run build` regenerates the local PNG assets before compiling the static site.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. After pushing to GitHub, enable GitHub Pages with GitHub Actions as the source. Pushes to `main` or `master` will run tests, build the app, and publish `dist`.

The app uses relative Vite asset paths, so it can run under a repository subpath without committing secrets or runtime configuration.

## LLM Provider Boundary

The default provider is `createMockProvider`, which streams deterministic demo text. Real provider support should be added through the `LlmProvider` interface and should use a separate proxy endpoint for secrets. Do not call provider APIs directly from the GitHub Pages client.

## Completion Log

- 2026-07-07: Implemented the initial GitHub Pages-ready Multi-Agent Roundtable app with mock streaming, editable agents, three themes, local PNG assets, Markdown/JSON/PDF export, tests, and deployment workflow.
- 2026-07-07: Added selectable visual discussion scenes with a roundtable stage, per-agent speech bubbles, active/last speaker status, mobile-first scene ordering, and export metadata for the selected scene.
- 2026-07-07: Refined the roundtable scene toward a Stanford small-town style with map tiles, roads, small buildings, and a central plaza table; added visible agent count controls for adding, removing, and deleting agents.
