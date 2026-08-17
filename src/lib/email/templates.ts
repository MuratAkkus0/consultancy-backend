export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const brand = {
  name: "Milestone Education Germany",
  siteUrl: "https://www.milestonegermany.de",
  logoUrl: "https://www.milestonegermany.de/images/logo-yatay-colored.png",
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
