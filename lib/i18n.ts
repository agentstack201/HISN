/**
 * Simple English/Arabic translations. The chosen language is stored in a
 * "lang" cookie; Arabic switches the page to right-to-left (dir="rtl").
 * Scanner findings are written in English (technical terms), documented in docs/decisions.md.
 */
import { cookies } from "next/headers";

const en = {
  appName: "HISN",
  tagline: "Web application security assessment for websites you own",
  nav: { home: "Home", dashboard: "Dashboard", targets: "Targets", scans: "Scan history", settings: "Settings", help: "Help", login: "Log in", register: "Register", logout: "Log out" },
  landing: {
    title: "Know how your website looks to an attacker — and how to fix it.",
    intro: "HISN checks websites you are authorized to test for common security weaknesses: HTTPS and certificates, security headers, cookie attributes and simple misconfigurations. Every finding shows the evidence observed and clear remediation steps.",
    start: "Create a free account",
    howTitle: "How an assessment works",
    steps: ["Add a website you own or are authorized to test.", "HISN sends a few normal HTTP requests from the server — no attacks, no port scanning.", "Results are saved with evidence, severity and remediation.", "Download a PDF report or compare scans over time."],
    featuresTitle: "What HISN checks",
    features: [
      ["HTTPS & TLS", "HTTPS usage, HTTP→HTTPS redirect, certificate trust and expiry."],
      ["Security headers", "CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy."],
      ["Cookies", "Secure, HttpOnly and SameSite attributes of observed cookies."],
      ["Misconfigurations", "Version disclosure, clickjacking, directory listing, risky CORS."],
    ],
    limitsTitle: "Honest limits",
    limits: "HISN is a basic, non-intrusive assessment. Finding no issues does not mean a website is completely secure.",
  },
  auth: { email: "Email", password: "Password", loginTitle: "Log in to HISN", registerTitle: "Create your account", submitLogin: "Log in", submitRegister: "Create account", haveAccount: "Already have an account?", noAccount: "No account yet?", checkEmail: "Account created. Check your email to confirm it, then log in." },
  dashboard: { title: "Dashboard", targets: "Saved targets", scans: "Total scans", completed: "Completed scans", failed: "Failed scans", bySeverity: "Open issues by severity (latest scan per target)", recent: "Recent scans", none: "No scans yet. Add a target and start your first assessment." },
  targets: { title: "Targets", add: "Add target", name: "Name", url: "URL", authorized: "I own this website or have written permission to test it.", save: "Save", delete: "Delete", scan: "Start scan", history: "Scan history", none: "No targets yet.", edit: "Edit target" },
  scans: { title: "Scan history", status: "Status", started: "Started", completed: "Completed", findings: "Findings", report: "Download PDF report", filter: "Filter by severity", all: "All", compare: "Compare", none: "No scans yet.", evidence: "Evidence", remediation: "Remediation", confidence: "Confidence", networkNote: "New scans need an internet connection and run on the server." },
  settings: { title: "Account settings", displayName: "Display name", language: "Preferred language", save: "Save settings", saved: "Settings saved." },
  severity: { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Informational" },
  status: { running: "Running", completed: "Completed", failed: "Failed", passed: "Passed", info: "Info", inconclusive: "Inconclusive" },
  footer: "HISN — Computing Diploma graduation project. Only test websites you are authorized to assess.",
};

type Dict = typeof en;

const ar: Dict = {
  appName: "حِصن",
  tagline: "تقييم أمن تطبيقات الويب للمواقع التي تملكها",
  nav: { home: "الرئيسية", dashboard: "لوحة التحكم", targets: "المواقع", scans: "سجل الفحوصات", settings: "الإعدادات", help: "المساعدة", login: "تسجيل الدخول", register: "إنشاء حساب", logout: "تسجيل الخروج" },
  landing: {
    title: "اعرف كيف يرى المهاجم موقعك — وكيف تصلح نقاط الضعف.",
    intro: "يفحص حِصن المواقع التي لديك تصريح باختبارها بحثًا عن نقاط الضعف الشائعة: HTTPS والشهادات، وترويسات الأمان، وخصائص ملفات تعريف الارتباط، والإعدادات الخاطئة البسيطة. كل نتيجة تعرض الدليل الملاحظ وخطوات المعالجة.",
    start: "أنشئ حسابًا مجانيًا",
    howTitle: "كيف يعمل التقييم",
    steps: ["أضف موقعًا تملكه أو لديك تصريح باختباره.", "يرسل حِصن عددًا قليلًا من طلبات HTTP العادية من الخادم — دون هجمات أو فحص منافذ.", "تُحفظ النتائج مع الدليل والخطورة وطريقة المعالجة.", "نزّل تقرير PDF أو قارن الفحوصات عبر الزمن."],
    featuresTitle: "ماذا يفحص حِصن",
    features: [
      ["HTTPS و TLS", "استخدام HTTPS، والتحويل من HTTP، وموثوقية الشهادة وانتهاؤها."],
      ["ترويسات الأمان", "CSP و HSTS و X-Content-Type-Options و Referrer-Policy و Permissions-Policy."],
      ["ملفات تعريف الارتباط", "خصائص Secure و HttpOnly و SameSite."],
      ["الإعدادات الخاطئة", "كشف الإصدارات، والتأطير (Clickjacking)، وعرض المجلدات، و CORS الخطِر."],
    ],
    limitsTitle: "حدود واضحة",
    limits: "حِصن تقييم أساسي غير تدخلي. عدم وجود نتائج لا يعني أن الموقع آمن تمامًا.",
  },
  auth: { email: "البريد الإلكتروني", password: "كلمة المرور", loginTitle: "تسجيل الدخول إلى حِصن", registerTitle: "إنشاء حساب", submitLogin: "دخول", submitRegister: "إنشاء الحساب", haveAccount: "لديك حساب؟", noAccount: "ليس لديك حساب؟", checkEmail: "تم إنشاء الحساب. أكّد بريدك الإلكتروني ثم سجّل الدخول." },
  dashboard: { title: "لوحة التحكم", targets: "المواقع المحفوظة", scans: "إجمالي الفحوصات", completed: "فحوصات مكتملة", failed: "فحوصات فاشلة", bySeverity: "المشكلات حسب الخطورة (آخر فحص لكل موقع)", recent: "أحدث الفحوصات", none: "لا توجد فحوصات بعد. أضف موقعًا وابدأ أول تقييم." },
  targets: { title: "المواقع", add: "إضافة موقع", name: "الاسم", url: "الرابط", authorized: "أملك هذا الموقع أو لدي إذن مكتوب باختباره.", save: "حفظ", delete: "حذف", scan: "بدء الفحص", history: "سجل الفحوصات", none: "لا توجد مواقع بعد.", edit: "تعديل الموقع" },
  scans: { title: "سجل الفحوصات", status: "الحالة", started: "البدء", completed: "الانتهاء", findings: "النتائج", report: "تنزيل تقرير PDF", filter: "تصفية حسب الخطورة", all: "الكل", compare: "مقارنة", none: "لا توجد فحوصات بعد.", evidence: "الدليل", remediation: "المعالجة", confidence: "درجة الثقة", networkNote: "تحتاج الفحوصات الجديدة إلى اتصال بالإنترنت وتعمل على الخادم." },
  settings: { title: "إعدادات الحساب", displayName: "الاسم الظاهر", language: "اللغة المفضلة", save: "حفظ الإعدادات", saved: "تم حفظ الإعدادات." },
  severity: { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة", info: "معلوماتية" },
  status: { running: "قيد التنفيذ", completed: "مكتمل", failed: "فاشل", passed: "ناجح", info: "معلومة", inconclusive: "غير حاسم" },
  footer: "حِصن — مشروع تخرج دبلوم الحوسبة. افحص فقط المواقع المصرّح لك بتقييمها.",
};

export type Lang = "en" | "ar";

export async function getDict(): Promise<{ lang: Lang; t: Dict }> {
  const lang = (await cookies()).get("lang")?.value === "ar" ? "ar" : "en";
  return { lang, t: lang === "ar" ? ar : en };
}
