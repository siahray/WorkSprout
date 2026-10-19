// Sanitiser for free-text search before it reaches a PostgREST filter.
//
// The list pages splice the term into `.or('col.ilike.%term%')`, and PostgREST
// parses that argument as a comma-separated list of conditions inside parens —
// a raw comma in the search text fails parsing outright (PGRST100) and takes
// the whole page down with a 400. Verified against the live API: dots, spaces,
// hyphens, underscores, percent signs, and parens-in-values all parse fine,
// but commas do not.
//
// So the delimiters `, ( ) \`, backslash (which would rewrite LIKE's
// escaping), and any control character (newlines in a pasted search) are
// swapped for LIKE's single-character wildcard `_`, which still matches the
// original text: "Smith, John" becomes the pattern %Smith_ John% and finds
// "Smith, John"; "line1\nline2" becomes %line1_line2% and matches the note
// that actually contains a newline. Everything a person would actually type
// (letters, digits, spaces, dots, punctuation like `-`/`.`/`₱`) passes
// through untouched.

const MAX_QUERY_LENGTH = 100

export function sanitizeSearch(raw: string | undefined): string {
  if (!raw) return ''
  return raw
    // Intentional: we're hunting control characters precisely so they can be
    // neutralised before reaching the filter.
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f(),\\]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .trim()
}
