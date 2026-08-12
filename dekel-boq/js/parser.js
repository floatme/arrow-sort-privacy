/**
 * Parsers for Dekel price-list / BOQ content from text, PDF, Excel, DXF.
 */

/** Typical Dekel item code: 01.12.003 or 1.2.3 or 06-01-010 */
export const CODE_RE = /\b(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\b/g;

/** Units as whole tokens — avoid matching "טון" inside "בטון". */
const UNIT_TOKEN_RE =
  /(^|[\s,;|/])(יח['׳"]?|יח׳|מ["״"]ר|מ["״"]ק|מ['׳"](?!\S)|ק["״"]ג|טון|קומפ['׳"]?|ליטר|שעה|יום|חודש|unit|m2|m3|m²|m³|kg|ton)(?=$|[\s,;|/])/i;

/** Full numbers only (no partial thousands split on 1450 → 145, 0). */
const NUM_RE = /\d+(?:[.,]\d+)?/g;

/**
 * @typedef {Object} DekelItem
 * @property {string} id
 * @property {string} code
 * @property {string} description
 * @property {string} unit
 * @property {number} qty
 * @property {number} unitPrice
 * @property {number} discount
 * @property {string} notes
 * @property {boolean} selected
 * @property {string} chapter
 * @property {string} source
 */

export function normalizeCode(code) {
  return String(code || "")
    .trim()
    .replace(/-/g, ".")
    .replace(/\s+/g, "");
}

export function chapterOf(code) {
  const n = normalizeCode(code);
  const m = n.match(/^(\d{1,2})/);
  return m ? m[1].padStart(2, "0") : "";
}

export function makeId() {
  return `i_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/**
 * @param {Partial<DekelItem>} partial
 * @returns {DekelItem}
 */
export function createItem(partial = {}) {
  const code = normalizeCode(partial.code || "");
  return {
    id: partial.id || makeId(),
    code,
    description: (partial.description || "").trim(),
    unit: (partial.unit || "").trim() || 'יח\'',
    qty: Number(partial.qty) || 0,
    unitPrice: Number(partial.unitPrice) || 0,
    discount: Number(partial.discount) || 0,
    notes: partial.notes || "",
    selected: partial.selected ?? Number(partial.qty) > 0,
    chapter: partial.chapter || chapterOf(code),
    source: partial.source || "manual",
  };
}

function parseNumber(raw) {
  if (raw == null || raw === "") return 0;
  const s = String(raw).trim().replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function extractUnit(text) {
  const s = String(text);
  // Prefer unit nearest the trailing numbers (typical Dekel row layout)
  const all = [...s.matchAll(new RegExp(UNIT_TOKEN_RE.source, "gi"))];
  if (!all.length) return "";
  const last = all[all.length - 1];
  return last[2].replace(/["״]/g, '"');
}

function stripUnit(text) {
  return String(text)
    .replace(new RegExp(UNIT_TOKEN_RE.source, "gi"), "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTrailingQtyPrice(text) {
  const nums = [...String(text).matchAll(NUM_RE)].map((m) => m[0]);
  if (nums.length >= 2) {
    return {
      qty: parseNumber(nums[nums.length - 2]),
      unitPrice: parseNumber(nums[nums.length - 1]),
      nums,
    };
  }
  if (nums.length === 1) {
    return { qty: 0, unitPrice: parseNumber(nums[0]), nums };
  }
  return { qty: 0, unitPrice: 0, nums: [] };
}

/**
 * Parse free text lines looking for Dekel-like rows.
 * @param {string} text
 * @param {string} source
 * @returns {DekelItem[]}
 */
export function parseTextCatalog(text, source = "text") {
  const lines = String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  /** @type {Map<string, DekelItem>} */
  const map = new Map();
  let pending = null;

  for (const line of lines) {
    CODE_RE.lastIndex = 0;
    const codes = [...line.matchAll(CODE_RE)];
    if (!codes.length) {
      if (pending && line.length > 2 && !/^\d+([.,]\d+)?$/.test(line)) {
        pending.description = `${pending.description} ${line}`.trim();
      }
      continue;
    }

    for (const match of codes) {
      const code = normalizeCode(match[1]);
      const after = line.slice(match.index + match[0].length).trim();
      const unit = extractUnit(after) || extractUnit(line);
      const { qty, unitPrice, nums } = extractTrailingQtyPrice(after);

      let description = stripUnit(after)
        .replace(/₪|ש["״]ח|NIS/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Remove trailing qty/price tokens from description (last 1–2 numbers)
      if (nums.length) {
        const drop = nums.length >= 2 ? 2 : 1;
        for (let d = 0; d < drop; d++) {
          description = description
            .replace(new RegExp(`(?:^|\\s)${nums[nums.length - 1 - d].replace(".", "\\.")}\\s*$`), "")
            .trim();
        }
      }

      // Also strip isolated dimension leftovers like "B-" when numbers were removed poorly — keep raw words
      if (!description) description = `סעיף ${code}`;

      const item = createItem({
        code,
        description,
        unit: unit || 'יח\'',
        qty,
        unitPrice,
        selected: qty > 0,
        source,
      });

      const existing = map.get(code);
      if (existing) {
        if (!existing.unitPrice && item.unitPrice) existing.unitPrice = item.unitPrice;
        if (!existing.qty && item.qty) {
          existing.qty = item.qty;
          existing.selected = true;
        }
        if (item.description.length > existing.description.length) {
          existing.description = item.description;
        }
        if (!existing.unit && item.unit) existing.unit = item.unit;
      } else {
        map.set(code, item);
      }
      pending = map.get(code);
    }
  }

  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}

/**
 * Heuristic column mapping for Excel sheets.
 * @param {string[]} headers
 */
function mapColumns(headers) {
  const h = headers.map((x) => String(x || "").toLowerCase().trim());
  const find = (...keys) => h.findIndex((cell) => keys.some((k) => cell.includes(k)));

  return {
    code: find("קוד", "סעיף", "code", "מספר סעיף", "מק\"ט", "מקט"),
    desc: find("תיאור", "תאור", "desc", "description", "שם"),
    unit: find("יחידה", "יח", "unit"),
    qty: find("כמות", "qty", "quantity", "כ.מ"),
    price: find("מחיר", "price", "תעריף", "מחיר יחידה", "מחיר יח"),
    discount: find("הנחה", "discount"),
    notes: find("הערה", "הערות", "note", "remark"),
  };
}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} source
 * @returns {DekelItem[]}
 */
export function parseExcelBuffer(buffer, source = "excel") {
  if (typeof XLSX === "undefined") {
    throw new Error("ספריית Excel לא נטענה");
  }
  const wb = XLSX.read(buffer, { type: "array" });
  /** @type {DekelItem[]} */
  const items = [];
  /** @type {Map<string, DekelItem>} */
  const map = new Map();

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rows.length) continue;

    // Find header row within first 15 rows
    let headerIdx = 0;
    let cols = null;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const mapped = mapColumns(rows[i].map(String));
      if (mapped.code >= 0 && mapped.desc >= 0) {
        headerIdx = i;
        cols = mapped;
        break;
      }
    }

    if (cols) {
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        const codeRaw = String(row[cols.code] ?? "").trim();
        CODE_RE.lastIndex = 0;
        const codeMatch = codeRaw.match(CODE_RE) || String(row.join(" ")).match(CODE_RE);
        if (!codeMatch) continue;
        const code = normalizeCode(codeMatch[0]);
        const item = createItem({
          code,
          description: String(row[cols.desc] ?? "").trim() || `סעיף ${code}`,
          unit: cols.unit >= 0 ? String(row[cols.unit] ?? "").trim() : 'יח\'',
          qty: cols.qty >= 0 ? parseNumber(row[cols.qty]) : 0,
          unitPrice: cols.price >= 0 ? parseNumber(row[cols.price]) : 0,
          discount: cols.discount >= 0 ? parseNumber(row[cols.discount]) : 0,
          notes: cols.notes >= 0 ? String(row[cols.notes] ?? "") : "",
          selected: cols.qty >= 0 ? parseNumber(row[cols.qty]) > 0 : false,
          source: `${source}:${name}`,
        });
        map.set(code, item);
      }
    } else {
      // Fallback: treat sheet as text blob
      const text = rows.map((r) => r.join("\t")).join("\n");
      for (const item of parseTextCatalog(text, `${source}:${name}`)) {
        map.set(item.code, item);
      }
    }
  }

  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}

/**
 * Extract TEXT entities from DXF.
 * @param {string} dxf
 */
export function parseDxfText(dxf) {
  const lines = String(dxf).replace(/\r/g, "").split("\n");
  const texts = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const code = lines[i].trim();
    const val = lines[i + 1];
    // group 0 TEXT/MTEXT, then later group 1 = text value
    if (code === "0" && /^(TEXT|MTEXT)$/i.test(val.trim())) {
      for (let j = i + 2; j < Math.min(i + 80, lines.length - 1); j++) {
        if (lines[j].trim() === "1") {
          texts.push(lines[j + 1].trim());
          break;
        }
      }
    }
  }
  return texts.join("\n");
}

/**
 * Best-effort string scrape from DWG binary (often weak).
 * @param {ArrayBuffer} buffer
 */
export function scrapeDwgStrings(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  let cur = [];
  const push = () => {
    if (cur.length >= 4) {
      const s = String.fromCharCode(...cur);
      if (/[\u0590-\u05FF0-9.]/.test(s) || CODE_RE.test(s)) chunks.push(s);
    }
    cur = [];
    CODE_RE.lastIndex = 0;
  };
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 9) cur.push(b);
    else push();
  }
  push();
  return chunks.join("\n");
}

/**
 * Read PDF text via pdf.js
 * @param {ArrayBuffer} buffer
 */
export async function extractPdfText(buffer) {
  const pdfjs = await import(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
  );
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const parts = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    parts.push(line);
  }
  return parts.join("\n");
}

/**
 * Merge catalog items with quantity hints from another parse.
 * @param {DekelItem[]} catalog
 * @param {DekelItem[]} quantities
 */
export function applyQuantities(catalog, quantities) {
  const qmap = new Map(quantities.map((q) => [normalizeCode(q.code), q]));
  return catalog.map((item) => {
    const q = qmap.get(item.code);
    if (!q) return { ...item };
    return {
      ...item,
      qty: q.qty || item.qty,
      selected: (q.qty || item.qty) > 0 || item.selected,
      notes: item.notes || q.notes || "",
      unit: item.unit || q.unit,
      unitPrice: item.unitPrice || q.unitPrice,
    };
  });
}

/**
 * Sample Dekel-like catalog for demo.
 * @returns {DekelItem[]}
 */
export function sampleCatalog() {
  const rows = [
    ["01.01.001", "חפירה בקרקע רגילה עד עומק 1.5 מ'", 'מ"ק', 185, 42],
    ["01.01.015", "מילוי מהודק בחול מדברי", 'מ"ק', 320, 95],
    ["02.02.010", "יציקת בטון B-30 ליסודות", 'מ"ק', 28.5, 620],
    ["02.03.005", "זיון פלדה מצולעת תוצרת מקומית", "ק\"ג", 4500, 6.8],
    ["04.01.002", "בלוק איטונג 20 ס״מ כולל טיח", 'מ"ר', 210, 178],
    ["06.02.012", "ריצוף גרניט פורצלן 60/60", 'מ"ר', 145, 210],
    ["08.01.008", "צביעה אקרילית 2 שכבות על קיר פנים", 'מ"ר', 380, 28],
    ["11.03.021", "דלת פנים עץ מלא כולל משקוף", "יח'", 6, 1450],
    ["15.02.004", "נקודת חשמל כולל שקע ותיעול", "יח'", 48, 185],
    ["19.01.001", "פינוי פסולת בניין לאתר מורשה", 'מ"ק', 55, 95],
  ];
  return rows.map(([code, description, unit, qty, unitPrice]) =>
    createItem({ code, description, unit, qty, unitPrice, selected: true, source: "sample" })
  );
}

export function lineTotal(item, indexFactor = 1, globalDiscount = 0) {
  const price = (Number(item.unitPrice) || 0) * (Number(indexFactor) || 1);
  const disc = Math.min(100, Math.max(0, Number(item.discount) || 0));
  const gdisc = Math.min(100, Math.max(0, Number(globalDiscount) || 0));
  const afterItem = price * (1 - disc / 100);
  const afterGlobal = afterItem * (1 - gdisc / 100);
  return (Number(item.qty) || 0) * afterGlobal;
}

export function formatMoney(n) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}
