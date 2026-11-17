type EmailPayload = {
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function renderHtml(payload: EmailPayload): string {
  const cta = payload.ctaLabel && payload.ctaUrl
    ? `<a href="${payload.ctaUrl}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#f96416;color:#ffffff;border-radius:8px;font-weight:600;text-decoration:none;">${payload.ctaLabel}</a>`
    : "";
  const paragraphs = payload.paragraphs
    .map((text) => `<p style="margin:0 0 12px;line-height:1.6;color:#374151;">${text}</p>`)
    .join("");
  return `<!doctype html>
<html lang="sk">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td style="font-size:20px;font-weight:700;color:#0f766e;padding-bottom:8px;">Bazárnik</td></tr>
          <tr><td style="font-size:22px;font-weight:700;color:#111827;padding-bottom:16px;">${payload.heading}</td></tr>
          <tr><td>${paragraphs}${cta}</td></tr>
          <tr><td style="padding-top:24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
            Tento e-mail ste dostali, pretože máte účet na platforme Bazárnik.
            ${payload.footerNote ?? "Ak si myslíte, že ide o omylom, ignorujte tento e-mail."}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.info(
      `[email] RESEND_API_KEY nie je nastavený – e-mail sa neodoslal. Príjemca: ${payload.to}, predmet: ${payload.subject}`
    );
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Bazárnik <noreply@bazarnik.sk>",
      to: [payload.to],
      subject: payload.subject,
      html: renderHtml(payload),
    }),
  });
  if (!response.ok) {
    console.error(`[email] Odoslanie zlyhalo: ${response.status}`);
    return false;
  }
  return true;
}

export function newMessageEmail(to: string, senderName: string, listingTitle: string, conversationUrl: string) {
  return sendEmail({
    to,
    subject: `Nová správa od ${senderName} – Bazárnik`,
    heading: "Máte novú správu",
    paragraphs: [
      `<strong>${senderName}</strong> vám napísal/a ohľadom inzerátu <strong>${listingTitle}</strong>.`,
      "Odpovedzte priamo vo svojom účte v sekcii Správy.",
    ],
    ctaLabel: "Zobraziť správu",
    ctaUrl: conversationUrl,
  });
}

export function savedSearchMatchEmail(to: string, searchName: string, listingTitle: string, searchUrl: string) {
  return sendEmail({
    to,
    subject: `Nový inzerát vo vyhľadávaní „${searchName}“ – Bazárnik`,
    heading: "Nový inzerát zodpovedá vášmu vyhľadávaniu",
    paragraphs: [
      `Vo vašom uloženom vyhľadávaní <strong>${searchName}</strong> sa objavil nový inzerát: <strong>${listingTitle}</strong>.`,
    ],
    ctaLabel: "Zobraziť výsledky",
    ctaUrl: searchUrl,
  });
}

export function listingStatusEmail(to: string, listingTitle: string, statusLabel: string, profileUrl: string) {
  return sendEmail({
    to,
    subject: `Zmena stavu inzerátu – Bazárnik`,
    heading: "Stav vášho inzerátu sa zmenil",
    paragraphs: [
      `Inzerát <strong>${listingTitle}</strong> má teraz stav <strong>${statusLabel}</strong>.`,
    ],
    ctaLabel: "Moje inzeráty",
    ctaUrl: profileUrl,
  });
}

export function accountNoticeEmail(to: string, heading: string, paragraphs: string[]) {
  return sendEmail({
    to,
    subject: `${heading} – Bazárnik`,
    heading,
    paragraphs,
  });
}
