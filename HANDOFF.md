# Pi Quote Clipboard Handoff

Gives a Mac the `ctrl+q` prompt quote, and carries the fix for a nested-bullet bug. The work Mac already has an older copy of this extension as a loose file, so Part B is an upgrade, not a first install. The home Mac ran these steps on 2026-11-17.

## Current behaviour

`ctrl+q` reads the macOS clipboard with `pbpaste` and writes a labelled block into pi's prompt, leaving the cursor after `My response:`:

```
Responding to:
> "the text you copied"
My response: |
```

Enter sends the quote and the comment as one message. The label above and the quotes around the text exist so the model can tell the quote from the reply without guessing.

The other behaviour, all present on the home Mac today:

- The quote is appended to whatever the prompt already holds, separated by one blank line. `ctrl+-` undoes the insert.
- The text goes in with `setEditorText`, not a paste. A paste over ten lines folds into a `[paste #N]` marker that hides the quoted text, and `getEditorText` expands any markers already in the prompt, so nothing is lost.
- A terminal selection's padding to the pane edge, and pi's own left margin, are trimmed before the quote is built.
- One pair of quotes wraps the whole selection, opening on the first line and closing on the last.
- A clipboard holding only whitespace raises a warning and leaves the prompt alone.
- The key is `ctrl+q` because Ghostty here treats Option as a text key, so `alt+q` types `œ` and never reaches pi, and pi binds `ctrl+q` itself only on Windows and WSL.

## The edge case this handoff is about

The Boss reported on 2026-11-17 that copying something with two indented bullet points put the second bullet outside the block quote.

Reproduction on the home Mac, with a clipboard whose second bullet sits six columns deeper than the first:

```
  - Pause
        - five minutes
```

Before the fix, the extension kept the relative indentation and prefixed every line with `> `, which produced:

```
Responding to:
> "- Pause
>       - five minutes"
My response:
```

Markdown inside a blockquote reads four or more leading spaces as an indented code block, so the second line stopped being a list item. A CommonMark parser (marked, the copy pi ships in `dist/core/export-html/vendor/marked.min.js`) turns the old text into one paragraph in the quote with a literal `- five minutes`, and the new text into a quote holding a `<ul><li>` item. The bullet marker stopped working, which is the escaping the Boss saw.

`lib/quote.ts` now normalizes each line's leading whitespace to at most three spaces after the margin is removed. Three spaces keeps a bullet a bullet and still shows one level of nesting; four or more is the code-block indent that broke it. Tabs are measured as two columns first, since a tab is one character but two or more columns on screen.

The alternative passed over: wrapping the whole paste in a fenced code block. That keeps indentation exactly, but it turns prose into code and costs the model the shape it reads best. A paste is a quote of a screen, not source code, so its layout only has to survive as shape.

What is not confirmed: the exact clipboard the Boss copied was not captured, so the reproduction above is the shape that produces the symptom, not a recording of it. If the work Mac still shows a bullet outside the quote after this update, save the clipboard text next to the failing case and add it as a test in `test/quote.test.ts`.

## Folder contents

- `extensions/index.ts` registers `ctrl+q` and calls the builder. It is the whole pi surface.
- `lib/quote.ts` builds the prompt text and holds the indentation cap. It is pure, so the tests run without pi.
- `test/quote.test.ts` has nine cases, including the nested second bullet and a tab-indented paste.
- `package.json` declares the package to pi with `"pi": { "extensions": ["./extensions/index.ts"] }`.

## Part A: check the folder on the home Mac

1. `cd pi-quote-clipboard`
2. `npm test`. Expect 9 pass, 0 fail.

## Part B: upgrade the work Mac

The work Mac already has `~/.pi/agent/extensions/quote-clipboard.ts`. Copying this folder on top of it would register `ctrl+q` twice, so remove the loose file as part of the update.

1. Run `pi install git:github.com/bradley-mankoff/pi-quote-clipboard`. The repository is public, so no GitHub token is needed. This adds the source to `~/.pi/agent/settings.json`.
2. To check the tests before installing, clone the repository and run `npm test`. Expect 9 pass, 0 fail.
3. If the work Mac cannot reach GitHub, copy the folder over instead and run `pi install <path-to-pi-quote-clipboard>`.
4. Delete `~/.pi/agent/extensions/quote-clipboard.ts`. Only one copy may register `ctrl+q`.
5. Restart pi, or run `/reload`.

## Verify

1. Copy two lines where the second bullet is indented deeper than the first, for example from a terminal selection:

   ```
     - Pause
           - five minutes
   ```

2. In a pi prompt, press `ctrl+q`. The editor must show `Responding to:`, then every copied line prefixed with `> `, then `My response: ` with the cursor at the end.
3. The second bullet must sit at most three spaces past its `> ` marker. Four or more means the cap is not in this copy.
4. Press Enter. In the sent message the second line must render as a list item, with a bullet marker, instead of literal text sitting at the code-block indent. The first line carries the opening quote mark, so it shows as quoted text rather than as a bullet.
5. Copy a single word and press `ctrl+q` again with text already in the prompt. The quote must append below the existing text and `ctrl+-` must take it back off.

## Rollback

`pi remove pi-quote-clipboard`, which removes it from `~/.pi/agent/settings.json`. To go back to the old loose file, copy the previous `quote-clipboard.ts` into `~/.pi/agent/extensions/` and reload.
