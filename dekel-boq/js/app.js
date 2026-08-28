/* Dekel BOQ app — classic script (works with file:// and http://) */
(function () {
  "use strict";

  var bootError = document.getElementById("boot-error");
  function showBootError(msg) {
    if (!bootError) {
      console.error(msg);
      return;
    }
    bootError.hidden = false;
    bootError.textContent = msg;
  }

  if (!window.DekelParser || !window.DekelExcel) {
    showBootError(
      "שגיאה בטעינת הסקריפטים. ודאו שתיקיות js/ ו-vendor/ נמצאות ליד index.html, או הריצו: python3 -m http.server 8765 ואז פתחו http://localhost:8765/dekel-boq/"
    );
    return;
  }

  var applyQuantities = window.DekelParser.applyQuantities;
  var createItem = window.DekelParser.createItem;
  var extractPdfText = window.DekelParser.extractPdfText;
  var formatMoney = window.DekelParser.formatMoney;
  var lineTotal = window.DekelParser.lineTotal;
  var parseDxfText = window.DekelParser.parseDxfText;
  var parseExcelBuffer = window.DekelParser.parseExcelBuffer;
  var parseTextCatalog = window.DekelParser.parseTextCatalog;
  var sampleCatalog = window.DekelParser.sampleCatalog;
  var scrapeDwgStrings = window.DekelParser.scrapeDwgStrings;
  var exportBoqExcel = window.DekelExcel.exportBoqExcel;

  var items = [];
  var filterQuery = "";
  var filterChapter = "";

  var els = {
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

  if (!els.projectDate || !els.btnSample || !els.itemsBody) {
    showBootError("חסרים אלמנטים בדף — ייתכן שנפתח קובץ HTML חלקי.");
    return;
  }

  try {
    els.projectDate.valueAsDate = new Date();
  } catch (_) {}

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
    var q = filterQuery.trim().toLowerCase();
    return items.filter(function (item) {
      if (filterChapter && item.chapter !== filterChapter) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().indexOf(q) !== -1 ||
        item.description.toLowerCase().indexOf(q) !== -1 ||
        String(item.notes || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function refreshChapterFilter() {
    var chapters = [];
    var seen = {};
    items.forEach(function (i) {
      if (i.chapter && !seen[i.chapter]) {
        seen[i.chapter] = true;
        chapters.push(i.chapter);
      }
    });
    chapters.sort();
    var current = els.filterChapter.value;
    els.filterChapter.innerHTML =
      '<option value="">כל הפרקים</option>' +
      chapters
        .map(function (c) {
          return '<option value="' + c + '">פרק ' + c + "</option>";
        })
        .join("");
    if (chapters.indexOf(current) !== -1) els.filterChapter.value = current;
  }

  function escapeAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function render() {
    var m = meta();
    var list = visibleItems();
    els.itemsBody.innerHTML = "";

    list.forEach(function (item) {
      var tr = document.createElement("tr");
      if (item.selected) tr.classList.add("selected");
      var total = lineTotal(item, m.indexFactor, m.globalDiscount);
      tr.innerHTML =
        '<td><input type="checkbox" data-id="' +
        item.id +
        '" data-field="selected" ' +
        (item.selected ? "checked" : "") +
        " /></td>" +
        '<td><input class="code" type="text" data-id="' +
        item.id +
        '" data-field="code" value="' +
        escapeAttr(item.code) +
        '" /></td>' +
        '<td><input type="text" data-id="' +
        item.id +
        '" data-field="description" value="' +
        escapeAttr(item.description) +
        '" /></td>' +
        '<td><input type="text" data-id="' +
        item.id +
        '" data-field="unit" value="' +
        escapeAttr(item.unit) +
        '" /></td>' +
        '<td><input type="number" min="0" step="0.01" data-id="' +
        item.id +
        '" data-field="qty" value="' +
        item.qty +
        '" /></td>' +
        '<td><input type="number" min="0" step="0.01" data-id="' +
        item.id +
        '" data-field="unitPrice" value="' +
        item.unitPrice +
        '" /></td>' +
        '<td><input type="number" min="0" max="100" step="0.1" data-id="' +
        item.id +
        '" data-field="discount" value="' +
        item.discount +
        '" /></td>' +
        '<td><span class="line-total">' +
        formatMoney(total) +
        "</span></td>" +
        '<td><input type="text" data-id="' +
        item.id +
        '" data-field="notes" value="' +
        escapeAttr(item.notes) +
        '" /></td>' +
        '<td><button type="button" class="row-del" data-del="' +
        item.id +
        '" title="מחק">×</button></td>';
      els.itemsBody.appendChild(tr);
    });

    var selected = items.filter(function (i) {
      return i.selected && i.qty > 0;
    });
    var before = selected.reduce(function (s, i) {
      return s + lineTotal(i, m.indexFactor, m.globalDiscount);
    }, 0);
    var vat = before * (m.vatRate / 100);
    els.totalBefore.textContent = formatMoney(before);
    els.totalVat.textContent = formatMoney(vat);
    els.totalGrand.textContent = formatMoney(before + vat);

    els.statusStats.innerHTML =
      '<span class="chip">' +
      items.length +
      " סעיפים</span>" +
      '<span class="chip">' +
      selected.length +
      " נבחרו</span>" +
      '<span class="chip">' +
      formatMoney(before + vat) +
      " כולל מע״מ</span>";

    els.btnExport.disabled = selected.length === 0;
    refreshChapterFilter();
  }

  function findItem(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  els.itemsBody.addEventListener("input", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "INPUT") return;
    var id = t.getAttribute("data-id");
    var field = t.getAttribute("data-field");
    if (!id || !field) return;
    var item = findItem(id);
    if (!item) return;

    if (field === "selected") {
      item.selected = t.checked;
    } else if (field === "qty" || field === "unitPrice" || field === "discount") {
      item[field] = Number(t.value) || 0;
      if (field === "qty" && item.qty > 0) item.selected = true;
    } else {
      item[field] = t.value;
      if (field === "code") {
        var parts = item.code.split(/[.\-/]/);
        item.chapter = parts[0] ? String(parts[0]).padStart(2, "0") : "";
      }
    }
    render();
  });

  els.itemsBody.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var id = t.getAttribute("data-del");
    if (!id) return;
    items = items.filter(function (i) {
      return i.id !== id;
    });
    render();
  });

  els.search.addEventListener("input", function () {
    filterQuery = els.search.value;
    render();
  });

  els.filterChapter.addEventListener("change", function () {
    filterChapter = els.filterChapter.value;
    render();
  });

  [els.globalDiscount, els.vatRate, els.indexFactor].forEach(function (el) {
    el.addEventListener("input", function () {
      render();
    });
  });

  els.btnClearQty.addEventListener("click", function () {
    items.forEach(function (item) {
      item.qty = 0;
      item.selected = false;
    });
    render();
  });

  els.btnAdd.addEventListener("click", function () {
    els.addForm.reset();
    els.addDialog.showModal();
  });

  els.addForm.addEventListener("close", function () {
    if (els.addDialog.returnValue !== "ok") return;
    var fd = new FormData(els.addForm);
    items.unshift(
      createItem({
        code: String(fd.get("code") || ""),
        description: String(fd.get("desc") || ""),
        unit: String(fd.get("unit") || "יח'"),
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

  els.btnSample.addEventListener("click", function () {
    items = sampleCatalog();
    showWorkspace();
    setStatus("נטענה דוגמת מחירון דקל (10 סעיפים)");
    render();
  });

  els.btnExport.addEventListener("click", function () {
    try {
      var result = exportBoqExcel({ items: items, meta: meta() });
      setStatus("יוצא " + result.filename + " — " + result.count + " סעיפים");
    } catch (err) {
      console.error(err);
      setStatus("שגיאת ייצוא: " + (err.message || err));
    }
  });

  async function handleFile(file, role) {
    showWorkspace();
    setStatus("קורא " + file.name + "…");
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    var buffer = await file.arrayBuffer();

    try {
      var parsed = [];

      if (ext === "pdf") {
        var text = await extractPdfText(buffer);
        parsed = parseTextCatalog(text, "pdf:" + file.name);
      } else if (ext === "xlsx" || ext === "xls") {
        parsed = parseExcelBuffer(buffer, "excel:" + file.name);
      } else if (ext === "csv" || ext === "txt") {
        parsed = parseTextCatalog(new TextDecoder("utf-8").decode(buffer), ext + ":" + file.name);
      } else if (ext === "dxf") {
        var dxfText = new TextDecoder("utf-8").decode(buffer);
        var extracted = parseDxfText(dxfText);
        parsed = parseTextCatalog(extracted || dxfText, "dxf:" + file.name);
      } else if (ext === "dwg") {
        var scraped = scrapeDwgStrings(buffer);
        parsed = parseTextCatalog(scraped, "dwg:" + file.name);
        if (!parsed.length) {
          setStatus("DWG: לא נמצאו קודי סעיפים. המירו את השרטוט ל-PDF או DXF וטענו שוב.");
          return;
        }
        setStatus(
          "DWG: חולצו " + parsed.length + " סעיפים באופן חלקי — מומלץ PDF/DXF לדיוק גבוה יותר."
        );
      } else {
        setStatus("סוג קובץ לא נתמך: ." + ext);
        return;
      }

      if (!parsed.length) {
        setStatus(
          "לא זוהו סעיפי דקל ב־" + file.name + ". בדקו שהקובץ מכיל קודי סעיפים כמו 01.02.003."
        );
        return;
      }

      if (role === "catalog") {
        if (items.length && items.some(function (i) { return i.qty > 0; })) {
          items = applyQuantities(parsed, items);
        } else {
          items = parsed;
        }
        setStatus("מחירון נטען: " + file.name + " — " + items.length + " סעיפים");
      } else if (!items.length) {
        items = parsed.map(function (p) {
          return Object.assign({}, p, { selected: p.qty > 0 || p.selected });
        });
        setStatus("נטען קובץ כמויות/שרטוט: " + file.name + " — " + items.length + " סעיפים");
      } else {
        items = applyQuantities(items, parsed);
        var have = {};
        items.forEach(function (i) {
          have[i.code] = true;
        });
        parsed.forEach(function (p) {
          if (!have[p.code]) items.push(Object.assign({}, p, { selected: p.qty > 0 }));
        });
        var withQty = items.filter(function (i) {
          return i.qty > 0;
        }).length;
        setStatus("כמויות עודכנו מ־" + file.name + " — " + withQty + " סעיפים עם כמות");
      }

      render();
    } catch (err) {
      console.error(err);
      setStatus("שגיאה בקריאת הקובץ: " + (err.message || err));
    }
  }

  els.catalogInput.addEventListener("change", function () {
    var file = els.catalogInput.files && els.catalogInput.files[0];
    if (file) handleFile(file, "catalog");
    els.catalogInput.value = "";
  });

  els.drawingInput.addEventListener("change", function () {
    var file = els.drawingInput.files && els.drawingInput.files[0];
    if (file) handleFile(file, "drawing");
    els.drawingInput.value = "";
  });

  var hero = document.getElementById("hero");
  if (hero) {
    ["dragenter", "dragover"].forEach(function (evt) {
      hero.addEventListener(evt, function (e) {
        e.preventDefault();
        hero.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      hero.addEventListener(evt, function (e) {
        e.preventDefault();
        hero.classList.remove("dragover");
      });
    });
    hero.addEventListener("drop", function (e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file, "catalog");
    });
  }

  document.documentElement.classList.add("app-ready");
})();
