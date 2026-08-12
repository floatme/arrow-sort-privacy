import {
  applyQuantities,
  createItem,
  extractPdfText,
  formatMoney,
  lineTotal,
  parseDxfText,
  parseExcelBuffer,
  parseTextCatalog,
  sampleCatalog,
  scrapeDwgStrings,
} from "./parser.js";
import { exportBoqExcel } from "./excel.js";

/** @type {import('./parser.js').DekelItem[]} */
let items = [];
let filterQuery = "";
let filterChapter = "";

const els = {
  catalogInput: document.getElementById("catalog-input"),
  drawingInput: document.getElementById("drawing-input"),
  projectPanel: document.getElementById("project-panel"),
  statusPanel: document.getElementById("status-panel"),
  tablePanel: document.getElementById("table-panel"),
  statusText: document.getElementById("status-text"),
  statusStats: document.getElementById("status-stats"),
  itemsBody: document.getElementById("items-body"),
  search: document.getElementById("search-items"),
  filterChapter: document.getElementById("filter-chapter"),
  btnExport: document.getElementById("btn-export"),
  btnSample: document.getElementById("btn-sample"),
  btnAdd: document.getElementById("btn-add-row"),
  btnClearQty: document.getElementById("btn-clear-qty"),
  projectName: document.getElementById("project-name"),
  clientName: document.getElementById("client-name"),
  projectDate: document.getElementById("project-date"),
  globalDiscount: document.getElementById("global-discount"),
  vatRate: document.getElementById("vat-rate"),
  indexFactor: document.getElementById("index-factor"),
  totalBefore: document.getElementById("total-before"),
  totalVat: document.getElementById("total-vat"),
  totalGrand: document.getElementById("total-grand"),
  addDialog: document.getElementById("add-dialog"),
  addForm: document.getElementById("add-form"),
};

els.projectDate.valueAsDate = new Date();

function showWorkspace() {
  els.projectPanel.hidden = false;
  els.statusPanel.hidden = false;
  els.tablePanel.hidden = false;
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function meta() {
  return {
    projectName: els.projectName.value.trim(),
    clientName: els.clientName.value.trim(),
    date: els.projectDate.value,
    globalDiscount: Number(els.globalDiscount.value) || 0,
    vatRate: Number(els.vatRate.value) || 0,
    indexFactor: Number(els.indexFactor.value) || 1,
  };
}

function visibleItems() {
  const q = filterQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (filterChapter && item.chapter !== filterChapter) return false;
    if (!q) return true;
    return (
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q)
    );
  });
}

function refreshChapterFilter() {
  const chapters = [...new Set(items.map((i) => i.chapter).filter(Boolean))].sort();
  const current = els.filterChapter.value;
  els.filterChapter.innerHTML = `<option value="">כל הפרקים</option>${chapters
    .map((c) => `<option value="${c}">פרק ${c}</option>`)
    .join("")}`;
  if (chapters.includes(current)) els.filterChapter.value = current;
}

function render() {
  const m = meta();
  const list = visibleItems();
  els.itemsBody.innerHTML = "";

  for (const item of list) {
    const tr = document.createElement("tr");
    if (item.selected) tr.classList.add("selected");
    const total = lineTotal(item, m.indexFactor, m.globalDiscount);

    tr.innerHTML = `
      <td><input type="checkbox" data-id="${item.id}" data-field="selected" ${item.selected ? "checked" : ""} /></td>
      <td><input class="code" type="text" data-id="${item.id}" data-field="code" value="${escapeAttr(item.code)}" /></td>
      <td><input type="text" data-id="${item.id}" data-field="description" value="${escapeAttr(item.description)}" /></td>
      <td><input type="text" data-id="${item.id}" data-field="unit" value="${escapeAttr(item.unit)}" /></td>
      <td><input type="number" min="0" step="0.01" data-id="${item.id}" data-field="qty" value="${item.qty}" /></td>
      <td><input type="number" min="0" step="0.01" data-id="${item.id}" data-field="unitPrice" value="${item.unitPrice}" /></td>
      <td><input type="number" min="0" max="100" step="0.1" data-id="${item.id}" data-field="discount" value="${item.discount}" /></td>
      <td><span class="line-total">${formatMoney(total)}</span></td>
      <td><input type="text" data-id="${item.id}" data-field="notes" value="${escapeAttr(item.notes)}" /></td>
      <td><button type="button" class="row-del" data-del="${item.id}" title="מחק">×</button></td>
    `;
    els.itemsBody.appendChild(tr);
  }

  const selected = items.filter((i) => i.selected && i.qty > 0);
  const before = selected.reduce((s, i) => s + lineTotal(i, m.indexFactor, m.globalDiscount), 0);
  const vat = before * (m.vatRate / 100);
  els.totalBefore.textContent = formatMoney(before);
  els.totalVat.textContent = formatMoney(vat);
  els.totalGrand.textContent = formatMoney(before + vat);

  els.statusStats.innerHTML = `
    <span class="chip">${items.length} סעיפים</span>
    <span class="chip">${selected.length} נבחרו</span>
    <span class="chip">${formatMoney(before + vat)} כולל מע״מ</span>
  `;

  els.btnExport.disabled = selected.length === 0;
  refreshChapterFilter();
}

function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function findItem(id) {
  return items.find((i) => i.id === id);
}

els.itemsBody.addEventListener("input", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  const id = t.dataset.id;
  const field = t.dataset.field;
  if (!id || !field) return;
  const item = findItem(id);
  if (!item) return;

  if (field === "selected") {
    item.selected = t.checked;
  } else if (field === "qty" || field === "unitPrice" || field === "discount") {
    item[field] = Number(t.value) || 0;
    if (field === "qty" && item.qty > 0) item.selected = true;
  } else {
    item[field] = t.value;
    if (field === "code") {
      item.chapter = item.code.split(/[.\-/]/)[0]?.padStart(2, "0") || "";
    }
  }
  render();
});

els.itemsBody.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const id = t.dataset.del;
  if (!id) return;
  items = items.filter((i) => i.id !== id);
  render();
});

els.search.addEventListener("input", () => {
  filterQuery = els.search.value;
  render();
});

els.filterChapter.addEventListener("change", () => {
  filterChapter = els.filterChapter.value;
  render();
});

for (const el of [els.globalDiscount, els.vatRate, els.indexFactor]) {
  el.addEventListener("input", () => render());
}

els.btnClearQty.addEventListener("click", () => {
  for (const item of items) {
    item.qty = 0;
    item.selected = false;
  }
  render();
});

els.btnAdd.addEventListener("click", () => {
  els.addForm.reset();
  els.addDialog.showModal();
});

els.addForm.addEventListener("close", () => {
  if (els.addDialog.returnValue !== "ok") return;
  const fd = new FormData(els.addForm);
  items.unshift(
    createItem({
      code: String(fd.get("code") || ""),
      description: String(fd.get("desc") || ""),
      unit: String(fd.get("unit") || 'יח\''),
      unitPrice: Number(fd.get("price")) || 0,
      qty: Number(fd.get("qty")) || 0,
      selected: true,
      source: "manual",
    })
  );
  showWorkspace();
  setStatus("נוסף סעיף ידני");
  render();
});

els.btnSample.addEventListener("click", () => {
  items = sampleCatalog();
  showWorkspace();
  setStatus("נטענה דוגמת מחירון דקל (10 סעיפים)");
  render();
});

els.btnExport.addEventListener("click", () => {
  try {
    const result = exportBoqExcel({ items, meta: meta() });
    setStatus(`יוצא ${result.filename} — ${result.count} סעיפים`);
  } catch (err) {
    console.error(err);
    setStatus(`שגיאת ייצוא: ${err.message || err}`);
  }
});

/**
 * @param {File} file
 * @param {"catalog"|"drawing"} role
 */
async function handleFile(file, role) {
  showWorkspace();
  setStatus(`קורא ${file.name}…`);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const buffer = await file.arrayBuffer();

  try {
    let parsed = [];

    if (ext === "pdf") {
      const text = await extractPdfText(buffer);
      parsed = parseTextCatalog(text, `pdf:${file.name}`);
    } else if (ext === "xlsx" || ext === "xls") {
      parsed = parseExcelBuffer(buffer, `excel:${file.name}`);
    } else if (ext === "csv" || ext === "txt") {
      const text = new TextDecoder("utf-8").decode(buffer);
      parsed = parseTextCatalog(text, `${ext}:${file.name}`);
    } else if (ext === "dxf") {
      const text = new TextDecoder("utf-8").decode(buffer);
      const extracted = parseDxfText(text);
      parsed = parseTextCatalog(extracted || text, `dxf:${file.name}`);
    } else if (ext === "dwg") {
      const scraped = scrapeDwgStrings(buffer);
      parsed = parseTextCatalog(scraped, `dwg:${file.name}`);
      if (!parsed.length) {
        setStatus(
          "DWG: לא נמצאו קודי סעיפים. המירו את השרטוט ל-PDF או DXF וטענו שוב."
        );
        return;
      }
      setStatus(
        `DWG: חולצו ${parsed.length} סעיפים באופן חלקי — מומלץ PDF/DXF לדיוק גבוה יותר.`
      );
    } else {
      setStatus(`סוג קובץ לא נתמך: .${ext}`);
      return;
    }

    if (!parsed.length) {
      setStatus(`לא זוהו סעיפי דקל ב־${file.name}. בדקו שהקובץ מכיל קודי סעיפים כמו 01.02.003.`);
      return;
    }

    if (role === "catalog") {
      // Keep quantities if reloading catalog over existing qty file
      if (items.length && items.some((i) => i.qty > 0)) {
        items = applyQuantities(parsed, items);
      } else {
        items = parsed;
      }
      setStatus(`מחירון נטען: ${file.name} — ${items.length} סעיפים`);
    } else {
      // drawing / quantities: merge onto catalog or become base
      if (!items.length) {
        items = parsed.map((p) => ({ ...p, selected: p.qty > 0 || p.selected }));
        setStatus(`נטען קובץ כמויות/שרטוט: ${file.name} — ${items.length} סעיפים`);
      } else {
        items = applyQuantities(items, parsed);
        // Also add unknown codes from drawing
        const have = new Set(items.map((i) => i.code));
        for (const p of parsed) {
          if (!have.has(p.code)) items.push({ ...p, selected: p.qty > 0 });
        }
        const withQty = items.filter((i) => i.qty > 0).length;
        setStatus(`כמויות עודכנו מ־${file.name} — ${withQty} סעיפים עם כמות`);
      }
    }

    render();
  } catch (err) {
    console.error(err);
    setStatus(`שגיאה בקריאת הקובץ: ${err.message || err}`);
  }
}

els.catalogInput.addEventListener("change", () => {
  const file = els.catalogInput.files?.[0];
  if (file) handleFile(file, "catalog");
  els.catalogInput.value = "";
});

els.drawingInput.addEventListener("change", () => {
  const file = els.drawingInput.files?.[0];
  if (file) handleFile(file, "drawing");
  els.drawingInput.value = "";
});

// Drag & drop on hero
const hero = document.getElementById("hero");
for (const evt of ["dragenter", "dragover"]) {
  hero.addEventListener(evt, (e) => {
    e.preventDefault();
    hero.classList.add("dragover");
  });
}
for (const evt of ["dragleave", "drop"]) {
  hero.addEventListener(evt, (e) => {
    e.preventDefault();
    hero.classList.remove("dragover");
  });
}
hero.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file, "catalog");
});
