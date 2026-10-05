import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as sourceCore from "../src/core.js";
import * as sourceUI from "../src/ui.js";
const root = fileURLToPath(new URL("../", import.meta.url));
execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root });
const bundle = readFileSync(root + "dist/app.bundle.js", "utf8");
const marker = "// Application startup";
test("standalone package preserves every public module export", () => {
  const cut = bundle.indexOf(marker);
  assert.ok(cut > 0);
  const modules = vm.runInNewContext(
    bundle.slice(0, cut) + "return {C,U};})();",
  );
  assert.deepEqual(
    Object.keys(modules.C).sort(),
    Object.keys(sourceCore).sort(),
  );
  assert.deepEqual(Object.keys(modules.U).sort(), Object.keys(sourceUI).sort());
});
test("downloaded entry point uses a local classic script without module fetching", () => {
  const html = readFileSync(root + "dist/index.html", "utf8");
  assert.match(html, /<script defer src="app.bundle.js"><\/script>/);
  assert.ok(!html.includes('type="module"'));
  for (const path of [
    "styles.css",
    "assets/icon.svg",
    "manifest.webmanifest",
    "LICENSE",
  ])
    assert.ok(readFileSync(root + "dist/" + path).length > 0);
  new vm.Script(bundle);
});
