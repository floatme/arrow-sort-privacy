/* Dekel excel export — classic script */
(function (global) {
"use strict";
var chapterOf = global.DekelParser.chapterOf;
var formatMoney = global.DekelParser.formatMoney;
var lineTotal = global.DekelParser.lineTotal;
var normalizeCode = global.DekelParser.normalizeCode;
/**
 * Export selected BOQ rows to an Excel workbook (SheetJS).
 * @param {object} opts
 *  * @param {object} opts.meta
 */
function exportBoqExcel({ items, meta }) {
  if (typeof XLSX === "undefined") {
    throw new Error("ספריית Excel לא נטענה");
  }

  const indexFactor = Number(meta.indexFactor) || 1;
  const globalDiscount = Number(meta.globalDiscount) || 0;
  const vatRate = Number(meta.vatRate) || 0;

  const selected = items.filter((i) => i.selected && (Number(i.qty) || 0) > 0);
  const rows = selected.map((item, idx) => {
    const unitPriceAdj = (Number(item.unitPrice) || 0) * indexFactor;
    const total = lineTotal(item, indexFactor, globalDiscount);
    return {
      מס: idx + 1,
      פרק: item.chapter || chapterOf(item.code),
      "קוד סעיף": normalizeCode(item.code),
      תיאור: item.description,
      יחידה: item.unit,
      כמות: Number(item.qty) || 0,
      "מחיר יחידה (מחירון)": Number(item.unitPrice) || 0,
      "מקדם תייקור": indexFactor,
      "מחיר יחידה מתואם": round2(unitPriceAdj),
      "הנחת סעיף %": Number(item.discount) || 0,
      "הנחה כללית %": globalDiscount,
      "סה״כ לפני מע״מ": round2(total),
      הערות: item.notes || "",
      מקור: item.source || "",
    };
  });

  const beforeVat = rows.reduce((s, r) => s + r["סה״כ לפני מע״מ"], 0);
  const vat = beforeVat * (vatRate / 100);
  const grand = beforeVat + vat;

  const summary = [
    ["דוח כמויות — מחירון דקל"],
    ["שם פרויקט", meta.projectName || ""],
    ["לקוח / מזמין", meta.clientName || ""],
    ["תאריך", meta.date || ""],
    ["מקדם תייקור", indexFactor],
    ["הנחה כללית %", globalDiscount],
    ["מע״מ %", vatRate],
    [],
    ["סיכום"],
    ["לפני מע״מ", round2(beforeVat), formatMoney(beforeVat)],
    ["מע״מ", round2(vat), formatMoney(vat)],
    ["סה״כ כולל מע״מ", round2(grand), formatMoney(grand)],
    ["מספר סעיפים", selected.length],
  ];

  // Chapter breakdown
  /** @type {Map<string, number>} */
  const byChapter = new Map();
  for (const item of selected) {
    const ch = item.chapter || chapterOf(item.code) || "אחר";
    byChapter.set(ch, (byChapter.get(ch) || 0) + lineTotal(item, indexFactor, globalDiscount));
  }
  summary.push([]);
  summary.push(["פירוט לפי פרק"]);
  summary.push(["פרק", "סה״כ לפני מע״מ"]);
  for (const [ch, sum] of [...byChapter.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    summary.push([ch, round2(sum)]);
  }

  const wb = XLSX.utils.book_new();
  const wsItems = XLSX.utils.json_to_sheet(rows.length ? rows : [{ הערה: "לא נבחרו סעיפים עם כמות" }]);
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);

  // Column widths
  wsItems["!cols"] = [
    { wch: 5 },
    { wch: 6 },
    { wch: 12 },
    { wch: 42 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
  ];
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, wsItems, "כמויות");
  XLSX.utils.book_append_sheet(wb, wsSummary, "סיכום");

  const safeName = (meta.projectName || "dekel-boq")
    .replace(/[^\w\u0590-\u05FF\-]+/g, "_")
    .slice(0, 40);
  const filename = `${safeName || "dekel-boq"}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, count: selected.length, beforeVat, vat, grand };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

global.DekelExcel = { exportBoqExcel: exportBoqExcel };
})(typeof window !== "undefined" ? window : globalThis);
