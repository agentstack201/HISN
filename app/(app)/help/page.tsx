import { getDict } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import Reveal from "@/components/Reveal";

export const metadata = { title: "Help" };

// Help content in both languages: [heading, paragraphs or bullet list].
const content = {
  ar: [
    ["ماذا يفعل الفحص؟", ["يرسل حِصن طلبات GET عادية إلى الرابط الذي حفظته (وإلى نسخته http://)، ويتبع حتى 5 تحويلات، ثم يقرأ ترويسات الاستجابة وملفات تعريف الارتباط وشهادة TLS. لا يهاجم ولا يسجّل الدخول ولا يخمّن كلمات المرور ولا يزحف على الموقع ولا يفحص المنافذ."]],
    ["مستويات الخطورة", ["عالية: لا يوجد HTTPS أو الشهادة غير موثوقة، فيمكن قراءة البيانات أو تعديلها.", "متوسطة: غياب CSP أو HSTS، أو عدم التحويل إلى HTTPS، أو ملفات ارتباط غير آمنة، أو عرض المجلدات، أو CORS خطِر.", "منخفضة: ثغرات تقوية مثل غياب nosniff أو Referrer-Policy، أو كشف الإصدارات، أو إمكانية التأطير.", "معلوماتية: ملاحظات وفحوصات ناجحة.", "لا تُنتج الفحوصات الحالية نتائج «حرجة»: غياب الترويسات وحده ليس ثغرة حرجة."]],
    ["قواعد الاستخدام", ["أضف فقط المواقع التي تملكها أو لديك إذن مكتوب باختبارها. الشبكات الخاصة و localhost وعناوين بيانات السحابة محظورة. يسمح لكل حساب بـ 5 فحوصات كل 10 دقائق.", "الفحوصات الجديدة تحتاج اتصالًا بالإنترنت وتعمل على الخادم."]],
    ["ماذا تعني حالة النتيجة؟", ["ناجح: الفحص تم ولا توجد مشكلة. معلومة: ملاحظة بلا خطر مباشر. غير حاسم: تعذّر التحقق (مثل عدم استجابة HTTP)، وهو ليس ثغرة. فاشل: تم رصد مشكلة.", "فشل الفحص كله (مثل انتهاء المهلة) يعني أنه لا توجد استنتاجات أمنية، وليس أن الموقع مصاب."]],
    ["التواصل", ["حِصن مشروع تخرج لدبلوم الحوسبة. للاستفسار تواصل مع فريق المشروع عبر مشرف المقرر."]],
  ],
  en: [
    ["What does a scan do?", ["HISN sends normal GET requests to the URL you saved (and to its http:// version), follows up to 5 redirects and reads the response headers, cookies and TLS certificate. It does not attack, log in, guess passwords, crawl, or scan ports."]],
    ["Severity levels", ["High: no HTTPS or an untrusted certificate: traffic can be read or changed.", "Medium: missing CSP/HSTS, no HTTPS redirect, insecure cookies, directory listing, risky CORS.", "Low: hardening gaps such as missing nosniff, Referrer-Policy, version disclosure, framing.", "Informational: observations and passed checks.", "The current checks never produce Critical findings: missing headers alone are not critical vulnerabilities."]],
    ["Rules of use", ["Only add websites you own or have written permission to test. Private networks, localhost and cloud metadata addresses are blocked. Each account may run 5 scans per 10 minutes.", "New scans need an internet connection and run on the server."]],
    ["What does a result status mean?", ["Passed: checked, no problem. Info: an observation with no direct risk. Inconclusive: could not be verified (for example HTTP did not respond); this is not a vulnerability. Failed: an issue was detected.", "A failed scan (for example a timeout) means no security conclusion can be drawn, not that the site is vulnerable."]],
    ["Contact", ["HISN is a diploma graduation project. For questions, contact the project team through your course supervisor."]],
  ],
} as const;

export default async function HelpPage() {
  const { lang, t } = await getDict();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t.nav.help} />
      {content[lang].map(([heading, items], i) => (
        <Reveal as="section" key={heading} delay={Math.min(i, 5) * 60} className="card card-hover space-y-2">
          <h2 className="text-lg font-semibold">{heading}</h2>
          {/^(مستويات|Severity)/.test(heading) ? (
            <ul className="list-disc space-y-1 ps-5 text-muted">{items.map((i) => <li key={i}>{i}</li>)}</ul>
          ) : (
            items.map((i) => <p key={i} className="text-muted">{i}</p>)
          )}
        </Reveal>
      ))}
    </div>
  );
}
