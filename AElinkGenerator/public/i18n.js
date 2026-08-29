#!/usr/bin/env node
"use strict";

/**
 * Simple EN/HE page language switcher (no Google Translate).
 * Apply with data-i18n / data-i18n-html / data-i18n-placeholder / data-i18n-aria.
 */
(function () {
  var STORAGE_KEY = "hmga_lang";

  var strings = {
    en: {
      pageTitle: "Help Me Get Around — AliExpress Link Converter",
      pageDescription:
        "Convert an AliExpress product link at no extra cost and help fund an accessible EZ Raider.",
      langBarLabel: "Language",
      langEn: "English",
      langHe: "עברית",
      eyebrow: "A small click can help me move again",
      headline: "Shop the same product. Help me get around.",
      lede:
        "Paste an AliExpress product link below. You’ll receive a new link to the exact same item at no extra cost to you, and I may earn a small affiliate commission.",
      sourceLabel: "Your original AliExpress product link",
      sourcePlaceholder: "https://www.aliexpress.com/item/1005001234567890.html",
      convertBtn: "Convert my link",
      clearBtn: "Clear",
      hint: "Works with product pages, mobile links, and regional AliExpress domains. No purchase is required.",
      resultTitle: "Your new affiliate link is ready!",
      copyBtn: "Copy new link",
      openBtn: "Open new link",
      storyTitle: "Why I built this",
      storyP1:
        "Nine years ago, I was injured in a work-related accident. I now live with Complex Regional Pain Syndrome (CRPS) in my left hand and right foot. Because of my injuries I’m not allowed to drive, I can’t really work, and I use crutches. Public transportation isn’t a safe option for me because I can fall on buses or trains.",
      storyP2:
        "I’m saving for an EZ Raider—an accessible mobility vehicle with a starting price of about ₪40,000. If enough people convert the AliExpress links they already plan to use, those tiny commissions may add up and help me regain some independence.",
      reassurance:
        "You don’t pay more and you don’t lose anything. The product and seller stay the same; only the link changes.",
      benefitsTitle: "How an EZ Raider would change my daily life",
      benefitsIntro:
        "This isn’t about having a recreational vehicle. CRPS in my right foot makes mobility difficult, while CRPS in my left hand adds another challenge when I rely on crutches. An appropriate mobility vehicle could give me a practical way to make everyday journeys without driving a car or risking another fall on public transportation.",
      benefit1Title: "Up to 40 km",
      benefit1Body:
        "The EZ Raider LW sold in Israel lists a maximum range of up to 40 km per charge. Actual range depends on terrain, weight, weather, and riding style.",
      benefit2Title: "A normal power socket",
      benefit2Body:
        "The supplied charger connects to an external charging port and a proper household outlet. Charging takes roughly 3–5 hours, depending on the model, and the battery does not have to be removed.",
      benefit3Title: "Safer indoor storage",
      benefit3Body:
        "At 67 cm wide with a folding structure, it may fit through my building and into secure indoor storage where a conventional mobility scooter cannot—keeping it close to a socket and away from street theft.",
      benefitsOutro:
        "Its four wheels, low center of gravity, and articulated suspension are designed for stability and maneuvering on urban and uneven surfaces. For me, that could mean reaching appointments, shops, friends, and ordinary places under my own control.",
      fig1Alt: "Full EZ Raider mobility vehicle fitted with a padded seat",
      fig1CaptionHtml:
        'EZ Raider fitted with a seat. Photo: <a href="https://bflex.io/services/buy/products/ez-raider-secondhand-4-wheel-power" target="_blank" rel="noopener">bFlex product listing</a>.',
      fig2Alt: "Seat installed behind the standing platform on an EZ Raider",
      fig2CaptionHtml:
        'The installed seat from the <a href="https://ezraider.com/accessories/" target="_blank" rel="noopener">manufacturer’s accessories gallery</a>.',
      fig3Alt: "Close view of the EZ Raider removable padded seat",
      fig3CaptionHtml:
        'Official removable seat upgrade. Photo: <a href="https://ezraider.com/accessories/" target="_blank" rel="noopener">EZRaider</a>.',
      sourceNoteHtml:
        'Specifications vary by model. Sources: <a href="https://ezraider.com/faq/" target="_blank" rel="noopener">EZRaider manufacturer FAQ</a>, <a href="https://ezraider.com/wp-content/uploads/2026/01/ezraider-user-manual-en.pdf" target="_blank" rel="noopener">manufacturer charging instructions</a>, and <a href="https://raider-ez.com/about/" target="_blank" rel="noopener">authorized Israeli distributor specifications</a>.',
      progressTitle: "The road to an EZ Raider",
      progressGoalPrefix: "raised toward",
      progressAria: "EZ Raider funding progress",
      howTitle: "How it works",
      how1: "Paste the AliExpress product page you were going to use.",
      how2: "Copy the converted link and shop normally.",
      how3: "If the purchase qualifies, AliExpress may pay me a small commission.",
      footer:
        "Affiliate disclosure: qualifying purchases may earn me a commission from AliExpress, at no additional cost to you.",
      errPasteFirst: "Paste an AliExpress product link first.",
      statusGenerating: "Generating your tracking link…",
      errGenerate: "Could not generate a link.",
      statusReady: "Affiliate link ready.",
      errReach: "Could not reach the link generator. Try again in a moment.",
      metaProduct: "Product {id}",
      metaReady: "Affiliate link ready",
      copied: "Copied!",
      statusCopied: "The new affiliate link was copied to your clipboard.",
      remainingSuffix: "still to go",
      percentFunded: "{n}% funded",
      raisedToward: "{earned} raised toward {goal}",
    },
    he: {
      pageTitle: "עזרו לי להתנייד — ממיר קישורי עליאקספרס",
      pageDescription:
        "המירו קישור מוצר מעליאקספרס בלי עלות נוספת ועזרו לממן רכב נגישות EZ Raider.",
      langBarLabel: "שפה",
      langEn: "English",
      langHe: "עברית",
      eyebrow: "לחיצה קטנה יכולה לעזור לי לנוע שוב",
      headline: "קנו את אותו מוצר. עזרו לי להתנייד.",
      lede:
        "הדביקו למטה קישור למוצר בעליאקספרס. תקבלו קישור חדש לאותו מוצר בדיוק, בלי עלות נוספת עבורכם, ואולי ארוויח עמלה קטנה של שיווק שותפים.",
      sourceLabel: "קישור המוצר המקורי מעליאקספרס",
      sourcePlaceholder: "https://www.aliexpress.com/item/1005001234567890.html",
      convertBtn: "המירו את הקישור שלי",
      clearBtn: "נקה",
      hint: "עובד עם דפי מוצר, קישורים לנייד ודומיינים אזוריים של עליאקספרס. אין חובת רכישה.",
      resultTitle: "הקישור החדש שלכם מוכן!",
      copyBtn: "העתיקו את הקישור החדש",
      openBtn: "פתחו את הקישור החדש",
      storyTitle: "למה בניתי את זה",
      storyP1:
        "לפני תשע שנים נפצעתי בתאונת עבודה. מאז אני חי עם תסמונת כאב אזורי מורכב (CRPS) ביד שמאל וברגל ימין. בגלל הפציעות אסור לי לנהוג, אני כמעט לא יכול לעבוד, ואני נעזר בקביים. תחבורה ציבורית אינה בטוחה עבורי כי אני עלול ליפול באוטובוס או ברכבת.",
      storyP2:
        "אני חוסך ל־EZ Raider — רכב ניידות נגיש במחיר התחלתי של כ־₪40,000. אם מספיק אנשים ימירו את קישורי עליאקספרס שהם ממילא מתכננים להשתמש בהם, העמלות הקטנות האלה עשויות להצטבר ולעזור לי להחזיר קצת עצמאות.",
      reassurance:
        "אתם לא משלמים יותר ואתם לא מפסידים כלום. המוצר והמוכר נשארים זהים; רק הקישור משתנה.",
      benefitsTitle: "איך EZ Raider ישנה את חיי היום־יום שלי",
      benefitsIntro:
        "זה לא עניין של רכב פנאי. CRPS ברגל ימין מקשה על הניידות, ו־CRPS ביד שמאל מוסיף אתגר נוסף כשאני נשען על קביים. רכב ניידות מתאים יכול לתת לי דרך מעשית לנסיעות יומיומיות בלי לנהוג ברכב ובלי לסכן נפילה נוספת בתחבורה ציבורית.",
      benefit1Title: "עד 40 ק״מ",
      benefit1Body:
        "דגם EZ Raider LW שנמכר בישראל מציין טווח מקסימלי של עד 40 ק״מ לטעינה. הטווח בפועל תלוי בשטח, במשקל, במזג האוויר ובסגנון הנסיעה.",
      benefit2Title: "שקע חשמל רגיל",
      benefit2Body:
        "המטען המצורף מתחבר ליציאת טעינה חיצונית ולשקע ביתי תקני. הטעינה נמשכת בערך 3–5 שעות, בהתאם לדגם, ואין צורך להוציא את הסוללה.",
      benefit3Title: "אחסון פנימי בטוח יותר",
      benefit3Body:
        "ברוחב של 67 ס״מ ועם מבנה מתקפל, הוא עשוי להיכנס לבניין שלי ולאחסון פנימי מאובטח במקום שבו קורקינט ניידות רגיל לא יכול — קרוב לשקע ומוגן מגניבה ברחוב.",
      benefitsOutro:
        "ארבעת הגלגלים, מרכז הכובד הנמוך והמתלה המפרקי מיועדים ליציבות ולתמרון בשטח עירוני ולא אחיד. בשבילי זה יכול להיות הגעה לתורים, לחנויות, לחברים ולמקומות רגילים בשליטה שלי.",
      fig1Alt: "רכב ניידות EZ Raider מלא עם מושב מרופד",
      fig1CaptionHtml:
        'EZ Raider עם מושב מותקן. צילום: <a href="https://bflex.io/services/buy/products/ez-raider-secondhand-4-wheel-power" target="_blank" rel="noopener">רשימת מוצר ב־bFlex</a>.',
      fig2Alt: "מושב מותקן מאחורי משטח העמידה ב־EZ Raider",
      fig2CaptionHtml:
        'המושב המותקן מתוך <a href="https://ezraider.com/accessories/" target="_blank" rel="noopener">גלריית האביזרים של היצרן</a>.',
      fig3Alt: "תקריב של מושב EZ Raider מרופד וניתן להסרה",
      fig3CaptionHtml:
        'שדרוג מושב רשמי ניתן להסרה. צילום: <a href="https://ezraider.com/accessories/" target="_blank" rel="noopener">EZRaider</a>.',
      sourceNoteHtml:
        'המפרט משתנה לפי דגם. מקורות: <a href="https://ezraider.com/faq/" target="_blank" rel="noopener">שאלות ותשובות של יצרן EZRaider</a>, <a href="https://ezraider.com/wp-content/uploads/2026/01/ezraider-user-manual-en.pdf" target="_blank" rel="noopener">הוראות טעינה של היצרן</a>, ו־<a href="https://raider-ez.com/about/" target="_blank" rel="noopener">מפרט מפיץ מורשה בישראל</a>.',
      progressTitle: "הדרך ל־EZ Raider",
      progressGoalPrefix: "גויסו לקראת",
      progressAria: "התקדמות המימון ל־EZ Raider",
      howTitle: "איך זה עובד",
      how1: "הדביקו את דף המוצר בעליאקספרס שבו תכננתם להשתמש.",
      how2: "העתיקו את הקישור המומר וקנו כרגיל.",
      how3: "אם הרכישה עומדת בתנאים, עליאקספרס עשויים לשלם לי עמלה קטנה.",
      footer:
        "גילוי נאות: רכישות מתאימות עשויות להניב לי עמלה מעליאקספרס, בלי עלות נוספת עבורכם.",
      errPasteFirst: "קודם הדביקו קישור למוצר בעליאקספרס.",
      statusGenerating: "מייצרים עבורכם קישור מעקב…",
      errGenerate: "לא ניתן לייצר קישור.",
      statusReady: "קישור השותפים מוכן.",
      errReach: "לא ניתן להגיע לממיר הקישורים. נסו שוב בעוד רגע.",
      metaProduct: "מוצר {id}",
      metaReady: "קישור השותפים מוכן",
      copied: "הועתק!",
      statusCopied: "הקישור החדש הועתק ללוח.",
      remainingSuffix: "נותרו",
      percentFunded: "{n}% מומנו",
      raisedToward: "{earned} גויסו לקראת {goal}",
    },
  };

  function normalize(lang) {
    return lang === "he" ? "he" : "en";
  }

  function detect() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "he" || stored === "en") return stored;
    } catch (e) { /* ignore */ }
    var nav = (navigator.language || "").toLowerCase();
    if (nav.indexOf("he") === 0 || nav.indexOf("iw") === 0) return "he";
    return "en";
  }

  function t(key, lang) {
    var pack = strings[normalize(lang)] || strings.en;
    return pack[key] != null ? pack[key] : strings.en[key] || key;
  }

  function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (_, name) {
      return vars && vars[name] != null ? String(vars[name]) : "";
    });
  }

  function apply(lang) {
    lang = normalize(lang);
    var root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "he" ? "rtl" : "ltr";
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* ignore */ }

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key, lang);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (key) el.innerHTML = t(key, lang);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key, lang));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (key) el.setAttribute("aria-label", t(key, lang));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (key) el.setAttribute("alt", t(key, lang));
    });

    var title = t("pageTitle", lang);
    if (title) document.title = title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("pageDescription", lang));

    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.classList.toggle("is-active", active);
    });

    window.dispatchEvent(new CustomEvent("hmga:langchange", { detail: { lang: lang } }));
  }

  function current() {
    return normalize(document.documentElement.lang || detect());
  }

  function bind() {
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        apply(btn.getAttribute("data-lang"));
      });
    });
  }

  window.HMGA_I18N = {
    strings: strings,
    t: t,
    fill: fill,
    apply: apply,
    current: current,
    detect: detect,
  };

  function boot() {
    bind();
    apply(detect());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
