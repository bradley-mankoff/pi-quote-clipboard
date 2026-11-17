import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuotedPrompt } from "../lib/quote.ts";

test("a single line gets one pair of quotes and the reply cursor", () => {
	assert.equal(
		buildQuotedPrompt("one line"),
		'Responding to:\n> "one line"\nMy response: ',
	);
});

test("every line of a block takes the quote prefix, so the quote never ends early", () => {
	assert.equal(
		buildQuotedPrompt("first\nsecond\nthird"),
		'Responding to:\n> "first\n> second\n> third"\nMy response: ',
	);
});

test("a blank line inside the paste stays inside the quote", () => {
	assert.equal(
		buildQuotedPrompt("first\n\nthird"),
		'Responding to:\n> "first\n>\n> third"\nMy response: ',
	);
});

test("terminal padding and pi's left margin are trimmed, deeper indentation survives", () => {
	const pasted = [
		"    Some text:            ",
		"    - Pause               ",
		"      - five minutes      ",
		"                        ",
	].join("\n");
	assert.equal(
		buildQuotedPrompt(pasted),
		'Responding to:\n> "Some text:\n> - Pause\n>   - five minutes"\nMy response: ',
	);
});

test("a nested bullet deeper than four columns keeps its marker inside the quote", () => {
	// The reported edge case: the second bullet keeps the relative indentation it had on screen,
	// and four or more spaces after the quote marker read as an indented code block in markdown,
	// so the bullet stops being a list item.
	const pasted = "  - Pause\n        - five minutes\n";
	const quoted = buildQuotedPrompt(pasted);
	assert.equal(quoted, 'Responding to:\n> "- Pause\n>    - five minutes"\nMy response: ');
	const indents = quoted
		.split("\n")
		.filter((line) => line.startsWith("> "))
		.map((line) => line.slice(2).length - line.slice(2).trimStart().length);
	assert.ok(Math.max(...indents) <= 3, `no line may reach the code-block indent: ${indents}`);
});

test("a tab counts as its screen width, not one character", () => {
	assert.equal(
		buildQuotedPrompt("\t- Pause\n\t\tsub\titem"),
		'Responding to:\n> "- Pause\n>   sub\titem"\nMy response: ',
	);
});

test("an existing draft is kept, with a blank line before the quote", () => {
	assert.equal(
		buildQuotedPrompt("quoted", "my draft"),
		'my draft\n\nResponding to:\n> "quoted"\nMy response: ',
	);
});

test("trailing whitespace in an existing draft is trimmed before the quote is added", () => {
	assert.equal(
		buildQuotedPrompt("quoted", "my draft   \n"),
		'my draft\n\nResponding to:\n> "quoted"\nMy response: ',
	);
});

test("a whitespace-only clipboard reports nothing to quote", () => {
	assert.equal(buildQuotedPrompt("\n   \n"), null);
	assert.equal(buildQuotedPrompt(""), null);
});
