// /**
//  * Builds a prompt for custom user-defined topics (no feed item).
//  */
// export function buildCustomTopicPrompt({
//   title,
//   description,
//   keywords,
//   testMode = false,
// }) {
//   if (testMode) {
//     return `
// Write a SHORT technical test analysis (150–200 words max).

// Topic: ${title}
// Description: ${description}

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
// Generate a high-credibility technical blog post based on the user's topic.

// AUDIENCE
// Experienced engineers, researchers, and technical practitioners who:
// - have strong CS and systems foundations
// - prefer depth over breadth
// - value mechanisms, trade-offs, and constraints over surface-level explanations

// TOPIC (USER-PROVIDED)
// Title: ${title}
// Description: ${description}

// Write a deep technical analysis on this topic. Use the description as your guiding scope.

// DO NOT:
// - explain basic concepts
// - write generic AI or cloud commentary
// - pad with filler content

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
// - Continuous prose in Markdown
// - Code blocks with language tags (\`\`\`python, \`\`\`sql, etc.)
// - LaTeX math using $...$ (inline) or $$...$$ (display)
// - Tables for comparison data where appropriate
// - No heading hierarchy except for the article title (single # at top)

// FINAL CHECK (INTERNAL)
// Before finalizing, ensure:
// - An experienced engineer would learn something new
// - Claims are backed by technical reasoning
// - Scope is tight and controlled
// - Theory and practice are balanced
// - The narrative flows naturally without relying on headings as signposts

// Keywords to emphasize naturally: ${keywords.join(", ")}
// Tone: Rigorous, analytical, engineer-to-engineer
// `;
// }

// Note that the code above is great because it creates a paragpraph for every idea well spaced

/**
 * Builds a prompt for custom user-defined topics (no feed item).
 */
export function buildCustomTopicPrompt({
  title,
  description,
  keywords,
  testMode = false,
}) {
  if (testMode) {
    return `
Write a SHORT technical test analysis (150–200 words max).

Topic: ${title}
Description: ${description}

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
Generate a high-credibility technical blog post based on the user's topic.

AUDIENCE
Experienced engineers, researchers, and technical practitioners who:
- have strong CS and systems foundations
- prefer depth over breadth
- value mechanisms, trade-offs, and constraints over surface-level explanations

TOPIC (USER-PROVIDED)
Title: ${title}
Description: ${description}

Write a deep technical analysis on this topic. Use the description as your guiding scope.

DO NOT:
- explain basic concepts
- write generic AI or cloud commentary
- pad with filler content

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

THEME LABELS (MANDATORY)
Each paragraph MUST have a ### theme label on its own line.
Generate theme labels dynamically based on the content — make them specific and descriptive.

FORMAT:
### [Auto-Generated Theme Label]

Paragraph text here. Develops the theme fully. 2-5 sentences that explore this specific idea.

### [Next Auto-Generated Theme Label]

Next paragraph here. New theme. Continues the narrative flow.

THEME LABEL RULES:
- Generate labels that reflect YOUR specific analysis (not generic like "Introduction" or "Conclusion")
- Labels should be intriguing and technical (e.g., "The Memory Bandwidth Bottleneck", "Why Consensus Fails at Scale")
- One ### label = one paragraph = one focused idea
- Blank line before and after each paragraph
- 8-12 themed paragraphs total

EXAMPLE OUTPUT:
"""
# Your Article Title Here

### The Staleness Problem Nobody Talks About

Cache invalidation is often cited as one of the hardest problems in computer science. But the real challenge isn't invalidation itself — it's detecting when invalidation is needed. Most systems fail silently, serving stale data without any indication of drift.

### Why TTL-Based Expiration Falls Short

Time-to-live strategies assume uniform data volatility. In practice, some keys change every second while others remain static for months. A single TTL value either over-invalidates stable data or under-invalidates volatile entries.

### Event-Driven Invalidation Architecture

The alternative is propagating change events through the system. When source data updates, a message triggers cache purges across all nodes. This requires reliable message delivery and careful handling of out-of-order events.
"""

STYLE RULES
DO:
- Write in clear, logical paragraphs with smooth transitions
- Each paragraph covers ONE theme (matches its label)
- Add blank lines between every paragraph
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
- use generic theme labels like "Introduction" or "Background"

OUTPUT FORMAT
- Line 1: Single # title (the user-provided title)
- Then: Series of ### theme labels, each followed by one paragraph
- Blank line before and after each paragraph
- Code blocks with language tags where needed
- LaTeX math using $...$ or $$...$$
- Tables for comparison data where appropriate

FINAL CHECK (INTERNAL)
Before finalizing, ensure:
- Every paragraph has a ### theme label above it
- Theme labels are specific and descriptive (not generic)
- Each paragraph is 2-5 sentences
- Blank lines separate all paragraphs
- No walls of text anywhere
- An experienced engineer would learn something new
- Claims are backed by technical reasoning
- Scope is tight and controlled
- Theory and practice are balanced

Keywords to emphasize naturally: ${keywords.join(", ")}
Tone: Rigorous, analytical, engineer-to-engineer
`;
}
