import { env } from "../../config/env.js";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const brand = {
  name: "Milestone Education Germany",
  siteUrl: env.APP_WEB_URL,
  logoUrl: `${env.APP_WEB_URL}/images/logo-yatay-colored.png`,
  supportEmail: "info@milestonegermany.de",
  phone: "+49 160 8520519",
  phoneHref: "+491608520519",
  whatsappUrl: "https://wa.me/491608520519",
  colors: {
    primary: "#03152d",
    primaryDark: "#010a17",
    primarySoft: "#f4f6f8",
    accent: "#f59e08",
    canvas: "#f9fafb",
    surface: "#ffffff",
    muted: "#4b5563",
    subtle: "#9ca3af",
    line: "#e5e7eb",
    // Inceleme sonucu bildirimleri icin. Lacivert/altin paletle cakismasin
    // diye ikisi de doygunlugu dusuk, koyu tonlar.
    success: "#15803d",
    danger: "#b91c1c",
  },

  font:
    "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, " +
    "Helvetica, Arial, sans-serif",
} as const;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

interface LayoutInput {
  subject: string;
  // Shown by inboxes next to the subject line; kept out of the visible body.
  preheader: string;
  heading: string;
  // Trusted HTML: built by the exporters below, never raw user input.
  bodyHtml: string;
  action: { url: string; label: string };
  footnoteHtml: string;
}

// Shared shell so every email looks the same. Tables and inline styles only -
// Outlook ignores modern layout, and most clients strip <style> rules. The one
// <style> block is a progressive enhancement for mobile: where it is dropped the
// inline styles still render a correct email.
const layout = ({
  subject,
  preheader,
  heading,
  bodyHtml,
  action,
  footnoteHtml,
}: LayoutInput) => {
  const c = brand.colors;
  const href = escapeHtml(action.url);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width:600px) {
    .ms-shell { padding: 16px 12px !important; }
    .ms-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .ms-heading { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background:${c.canvas};-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:${c.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.canvas};">
    <tr>
      <td class="ms-shell" align="center" style="padding:40px 16px;">

        <!--
          Fluid-hybrid width: the tables stay fluid with a max-width so they can
          shrink on phones, and Outlook (which ignores max-width) gets the fixed
          600px from this conditional wrapper instead.
        -->
        <!--[if mso | IE]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${c.surface};border:1px solid ${c.line};border-radius:24px;overflow:hidden;">
          <!-- Brand rule: the navy/gold split echoes the star and the flag stripe in the logo. -->
          <tr>
            <td width="78%" height="4" style="background:${c.primary};font-size:0;line-height:0;">&nbsp;</td>
            <td width="22%" height="4" style="background:${c.accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td colspan="2" align="center" style="padding:32px 24px 28px;">
              <a href="${escapeHtml(brand.siteUrl)}" style="text-decoration:none;">
                <img src="${escapeHtml(brand.logoUrl)}" width="200" height="83" alt="${escapeHtml(brand.name)}" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="height:1px;background:${c.line};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td colspan="2" class="ms-pad" style="padding:36px 40px 40px;">

              <h1 class="ms-heading" style="margin:0 0 18px;font-family:${brand.font};font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.2px;color:${c.primary};">${escapeHtml(heading)}</h1>

              <div style="font-family:${brand.font};font-size:15px;line-height:1.7;color:${c.muted};">${bodyHtml}</div>

              <!-- Button as a table cell: Outlook drops the radius but still paints the fill. -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
                <tr>
                  <td align="center" bgcolor="${c.primary}" style="border-radius:12px;">
                    <a href="${href}" style="display:inline-block;padding:15px 34px;font-family:${brand.font};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(action.label)}</a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
                <tr>
                  <td style="background:${c.primarySoft};border:1px solid ${c.line};border-radius:12px;padding:16px 18px;font-family:${brand.font};font-size:13px;line-height:1.6;color:${c.muted};">
                    Buton çalışmazsa bu bağlantıyı tarayıcınızın adres çubuğuna kopyalayın:<br />
                    <a href="${href}" style="color:${c.primary};font-weight:600;word-break:break-all;text-decoration:underline;">${href}</a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
                <tr>
                  <td style="border-top:1px solid ${c.line};padding-top:20px;font-family:${brand.font};font-size:13px;line-height:1.6;color:${c.subtle};">${footnoteHtml}</td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
          <tr>
            <td align="center" style="padding:24px 16px 8px;font-family:${brand.font};font-size:13px;line-height:1.7;color:${c.subtle};">
              <div style="font-weight:700;color:${c.primary};">${escapeHtml(brand.name)}</div>
              <!-- Plain spaces around the separators on purpose: &nbsp; would make
                   this one unbreakable run and push the whole layout past 600px. -->
              <div style="margin-top:4px;">
                <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${c.muted};text-decoration:none;white-space:nowrap;">${escapeHtml(brand.supportEmail)}</a>
                <span style="color:${c.line};">·</span>
                <a href="tel:${escapeHtml(brand.phoneHref)}" style="color:${c.muted};text-decoration:none;white-space:nowrap;">${escapeHtml(brand.phone)}</a>
                <span style="color:${c.line};">·</span>
                <a href="${escapeHtml(brand.siteUrl)}" style="color:${c.muted};text-decoration:none;white-space:nowrap;">milestonegermany.de</a>
              </div>
              <div style="margin-top:12px;color:${c.subtle};">
                Bu otomatik bir bilgilendirme e-postasıdır, lütfen yanıtlamayın.<br />
                Sorularınız için <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${c.muted};">${escapeHtml(brand.supportEmail)}</a> adresine yazabilir ya da
                <a href="${escapeHtml(brand.whatsappUrl)}" style="color:${c.muted};">WhatsApp</a> üzerinden ulaşabilirsiniz.
              </div>
            </td>
          </tr>
        </table>

        <!--[if mso | IE]></td></tr></table><![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;
};

const greeting = (name?: string) =>
  name ? `Merhaba ${name.trim()},` : "Merhaba,";

// Same frame for every plaintext part, so the fallback carries the brand too.
const plain = (lines: string[]) =>
  [
    ...lines,
    "",
    "—",
    brand.name,
    brand.supportEmail + " · " + brand.phone,
    brand.siteUrl,
    "",
    "Bu otomatik bir bilgilendirme e-postasıdır, lütfen yanıtlamayın.",
  ].join("\n");

export const resetPasswordEmail = ({
  url,
  name,
  expiresInHours = 1,
}: {
  url: string;
  name?: string;
  expiresInHours?: number;
}): EmailContent => ({
  subject: `Şifre sıfırlama isteği · ${brand.name}`,
  text: plain([
    greeting(name),
    "",
    "Milestone Education Germany hesabınız için bir şifre sıfırlama isteği aldık.",
    "Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın:",
    "",
    url,
    "",
    `Bu bağlantı güvenliğiniz için ${expiresInHours} saat sonra geçersiz olur ve yalnızca bir kez kullanılabilir.`,
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmeden kalır.",
  ]),
  html: layout({
    subject: "Şifre sıfırlama isteği",
    preheader: `Şifrenizi ${expiresInHours} saat içinde sıfırlayabilirsiniz.`,
    heading: "Şifrenizi sıfırlayın",
    bodyHtml: `<p style="margin:0 0 14px;">${escapeHtml(greeting(name))}</p>
             <p style="margin:0;">Hesabınız için bir şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.</p>`,
    action: { url, label: "Şifremi sıfırla" },
    footnoteHtml: `<strong style="color:${brand.colors.muted};">Güvenlik notu:</strong> Bu bağlantı ${expiresInHours} saat sonra geçersiz olur ve yalnızca bir kez kullanılabilir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz — şifreniz değişmeden kalır.`,
  }),
});

export const verifyEmail = ({
  url,
  name,
  expiresInHours = 1,
}: {
  url: string;
  name?: string;
  expiresInHours?: number;
}): EmailContent => ({
  subject: `E-posta adresinizi doğrulayın · ${brand.name}`,
  text: plain([
    greeting(name),
    "",
    "Milestone Education Germany'ye hoş geldiniz.",
    "Hesabınızı etkinleştirmek için e-posta adresinizi aşağıdaki bağlantıdan doğrulayın:",
    "",
    url,
    "",
    `Bu bağlantı ${expiresInHours} saat boyunca geçerlidir.`,
    "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.",
  ]),
  html: layout({
    subject: "E-posta adresinizi doğrulayın",
    preheader: "Hesabınızı etkinleştirmek için tek bir adım kaldı.",
    heading: "E-posta adresinizi doğrulayın",
    bodyHtml: `<p style="margin:0 0 14px;">${escapeHtml(greeting(name))}</p>
             <p style="margin:0 0 14px;"><strong style="color:${brand.colors.primary};">${escapeHtml(brand.name)}</strong>'ye hoş geldiniz. Yurt dışı eğitim yolculuğunuza başlamak için son bir adım kaldı.</p>
             <p style="margin:0;">Hesabınızı etkinleştirmek için aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın.</p>`,
    action: { url, label: "E-postamı doğrula" },
    footnoteHtml: `Bu bağlantı ${expiresInHours} saat boyunca geçerlidir. Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.`,
  }),
});

// Tek örnek: Intl formatter kurulumu pahalı, her e-postada yeniden yaratmayalım.
// Saat dilimi sabit (Europe/Berlin) — sunucu TZ'i değişse de e-postadaki saat
// alıcı için aynı anlama gelsin.
const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const detailRow = (label: string, value: string, valueColor?: string) => {
  const c = brand.colors;
  return `<tr>
    <td style="padding:10px 0 0;font-family:${brand.font};font-size:13px;line-height:1.5;color:${c.subtle};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0 0 16px;font-family:${brand.font};font-size:13px;line-height:1.5;font-weight:600;color:${valueColor ?? c.primary};word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`;
};

type DetailRowTuple = [label: string, value: string, valueColor?: string];

// Şerit border-left yerine ayrı bir hücre: Outlook td border'larını yer yer
// yutuyor.
const detailCard = (rows: DetailRowTuple[], stripeColor?: string) => {
  const c = brand.colors;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;background:${c.surface};border:1px solid ${c.line};border-radius:12px;overflow:hidden;">
    <tr>
      <td width="4" bgcolor="${stripeColor ?? c.accent}" style="width:4px;font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding:8px 18px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows.map(([label, value, valueColor]) => detailRow(label, value, valueColor)).join("")}
        </table>
      </td>
    </tr>
  </table>`;
};

export interface DocumentUploadedEmailBase {
  recipientName?: string;
  documentName: string;
  documentTypeName: string;
  url: string;
  uploadedAt?: Date;
}

export interface DocumentUploadedEmailInput extends DocumentUploadedEmailBase {
  // Öğrenciye giden e-postada danışmanın yalnızca adı geçer, iletişim bilgisi
  // geçmez - bkz. /me/consultant kolon seti.
  uploaderName: string;
}

const documentUploadedEmail = (
  {
    recipientName,
    uploaderName,
    documentName,
    documentTypeName,
    url,
    uploadedAt,
  }: DocumentUploadedEmailBase & { uploaderName?: string },
  copy: {
    subjectLead: string;
    heading: string;
    // Yükleyeni açıklamayan varyantlarda boş string gelir.
    sentenceHtml: (uploaderNameHtml: string) => string;
    sentenceText: string;
    // Yalnızca uploaderName ile birlikte anlamlı; ikisi de yoksa satır düşer.
    uploaderLabel?: string;
    actionLabel: string;
    footnoteHtml: string;
    footnoteText: string;
  },
): EmailContent => {
  const showUploader = Boolean(copy.uploaderLabel && uploaderName);

  const rows: DetailRowTuple[] = [
    ["Belge", documentName],
    ["Belge türü", documentTypeName],
  ];
  if (showUploader) rows.push([copy.uploaderLabel!, uploaderName!]);
  if (uploadedAt) rows.push(["Yüklenme", dateTimeFormatter.format(uploadedAt)]);

  return {
    subject: `${copy.subjectLead}: ${documentName} · ${brand.name}`,
    text: plain([
      greeting(recipientName),
      "",
      copy.sentenceText,
      "",
      `Belge: ${documentName}`,
      `Belge türü: ${documentTypeName}`,
      ...(showUploader ? [`${copy.uploaderLabel}: ${uploaderName}`] : []),
      ...(uploadedAt
        ? [`Yüklenme: ${dateTimeFormatter.format(uploadedAt)}`]
        : []),
      "",
      "Panele gitmek için:",
      url,
      "",
      copy.footnoteText,
    ]),
    html: layout({
      subject: copy.heading,
      preheader: `${documentTypeName} · ${documentName}`,
      heading: copy.heading,
      bodyHtml: `<p style="margin:0 0 14px;">${escapeHtml(greeting(recipientName))}</p>
             <p style="margin:0;">${copy.sentenceHtml(showUploader ? `<strong style="color:${brand.colors.primary};">${escapeHtml(uploaderName!)}</strong>` : "")}</p>
             ${detailCard(rows)}`,
      action: { url, label: copy.actionLabel },
      footnoteHtml: copy.footnoteHtml,
    }),
  };
};

export const documentUploadedForConsultantEmail = (
  input: DocumentUploadedEmailInput,
): EmailContent =>
  documentUploadedEmail(input, {
    subjectLead: "Öğrenciniz yeni bir belge yükledi",
    heading: "Yeni bir belge yüklendi",
    sentenceHtml: (name) =>
      `Öğrenciniz ${name} yeni bir belge yükledi. Belgeyi panelinizden inceleyebilirsiniz.`,
    sentenceText:
      "Öğrencilerinizden biri yeni bir belge yükledi. Belgeyi panelinizden inceleyebilirsiniz.",
    uploaderLabel: "Öğrenci",
    actionLabel: "Panelde incele",
    footnoteHtml:
      "Belgeyi inceledikten sonra panelden onaylayabilir ya da reddedebilirsiniz. Öğrenci, belgenin inceleme durumunu kendi hesabından takip eder.",
    footnoteText:
      "Belgeyi inceledikten sonra panelden onaylayabilir ya da reddedebilirsiniz.",
  });

export const documentUploadedForStudentEmail = (
  input: DocumentUploadedEmailInput,
): EmailContent =>
  documentUploadedEmail(input, {
    subjectLead: "Hesabınıza yeni bir belge eklendi",
    heading: "Hesabınıza yeni bir belge eklendi",
    sentenceHtml: (name) =>
      `Danışmanınız ${name} hesabınıza yeni bir belge ekledi. Belgeyi hesabınızdan görüntüleyebilir ve indirebilirsiniz.`,
    sentenceText:
      "Danışmanınız hesabınıza yeni bir belge ekledi. Belgeyi hesabınızdan görüntüleyebilir ve indirebilirsiniz.",
    uploaderLabel: "Yükleyen danışman",
    actionLabel: "Panelde görüntüle",
    footnoteHtml:
      "Belge, hesabınızdaki belgeler bölümünde listelenir. Bu belgeyle ilgili bir sorunuz varsa danışmanınıza panelden mesaj gönderebilirsiniz.",
    footnoteText:
      "Belge, hesabınızdaki belgeler bölümünde listelenir. Sorularınızı danışmanınıza panelden iletebilirsiniz.",
  });

// Admin yüklemeleri için nötr varyant: öğrenci belgeden haberdar olur ama
// yükleyenin kimliği paylaşılmaz - admin, öğrenciye "danışmanınız" gibi
// görünmemeli ve panelde muhatabı da değil.
export const documentUploadedByAdminForStudentEmail = (
  input: DocumentUploadedEmailBase,
): EmailContent =>
  documentUploadedEmail(input, {
    subjectLead: "Hesabınıza yeni bir belge eklendi",
    heading: "Hesabınıza yeni bir belge eklendi",
    sentenceHtml: () =>
      "Hesabınıza yeni bir belge eklendi. Belgeyi hesabınızdan görüntüleyebilir ve indirebilirsiniz.",
    sentenceText:
      "Hesabınıza yeni bir belge eklendi. Belgeyi hesabınızdan görüntüleyebilir ve indirebilirsiniz.",
    actionLabel: "Panelde görüntüle",
    footnoteHtml:
      "Belge, hesabınızdaki belgeler bölümünde listelenir. Bu belgeyle ilgili bir sorunuz varsa danışmanınıza panelden mesaj gönderebilirsiniz.",
    footnoteText:
      "Belge, hesabınızdaki belgeler bölümünde listelenir. Sorularınızı danışmanınıza panelden iletebilirsiniz.",
  });

export interface DocumentReviewedEmailInput {
  recipientName?: string;
  reviewerName: string;
  documentName: string;
  documentTypeName: string;
  // Şemadan türetilmiyor: lib/email, db katmanına bağlanmasın.
  reviewStatus: "accepted" | "rejected";
  url: string;
  reviewedAt?: Date;
  // documents tablosunda henüz karşılığı yok (v2); gelmeden de doğru render eder.
  reason?: string;
}

export const documentReviewedForStudentEmail = ({
  recipientName,
  reviewerName,
  documentName,
  documentTypeName,
  reviewStatus,
  url,
  reviewedAt,
  reason,
}: DocumentReviewedEmailInput): EmailContent => {
  const c = brand.colors;
  const accepted = reviewStatus === "accepted";

  const verdict = accepted ? "Onaylandı" : "Reddedildi";
  const verdictColor = accepted ? c.success : c.danger;
  const heading = accepted ? "Belgeniz onaylandı" : "Belgeniz reddedildi";
  const sentence = accepted
    ? "belgenizi inceledi ve onayladı. Bu belge için başka bir işlem yapmanıza gerek yok."
    : "belgenizi inceledi ve reddetti. Belgeyi düzeltip yeniden yükleyebilirsiniz.";

  const rows: DetailRowTuple[] = [
    ["Belge", documentName],
    ["Belge türü", documentTypeName],
    ["Sonuç", verdict, verdictColor],
    ["İnceleyen danışman", reviewerName],
  ];
  if (reviewedAt) rows.push(["İnceleme", dateTimeFormatter.format(reviewedAt)]);

  const reasonHtml =
    !accepted && reason
      ? `<p style="margin:14px 0 0;"><strong style="color:${c.primary};">Gerekçe:</strong> ${escapeHtml(reason)}</p>`
      : "";

  return {
    subject: `${heading}: ${documentName} · ${brand.name}`,
    text: plain([
      greeting(recipientName),
      "",
      `Danışmanınız ${reviewerName} ${sentence}`,
      ...(!accepted && reason ? ["", `Gerekçe: ${reason}`] : []),
      "",
      `Belge: ${documentName}`,
      `Belge türü: ${documentTypeName}`,
      `Sonuç: ${verdict}`,
      `İnceleyen danışman: ${reviewerName}`,
      ...(reviewedAt
        ? [`İnceleme: ${dateTimeFormatter.format(reviewedAt)}`]
        : []),
      "",
      "Panele gitmek için:",
      url,
      "",
      accepted
        ? "Onaylanan belgeler başvuru dosyanızda kullanılır."
        : "Belgeyi düzelttikten sonra aynı belge türü için yeni bir yükleme yapabilirsiniz.",
    ]),
    html: layout({
      subject: heading,
      preheader: `${documentTypeName} · ${documentName}`,
      heading,
      bodyHtml: `<p style="margin:0 0 14px;">${escapeHtml(greeting(recipientName))}</p>
             <p style="margin:0;">Danışmanınız <strong style="color:${c.primary};">${escapeHtml(reviewerName)}</strong> ${escapeHtml(sentence)}</p>
             ${reasonHtml}
             ${detailCard(rows, verdictColor)}`,
      action: {
        url,
        label: accepted ? "Panelde görüntüle" : "Panelde yeniden yükle",
      },
      footnoteHtml: accepted
        ? "Onaylanan belgeler başvuru dosyanızda kullanılır. Belgenin güncel bir sürümü gerekirse danışmanınız sizi bilgilendirir."
        : "Belgeyi düzelttikten sonra aynı belge türü için yeni bir yükleme yapabilirsiniz. Neyin eksik olduğundan emin değilseniz danışmanınıza panelden mesaj gönderebilirsiniz.",
    }),
  };
};
