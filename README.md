# pi-quote-clipboard

pi-quote-clipboard is an extension for the [pi coding agent](https://github.com/earendil-works/pi). Pressing `ctrl+q` reads the macOS clipboard with `pbpaste` and puts it into pi's prompt as a labelled quote, with the cursor after `My response:`:

```
Responding to:
> "the text you copied"
My response: |
```

Enter sends the quote and the comment as one message. The label and the quotes let the model tell the quoted text from what you wrote about it.

## Install

From GitHub:

```sh
pi install git:github.com/bradley-mankoff/pi-quote-clipboard
```

From a local checkout:

```sh
pi install /path/to/pi-quote-clipboard
```

To try it for one session without installing:

```sh
pi -e /path/to/pi-quote-clipboard
```

Remove an older loose copy first. A file at `~/.pi/agent/extensions/quote-clipboard.ts` registers the same shortcut, and leaving both in place loads the handler twice.

## Behaviour

- `ctrl+q` appends to whatever the prompt already holds, separated by one blank line. It never replaces a draft. `ctrl+-` undoes the insert.
- The quote goes in with `setEditorText`, not a paste, so a long clipboard is not folded into a `[paste #N]` marker. `getEditorText` expands markers already in the prompt, so nothing is lost.
- Trailing padding from a terminal selection and pi's left margin are trimmed. Deeper indentation is kept, capped at three spaces so a nested bullet stays a list item inside the blockquote.
- One pair of quotes wraps the whole selection: it opens on the first quoted line and closes on the last.
- A clipboard that holds only whitespace raises a warning and leaves the prompt alone.
- `ctrl+q` is the key because Ghostty here treats Option as a text key, so `alt+q` never reaches pi, and pi binds `ctrl+q` itself only on Windows and WSL.

## Test

```sh
npm test
```

Nine cases: a single line, a multi-line block, a blank line inside the quote, terminal padding and pi's left margin, a nested second bullet, a tab-indented paste, appending to an existing draft, trailing whitespace in a draft, and a whitespace-only clipboard.
