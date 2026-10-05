# Contributing

Describe the concrete input, expected behavior and actual result in an issue. Use fictional/redacted examples; do not include private diffs, conversations or backup files. Check [current limits](README.md) first.

Run `npm test` and `npm run build` with Node 22+. For a UI change, serve `dist/`, try the relevant complete workflow and both languages, and inspect a narrow viewport. Data-format changes need a migration or an explicit version rejection; never silently overwrite unreadable records. Source strings, URL protocols, diff counts and calendar content should remain validated at the boundary.

Contributions use the MIT license. Keep changes focused and explain which observation or bug they address.
