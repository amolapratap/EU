/**
 * Comprehensive sanitizer for LaTeX math expressions embedded in Markdown.
 * Fixes common AI generation flaws such as:
 * 1. Mismatched delimiters (e.g. `$$ ... $` or `$ ... $$`).
 * 2. Unclosed display math (`$$`) blocks before markdown headings (e.g. `## Section`) or at end of text.
 * 3. Unclosed LaTeX environments (e.g. `\begin{aligned}` without `\end{aligned}`).
 * 4. Dangling single dollar signs that accidentally swallow subsequent paragraphs.
 */
export function sanitizeLatexMath(text: string): string {
  if (!text || typeof text !== "string") {
    return text || "";
  }

  let sanitized = text;

  // 1. Fix single-line mismatched math using replacer functions to avoid JS $$ escaping confusion
  // '$$ ... $' where content has no $ -> '$$ ... $$'
  sanitized = sanitized.replace(/(^|\n)\$\$([^$\n]+)\$(?!\$)\s*(\n|$)/g, (_m, p1, p2, p3) => `${p1}$$${p2}$$${p3}`);
  // '$ ... $$' where content has no $ -> '$$ ... $$'
  sanitized = sanitized.replace(/(^|\n)(?<!\$)\$(?!\$)([^$\n]+)\$\$\s*(\n|$)/g, (_m, p1, p2, p3) => `${p1}$$${p2}$$${p3}`);
  // Inline mismatched '$$...$' -> '$$...$$'
  sanitized = sanitized.replace(/\$\$([^$\n]+)\$(?!\$)/g, (_m, p1) => `$$${p1}$$`);
  // Inline mismatched '$...$$' -> '$$...$$'
  sanitized = sanitized.replace(/(?<!\$)\$([^$\n]+)\$\$/g, (_m, p1) => `$$${p1}$$`);

  // 2. Fix unclosed environments like \begin{aligned} without \end{aligned}
  const beginRegex = /\\begin\{([a-zA-Z*]+)\}/g;
  let match: RegExpExecArray | null;
  const envNames = new Set<string>();
  while ((match = beginRegex.exec(sanitized)) !== null) {
    envNames.add(match[1]);
  }

  envNames.forEach((env) => {
    const beginCount = (sanitized.match(new RegExp(`\\\\begin\\{${env}\\}`, "g")) || []).length;
    const endCount = (sanitized.match(new RegExp(`\\\\end\\{${env}\\}`, "g")) || []).length;
    if (beginCount > endCount) {
      const missingEnds = Array(beginCount - endCount)
        .fill(`\\end{${env}}`)
        .join("\n");
      const trimmed = sanitized.trimEnd();
      if (trimmed.endsWith("$$")) {
        const lastIdx = sanitized.lastIndexOf("$$");
        sanitized = sanitized.slice(0, lastIdx) + `\n${missingEnds}\n` + sanitized.slice(lastIdx);
      } else {
        sanitized += `\n${missingEnds}\n`;
      }
    }
  });

  // 3. Fix unclosed display math '$$' before headings, list items, or end of text
  const lines = sanitized.split("\n");
  let inDisplayMath = false;
  const repairedLines: string[] = [];

  for (const line of lines) {
    const stripped = line.trim();

    // If currently inside an open $$ block, and the line starts a new markdown heading (# or ## or ###)
    if (inDisplayMath && stripped.startsWith("#")) {
      repairedLines.push("$$");
      inDisplayMath = false;
    }

    const temp = stripped.replace(/\\\$\$/g, "");
    const count = (temp.match(/\$\$/g) || []).length;
    if (count % 2 !== 0) {
      inDisplayMath = !inDisplayMath;
    }

    repairedLines.push(line);
  }

  if (inDisplayMath) {
    repairedLines.push("$$");
  }

  sanitized = repairedLines.join("\n");

  // 4. Fix odd single dollar signs on lines that do not have $$ and are not headings
  const finalLines = sanitized.split("\n");
  const balancedLines: string[] = [];

  for (const line of finalLines) {
    const stripped = line.trim();
    if (stripped.includes("$$") || stripped.startsWith("#") || !stripped) {
      balancedLines.push(line);
      continue;
    }

    const cleaned = stripped.replace(/\\\s*\$/g, "");
    const singleDollars = cleaned.match(/(?<!\$)\$(?!\$)/g) || [];
    if (singleDollars.length % 2 !== 0) {
      // Balance trailing single $ to prevent swallowing the rest of the text
      balancedLines.push(line + "$");
    } else {
      balancedLines.push(line);
    }
  }

  return balancedLines.join("\n");
}
