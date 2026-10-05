import * as C from "./core.js";
import * as U from "./ui.js";
const { $, t, esc } = U;
const state = U.store(
  "patch-atlas",
  { diff: "", goal: "", checks: {}, notes: {} },
  C.validate,
);
let selected = "0";
const checkNames = {
  purpose: ["Amaç ve kapsamı anladım", "I understand purpose and scope"],
  edges: ["Kenar durumlarını değerlendirdim", "I considered edge cases"],
  validation: [
    "Çalıştırdığım kontrolleri not ettim",
    "I recorded checks I ran",
  ],
  authority: [
    "Yetki sınırlarını değerlendirdim",
    "I considered authority boundaries",
  ],
  data: [
    "Veri değişimini ve geri dönüşü değerlendirdim",
    "I considered data changes and recovery",
  ],
  dependency: [
    "Bağımlılık değişimini inceledim",
    "I inspected the dependency change",
  ],
  delivery: [
    "Dağıtım değişimini değerlendirdim",
    "I considered delivery changes",
  ],
  destructive: [
    "Silme işlemini ve geri dönüşü doğruladım",
    "I checked deletion and recovery",
  ],
  execution: [
    "Çalıştırılan/işlenen girdileri inceledim",
    "I inspected executed/rendered input",
  ],
  unfinished: [
    "Tamamlanmamış işaretlerini değerlendirdim",
    "I considered unfinished markers",
  ],
  binary: [
    "İkili dosyayı harici araçla inceledim",
    "I inspected the binary with an external tool",
  ],
};
const cueNames = {
  authority: ["Yetki sınırı", "Authority boundary"],
  data: ["Veri yapısı", "Data structure"],
  dependency: ["Bağımlılık", "Dependency"],
  delivery: ["Dağıtım", "Delivery"],
  destructive: ["Silme ifadesi", "Deletion expression"],
  execution: ["Dinamik işlem", "Dynamic execution/rendering"],
  unfinished: ["İşaretli eksik", "Unfinished marker"],
};
function hydrate() {
  $("diff").value = state.get().diff;
  $("goal").value = state.get().goal;
}
function render() {
  $("lead").textContent = t(
    "AI’nin veya bir geliştiricinin ürettiği diff’i getir. Dosyaları, tam satır konumlarını ve kendi kontrol notlarını tek bir inceleme masasında gör.",
    "Bring a diff written by AI or a developer. See files, exact line coordinates and your own check notes on one review desk.",
  );
  const data = state.get(),
    parsed = C.parseDiff(data.diff);
  state.warn();
  const completed = parsed.files.filter((f) =>
    C.reviewChecks(f).every((c) => data.checks[f.id]?.includes(c)),
  ).length;
  $("review-count").textContent =
    completed +
    " / " +
    parsed.files.length +
    " " +
    t("kontrol listesi", "checklists");
  $("metrics").innerHTML = [
    [parsed.files.length, t("DOSYA", "FILES")],
    ["+" + parsed.added, t("EKLENEN SATIR", "ADDED LINES")],
    ["−" + parsed.removed, t("SİLİNEN SATIR", "REMOVED LINES")],
  ]
    .map(
      ([n, s]) =>
        `<div class="metric"><strong>${n}</strong><small>${s}</small></div>`,
    )
    .join("");
  $("file-nav").innerHTML = parsed.files
    .map(
      (f) =>
        `<button type="button" data-file="${f.id}" aria-pressed="${f.id === selected}">${esc(f.path)}</button>`,
    )
    .join("");
  const file = parsed.files.find((f) => f.id === selected) || parsed.files[0];
  if (!file) {
    $("review").innerHTML =
      '<div class="empty">' +
      t(
        "Örneği aç veya bir unified diff yapıştır.",
        "Open the sample or paste a unified diff.",
      ) +
      "</div>";
    return;
  }
  selected = file.id;
  const cues = C.cues(file),
    checks = C.reviewChecks(file);
  $("review").innerHTML =
    `<article class="record"><div class="section-head"><h3 class="path">${esc(file.path)}</h3><span class="tag">+${file.added} / −${file.removed}</span></div>${file.rename ? `<p class="hint">${esc(file.oldPath)} → ${esc(file.path)}</p>` : ""}<div class="meta">${cues.map((c) => `<span class="tag">${esc(t(...cueNames[c.type]))}${c.line === null ? " · " + t("dosya adı", "file name") : " · L" + c.line}</span>`).join("") || t("Belirli metin işareti yok. Normal inceleme yine gerekli.", "No specific text cue. Normal review is still needed.")}</div>${file.added + file.removed > 200 ? '<p class="note">' + t("Büyük değişiklik: incelemeyi küçük bölümlere ayırmayı düşün.", "Large change: consider dividing the review into smaller sections.") + "</p>" : ""}${file.binary ? '<p class="note">' + t("İkili içeriğin satırları bu diff içinde görünmüyor. Harici araçla incele.", "Binary content lines are not visible in this diff. Inspect with an external tool.") + "</p>" : ""}<div class="diff" tabindex="0" aria-label="${t("Satır konumlarıyla değişiklik", "Change with line coordinates")}">${file.hunks.map((h) => `<span class="diff-line changed">${esc(h.header)}</span>` + h.lines.map((l) => `<span class="diff-line ${l.kind === "+" ? "add" : l.kind === "-" ? "del" : ""}"><span class="line-no">${l.old ?? "·"} / ${l.new ?? "·"}</span>${esc(l.kind + l.text)}</span>`).join("")).join("") || '<span class="diff-line">' + t("Metin hunki yok: isim, mod veya ikili değişimi.", "No text hunk: name, mode or binary change.") + "</span>"}</div><h3 class="spaced">${t("Senin inceleme kaydın", "Your review record")}</h3>${checks.map((c) => `<div class="review-row"><input type="checkbox" id="check-${c}" data-check="${c}" ${data.checks[file.id]?.includes(c) ? "checked" : ""}><label for="check-${c}">${esc(t(...checkNames[c]))}</label></div>`).join("")}<div class="field spaced"><label for="review-note">${t("Ne doğruladın? Ne açık kaldı?", "What did you verify? What remains open?")}</label><textarea id="review-note" maxlength="4000" rows="3">${esc(data.notes[file.id] || "")}</textarea><p class="hint">${t("İşaretler kişisel kaydındır; uygulama testlerin çalıştırıldığını doğrulayamaz.", "Ticks are your personal record; the app cannot verify that tests ran.")}</p></div></article>`;
  $("review-note").onchange = () => {
    const next = structuredClone(state.get());
    next.notes[file.id] = $("review-note").value;
    try {
      state.set(next);
    } catch (e) {
      U.notify(e.message);
    }
  };
  document.querySelectorAll("[data-check]").forEach(
    (box) =>
      (box.onchange = () => {
        const next = structuredClone(state.get());
        const set = new Set(next.checks[file.id] || []);
        box.checked
          ? set.add(box.dataset.check)
          : set.delete(box.dataset.check);
        next.checks[file.id] = [...set];
        state.set(next);
        render();
      }),
  );
  document.querySelectorAll("[data-file]").forEach(
    (button) =>
      (button.onclick = () => {
        selected = button.dataset.file;
        render();
      }),
  );
}
$("diff-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    const diff = $("diff").value;
    C.parseDiff(diff);
    if (
      diff !== state.get().diff &&
      state.get().diff &&
      !confirm(
        t(
          "Diff değişti; önceki dosya incelemeleri sıfırlanacak. Devam?",
          "The diff changed; previous file reviews will reset. Continue?",
        ),
      )
    )
      return;
    const next =
      diff === state.get().diff
        ? { ...state.get(), goal: $("goal").value }
        : { diff, goal: $("goal").value, checks: {}, notes: {} };
    if (state.set(next)) {
      selected = "0";
      render();
    }
  } catch (error) {
    U.notify(error.message);
  }
};
$("report").onclick = () =>
  U.download("patch-atlas-review.md", C.report(state.get()), "text/markdown");
$("demo").onclick = () => {
  if (
    state.get().diff &&
    !confirm(
      t(
        "Kurgusal örnek mevcut incelemenin yerini alacak. Devam?",
        "The fictional sample will replace this review. Continue?",
      ),
    )
  )
    return;
  state.set({
    goal: t(
      "Oturum doğrulama ve eski kayıt temizliği değişikliklerini gözden geçir.",
      "Review changes to session validation and old-record cleanup.",
    ),
    diff: SAMPLE,
    notes: {},
    checks: {},
  });
  selected = "0";
  hydrate();
  render();
};
U.bindData("patch-atlas", state, C.validate, () => {
  selected = "0";
  hydrate();
  render();
});
hydrate();
U.init(render);
const SAMPLE = `diff --git a/src/auth/session.js b/src/auth/session.js
index 1111111..2222222 100644
--- a/src/auth/session.js
+++ b/src/auth/session.js
@@ -1,3 +1,5 @@
 export function session(user) {
-  return user.id;
+  if (!user) throw new Error("missing user");
+  // TODO: verify permission before returning the session
+  return user.id;
 }
diff --git a/migrations/cleanup.sql b/migrations/cleanup.sql
index 1111111..2222222 100644
--- a/migrations/cleanup.sql
+++ b/migrations/cleanup.sql
@@ -1 +1 @@
-DELETE FROM sessions WHERE expired = true;
+DELETE FROM sessions;
diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -1 +1 @@
-{ "version": "1.0.0" }
+{ "version": "1.1.0" }
`;
