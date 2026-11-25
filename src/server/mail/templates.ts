import Handlebars from "handlebars";

/**
 * Email templates. Each has a subject, a plain-text body and an HTML body.
 * Handlebars escapes `{{value}}`, so user-provided text is safe in HTML.
 */
export type EmailTemplates = {
  verify_email: { firstName: string; code: string };
  password_reset: { firstName: string; url: string };
  password_changed: { firstName: string };
  notification: {
    firstName: string;
    title: string;
    body: string;
    url?: string;
    cta?: string;
  };
  payment_receipt: {
    firstName: string;
    amount: string;
    vehicle: string;
    reference: string;
    url: string;
  };
};

export type EmailName = keyof EmailTemplates;

type Source = { subject: string; text: string; html: string };

const SOURCES: Record<EmailName, Source> = {
  verify_email: {
    subject: "{{code}} is your RentARide code",
    text: "Hi {{firstName}},\n\nYour RentARide verification code is {{code}}. It expires in 10 minutes.\n\nIf you didn't sign up, ignore this email.",
    html: `<p>Hi {{firstName}},</p>
<p>Your RentARide verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">{{code}}</p>
<p>It expires in 10 minutes. If you didn't sign up, ignore this email.</p>`,
  },
  password_reset: {
    subject: "Reset your RentARide password",
    text: "Hi {{firstName}},\n\nReset your password with this link, which works for one hour:\n{{url}}\n\nIf you didn't ask for this, ignore this email. Your password won't change.",
    html: `<p>Hi {{firstName}},</p>
<p>Use the button below to choose a new password. The link works for one hour.</p>
{{> button url=url label="Reset password"}}
<p>If you didn't ask for this, ignore this email. Your password won't change.</p>`,
  },
  password_changed: {
    subject: "Your RentARide password was changed",
    text: "Hi {{firstName}},\n\nYour password was just changed and you were signed out of other devices. If this wasn't you, reset your password now and contact support@rentaride.ng.",
    html: `<p>Hi {{firstName}},</p>
<p>Your password was just changed and you were signed out of other devices.</p>
<p>If this wasn't you, reset your password now and contact support@rentaride.ng.</p>`,
  },
  notification: {
    subject: "{{title}}",
    text: "Hi {{firstName}},\n\n{{body}}{{#if url}}\n\n{{url}}{{/if}}",
    html: `<p>Hi {{firstName}},</p>
<p>{{body}}</p>
{{#if url}}{{> button url=url label=(or cta "Open RentARide")}}{{/if}}`,
  },
  payment_receipt: {
    subject: "Receipt: {{amount}} for your {{vehicle}}",
    text: "Hi {{firstName}},\n\nWe received {{amount}} for your {{vehicle}}.\nReference: {{reference}}\n\n{{url}}",
    html: `<p>Hi {{firstName}},</p>
<p>We received <strong>{{amount}}</strong> for your {{vehicle}}.</p>
<p>Reference: <code>{{reference}}</code></p>
{{> button url=url label="View lease"}}`,
  },
};

const layout = Handlebars.compile(`<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0"><tr><td style="font-size:15px;line-height:1.6">
<p style="font-weight:700;font-size:16px;margin:0 0 24px">RentARide</p>
{{{content}}}
<p style="color:#71717a;font-size:12px;margin-top:32px">RentARide, Lagos, Nigeria</p>
</td></tr></table></td></tr></table></body></html>`);

const hb = Handlebars.create();
hb.registerHelper("or", (a: unknown, b: unknown) => a || b);
hb.registerPartial(
  "button",
  `<p style="margin:24px 0"><a href="{{url}}" style="background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block;font-weight:600">{{label}}</a></p>`,
);

const compiled = Object.fromEntries(
  Object.entries(SOURCES).map(([name, s]) => [
    name,
    {
      subject: hb.compile(s.subject, { noEscape: true }),
      text: hb.compile(s.text, { noEscape: true }),
      html: hb.compile(s.html),
    },
  ]),
) as Record<EmailName, Record<keyof Source, HandlebarsTemplateDelegate>>;

export function renderEmail<N extends EmailName>(
  name: N,
  data: EmailTemplates[N],
) {
  const t = compiled[name];
  return {
    subject: t.subject(data),
    text: t.text(data),
    html: layout({ content: t.html(data) }),
  };
}
