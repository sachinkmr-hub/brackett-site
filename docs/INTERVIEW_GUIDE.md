# Brackett interview guide

## The problem and intended user

Target user: a small product team preparing a decision review. Questions arrive from
conversations, documents, and product observations. A task board records work, but often
fails to preserve why a decision was made and which evidence supported it.

Brackett's intended job: capture a question → attach evidence → review priority and
missing context → have a person decide → preserve the decision with source attribution.
The problem and target segment are hypotheses, not results of completed user research.

## A defensible 60-second explanation

Use these points in your own words:

- I wanted to make business decision context retrievable instead of scattered across tools.
- I defined a workflow around questions, evidence, and recorded decisions.
- The first reliability requirement is knowing when evidence is missing.
- The analyst uses deterministic code for counts, priority, and retrieval. An LLM is
  used separately for optional website extraction, where its structured output is validated.
- I used AI heavily for implementation. My original contribution was product direction
  and workflow design. I am learning to inspect, test, and explain the implementation.
- I do not claim customer traction or independently written full-stack code.

Only say you personally tested, researched, or made a technical choice after you have
actually done so and can explain it. This upgrade was implemented by an AI coding assistant.

## Five-minute demonstration

1. Run `npm run demo` from the repository root. Identify the synthetic dataset explicitly.
2. Review open questions. Checkout ranks above pricing because critical outranks high;
   an answered onboarding question does not appear in the review queue.
3. Ask which decisions need a source. Checkout is flagged even though it has an
   engineering-board label. Organization is not evidence.
4. Ask about pricing. Inspect the attached excerpt. Explain that attached evidence
   does not prove the claim true, representative, or current.
5. Ask about headcount. The system returns no matching records instead of inventing an answer.
6. Show `npm run eval --prefix Backend`. Explain the ten regression scenarios and their limits.
7. For the full authenticated UI, configure PostgreSQL and auth first. Create a question
   with an excerpt, ask the analyst, inspect the source, and log a decision. This path
   still needs live integration testing before claiming a successful deployed demo.

## Decisions and tradeoffs

| Choice | Reason | Cost or limitation |
|---|---|---|
| Deterministic triage | Counts, status filters, and priority rules are testable and need no generation | Cannot understand arbitrary business questions |
| Lexical retrieval | Small, transparent baseline with stable ordering | Misses synonyms; no semantic understanding |
| URL or excerpt required | Labels and board membership cannot substantiate a claim | Attachments can still be wrong, stale, or fabricated |
| Human logs the final decision | Evidence retrieval does not establish business correctness | Does not automate business execution |
| Atomic decision writes | Failed persistence must not leave an answered question without its decision | Requires live Postgres testing to confirm deployment behavior |
| Validate extracted JSON | Valid JSON can still have missing or invalid fields | Schema validation does not prove factual correctness |
| Credentials from environment | Secrets must not be shipped in source | Previously exposed credentials require provider revocation |

## Concrete bugs fixed

- Removed an embedded provider credential and its silent fallback.
- Made compatible provider base URL configuration take effect for Groq too.
- Validated website extraction fields and tone before returning them.
- Replaced integration-based answer confidence with matched-record evidence status.
- Added query-sensitive triage and explicit no-match abstention.
- Stopped counting boards, source labels, and arbitrary messages as source evidence.
- Rejected attaching a board from a different workspace.
- Wrapped decision status, message, and attributed activity writes in one transaction.
- Retrieved the latest logged decision from decision activity rather than the latest message.
- Reset analyst loading state with `finally` and expose method, processing latency,
  model calls, model cost, limitations, and attached source links.
- Prevented production 500 responses from exposing internal error messages.

## How to measure product value

Proposed primary metric: median time from opening a decision review to recording its
outcome. Supporting metrics: share of decisions with inspectable source material,
unresolved-question age, and proportion of suggested records reviewers find relevant.
Guardrails: unsupported-answer rate, wrong-workspace access, failed decision persistence,
and reviewer disagreement. No values have been measured for these product metrics yet.

Start with five target-team interviews and observe their existing review workflow.
Test a narrow pricing/checkout review scenario. Compare completion time and context
reconstruction with their current workflow before adding more integrations.

## Evaluation and cost claims

The ten-case analyst suite checks empty workspaces, labels masquerading as evidence,
manual excerpts, unrelated queries, substring false matches, priority ordering, missing
source selection, mixed evidence, instruction-like source text, and citation limits.
It is a regression suite authored alongside the implementation, not a held-out benchmark.
The injection case demonstrates that deterministic triage does not execute source text;
it does not establish prompt-injection resistance for provider-backed extraction.

Execution metadata reports processing time inside the analyst function. It excludes
network, database, and rendering time. Zero model cost applies only to this deterministic
function. No live provider quality, pricing, latency, or model comparison was measured.

## Questions you must be able to answer yourself

- Why is a source URL insufficient to prove a business recommendation?
- What happens when the second write in a database transaction fails?
- Where is workspace membership checked, and where is board ownership checked?
- How does token matching differ from embeddings and semantic retrieval?
- Why can all ten regression cases pass while real user questions still fail?
- Which work did you direct, which was AI-generated, and which can you reproduce?

## Remaining work before a production claim

- Revoke the previously exposed provider key. This patch cannot revoke it remotely.
- Run full browser/auth/Postgres/provider integration tests against a configured environment.
- Add persistent analyst-run logs and a held-out dataset with reviewer relevance labels.
- Implement real ingestion and provenance validation before claiming verified live evidence.
- Add a durable delivery outbox, retries, and idempotency before claiming reliable automation.
- Some legacy endpoints remain scaffolding; inspect discussions, assignment, and delivery
  capabilities before presenting them. The demo intentionally focuses on the implemented
  question/evidence/review/decision path.
