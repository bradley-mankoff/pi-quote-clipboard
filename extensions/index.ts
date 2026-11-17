/**
 * quote-clipboard: ctrl+q pastes the clipboard into pi's prompt as a labelled, quoted block and
 * leaves the cursor after "My response:", so a comment can follow (the Boss, 2026-11-07):
 *
 *     Responding to:
 *     > "the selected text"
 *     My response: what you think of it
 *
 * Herdr copies mouse selections on its own (copy_on_select defaults to true), so the loop is
 * highlight, ctrl+q, type, repeat; Enter sends the quotes and comments as one message. This
 * replaces herdr-annotate, whose store and manager went unused.
 *
 * ctrl+q rather than alt+q: Ghostty here leaves Option as a text key (no macos-option-as-alt),
 * so Option+Q types "œ" and never reaches pi. pi binds ctrl+q only on Windows and WSL.
 * The quote is appended with setEditorText rather than pasteToEditor: a paste over 10 lines
 * folds into a [paste #N] marker, blank lines and all, which hides the text being commented
 * on and leaves the cursor beside the marker. getEditorText expands any markers already in
 * the prompt, so nothing is lost, and ctrl+- undoes the append.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { execFileSync } from "node:child_process";
import { buildQuotedPrompt } from "../lib/quote.ts";

export default function (pi: ExtensionAPI) {
	pi.registerShortcut(Key.ctrl("q"), {
		description: "Quote the clipboard into the prompt",
		handler: (ctx) => {
			let text: string;
			try {
				text = execFileSync("pbpaste", { encoding: "utf8" });
			} catch {
				ctx.ui.notify("quote-clipboard: pbpaste failed", "error");
				return;
			}
			const next = buildQuotedPrompt(text, ctx.ui.getEditorText());
			if (next === null) {
				ctx.ui.notify("quote-clipboard: the clipboard is empty", "warning");
				return;
			}
			ctx.ui.setEditorText(next);
		},
	});
}
