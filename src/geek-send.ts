/**
 * BOSS直聘 geek-send — 求职者端：向 HR 发送消息
 *
 * BOSS 直聘使用 MQTT 协议发消息，必须走 UI 自动化，不能直接调 API。
 * 流程：导航到 geek 聊天页 → 在列表找到对话 → 点击 → 输入并发送。
 */
import { cli, Strategy } from '@jackwener/opencli';
import {
  requirePage, navigateTo, findGeekFriendByUid,
  typeAndSendMessage, verbose, BOSS_DOMAIN,
} from './common.js';

const GEEK_CHAT_URL = `https://${BOSS_DOMAIN}/web/geek/chat`;

cli({
  site: 'boss',
  name: 'geek-send',
  description: 'BOSS直聘向 HR 发送消息（求职者端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, help: 'HR 的 encryptUid（来自 geek-chatlist 或 geek-inbox）' },
    { name: 'text', required: true, positional: true, help: '要发送的消息内容' },
  ],
  columns: ['status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose(`向 HR ${kwargs.uid} 发送消息...`);

    // 导航到 geek 聊天页，建立上下文
    await navigateTo(page, GEEK_CHAT_URL, 3);

    const friend = await findGeekFriendByUid(page, kwargs.uid);
    if (!friend) throw new Error('未找到该 HR，请确认 uid 是否正确（来自 geek-chatlist 或 geek-inbox）');

    const numericUid = friend.uid || friend.bossUid;
    const friendName = friend.bossName || friend.name || 'HR';

    // 在聊天列表里点击对应对话
    const clicked: boolean = await page.evaluate(`
      (() => {
        const items = document.querySelectorAll('.chat-list-item, .friend-item, [data-uid]');
        for (const item of items) {
          const uid = item.getAttribute('data-uid') || item.dataset?.uid;
          if (uid && String(uid) === String(${JSON.stringify(String(numericUid))})) {
            item.click();
            return true;
          }
        }
        return false;
      })()
    `) as boolean;

    if (!clicked) throw new Error('在聊天列表中未找到该对话，请先确认 geek-chatlist 中存在此 uid');

    await page.wait({ time: 2 });

    const sent = await typeAndSendMessage(page, kwargs.text);
    if (!sent) throw new Error('找不到消息输入框，请检查页面是否正常加载');

    await page.wait({ time: 1 });

    return [{ status: '✅ 发送成功', detail: `已向 ${friendName} 发送：${kwargs.text}` }];
  },
});
