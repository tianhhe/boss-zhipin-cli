/**
 * BOSS直聘 send — 招聘端：向候选人发送消息
 */
import { cli, Strategy } from '@jackwener/opencli';
import {
  requirePage, navigateToChat, findFriendByUid,
  clickCandidateInList, typeAndSendMessage, BOSS_DOMAIN,
} from './common.js';

cli({
  site: 'boss',
  name: 'send',
  description: 'BOSS直聘发送聊天消息（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, help: '候选人 encryptUid（来自 chatlist）' },
    { name: 'text', required: true, positional: true, help: '消息内容' },
  ],
  columns: ['status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);
    await navigateToChat(page, 3);
    const friend = await findFriendByUid(page, kwargs.uid, { maxPages: 5 });
    if (!friend) throw new Error('未找到该候选人，请确认 uid 是否正确');
    const clicked = await clickCandidateInList(page, friend.uid);
    if (!clicked) throw new Error('无法在聊天列表中找到该用户');
    await page.wait({ time: 2 });
    const sent = await typeAndSendMessage(page, kwargs.text);
    if (!sent) throw new Error('找不到消息输入框');
    await page.wait({ time: 1 });
    return [{ status: '✅ 发送成功', detail: `已向 ${friend.name || '候选人'} 发送：${kwargs.text}` }];
  },
});
