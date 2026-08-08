// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例3 用。「通知」固有の知識が shared に置かれている。

import { ADMIN_MAIL, MAIL_SUBJECT_WELCOME } from './constants';

export function welcomeMail(name: string): { subject: string; body: string } {
  return {
    subject: MAIL_SUBJECT_WELCOME,
    body: `${name} 様\nご登録ありがとうございます。\nお問い合わせ: ${ADMIN_MAIL}`,
  };
}

export function orderMail(name: string, total: number): { subject: string; body: string } {
  return {
    subject: 'ご注文ありがとうございます',
    body: `${name} 様\n合計 ${total} 円です。\nお問い合わせ: ${ADMIN_MAIL}`,
  };
}
