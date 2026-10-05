export const $ = (id) => document.getElementById(id);
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let language = "tr";
try {
  language = localStorage.getItem("community:language") === "en" ? "en" : "tr";
} catch {}
export const t = (tr, en) => (language === "tr" ? tr : en);
export const lang = () => language;
export const uid = () => crypto.randomUUID();
export function notify(message) {
  $("toast").textContent = message;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("toast").textContent = ""), 7500);
}
export function init(render) {
  const translate = () => {
    document.documentElement.lang = language;
    document
      .querySelectorAll("[data-tr]")
      .forEach((el) => (el.textContent = el.dataset[language]));
    $("language").textContent = language === "tr" ? "EN" : "TR";
    $("language").setAttribute(
      "aria-label",
      t("Switch to English", "Türkçeye geç"),
    );
    render();
  };
  $("language").onclick = () => {
    language = language === "tr" ? "en" : "tr";
    try {
      localStorage.setItem("community:language", language);
    } catch {}
    translate();
  };
  translate();
  if ("serviceWorker" in navigator && location.protocol !== "file:")
    navigator.serviceWorker.register("./sw.js").catch(() => {});
}
export function download(name, value, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    notify(t("Panoya kopyalandı.", "Copied to clipboard."));
  } catch {
    download("draft.txt", value);
    notify(
      t(
        "Pano kullanılamadı; metin dosyası indirildi.",
        "Clipboard unavailable; a text file was downloaded.",
      ),
    );
  }
}
export function store(kind, empty, validate) {
  const key = "community:" + kind;
  let current = structuredClone(empty),
    broken = null,
    unsaved = false;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        current = validate(JSON.parse(raw));
      } catch {
        broken = raw;
      }
    }
  } catch {
    unsaved = true;
  }
  const warn = () => {
    const box = $("storage-warning");
    box.hidden = !broken && !unsaved;
    if (broken) {
      box.innerHTML =
        "<p>" +
        t(
          "Yerel kayıt okunamadı. Üzerine yazma engellendi. Önce bozuk kaydı kurtarabilir veya kayıtları sıfırlayabilirsin.",
          "Saved data could not be read. Writes are blocked. Recover the original or clear records first.",
        ) +
        '</p><button id="recover-raw">' +
        t("Orijinal kaydı indir", "Download original record") +
        "</button>";
      $("recover-raw").onclick = () => download(kind + "-recovery.txt", broken);
    } else if (unsaved)
      box.textContent = t(
        "Yerel kayıt kullanılamıyor. Değişikliklerin bu oturumda duruyor; kapanmadan JSON yedeğini indir.",
        "Local saving is unavailable. Changes remain in this session; download a JSON backup before closing.",
      );
  };
  return {
    get: () => current,
    blocked: () => broken !== null,
    warn,
    set(next) {
      if (broken) {
        warn();
        notify(
          t(
            "Bozuk kaydı önce indir veya sıfırla.",
            "Recover or clear the damaged record first.",
          ),
        );
        return false;
      }
      current = validate(next);
      try {
        localStorage.setItem(key, JSON.stringify(current));
        unsaved = false;
      } catch {
        unsaved = true;
      }
      warn();
      return true;
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        notify(
          t(
            "Tarayıcı kaydı silinemedi.",
            "Browser record could not be removed.",
          ),
        );
        return false;
      }
      broken = null;
      unsaved = false;
      current = structuredClone(empty);
      warn();
      return true;
    },
    restore(next) {
      if (broken) {
        warn();
        return false;
      }
      return this.set(next);
    },
  };
}
export function bindData(kind, state, validate, render, limit = 3000000) {
  $("backup").onclick = () =>
    download(
      kind + "-backup.json",
      JSON.stringify({ kind, version: 1, data: state.get() }, null, 2),
      "application/json",
    );
  $("reset").onclick = () => {
    if (
      confirm(
        t(
          "Tüm kayıtlar silinecek. Önce yedek indirebilirsin. Devam?",
          "All records will be cleared. You can back up first. Continue?",
        ),
      ) &&
      state.clear()
    )
      render();
  };
  $("import").onchange = async () => {
    try {
      const file = $("import").files[0];
      if (!file || file.size > limit)
        throw Error(
          t("Dosya boyutu sınırı aşıldı.", "File size limit exceeded."),
        );
      const parsed = JSON.parse(await file.text());
      if (parsed.kind !== kind || parsed.version !== 1)
        throw Error(
          t(
            "Bu uygulamaya ait sürüm 1 yedeği gerekli.",
            "A version 1 backup for this app is required.",
          ),
        );
      const next = validate(parsed.data);
      if (state.blocked())
        throw Error(
          t(
            "Önce bozuk kaydı kurtar veya sil.",
            "Recover or clear the damaged record first.",
          ),
        );
      if (
        confirm(
          t(
            "Mevcut kayıtlar değişecek. Devam etmeden önce kurtarma yedeğin indirilecek. Devam?",
            "Current records will be replaced. A recovery backup will download first. Continue?",
          ),
        )
      ) {
        download(
          kind + "-before-import.json",
          JSON.stringify({ kind, version: 1, data: state.get() }, null, 2),
          "application/json",
        );
        state.restore(next);
        render();
        notify(t("Yedek yüklendi.", "Backup restored."));
      }
    } catch (e) {
      notify(e.message);
    } finally {
      $("import").value = "";
    }
  };
}
export function dateLabel(value) {
  if (!value) return t("Tarih yok", "No date");
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    language === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "short", year: "numeric" },
  );
}
export function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function afterDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
