# Kairos frontend

This is the React chat interface for Kairos. It streams agent responses from the FastAPI
backend and visualizes deferred behavior, web-search activity, and sources. The picker uses
“skills” as a concise product label; technically, Latin is a Harness `SKILL.md` Agent Skill and the
tool-backed choices are core Pydantic AI capabilities.

## Development

Start the Kairos backend from the repository root, then run:

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite development server proxies `/chat` requests to
`http://127.0.0.1:8000`.

Use `/`, `@`, or the wand button in the composer to browse available skills. Copyright requires
a valid Website URL before the prompt can be sent. Latin translates the text in the prompt and
can also be loaded naturally when the user asks for a Latin translation.

## Verification

```bash
npm test
npm run lint
npm run build
```
