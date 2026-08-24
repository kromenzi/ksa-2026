# Local Safety AI Runtime

This runtime executes the Safety AI Agent Platform locally/self-hosted.

## Architecture

Safety Board → Local AI Gateway → Ollama → local model.

No OpenAI, Gemini, Claude, Groq, or OpenRouter endpoint is required.

## Start

```bash
cp .env.example .env
docker compose --env-file .env up -d --build
docker exec abdulkarem-safety-ollama ollama pull qwen3:8b
```

Health check:

```bash
curl http://localhost:8787/health
```

## Workflow

Context Engine → Safety Agent → Vision Agent → Risk Assessment → Incident Investigation → NCR → Training → Report → Approval/Review Loop → Dashboard.

The workflow is bounded by `MAX_AGENT_STEPS` and uses only the context supplied by the Safety Board plus the local model.
