import { buildPerspectivePrompt } from "./promptBuilder.mjs";
import { buildCustomTopicPrompt } from "./custompromptBuilder.mjs";

export function buildSourceQualifierPrompt({ topicName, candidates }) {
  return `
You are the Source Qualifier agent in an automated publishing system.

Your job is to predict which source candidates are most likely to survive a strict technical editorial review.

Return valid JSON with this exact shape:
{
  "evaluations": [
    {
      "candidate_index": 0,
      "pass_likelihood": 0,
      "recommended": false,
      "rationale": "string",
      "strengths": ["string"],
      "risks": ["string"]
    }
  ]
}

Scoring policy:
- Use pass_likelihood from 0 to 100.
- Recommended should be true only if the source looks likely to produce a publishable, technically specific article.

How to judge:
- Prefer sources with clear mechanisms, failure modes, architectural tradeoffs, operational constraints, security implications, or production lessons.
- Penalize generic tutorials, listicles, vague AI news, shallow opinion pieces, and broad strategic business headlines.
- Penalize "part 2", "beginner", "best tools", "top X", and obvious SEO/tutorial bait unless the source signal is unusually concrete.
- Prefer sources that make it easy for later agents to produce originality, technical depth, and specific comparisons.

Topic: ${topicName}

Candidates:
${JSON.stringify(candidates, null, 2)}
`;
}

export function buildRecoveryStrategistPrompt({ topicName, item }) {
  return `
You are the Recovery Strategist agent in an automated publishing system.

This source was not strongly recommended for the normal publishing branch.
Your job is to salvage it by finding a narrower, more defensible, more technical angle.

Return valid JSON with this exact shape:
{
  "salvageable": true,
  "reframed_angle": "string",
  "technical_focus": "string",
  "required_upgrades": ["string"],
  "avoid": ["string"]
}

Topic: ${topicName}
Source title: ${item?.title || ""}
Source summary: ${item?.contentSnippet || ""}
Source url: ${item?.link || ""}

Rules:
- Make the angle narrower and more concrete than the source headline.
- Prefer operational, security, architecture, or failure-mode framing.
- Avoid generic summaries, listicles, and hype.
- If the source is still weak, set salvageable to false and explain what to avoid.
`;
}

export function buildPlannerPrompt({
  topicName,
  keywords,
  item,
  customTopic,
  recoveryStrategy = null,
}) {
  if (customTopic) {
    return `
You are the Topic Planner agent in an automated publishing system.

Create a concrete article plan for the custom topic below.

Return valid JSON with this exact shape:
{
  "proposed_title": "string",
  "angle": "string",
  "thesis": "string",
  "audience": "string",
  "outline": ["string"],
  "must_include": ["string"],
  "risks": ["string"],
  "tags": ["string"]
}

Topic title: ${customTopic.title}
Topic description: ${customTopic.description}
Keywords: ${keywords.join(", ")}

Rules:
- Plan for a technically serious article.
- Outline must contain 6 to 8 steps.
- Tags must be short, lowercase, and useful for a blog.
- Risks should name what could make the article weak or generic.
`;
  }

  return `
You are the Topic Planner agent in an automated publishing system.

Create a concrete article plan from this source signal.

Return valid JSON with this exact shape:
{
  "proposed_title": "string",
  "angle": "string",
  "thesis": "string",
  "audience": "string",
  "outline": ["string"],
  "must_include": ["string"],
  "risks": ["string"],
  "tags": ["string"]
}

Topic: ${topicName}
Keywords: ${keywords.join(", ")}
Source title: ${item.title}
Source summary: ${item.contentSnippet || "No summary available"}
Source url: ${item.link || "No link available"}

${recoveryStrategy ? `Recovery strategy:
${JSON.stringify(recoveryStrategy, null, 2)}` : ""}

Rules:
- Do not restate the source headline as the article title.
- Use the source as a trigger, not as something to summarize.
- Outline must contain 6 to 8 steps.
- Tags must be short, lowercase, and useful for a blog.
- Risks should name what could make the article weak or generic.
- If a recovery strategy is present, follow it and bias toward a narrower, more defensible technical angle.
`;
}

export function buildDraftAgentPrompt({
  item,
  topicName,
  matchedKeywords,
  plan,
  customTopic,
  minimumWords = 900,
  recoveryStrategy = null,
}) {
  const planBlock = `
Execution plan:
- Proposed title: ${plan.proposed_title}
- Angle: ${plan.angle}
- Thesis: ${plan.thesis}
- Audience: ${plan.audience}
- Outline:
${(plan.outline || []).map((point, index) => `  ${index + 1}. ${point}`).join("\n")}
- Must include:
${(plan.must_include || []).map((point) => `  - ${point}`).join("\n")}
- Risks to avoid:
${(plan.risks || []).map((point) => `  - ${point}`).join("\n")}
`;

  if (customTopic) {
    return `
You are the Draft Writer agent.

${planBlock}

${recoveryStrategy ? `Recovery strategy:
${JSON.stringify(recoveryStrategy, null, 2)}` : ""}

Use the plan to write the article. Keep the writing technical, specific, and publication-ready.
You must produce a substantial article of at least ${minimumWords} words.
Target range: ${minimumWords}-${minimumWords + 500} words.
Do not end early. Add concrete examples, implementation detail, comparisons, and operational implications if needed to reach depth.

${buildCustomTopicPrompt({
  title: customTopic.title,
  description: customTopic.description,
  keywords: matchedKeywords,
  testMode: false,
})}
`;
  }

  return `
You are the Draft Writer agent.

${planBlock}

${recoveryStrategy ? `Recovery strategy:
${JSON.stringify(recoveryStrategy, null, 2)}` : ""}

Use the source article only as the trigger for analysis. Do not summarize it.
You must produce a substantial article of at least ${minimumWords} words.
Target range: ${minimumWords}-${minimumWords + 500} words.
Do not end early. Add concrete examples, implementation detail, comparisons, and operational implications if needed to reach depth.

${buildPerspectivePrompt({
  item,
  topicName,
  matchedKeywords,
  testMode: false,
})}
`;
}

export function buildReviewerPrompt({
  title,
  body,
  plan,
  item,
  customTopic,
  priorReview = null,
  revisionCycle = 0,
}) {
  return `
You are the Quality Reviewer agent in an automated publishing system.

Review the article draft and return valid JSON with this exact shape:
{
  "overall_score": 0,
  "technical_depth": 0,
  "originality": 0,
  "clarity": 0,
  "structure": 0,
  "strengths": ["string"],
  "issues": ["string"],
  "must_revise": true,
  "publish_ready": false,
  "revision_brief": ["string"]
}

Scoring:
- Use integers from 0 to 100.
- "must_revise" should be true only for issues that materially block publication.
- "publish_ready" should be true if the draft could reasonably go live as-is, even if minor improvements are still possible.

Editorial policy:
- Judge publishability, not perfection.
- Do not keep the score flat if the revised draft clearly fixed the prior blocking issues.
- If this is a later review round, compare the current draft against the previous review and explicitly check whether prior issues were resolved.
- Do not introduce new minor complaints in later rounds unless they are genuinely important enough to block publication.
- If the article is structurally sound, technically specific, and useful to an experienced reader, it can be publish_ready=true even if a few optional improvements remain.
- Keep "issues" and "revision_brief" short, concrete, and limited to the highest-impact blockers only.

Scoring guidance:
- 90-100: publication-ready and unusually strong
- 80-89: publication-ready with only minor optional improvements
- 70-79: decent but still blocked by a few meaningful issues
- below 70: clearly not ready

Plan:
${JSON.stringify(plan, null, 2)}

${customTopic
    ? `Custom topic:
${JSON.stringify(customTopic, null, 2)}`
    : `Source signal:
${JSON.stringify(
        {
          title: item?.title,
          summary: item?.contentSnippet || "",
          url: item?.link || "",
        },
        null,
        2,
      )}`}

Draft title: ${title}

Revision cycle: ${revisionCycle}

${priorReview ? `Previous review to compare against:
${JSON.stringify(priorReview, null, 2)}` : "This is the first review pass."}

Draft body:
${body}
`;
}

export function buildRevisionPrompt({
  title,
  body,
  review,
  plan,
  revisionCycle = 0,
  currentWordCount = 0,
  minimumWords = 900,
}) {
  return `
You are the Revision Agent.

Revise the article so it fixes the review issues while preserving the strongest parts.

Return markdown only.

Plan:
${JSON.stringify(plan, null, 2)}

Review feedback:
${JSON.stringify(review, null, 2)}

Current draft title: ${title}
Current draft body:
${body}

Requirements:
- Keep the single # title line first.
- Keep the ### themed paragraph structure.
- Fix every item in revision_brief.
- Make the article more technical, concrete, and publishable.
- Revise only against the listed blocking issues. Do not perform broad unnecessary rewrites.
- Preserve the existing strengths from the review.
- Add specific examples, comparisons, or technical detail only where the review explicitly asked for them.
- If the review asked for a stronger conclusion, end with a concise synthesis rather than adding filler.
- This is revision cycle ${revisionCycle}. Make direct fixes, not exploratory changes.
- Current word count is approximately ${currentWordCount}.
- Final draft must be at least ${minimumWords} words.
- If the article is below ${minimumWords} words, expand it with meaningful technical substance rather than padding.
`;
}
