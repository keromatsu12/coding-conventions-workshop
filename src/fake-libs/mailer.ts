/**
 * ============================================================
 *  ⚠️ このファイルは【リファクタリング対象外】です。
 * ============================================================
 *
 * 外部の SMTP サーバなしでワークショップを動かすための「偽メール送信」です。
 * 送った内容は標準出力に出しつつ、後から検証できるよう配列にも溜めます。
 *
 * 宛先が不正な場合は **本当に例外を投げます**。
 * 第10章 10-3「握りつぶし」の演習で、catch {} が何を飲み込んでいるかを
 * 目で確かめられるようにするためです。
 */

export class MailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailError';
  }
}

export interface SentMail {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

const outbox: SentMail[] = [];

export function getOutbox(): readonly SentMail[] {
  return outbox;
}

export function clearOutbox(): void {
  outbox.length = 0;
}

export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new MailError(`メールを送信できません: 宛先が不正です (to=${JSON.stringify(to)})`);
  }

  const mail: SentMail = { to, subject, body, sentAt: new Date().toISOString() };
  outbox.push(mail);

  console.log(`    [mail] to=${to} subject=${subject}`);
  console.log(`    [mail] ${body.split('\n').join('\n    [mail] ')}`);
}
