/**
 * BOSS直聘 common utilities — 招聘端 + 求职者端共用
 *
 * 基于 jackwener/opencli 的 boss/common.ts，扩展了求职者端（geek）辅助函数。
 */
import type { IPage } from '@jackwener/opencli/types';

// ── Constants ───────────────────────────────────────────────────────────────

export const BOSS_DOMAIN = 'www.zhipin.com';
const CHAT_URL = `https://${BOSS_DOMAIN}/web/chat/index`;
const GEEK_JOB_URL = `https://${BOSS_DOMAIN}/web/geek/job`;
const COOKIE_EXPIRED_CODES = new Set([7, 37]);
const COOKIE_EXPIRED_MSG = 'Cookie 已过期！请在当前 Chrome 浏览器中重新登录 BOSS 直聘。';
const DEFAULT_TIMEOUT = 15_000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface BossApiResponse {
  code: number;
  message?: string;
  zpData?: any;
  [key: string]: any;
}

export interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: string;
  timeout?: number;
  allowNonZero?: boolean;
}

// ── Core helpers ────────────────────────────────────────────────────────────

export function verbose(msg: string): void {
  if (process.env.OPENCLI_VERBOSE) console.error('[boss]', msg);
}

export function requirePage(page: IPage | null): asserts page is IPage {
  if (!page) throw new Error('Browser page required');
}

export async function navigateToChat(page: IPage, waitSeconds = 2): Promise<void> {
  await page.goto(CHAT_URL);
  await page.wait({ time: waitSeconds });
}

export async function navigateTo(page: IPage, url: string, waitSeconds = 1): Promise<void> {
  await page.goto(url);
  await page.wait({ time: waitSeconds });
}

export function checkAuth(data: BossApiResponse): void {
  if (COOKIE_EXPIRED_CODES.has(data.code)) {
    throw new Error(COOKIE_EXPIRED_MSG);
  }
}

export function assertOk(data: BossApiResponse, errorPrefix?: string): void {
  if (data.code === 0) return;
  checkAuth(data);
  const prefix = errorPrefix ? `${errorPrefix}: ` : '';
  throw new Error(`${prefix}${data.message || 'Unknown error'} (code=${data.code})`);
}

export async function bossFetch(
  page: IPage,
  url: string,
  opts: FetchOptions = {},
): Promise<BossApiResponse> {
  const method = opts.method ?? 'GET';
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
  const body = opts.body ?? null;

  const script = `
    async () => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(${JSON.stringify(method)}, ${JSON.stringify(url)}, true);
        xhr.withCredentials = true;
        xhr.timeout = ${timeout};
        xhr.setRequestHeader('Accept', 'application/json');
        ${method === 'POST' ? `xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');` : ''}
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch(e) { reject(new Error('JSON parse failed: ' + xhr.responseText.substring(0, 200))); }
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.send(${body ? JSON.stringify(body) : 'null'});
      });
    }
  `;

  const data = await page.evaluate(script) as BossApiResponse;

  if (!opts.allowNonZero && data.code !== 0) {
    assertOk(data);
  }

  return data;
}

// ── 招聘端辅助 ───────────────────────────────────────────────────────────────

export async function fetchFriendList(
  page: IPage,
  opts: { pageNum?: number; jobId?: string } = {},
): Promise<any[]> {
  const pageNum = opts.pageNum ?? 1;
  const jobId = opts.jobId ?? '0';
  const url = `https://${BOSS_DOMAIN}/wapi/zprelation/friend/getBossFriendListV2.json?page=${pageNum}&status=0&jobId=${jobId}`;
  const data = await bossFetch(page, url);
  return data.zpData?.friendList || [];
}

export async function fetchRecommendList(page: IPage): Promise<any[]> {
  const url = `https://${BOSS_DOMAIN}/wapi/zprelation/friend/getNewGreetList.json?page=1`;
  const data = await bossFetch(page, url);
  return data.zpData?.greetRecSortList || data.zpData?.friendList || [];
}

export async function findFriendByUid(
  page: IPage,
  encryptUid: string,
  opts: { maxPages?: number; checkGreetList?: boolean } = {},
): Promise<any | null> {
  const maxPages = opts.maxPages ?? 3;

  if (opts.checkGreetList) {
    const greetList = await fetchRecommendList(page);
    const found = greetList.find((f: any) => f.encryptUid === encryptUid);
    if (found) return found;
  }

  for (let p = 1; p <= maxPages; p++) {
    const list = await fetchFriendList(page, { pageNum: p });
    if (list.length === 0) break;
    const found = list.find((f: any) => f.encryptUid === encryptUid);
    if (found) return found;
  }
  return null;
}

export async function clickCandidateInList(page: IPage, numericUid: string | number): Promise<boolean> {
  const result = await page.evaluate(`
    (() => {
      const items = document.querySelectorAll('.chat-list-item, .friend-item, [data-uid]');
      for (const item of items) {
        const uid = item.getAttribute('data-uid') || item.dataset?.uid;
        if (uid && String(uid) === String(${JSON.stringify(numericUid)})) {
          item.click();
          return true;
        }
      }
      return false;
    })()
  `);
  return result as boolean;
}

export async function typeAndSendMessage(page: IPage, text: string): Promise<boolean> {
  const result = await page.evaluate(`
    (() => {
      const input = document.querySelector('.chat-input-box [contenteditable]')
        || document.querySelector('[contenteditable="true"]')
        || document.querySelector('.input-area textarea');
      if (!input) return false;
      input.focus();
      document.execCommand('insertText', false, ${JSON.stringify(text)});
      const sendBtn = document.querySelector('.send-btn:not([disabled]), .btn-send:not([disabled])');
      if (sendBtn) { sendBtn.click(); return true; }
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
      input.dispatchEvent(event);
      return true;
    })()
  `);
  return result as boolean;
}

// ── 求职者端辅助 ─────────────────────────────────────────────────────────────

/**
 * 导航到求职者首页，建立 geek 端 cookie 上下文
 */
export async function navigateToGeekJob(page: IPage, waitSeconds = 1): Promise<void> {
  await page.goto(GEEK_JOB_URL);
  await page.wait({ time: waitSeconds });
}

/**
 * 求职者端 XHR 请求（和 bossFetch 完全一样，语义区分）
 */
export const geekFetch = bossFetch;

/**
 * 获取求职者聊天列表（geek 侧）
 */
export async function fetchGeekChatList(
  page: IPage,
  opts: { pageNum?: number } = {},
): Promise<any[]> {
  const pageNum = opts.pageNum ?? 1;
  const url = `https://${BOSS_DOMAIN}/wapi/zpgeek/friend/getGeekFriendListV2.json?page=${pageNum}&status=0`;
  const data = await bossFetch(page, url);
  return data.zpData?.friendList || [];
}

/**
 * 在求职者聊天列表中按 encryptUid 找到对话
 */
export async function findGeekFriendByUid(
  page: IPage,
  encryptUid: string,
  maxPages = 3,
): Promise<any | null> {
  for (let p = 1; p <= maxPages; p++) {
    const list = await fetchGeekChatList(page, { pageNum: p });
    if (list.length === 0) break;
    const found = list.find((f: any) => f.encryptUid === encryptUid);
    if (found) return found;
  }
  return null;
}
