// ============================================================
// سكربت حفظ نتائج اختبار صيانة الجوالات في جدول قوقل
// انسخ هذا الملف كاملًا والصقه في محرر Apps Script
// ============================================================

// غيّر كلمة المرور هذه إلى كلمة خاصة بك (أحرف إنجليزية وأرقام)
// هي التي ستدخلها في صفحة النتائج لترى الدرجات وتحذف المتدربين
const PASSWORD = "omar2026";

// مفتاح الإجابات الصحيحة للأسئلة الثلاثين بالترتيب (لا تغيّره إلا إذا غيّرت الأسئلة)
const KEY = [1,1,1,1,1,1,0,1,1,0,1,0,1,1,0,1,1,0,1,1,1,1,1,1,0,0,1,1,1,1];

const SHEET_NAME = "النتائج";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["المعرف", "الاسم", "الدرجة", "من", "النسبة", "الإجابات", "وقت التسليم"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return reply_({ ok: true, message: "السكربت يعمل" });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { return reply_({ ok: false, error: "bad_request" }); }
  const sh = getSheet_();

  // تسليم اختبار من متدرب (متاح للجميع)
  if (body.action === "submit") {
    const name = String(body.name || "").trim().slice(0, 80);
    const answers = Array.isArray(body.answers) ? body.answers.slice(0, KEY.length).map(function (v) { v = Number(v); return (v >= 0 && v <= 3) ? Math.floor(v) : -1; }) : [];
    if (name.length < 3 || answers.length !== KEY.length) return reply_({ ok: false, error: "bad_request" });
    let score = 0;
    for (let i = 0; i < KEY.length; i++) if (answers[i] === KEY[i]) score++;
    const id = Utilities.getUuid();
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      sh.appendRow([id, name, score, KEY.length, Math.round(score / KEY.length * 100) + "%", answers.join(" "), new Date()]);
    } finally { lock.releaseLock(); }
    return reply_({ ok: true, id: id, score: score, total: KEY.length });
  }

  // كل ما بعد هذا للمدرب فقط ويحتاج كلمة المرور
  if (body.password !== PASSWORD) return reply_({ ok: false, error: "auth" });

  if (body.action === "list") {
    const values = sh.getDataRange().getValues().slice(1);
    const rows = values.filter(function (r) { return r[0]; }).map(function (r) {
      return {
        id: String(r[0]),
        name: String(r[1]),
        score: Number(r[2]),
        total: Number(r[3]),
        answers: String(r[5]).trim().split(/\s+/).map(Number),
        submittedAt: r[6] instanceof Date ? r[6].toISOString() : String(r[6])
      };
    });
    return reply_({ ok: true, rows: rows });
  }

  if (body.action === "delete") {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
      for (let i = ids.length - 1; i >= 1; i--) {
        if (String(ids[i][0]) === String(body.id)) { sh.deleteRow(i + 1); return reply_({ ok: true }); }
      }
    } finally { lock.releaseLock(); }
    return reply_({ ok: false, error: "not_found" });
  }

  return reply_({ ok: false, error: "bad_request" });
}
