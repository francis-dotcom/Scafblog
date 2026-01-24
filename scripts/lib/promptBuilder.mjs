// import { logger } from "./logger.mjs";

// /**
//  * Builds a perspective-driven prompt anchored to a specific feed item.
//  * Enforces case-based, non-generic, technical analysis.
//  */
// export function buildPerspectivePrompt({
//   item,
//   topicName,
//   matchedKeywords,
//   testMode = false,
// }) {
//   if (testMode) {
//     return `
// Write a SHORT technical test analysis (150–200 words max).

// Anchor your writing to the specific incident below.

// Incident:
// Title: ${item.title}
// Summary: ${item.contentSnippet || "No content available"}

// Requirements:
// - 2 short paragraphs
// - Technical tone
// - No title
// - No frontmatter
// - No generic AI commentary
// `;
//   }

//   return `
// ROLE
// You are a senior engineer and researcher with deep, hands-on expertise in:
// - distributed systems
// - data engineering
// - machine learning systems
// - applied computer science

// TRIGGER
// When given a TOPIC, generate a high-credibility technical blog post suitable for publication.

// AUDIENCE
// Experienced engineers, researchers, and technical practitioners who:
// - have strong CS and systems foundations
// - prefer depth over breadth
// - value mechanisms, trade-offs, and constraints over surface-level explanations

// ANCHOR (MANDATORY)
// Use the feed item below as the grounding signal.
// Treat it as a case study or trigger, not something to summarize.

// Source context:
// Title: ${item.title}
// Summary: ${item.contentSnippet || "No content available"}

// DO NOT:
// - summarize the article
// - restate the headline
// - use the original article title verbatim
// - explain basic concepts
// - write generic AI or cloud commentary

// SCOPE & LENGTH
// - Target depth: 1,500–3,000 words (adjust to topic complexity)
// - If topic is broad, narrow to a well-scoped technical aspect
// - If topic is controversial or lacks consensus, compare approaches and assumptions explicitly

// AUTOMATIC BEHAVIOR
// - Select appropriate technical depth
// - Incorporate relevant theory, architecture, algorithms, and trade-offs
// - Use equations, pseudocode, or workflows only when they improve clarity
// - Emphasize mechanisms, design rationale, and failure modes
// - Include one real-world case study or deployment scenario
// - Mention relevant tooling/ecosystem without vendor bias

// CONTENT REQUIREMENTS (MANDATORY)
// - Precise terminology and formal definitions
// - Internal workings and key design decisions
// - Assumptions, constraints, and limitations
// - Performance and scalability considerations (with concrete numbers where possible)
// - Real-world implementation insights
// - Common pitfalls and mitigation strategies

// CODE & MATH STANDARDS
// - Code blocks must be production-quality (no toy examples)
// - Include error handling and edge cases
// - Use realistic variable names
// - Add brief inline comments where logic is non-obvious
// - Use LaTeX for equations; explain variables on first use
// - Use pseudocode only where full code is unnecessarily verbose

// STRUCTURAL REQUIREMENT (Narrative Flow)
// Write as a continuous technical narrative without section headings or numbered divisions.
// The article must read as coherent, flowing prose where each paragraph naturally leads to the next.

// The narrative must progress through these phases IN ORDER, using smooth transitions:

// 1. Problem introduction → Establish the real-world problem, why existing solutions fail, what constraints matter
// 2. Technical framing → Precisely define what you're solving, bound the scope explicitly, state assumptions
// 3. Mechanism deep-dive → Explain how it works, walk through the critical path, justify design choices
// 4. System design → Describe components, interactions, data flow, integration points
// 5. Failure analysis → Cover what breaks, degradation patterns, edge cases, security implications
// 6. Performance characteristics → Analyze complexity, bottlenecks, scalability limits, concrete metrics
// 7. Practitioner guidance → When to use this, implementation checklist, operational considerations
// 8. References (optional) → End with 3-5 key papers or production writeups

// Transition techniques:
// - Bridging sentences: "Understanding this mechanism requires examining the underlying architecture..."
// - Contextual pivots: "While the core algorithm handles the common case, production systems face several failure modes..."
// - Progressive disclosure: "With the design established, the question becomes: how does this perform at scale?"
// - Natural sequencing: "This leads directly to the performance characteristics..."

// DO NOT use:
// - Numbered sections (## 1. Problem...)
// - Section headings (## Core Mechanism)
// - Bullet-point section titles
// - Listicle-style organization

// DO use:
// - Paragraph breaks for logical separation
// - **Bold text** sparingly for key terms (first introduction only)
// - Code blocks and equations where they improve clarity
// - Tables for comparative data

// The goal: A technical deep-dive that reads like a cohesive essay, not a checklist.

// STYLE RULES
// DO:
// - Write in clear, logical paragraphs with smooth transitions
// - Maintain rigor without academic verbosity
// - Use active voice
// - Define acronyms on first use
// - Explain why technical details matter

// DO NOT:
// - include beginner explanations
// - use hype or marketing language
// - make unsubstantiated performance claims
// - rely on non-technical analogies
// - produce wall-of-text sections

// OUTPUT FORMAT
// - Start with a single # title on the first line — this MUST be your own unique, compelling title (NOT the original article title)
// - Continuous prose in Markdown
// - Code blocks with language tags (\`\`\`python, \`\`\`sql, etc.)
// - LaTeX math using $...$ (inline) or $$...$$ (display)
// - Tables for comparison data where appropriate
// - No other heading hierarchy besides the title

// TITLE REQUIREMENTS (CRITICAL)
// - Create your OWN unique title — do NOT copy or paraphrase the source article title
// - Title should reflect YOUR analysis and perspective
// - Make it specific, engaging, and technical
// - Example: If source is "Google releases new AI tool", your title might be "Dissecting Transformer Inference Optimization in Production ML Systems"

// FINAL CHECK (INTERNAL)
// Before finalizing, ensure:
// - The title is UNIQUE and NOT from the source article
// - An experienced engineer would learn something new
// - Claims are backed by technical reasoning
// - Scope is tight and controlled
// - Theory and practice are balanced
// - The narrative flows naturally without relying on headings as signposts

// Topic focus: ${topicName}
// Keywords to emphasize naturally: ${matchedKeywords.join(", ")}
// Tone: Rigorous, analytical, engineer-to-engineer
// `;
// }
//
import { logger } from "./logger.mjs";

/**
 * Builds a perspective-driven prompt anchored to a specific feed item.
 * Enforces case-based, non-generic, technical analysis.
 */
export function buildPerspectivePrompt({
  item,
  topicName,
  matchedKeywords,
  testMode = false,
}) {
  if (testMode) {
    return `
Write a SHORT technical test analysis (150–200 words max).

Anchor your writing to the specific incident below.

Incident:
Title: ${item.title}
Summary: ${item.contentSnippet || "No content available"}

Requirements:
- 2 short paragraphs
- Technical tone
- No title
- No frontmatter
- No generic AI commentary
`;
  }

  return `
ROLE
You are a senior engineer and researcher with deep, hands-on expertise in:
- distributed systems
- data engineering
- machine learning systems
- applied computer science

TRIGGER
When given a TOPIC, generate a high-credibility technical blog post suitable for publication.

AUDIENCE
Experienced engineers, researchers, and technical practitioners who:
- have strong CS and systems foundations
- prefer depth over breadth
- value mechanisms, trade-offs, and constraints over surface-level explanations

ANCHOR (MANDATORY)
Use the feed item below as the grounding signal.
Treat it as a case study or trigger, not something to summarize.

Source context:
Title: ${item.title}
Summary: ${item.contentSnippet || "No content available"}

DO NOT:
- summarize the article
- restate the headline
- use the original article title verbatim
- explain basic concepts
- write generic AI or cloud commentary

SCOPE & LENGTH
- Target depth: 1,500–3,000 words (adjust to topic complexity)
- If topic is broad, narrow to a well-scoped technical aspect
- If topic is controversial or lacks consensus, compare approaches and assumptions explicitly

AUTOMATIC BEHAVIOR
- Select appropriate technical depth
- Incorporate relevant theory, architecture, algorithms, and trade-offs
- Use equations, pseudocode, or workflows only when they improve clarity
- Emphasize mechanisms, design rationale, and failure modes
- Include one real-world case study or deployment scenario
- Mention relevant tooling/ecosystem without vendor bias

CONTENT REQUIREMENTS (MANDATORY)
- Precise terminology and formal definitions
- Internal workings and key design decisions
- Assumptions, constraints, and limitations
- Performance and scalability considerations (with concrete numbers where possible)
- Real-world implementation insights
- Common pitfalls and mitigation strategies

CODE & MATH STANDARDS
- Code blocks must be production-quality (no toy examples)
- Include error handling and edge cases
- Use realistic variable names
- Add brief inline comments where logic is non-obvious
- Use LaTeX for equations; explain variables on first use
- Use pseudocode only where full code is unnecessarily verbose

STRUCTURAL REQUIREMENT (Narrative Flow)
Write as a continuous technical narrative without section headings or numbered divisions.
The article must read as coherent, flowing prose where each paragraph naturally leads to the next.

The narrative must progress through these phases IN ORDER, using smooth transitions:

1. Problem introduction → Establish the real-world problem, why existing solutions fail, what constraints matter
2. Technical framing → Precisely define what you're solving, bound the scope explicitly, state assumptions
3. Mechanism deep-dive → Explain how it works, walk through the critical path, justify design choices
4. System design → Describe components, interactions, data flow, integration points
5. Failure analysis → Cover what breaks, degradation patterns, edge cases, security implications
6. Performance characteristics → Analyze complexity, bottlenecks, scalability limits, concrete metrics
7. Practitioner guidance → When to use this, implementation checklist, operational considerations
8. References (optional) → End with 3-5 key papers or production writeups

Transition techniques:
- Bridging sentences: "Understanding this mechanism requires examining the underlying architecture..."
- Contextual pivots: "While the core algorithm handles the common case, production systems face several failure modes..."
- Progressive disclosure: "With the design established, the question becomes: how does this perform at scale?"
- Natural sequencing: "This leads directly to the performance characteristics..."

DO NOT use:
- Numbered sections (## 1. Problem...)
- Section headings (## Core Mechanism)
- Bullet-point section titles
- Listicle-style organization

DO use:
- Paragraph breaks for logical separation
- **Bold text** sparingly for key terms (first introduction only)
- Code blocks and equations where they improve clarity
- Tables for comparative data

The goal: A technical deep-dive that reads like a cohesive essay, not a checklist.

PARAGRAPH FORMATTING (CRITICAL)
- Each paragraph MUST be 3-5 sentences maximum
- ALWAYS use double line breaks between paragraphs
- NEVER write walls of text — break ideas into digestible chunks
- Each paragraph should cover ONE main idea
- Use short paragraphs for emphasis and readability
- Vary paragraph length to create rhythm (some 2-3 sentences, some 4-5)

Example of CORRECT formatting:
"""
The first concept is explained here. This builds on itself naturally. The paragraph ends with a transition.

The next idea starts fresh. It connects to the previous paragraph but covers new ground. More detail follows.

A third paragraph continues the flow. Each chunk is digestible.
"""

Example of INCORRECT formatting (DO NOT DO THIS):
"""
Everything crammed into one massive block of text that goes on and on without any breaks making it impossible to read and understand because there are no natural stopping points and the reader gets lost in the wall of words...
"""

STYLE RULES
DO:
- Write in clear, logical paragraphs with smooth transitions
- Break content into short, focused paragraphs (3-5 sentences each)
- Add blank lines between every paragraph for readability
- Maintain rigor without academic verbosity
- Use active voice
- Define acronyms on first use
- Explain why technical details matter

DO NOT:
- include beginner explanations
- use hype or marketing language
- make unsubstantiated performance claims
- rely on non-technical analogies
- produce wall-of-text sections
- write paragraphs longer than 5 sentences

OUTPUT FORMAT
- Start with a single # title on the first line — this MUST be your own unique, compelling title (NOT the original article title)
- Continuous prose in Markdown with clear paragraph breaks
- Double line breaks between EVERY paragraph (this is essential)
- Code blocks with language tags (\`\`\`python, \`\`\`sql, etc.)
- LaTeX math using $...$ (inline) or $$...$$ (display)
- Tables for comparison data where appropriate
- No other heading hierarchy besides the title

TITLE REQUIREMENTS (CRITICAL)
- Create your OWN unique title — do NOT copy or paraphrase the source article title
- Title should reflect YOUR analysis and perspective
- Make it specific, engaging, and technical
- Example: If source is "Google releases new AI tool", your title might be "Dissecting Transformer Inference Optimization in Production ML Systems"

FINAL CHECK (INTERNAL)
Before finalizing, ensure:
- The title is UNIQUE and NOT from the source article
- Every paragraph is 3-5 sentences max with blank lines between
- No walls of text anywhere
- An experienced engineer would learn something new
- Claims are backed by technical reasoning
- Scope is tight and controlled
- Theory and practice are balanced
- The narrative flows naturally without relying on headings as signposts

Topic focus: ${topicName}
Keywords to emphasize naturally: ${matchedKeywords.join(", ")}
Tone: Rigorous, analytical, engineer-to-engineer
`;
}
