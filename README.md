# Kairos

Kairos is a conversational Pydantic AI agent with OpenAI native web search, portable Agent Skills,
deferred workflow capabilities, deterministic tools, specialist-agent delegation, and a small RAG
knowledge index.

The UI groups five optional behaviors under the product label “skills,” but the implementation now
keeps the Pydantic primitives explicit:

- `latin` is a real Pydantic AI Harness Agent Skill loaded from `skills/latin/SKILL.md`.
- `copyright` is a Python capability that couples its instructions to the `count_words` tool.
- `project-estimate` is a Python capability that couples instructions to deterministic estimation.
- `document-review` is a Python capability that couples instructions to specialist delegation.
- `knowledge-search` is a Python capability that couples instructions to the RAG search tool.

Both kinds use Pydantic AI's deferred `load_capability` flow. Harness `Skills` is the right fit for
portable, instruction-only `SKILL.md` packages. Core `Capability` is the right fit when instructions
and executable tools need to become available together.

Invoke Copyright with a website and, optionally, extra context:

```text
/copyright https://example.com Write a concise homepage hero for technical founders
```

Invoke Latin with text:

```text
/latin Knowledge is power
```

You can also ask naturally, such as “Translate knowledge is power into Latin.” The model sees a
compact catalog of available behaviors and loads the Latin Agent Skill when the request calls for
it. If you enter
`/copyright` by itself, Kairos asks for the website and optional context before running the skill.
Conversation history remains available until you use `/new` or exit.

## Run Kairos

The repository owns both applications:

- `app/` — the FastAPI/Pydantic AI backend
- `frontend/` — the React chat interface

Start the backend:

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env
uv sync
docker compose up -d postgres
uv run kairos-migrate
uv run kairos-index
uv run fastapi dev
```

In a second terminal, start the frontend:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Type `/` or `@`, or select the wand button, to open the
skill picker. Selecting a skill shows its description. Copyright also reveals its required Website
field; Latin uses the text in the prompt directly.

## RAG experiment

Five synthetic Markdown reports live in `knowledge/reports/`. The indexer splits them on Markdown
headings, embeds each section with `text-embedding-3-small`, and stores the text, vector, source,
heading, model, and dimensions in PostgreSQL with pgvector.

The setup is explicit and repeatable:

```bash
docker compose up -d postgres  # PostgreSQL 17 + pgvector 0.8.6 on 127.0.0.1:54320
uv run kairos-migrate          # applies checksummed SQL migrations
uv run kairos-migrate          # safe no-op when already current
uv run kairos-index            # indexes or replaces the five reports
```

Then ask naturally or select Knowledge Search:

```text
What problems delayed payment work in previous projects?
```

Kairos loads the deferred workflow capability, calls `search_knowledge`, embeds the query, performs an exact
cosine search inside the fixed `sample-project-reports` scope, and answers from the returned
passages. Every passage includes its report path and heading. The model cannot choose the database
scope. This sample is local and single-user; real user uploads would require authenticated ownership
and permission filters before vector search.

The corpus is tiny, so the database deliberately uses exact search rather than an approximate HNSW
index. Changing the embedding model or its 1,536 dimensions requires a migration and full reindex.

Talk to the agent through `POST /chat`:

```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What happened in AI today?"}'
```

The response contains a `conversation_id`. Include it on later requests to continue the same
conversation.

Invoke the copyright skill by sending `skill` and `website`:

```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "message":"Write a concise homepage hero",
    "skill":"copyright",
    "website":"https://example.com",
    "context":"The audience is technical founders"
  }'
```

`website` is required whenever `skill` is `copyright`. Conversation history is held in memory and
is reset when the service restarts; it is not shared between multiple server workers.

For a streaming UI, send the same request body to `POST /chat/stream`. It returns server-sent
events for text deltas, skill usage, web-search activity, sources, completion, and errors. The
React client in `frontend/` consumes this endpoint.

## Optional terminal chat

You can also run the agent directly in a terminal:

```bash
uv run kairos
```

Commands:

- `/copyright [website] [optional context]`
- `/latin [text]`
- `/knowledge [question]`
- `/new`
- `/help`
- `/quit`

Chat history is held only in memory. PostgreSQL stores only the sample RAG knowledge chunks; there
is no campaign model, background worker, user upload system, or persistent conversation store.

## Logfire tracing

Kairos instruments Pydantic AI with Logfire. Agent runs, model calls, capability loading, native
web-search calls, and message content are traced. The API passes its `conversation_id` into
Pydantic AI, so every turn in one UI chat shares the same Logfire conversation identifier.

Local development still works without Logfire credentials. To send traces, authenticate this
machine with Logfire or set `LOGFIRE_TOKEN`, then restart the API:

```bash
uv run logfire auth
# Or: export LOGFIRE_TOKEN=...
uv run fastapi dev
```

Set `LOGFIRE_ENVIRONMENT` when you need a name other than `development`. Provider-level HTTP
payload capture is deliberately disabled because it can duplicate prompts and secrets.
