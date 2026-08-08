// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例3 用。「会員」固有の知識が shared に置かれている。

import { LOYAL_MEMBER_YEARS } from './constants';

export function isLoyal(membershipYears: number): boolean {
  return membershipYears >= LOYAL_MEMBER_YEARS;
}

export function displayName(user: { name: string; membershipYears: number }): string {
  return isLoyal(user.membershipYears) ? `${user.name} 様（優待）` : `${user.name} 様`;
}
