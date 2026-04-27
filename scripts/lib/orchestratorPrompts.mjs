import { buildPerspectivePrompt } from "./promptBuilder.mjs";
import { buildCustomTopicPrompt } from "./custompromptBuilder.mjs";

export function buildPlannerPrompt({ topicName, keywords, item, customTopic }) {
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

Rules:
- Do not restate the source headline as the article title.
- Use the source as a trigger, not as something to summarize.
- Outline must contain 6 to 8 steps.
- Tags must be short, lowercase, and useful for a blog.
- Risks should name what could make the article weak or generic.
`;
}

export function buildDraftAgentPrompt({
  item,
  topicName,
  matchedKeywords,
  plan,
  customTopic,
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

Use the plan to write the article. Keep the writing technical, specific, and publication-ready.

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

Use the source article only as the trigger for analysis. Do not summarize it.

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
- "must_revise" should be true if the draft is not yet fit to publish.
- "publish_ready" should be true only if the draft could go live as-is.

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

Draft body:
${body}
`;
}

export function buildRevisionPrompt({
  title,
  body,
  review,
  plan,
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
`;
}
