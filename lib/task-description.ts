/** Strip internal task markers and split description into readable parts for staff UI. */
export type ParsedTaskDescription = {
  summary: string;
  sentences: string[];
  assignmentNote: string;
};

const INTERNAL_MARKER_RE = /\[(?:auto_task|review_task):[^\]]+\]\s*/gi;
const CASE_PREFIX_RE = /^Case\s+[A-Z0-9-]+:\s*/i;
const DEADLINE_SUFFIX_RE = /\s*Deadline:\s*[^.\n]+(?:\.)?\s*$/i;
const ASSIGNMENT_PATTERNS = [
  /\bAwaiting assignment from Workload[^.]*\./gi,
  /\bAssign from Workload[^.]*\./gi,
  /\bAssigned person:\s*[^.]*\./gi,
] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseTaskDescription(raw?: string | null): ParsedTaskDescription {
  let text = normalizeWhitespace(raw || "");
  if (!text) {
    return { summary: "", sentences: [], assignmentNote: "" };
  }

  text = normalizeWhitespace(text.replace(INTERNAL_MARKER_RE, ""));
  text = normalizeWhitespace(text.replace(CASE_PREFIX_RE, ""));
  text = normalizeWhitespace(text.replace(DEADLINE_SUFFIX_RE, ""));

  let assignmentNote = "";
  for (const pattern of ASSIGNMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      assignmentNote = normalizeWhitespace(match[0].replace(/\.$/, ""));
      text = normalizeWhitespace(text.replace(pattern, ""));
    }
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return {
    summary: text,
    sentences,
    assignmentNote,
  };
}
