/**
 * Arabic text for scanner findings.
 *
 * The scanner stores findings in English (and PDF reports stay English, see
 * docs/decisions.md). The interface translates them at display time:
 * localizeFinding() picks the Arabic title/description/remediation that matches
 * the finding's check_key and outcome. The EVIDENCE is never translated because
 * it is raw technical data (header values, URLs, error codes).
 *
 * Receives: a finding and the language. Returns: title, description, remediation.
 * Used by: the scan details page and the scan comparison table.
 * Unknown findings fall back to their English text, so nothing is ever lost.
 */
import type { Finding } from "./security-checks";
import type { Lang } from "./i18n";

interface Text {
  title: string;
  description: string;
  remediation: string;
}

// The five header checks share one shape: name, why it matters, how to fix.
const HEADERS: Record<string, { name: string; why: string; fix: string }> = {
  "header.hsts": {
    name: "Strict-Transport-Security (HSTS)",
    why: "تُلزم HSTS المتصفحات باستخدام HTTPS دائمًا، وتحمي من هجمات خفض الحماية.",
    fix: "أضف الترويسة: Strict-Transport-Security: max-age=31536000; includeSubDomains",
  },
  "header.csp": {
    name: "Content-Security-Policy (CSP)",
    why: "تحدد سياسة أمان المحتوى السكربتات المسموح بتشغيلها، فتقلل أثر هجمات حقن السكربتات (XSS).",
    fix: "أضف سياسة Content-Security-Policy تبدأ بـ default-src 'self'; ثم عدّلها حسب الموارد التي يحتاجها موقعك.",
  },
  "header.xcto": {
    name: "X-Content-Type-Options",
    why: "تمنع المتصفح من تخمين نوع الملف، وهذا قد يحوّل ملفًا مرفوعًا إلى سكربت.",
    fix: "أضف الترويسة: X-Content-Type-Options: nosniff",
  },
  "header.referrer": {
    name: "Referrer-Policy",
    why: "تتحكم في مقدار عنوان الصفحة المرسل إلى المواقع الأخرى، وقد يتضمن مسارات أو رموزًا خاصة.",
    fix: "أضف الترويسة: Referrer-Policy: strict-origin-when-cross-origin",
  },
  "header.permissions": {
    name: "Permissions-Policy",
    why: "تقيّد ميزات المتصفح القوية (الكاميرا والميكروفون والموقع) التي لا يحتاجها الموقع.",
    fix: "أضف مثلًا: Permissions-Policy: camera=(), microphone=(), geolocation=()",
  },
};

const NO_ACTION = "لا يلزم أي إجراء.";

// Everything else, keyed by "<check_key>:<variant>" (see variantOf).
const TEXTS: Record<string, Text> = {
  "https.used:failed": {
    title: "الموقع لا يعمل عبر HTTPS",
    description: "الاتصال بين الزائر والموقع غير مشفّر، فيمكن قراءة البيانات أو تعديلها أثناء انتقالها في الشبكة.",
    remediation: "ثبّت شهادة TLS (مثل Let's Encrypt) وحوّل كل طلبات HTTP إلى HTTPS.",
  },
  "https.used:passed": {
    title: "الموقع يعمل عبر HTTPS",
    description: "وصلت الصفحة النهائية عبر اتصال HTTPS مشفّر.",
    remediation: NO_ACTION,
  },
  "tls.certificate:untrusted": {
    title: "شهادة TLS غير موثوقة",
    description: "ستعرض المتصفحات تحذيرًا أمنيًا لأنه تعذّر التحقق من الشهادة.",
    remediation: "استخدم شهادة من جهة موثوقة تطابق اسم النطاق وغير منتهية، وقدّم سلسلة الشهادات كاملة.",
  },
  "tls.certificate:expiring": {
    title: "شهادة TLS ستنتهي قريبًا",
    description: "الشهادة موثوقة لكنها ستنتهي خلال 14 يومًا.",
    remediation: "جدّد الشهادة، ويفضّل تفعيل التجديد التلقائي.",
  },
  "tls.certificate:valid": {
    title: "شهادة TLS صالحة",
    description: "تم التحقق من الشهادة بواسطة جهة موثوقة.",
    remediation: NO_ACTION,
  },
  "https.redirect:inconclusive": {
    title: "تعذّر اختبار التحويل من HTTP إلى HTTPS",
    description: "لم يستجب الإصدار غير المشفّر (HTTP) من الموقع، فلم يمكن التحقق من التحويل.",
    remediation: "إذا كان المنفذ 80 مفتوحًا، فاجعله يحوّل بشكل دائم (301) إلى HTTPS.",
  },
  "https.redirect:passed": {
    title: "التحويل من HTTP إلى HTTPS يعمل",
    description: "من يكتب http:// يُنقل تلقائيًا إلى النسخة الآمنة.",
    remediation: NO_ACTION,
  },
  "https.redirect:failed": {
    title: "لا يوجد تحويل من HTTP إلى HTTPS",
    description: "من يستخدم http:// يبقى على اتصال غير مشفّر.",
    remediation: "اضبط خادم الويب ليحوّل كل طلبات HTTP إلى HTTPS بحالة 301.",
  },
  "cookies.flags:info": {
    title: "لم تُلاحَظ ملفات تعريف ارتباط",
    description: "لم تضع الصفحة المفحوصة ملفات تعريف ارتباط، فلا يمكن تقييم خصائصها. قد تضعها صفحات تسجيل الدخول.",
    remediation: "لا يلزم إجراء لهذه الصفحة.",
  },
  "cookies.flags:passed": {
    title: "ملفات تعريف الارتباط تستخدم خصائص آمنة",
    description: "كل الملفات الملاحَظة تحدد Secure و HttpOnly و SameSite.",
    remediation: NO_ACTION,
  },
  "cookies.flags:failed": {
    title: "ملفات تعريف ارتباط تنقصها خصائص الأمان",
    description:
      "بدون Secure قد تُرسل عبر HTTP، وبدون HttpOnly يمكن للسكربتات (وهجمات XSS) قراءتها، وبدون SameSite تُرسل مع طلبات المواقع الأخرى (خطر CSRF). ملاحظة: بعض الملفات تحتاج فعلًا لوصول السكربتات.",
    remediation: "اضبط الملفات بـ: Secure; HttpOnly; SameSite=Lax (أو Strict). ملفات الجلسة يجب أن تكون دائمًا HttpOnly.",
  },
  "misconfig.version_disclosure:failed": {
    title: "كشف إصدار برنامج الخادم",
    description: "إظهار أرقام الإصدارات الدقيقة يساعد المهاجم على البحث عن ثغرات معروفة.",
    remediation: "اضبط الخادم أو الإطار البرمجي لإخفاء أرقام الإصدارات (مثل server_tokens off في nginx، وإزالة X-Powered-By).",
  },
  "misconfig.version_disclosure:passed": {
    title: "لا تُكشف أرقام إصدارات البرامج",
    description: "ترويستا Server و X-Powered-By لا تُظهران أرقام إصدارات.",
    remediation: NO_ACTION,
  },
  "misconfig.clickjacking:failed": {
    title: "يمكن تضمين الصفحة في إطار (Clickjacking)",
    description: "يمكن لموقع آخر تحميل هذه الصفحة في إطار مخفي وخداع المستخدم ليضغط عليها.",
    remediation: "أضف: Content-Security-Policy: frame-ancestors 'self' (أو X-Frame-Options: DENY).",
  },
  "misconfig.clickjacking:passed": {
    title: "توجد حماية من Clickjacking",
    description: "تقيّد الصفحة المواقع التي يمكنها تضمينها.",
    remediation: NO_ACTION,
  },
  "misconfig.directory_listing:failed": {
    title: "عرض محتويات المجلدات مفعّل",
    description: "يعرض الخادم قائمة الملفات في المجلد، وقد يكشف نسخًا احتياطية أو ملفات خاصة.",
    remediation: "عطّل فهرسة المجلدات التلقائية (Options -Indexes في Apache، و autoindex off في nginx).",
  },
  "misconfig.cors:failed": {
    title: "إعداد CORS متساهل مع إرسال بيانات الاعتماد",
    description: "يسمح الخادم لأي موقع مع بيانات الاعتماد معًا، وقد يعرّض بيانات المستخدم لمواقع أخرى.",
    remediation: "اسمح فقط بمواقع موثوقة محددة عند الحاجة لبيانات الاعتماد.",
  },
};

type FindingLike = Pick<Finding, "check_key" | "title" | "status"> & Partial<Pick<Finding, "description" | "remediation">>;

/** Which outcome of a check this finding is (the English title tells header/TLS variants apart). */
function variantOf(f: FindingLike): string {
  if (f.check_key.startsWith("header.")) {
    if (f.title.startsWith("Missing")) return `${f.check_key}:missing`;
    if (f.title.startsWith("Weak")) return `${f.check_key}:weak`;
    return `${f.check_key}:ok`;
  }
  if (f.check_key === "tls.certificate") {
    if (f.title.includes("not trusted")) return "tls.certificate:untrusted";
    if (f.title.includes("expires soon")) return "tls.certificate:expiring";
    return "tls.certificate:valid";
  }
  return `${f.check_key}:${f.status}`;
}

export function localizeFinding(f: FindingLike, lang: Lang): Text {
  const english = { title: f.title, description: f.description ?? "", remediation: f.remediation ?? "" };
  if (lang !== "ar") return english;

  const variant = variantOf(f);
  const header = HEADERS[f.check_key];
  if (header) {
    if (variant.endsWith(":missing")) {
      return { title: `ترويسة ${header.name} غير موجودة`, description: header.why, remediation: header.fix };
    }
    if (variant.endsWith(":weak")) {
      return { title: `ترويسة ${header.name} ضعيفة`, description: `${header.why} قيمتها الحالية ضعيفة (انظر الدليل).`, remediation: header.fix };
    }
    return { title: `ترويسة ${header.name} مضبوطة`, description: header.why, remediation: NO_ACTION };
  }
  return TEXTS[variant] ?? english;
}
