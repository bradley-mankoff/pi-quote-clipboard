/**
 * Builds the prompt text that ctrl+q inserts:
 *
 *     Responding to:
 *     > "the copied text"
 *     My response: |
 *
 * The label above the quote and the quotes around it both exist so the model can tell the quoted
 * text from the answer that follows without guessing where one ends and the other starts. The
 * cursor lands after "My response:" because the next thing typed is the comment on the quote.
 */

/**
 * Markdown inside a blockquote reads four or more leading spaces as an indented code block. A
 * pasted terminal selection keeps its screen layout as leading spaces, so a nested bullet can
 * land at four or more and stop being a list item: the bullet marker turns into literal text and
 * the line reads as if it left the quote. Three spaces keeps the marker a marker and still shows
 * one level of nesting. The alternative passed over, wrapping the whole paste in a fenced code
 * block, would keep the indentation exactly, but it turns prose into code and costs the model the
 * shape it reads best; a paste is a quote of a screen, not source, so its layout only has to
 * survive as shape.
 */
const MAX_QUOTE_INDENT = 3;

function normalizeIndent(line: string): string {
	const indent = /^[ \t]*/.exec(line)?.[0] ?? "";
	// A tab can be four columns wide on screen but is one character in the string, so measure it
	// as spaces before deciding how much of it survives.
	const width = indent.replace(/\t/g, "  ").length;
	return " ".repeat(Math.min(width, MAX_QUOTE_INDENT)) + line.slice(indent.length);
}

/**
 * Returns the new prompt text, or null when the clipboard holds nothing but whitespace.
 *
 * `existingPrompt` is kept as it stands, with a blank line before the quote when it already holds
 * text, so ctrl+q appends to a draft instead of replacing it.
 */
export function buildQuotedPrompt(clipboard: string, existingPrompt = ""): string | null {
	let lines = clipboard
		.replace(/\r\n?/g, "\n")
		.split("\n")
		// A terminal selection carries the padding to the pane edge on every line, and pi's left
		// margin sits in front of the selected text. Both go.
		.map((line) => line.trimEnd());
	while (lines.length > 0 && lines[0] === "") lines.shift();
	while (lines.length > 0 && lines.at(-1) === "") lines.pop();
	if (lines.length === 0) return null;

	// The shallowest line is pi's margin, plus any selection padding that survived on it. Removing
	// its indentation from every line keeps deeper indentation relative to it.
	const margin = Math.min(
		...lines.filter((line) => line !== "").map((line) => line.length - line.trimStart().length),
	);
	lines = lines.map((line) => normalizeIndent(line.slice(margin)));

	// Every line takes the quote prefix, including blank ones, so a blank line does not end the
	// blockquote and the quoted text never reads as the reply. One pair of quotes wraps the whole
	// selection, opening on the first line and closing on the last, so a multi-line paste is not
	// chopped into one quote per line.
	const body = lines.map((line) => (line ? `> ${line}` : ">"));
	body[0] = `> "${lines[0]}`;
	body[body.length - 1] += '"';

	const before = existingPrompt.trimEnd();
	const lead = !before.trim() ? "" : before.endsWith("\n") ? "\n" : "\n\n";
	return `${before}${lead}Responding to:\n${body.join("\n")}\nMy response: `;
}
