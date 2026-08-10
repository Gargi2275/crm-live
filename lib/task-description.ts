/** Strip internal task markers and return readable copy for staff UI. */
export type ParsedTaskDescription = {
  summary: string;
  sentences: string[];
  assignmentNote: string;
};

/** Matches both `[review_task:document-review:34:initial]` and older `[review_task.document.review:34:initial]`. */
const INTERNAL_MARKER_RE =
  /\[(?:auto[_.-]?task|review[_.-]?task)[^\]]*\]\s*/gi;
const CASE_PREFIX_RE = /^Case\s+[A-Z0-9-]+:\s*/i;
const DEADLINE_SUFFIX_RE = /\s*Deadline:\s*[^.\n]+(?:\.)?\s*$/i;
const ASSIGNMENT_PATTERNS = [
  /\bAwaiting assignment from Workload[^.]*\./gi,
  /\bAssign from Workload[^.]*\./gi,
  /\bAssigned person:\s*[^.]*\./gi,
] as const;

const READABLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bReview within\s+(\d+)\s*h\b/gi, "Please review within $1 hours"],
  [/\bSubmit within\s+(\d+)\s*h\b/gi, "Please submit within $1 hours"],
  [/\bRe-uploaded documents\b/gi, "Customer re-uploaded documents"],
  [/\bUploaded documents\b/gi, "Customer uploaded documents"],
  [/\bAudit submitted\b/gi, "Audit fee paid — documents ready for review"],
  [/\bForm review required\b/gi, "Form review needed"],
  [/\bSubmit application to government\/portal\b/gi, "Submit this application to the government portal"],
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function humanizePhrases(value: string) {
  let text = value;
  for (const [pattern, replacement] of READABLE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return normalizeWhitespace(text);
}

export function parseTaskDescription(raw?: string | null): ParsedTaskDescription {
  let text = normalizeWhitespace(raw || "");
  if (!text) {
    return { summary: "", sentences: [], assignmentNote: "" };
  }

  text = normalizeWhitespace(text.replace(INTERNAL_MARKER_RE, ""));
  // Catch leftover tech tokens like review_task.document.review:34:initial without brackets.
  text = normalizeWhitespace(
    text.replace(/\b(?:auto[_.-]?task|review[_.-]?task)[a-z0-9_.:-]*\b/gi, ""),
  );
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

  text = humanizePhrases(text);

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

/** One-line readable description for cards/lists. */
export function formatTaskDescriptionForDisplay(raw?: string | null): string {
  return parseTaskDescription(raw).summary;
}
