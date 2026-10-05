# Design decisions

1. **A complete small task.** A local review desk for AI-written or human-written changes. Paste a unified diff, inspect exact old/new coordinates and keep your own review evidence. The source-to-feature reasoning is documented in RESEARCH.md.
2. **No account or runtime key.** These workflows can operate on user-entered facts and transparent rules. No generation API is needed to deliver the first useful action.
3. **Data survives decisions.** Reconsidering an intention or parking a conversation keeps a record; deletion is a separate explicit action. Diff replacement warns before resetting checks. Imports create a recovery copy. Capacity limits are shown rather than silently truncating.
4. **Distinct visual character.** Patch Atlas uses a dark botanical review desk and lime coordinates. Later Lane uses warm paper, serif headlines and numbered reading cards. Reply Harbor uses blue, generous spacing and a separate draft surface. Layouts retain labels, keyboard focus indicators and responsive controls.
5. **User judgments remain visible.** Priorities, minutes, effort, checkboxes and draft wording are entered or edited by the person. They are not machine confidence estimates. The app does not infer a private account's content.
6. **Local language with portable output.** Turkish is the first-open interface and English is available. Search folds dotted/dotless I and diacritics where relevant. User content keeps its original wording. JSON is lossless for the supported model; Markdown and calendar exports have explicitly narrower purposes.

The layout uses native controls with labels, live status messages and focus styles. Desktop and mobile Chromium flows were inspected. No full accessibility certification or completed VoiceOver audit is claimed; that remains a roadmap item.
