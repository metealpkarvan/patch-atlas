export const MAX_DIFF = 500000;
export function text(value, max) {
  if (typeof value !== "string" || value.length > max || value.includes("\0"))
    throw Error("Invalid text or size limit exceeded");
  return value;
}
export function decodePath(raw) {
  let value = raw.trim();
  if (value.startsWith('"')) {
    if (!value.endsWith('"')) throw Error("Unclosed quoted path");
    value = value.slice(1, -1);
    const bytes = [];
    const enc = new TextEncoder();
    for (let i = 0; i < value.length; ) {
      if (value[i] === "\\") {
        const oct = value.slice(i + 1).match(/^[0-7]{1,3}/);
        if (oct) {
          bytes.push(parseInt(oct[0], 8));
          i += oct[0].length + 1;
          continue;
        }
        const escapes = { n: "\n", t: "\t", r: "\r", "\\": "\\", '"': '"' };
        if (!(value[i + 1] in escapes)) throw Error("Unsupported path escape");
        bytes.push(...enc.encode(escapes[value[i + 1]]));
        i += 2;
      } else {
        const c = String.fromCodePoint(value.codePointAt(i));
        bytes.push(...enc.encode(c));
        i += c.length;
      }
    }
    value = new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(bytes),
    );
  } else value = value.split("\t")[0];
  if (value !== "/dev/null") value = value.replace(/^[ab]\//, "");
  return text(value, 2000);
}
export function parseDiff(input) {
  text(input, MAX_DIFF);
  if (!input.trim()) return { files: [], added: 0, removed: 0 };
  if (/^diff --(?:cc|combined) /m.test(input))
    throw Error(
      "Combined merge diffs are unsupported. Use a two-way unified diff.",
    );
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 12000) throw Error("Diff exceeds 12,000 lines");
  const files = [];
  let file = null,
    hunk = null,
    oldLine = 0,
    newLine = 0;
  function finishHunk() {
    if (
      hunk &&
      (hunk.oldSeen !== hunk.oldCount || hunk.newSeen !== hunk.newCount)
    )
      throw Error("Incomplete or malformed hunk in " + file.path);
    hunk = null;
  }
  function begin(path) {
    finishHunk();
    if (files.length >= 80) throw Error("Diff exceeds 80 files");
    file = {
      id: String(files.length),
      path,
      oldPath: path,
      hunks: [],
      added: 0,
      removed: 0,
      binary: false,
      rename: false,
      modeOnly: false,
    };
    files.push(file);
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("diff --git ")) {
      const quoted = line.match(
        /^diff --git ("(?:\\.|[^"\\])*"|\S+) ("(?:\\.|[^"\\])*"|\S+)$/,
      );
      if (quoted) begin(decodePath(quoted[2]));
      else {
        const cut = line.lastIndexOf(" b/");
        if (cut < 0) throw Error("Unsupported Git file header");
        begin(decodePath(line.slice(cut + 1)));
      }
      continue;
    }
    if (line.startsWith("@@")) {
      finishHunk();
      if (!file) throw Error("Hunk has no file header");
      const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (!m) throw Error("Unsupported hunk header");
      const values = [
        Number(m[1]),
        Number(m[2] ?? 1),
        Number(m[3]),
        Number(m[4] ?? 1),
      ];
      if (values.some((v) => !Number.isSafeInteger(v) || v > 100000000))
        throw Error("Invalid hunk coordinate");
      [oldLine, , newLine] = values;
      hunk = {
        header: line,
        oldCount: values[1],
        newCount: values[3],
        oldSeen: 0,
        newSeen: 0,
        lines: [],
      };
      file.hunks.push(hunk);
      continue;
    }
    if (
      hunk &&
      (hunk.oldSeen < hunk.oldCount || hunk.newSeen < hunk.newCount)
    ) {
      if (line.startsWith("\\ No newline at end of file")) continue;
      const kind = line[0];
      if (![" ", "+", "-"].includes(kind))
        throw Error("Malformed hunk body in " + file.path);
      const entry = {
        kind,
        text: line.slice(1),
        old: kind === "+" ? null : oldLine,
        new: kind === "-" ? null : newLine,
      };
      if (kind !== "+") {
        hunk.oldSeen++;
        oldLine++;
      }
      if (kind !== "-") {
        hunk.newSeen++;
        newLine++;
      }
      if (hunk.oldSeen > hunk.oldCount || hunk.newSeen > hunk.newCount)
        throw Error("Hunk line count mismatch");
      hunk.lines.push(entry);
      if (kind === "+") file.added++;
      if (kind === "-") file.removed++;
      continue;
    }
    if (line.startsWith("--- ")) {
      finishHunk();
      const old = decodePath(line.slice(4));
      if (!file || file.hunks.length || file.newHeader) begin(old);
      file.oldPath = old;
      continue;
    }
    if (line.startsWith("+++ ")) {
      if (!file) throw Error("New file header has no old file");
      const path = decodePath(line.slice(4));
      file.path = path === "/dev/null" ? file.oldPath : path;
      file.newHeader = true;
      continue;
    }
    if (file && line.startsWith("rename from ")) {
      file.oldPath = decodePath(line.slice(12));
      file.rename = true;
    }
    if (file && line.startsWith("rename to ")) {
      file.path = decodePath(line.slice(10));
      file.rename = true;
    }
    if (
      file &&
      (line.startsWith("Binary files ") || line === "GIT binary patch")
    )
      file.binary = true;
    if (
      file &&
      /^(old mode|new mode|new file mode|deleted file mode) /.test(line)
    )
      file.modeOnly = true;
    if (
      hunk &&
      line &&
      !line.startsWith("\\ No newline") &&
      !line.startsWith("-- ")
    )
      throw Error("Unexpected data after hunk in " + file.path);
  }
  finishHunk();
  if (!files.length) throw Error("No unified diff file headers found");
  for (const f of files)
    if (
      !f.path ||
      f.path === "/dev/null" ||
      (!f.hunks.length && !f.binary && !f.modeOnly && !f.rename)
    )
      throw Error("Incomplete file change in " + f.path);
  return {
    files,
    added: files.reduce((s, f) => s + f.added, 0),
    removed: files.reduce((s, f) => s + f.removed, 0),
  };
}
export function cues(file) {
  const found = [];
  const path = file.path.toLowerCase();
  const add = (type, why, line = null) => found.push({ type, why, line });
  if (/(^|\/)(auth|session|permission|access)|token|credential/.test(path))
    add("authority", "path");
  if (/migrat|schema|database|\.sql$/.test(path)) add("data", "path");
  if (
    /(^|\/)(package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|requirements[^/]*|cargo\.lock|gemfile[^/]*)$/.test(
      path,
    )
  )
    add("dependency", "path");
  if (/(^|\/)(\.github|docker|terraform)|deploy|\.ya?ml$/.test(path))
    add("delivery", "path");
  for (const h of file.hunks)
    for (const l of h.lines)
      if (l.kind === "+") {
        if (
          /\b(?:DROP\s+(?:TABLE|DATABASE)|TRUNCATE|DELETE\s+FROM)\b|\brm\s+-[a-z]*r[a-z]*f/.test(
            l.text.toUpperCase(),
          ) ||
          /\brm\s+-[a-z]*r[a-z]*f/.test(l.text)
        )
          add("destructive", "added-line", l.new);
        if (/\b(?:eval|exec|spawn)\s*\(|innerHTML\s*=/.test(l.text))
          add("execution", "added-line", l.new);
        if (/\b(?:TODO|FIXME|HACK)\b/.test(l.text))
          add("unfinished", "added-line", l.new);
      }
  const seen = new Set();
  return found.filter((c) => {
    const k = c.type + ":" + c.line;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
export function reviewChecks(file) {
  const result = ["purpose", "edges", "validation"];
  if (file.binary) result.push("binary");
  for (const cue of cues(file))
    if (
      [
        "authority",
        "data",
        "dependency",
        "delivery",
        "destructive",
        "execution",
        "unfinished",
      ].includes(cue.type) &&
      !result.includes(cue.type)
    )
      result.push(cue.type);
  return result;
}
export function validate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid archive");
  const diff = text(value.diff, MAX_DIFF),
    goal = text(value.goal, 2000),
    parsed = parseDiff(diff);
  const notes = {},
    checks = {};
  for (const [key, target] of [
    ["notes", notes],
    ["checks", checks],
  ]) {
    if (
      !value[key] ||
      typeof value[key] !== "object" ||
      Array.isArray(value[key])
    )
      throw Error("Invalid review records");
    if (Object.keys(value[key]).length > 80)
      throw Error("Too many review records");
    for (const [id, item] of Object.entries(value[key])) {
      const file = parsed.files.find((f) => f.id === id);
      if (!file) throw Error("Review references unknown file");
      if (key === "notes") target[id] = text(item, 4000);
      else {
        if (
          !Array.isArray(item) ||
          item.length > 12 ||
          new Set(item).size !== item.length ||
          item.some((c) => !reviewChecks(file).includes(c))
        )
          throw Error("Unknown or duplicate checklist item");
        target[id] = [...item];
      }
    }
  }
  return { diff, goal, notes, checks };
}
export function report(value) {
  const state = validate(value),
    parsed = parseDiff(state.diff);
  const rows = [
    "# Patch Atlas review record",
    "",
    state.goal,
    "",
    `Files: ${parsed.files.length} · +${parsed.added} / -${parsed.removed}`,
    "",
    "This is a human review record. Cues are textual prompts, not verified defects, a security audit or merge approval.",
    "",
  ];
  for (const f of parsed.files) {
    rows.push(
      "## " + f.path,
      "",
      `+${f.added} / -${f.removed}${f.binary ? " · Binary: inspect externally" : ""}`,
      "",
    );
    for (const item of reviewChecks(f))
      rows.push(
        `- [${state.checks[f.id]?.includes(item) ? "x" : " "}] ${item}`,
      );
    rows.push("", state.notes[f.id] || "No reviewer note.", "");
  }
  return rows.join("\n");
}
