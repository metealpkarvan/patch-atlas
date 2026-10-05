import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/core.js";
const patch =
  "diff --git a/auth.js b/auth.js\n--- a/auth.js\n+++ b/auth.js\n@@ -10,3 +20,4 @@\n function start() {\n-  old();\n+  eval(input);\n+  // TODO review\n }\n";
const archive = () => ({
  diff: patch,
  goal: "Review input handling",
  notes: {},
  checks: {},
});
test("positions track both old and new lines", () => {
  const p = C.parseDiff(patch);
  assert.equal(p.added, 2);
  assert.equal(p.removed, 1);
  assert.deepEqual(
    p.files[0].hunks[0].lines.map((l) => [l.old, l.new]),
    [
      [10, 20],
      [11, null],
      [null, 21],
      [null, 22],
      [12, 23],
    ],
  );
});
test("CRLF patches keep accurate coordinates", () =>
  assert.equal(C.parseDiff(patch.replace(/\n/g, "\r\n")).added, 2));
test("blank input returns an empty map", () =>
  assert.equal(C.parseDiff("  ").files.length, 0));
test("plain two-way unified format is supported", () =>
  assert.equal(
    C.parseDiff(patch.slice(patch.indexOf("---"))).files[0].path,
    "auth.js",
  ));
test("quoted spaces in file names survive", () =>
  assert.equal(C.decodePath('"b/a file.js"'), "a file.js"));
test("Git octal UTF-8 file names decode", () =>
  assert.equal(C.decodePath('"b/\\303\\247ay.swift"'), "çay.swift"));
test("timestamp suffixes are not part of names", () =>
  assert.equal(C.decodePath("b/test.js\t2026-10-05"), "test.js"));
test("literal Unicode file names survive", () =>
  assert.equal(C.decodePath('"b/hatıra🫖.swift"'), "hatıra🫖.swift"));
test("unknown quoted path escape is rejected", () =>
  assert.throws(() => C.decodePath('"b/a\\q"')));
test("invalid UTF-8 is rejected", () =>
  assert.throws(() => C.decodePath('"b/\\377"')));
test("no-newline metadata does not change counts", () =>
  assert.equal(C.parseDiff(patch + "\\ No newline at end of file\n").added, 2));
test("zero-count creation hunk is supported", () => {
  const p = C.parseDiff("--- /dev/null\n+++ b/new.js\n@@ -0,0 +1 @@\n+hello\n");
  assert.equal(p.added, 1);
  assert.equal(p.files[0].hunks[0].lines[0].old, null);
});
test("deleted files retain their old path", () =>
  assert.equal(
    C.parseDiff("--- a/old.js\n+++ /dev/null\n@@ -1 +0,0 @@\n-old\n").files[0]
      .path,
    "old.js",
  ));
test("multiple plain files stay separate", () =>
  assert.equal(
    C.parseDiff(
      patch.slice(patch.indexOf("---")) +
        "--- a/two\n+++ b/two\n@@ -1 +1 @@\n-a\n+b\n",
    ).files.length,
    2,
  ));
test("binary change is explicit and requires external inspection", () => {
  const f = C.parseDiff(
    "diff --git a/photo.png b/photo.png\nBinary files a/photo.png and b/photo.png differ\n",
  ).files[0];
  assert.equal(f.binary, true);
  assert.ok(C.reviewChecks(f).includes("binary"));
});
test("rename-only change is supported", () => {
  const f = C.parseDiff(
    "diff --git a/one b/two\nsimilarity index 100%\nrename from one\nrename to two\n",
  ).files[0];
  assert.equal(f.oldPath, "one");
  assert.equal(f.path, "two");
});
test("mode-only change is supported", () =>
  assert.equal(
    C.parseDiff("diff --git a/run b/run\nold mode 100644\nnew mode 100755\n")
      .files[0].modeOnly,
    true,
  ));
test("an added plus-prefixed line is not mistaken for a file header", () =>
  assert.equal(
    C.parseDiff("--- a/f\n+++ b/f\n@@ -0,0 +1 @@\n+++ b/not-a-header\n")
      .files[0].added,
    1,
  ));
for (const [name, bad] of [
  ["truncated", patch.replace(" }\n", "")],
  ["mismatched counts", patch.replace("+20,4", "+20,5")],
  ["unknown hunk line", patch.replace(" function", "!function")],
  ["combined format", "diff --cc a.js\n"],
  ["no header", "some source code"],
  ["missing file body", "--- a/f\n+++ b/f\n"],
  ["hunk without file", "@@ -1 +1 @@\n-a\n+b\n"],
  ["oversized input", "a".repeat(C.MAX_DIFF + 1)],
])
  test("reject " + name, () => assert.throws(() => C.parseDiff(bad)));
test("text cues point to added line coordinates", () =>
  assert.equal(
    C.cues(C.parseDiff(patch).files[0]).find((c) => c.type === "execution")
      .line,
    21,
  ));
test("deleted eval is not a new execution cue", () =>
  assert.equal(
    C.cues(
      C.parseDiff(
        patch
          .replace("-  old();", "-  eval(input);")
          .replace("+  eval(input);", "+  safe();"),
      ).files[0],
    ).some((c) => c.type === "execution"),
    false,
  ));
test("SQL deletion gets a textual attention cue", () =>
  assert.ok(
    C.cues(
      C.parseDiff(
        "--- a/cleanup.sql\n+++ b/cleanup.sql\n@@ -0,0 +1 @@\n+DELETE FROM accounts;\n",
      ).files[0],
    ).some((c) => c.type === "destructive"),
  ));
test("archive round trip preserves reviewer notes", () => {
  const a = archive();
  a.notes["0"] = "Ran tests; boundary remains open";
  a.checks["0"] = ["purpose"];
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(a))), a);
});
test("unknown file references are rejected", () => {
  const a = archive();
  a.notes["90"] = "unexpected";
  assert.throws(() => C.validate(a));
});
test("unknown checklist entries are rejected", () => {
  const a = archive();
  a.checks["0"] = ["auto-approved"];
  assert.throws(() => C.validate(a));
});
test("duplicate checks are rejected", () => {
  const a = archive();
  a.checks["0"] = ["purpose", "purpose"];
  assert.throws(() => C.validate(a));
});
test("report keeps unreviewed checks unchecked", () => {
  const r = C.report(archive());
  assert.ok(r.includes("- [ ] purpose"));
  assert.ok(r.includes("not verified defects"));
});
test("review report keeps source paths and notes", () => {
  const a = archive();
  a.notes["0"] = "Manual check only";
  assert.ok(C.report(a).includes("auth.js"));
  assert.ok(C.report(a).includes("Manual check only"));
});
