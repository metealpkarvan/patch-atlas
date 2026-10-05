import { mkdir, cp, rm, readFile, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of [
  "styles.css",
  "sw.js",
  "manifest.webmanifest",
  "assets",
  "LICENSE",
])
  await cp(file, `dist/${file}`, { recursive: true });
function wrap(source, name) {
  const names = [
    ...source.matchAll(/^export (?:async )?(?:function|const) ([$\w]+)/gm),
  ].map((m) => m[1]);
  if (!names.length) throw Error("No named exports");
  return `const ${name}=(()=>{\n${source.replace(/^export /gm, "")}\nreturn {${names.join(",")}};})();`;
}
const core = wrap(await readFile("src/core.js", "utf8"), "C");
const ui = wrap(await readFile("src/ui.js", "utf8"), "U");
const app = (await readFile("src/app.js", "utf8")).replace(
  /^import .*;\s*$/gm,
  "",
);
await writeFile(
  "dist/app.bundle.js",
  `(()=>{\n${core}\n${ui}\n// Application startup\n${app}\n})();`,
);
await writeFile(
  "dist/index.html",
  (await readFile("index.html", "utf8")).replace(
    '<script type="module" src="src/app.js"></script>',
    '<script defer src="app.bundle.js"></script>',
  ),
);
await writeFile(
  "dist/OPEN-ME.txt",
  "Open index.html in your browser. No Node.js or server needed. Use the online app for predictable per-origin storage and installed offline mode. Back up your data before switching between the online and downloaded app.\n",
);
console.log("Built standalone browser app in dist/");
