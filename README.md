# Scafblog

Scafblog is a live Docusaurus site with an AI-orchestrated publishing pipeline. The site stays a normal static blog, but the content generation flow now runs as a staged automation system instead of a single prompt script.

## What the automation does

`Scafblog` runs these orchestration stages:

1. `Source Scout`
   Fetches RSS feeds, removes already-processed items, and ranks candidates by keyword relevance.
2. `Topic Planner`
   Chooses a publishable angle, thesis, outline, risks, and tags for the article.
3. `Draft Writer`
   Produces the first markdown draft using the plan and source signal.
4. `Quality Reviewer`
   Scores technical depth, originality, clarity, and structure.
5. `Revision Agent`
   Rewrites the article when the review score is below threshold or revision is required.
6. `Publish Validator`
   Runs local checks on title originality, source quality, word count, themed structure, title quality, and publish readiness.
7. `Publisher`
   Saves approved posts into `stageArea/drafts/` first.
8. `Approval Reporter`
   Writes a pending-approval report and waits for human confirmation before final publishing.

Every run writes artifacts to `stageArea/runs/<timestamp>-<slug>/` so the full reasoning chain is inspectable:
- `01-source.json`
- `02-plan.json`
- `03-draft.md`
- `04-review.json`
- `05-revised.md` when revision happens
- `05b-review-after-revision.json` when revision is re-reviewed
- `06-validation.json`
- `06-final.mdx`
- `07-summary.json`

The orchestration runtime also writes a local execution tracker to `orchestration-state.local.json`. That file is gitignored and is meant for local audit/debug history only.

Architecture reference: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Installation

```bash
npm install
```

## Local site development

```bash
npm run start
```

## Orchestrated generation

Preview ranked candidates without generating:

```bash
npm run preview
```

Run the full automated pipeline:

```bash
npm run orchestrate
```

Run the pipeline interactively:

```bash
npm run orchestrate:interactive
```

Review the last orchestration run:

```bash
npm run review:last
```

List all pending approval runs:

```bash
npm run list:pending
```

Approve the last staged draft and publish it to `blog/`:

```bash
npm run approve:last
```

Approve a specific pending run by picking from a list:

```bash
npm run approve:pick
```

Approve a specific run directly by id:

```bash
node scripts/feed-to-draft.mjs --approve-last --run-id=<runId>
```

Reject the last staged draft:

```bash
npm run reject:last
```

Reject by picking from pending runs:

```bash
npm run reject:pick
```

## Environment

Create `./.env` with at least:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Optional tuning:

```bash
OPENAI_RATE_LIMIT=3
OPENAI_MAX_TOKENS=2600
MAX_TOTAL_POSTS=1
REVIEW_THRESHOLD=80
MIN_WORDS=900
```

## Build

```bash
npm run build
```

## Deployment

```bash
npm run generate:pr
```

That flow:
- generates an article into `stageArea/drafts/`
- waits for human approval
- after approval, you can publish to `blog/`
- then open a GitHub pull request for review if desired

The live site remains a normal Docusaurus deployment. The AI system only changes how content is produced and gated before publishing.
