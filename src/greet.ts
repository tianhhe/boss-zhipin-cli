/**
 * BOSS直聘 greet — 招聘端：向候选人发送招呼
 */
import { cli, Strategy } from '@jackwener/opencli';
import {
  requirePage, navigateToChat, findFriendByUid,
  clickCandidateInList, typeAndSendMessage, verbose, BOSS_DOMAIN,
} from './common.js';

cli({
  site: 'boss',
  name: 'greet',
  description: 'BOSS直聘向候选人发送招呼（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, help: '候选人 encryptUid（来自 recommend）' },
    { name: 'security-id', required: true, help: '候选人 securityId' },
    { name: 'job-id', required: true, help: '职位 encryptJobId' },
    { name: 'text', default: '', help: '自定义招呼语（空=使用默认）' },
  ],
  columns: ['status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose(`向候选人 ${kwargs.uid} 发招呼...`);
    await navigateToChat(page, 3);
    const friend = await findFriendByUid(page, kwargs.uid, { maxPages: 1, checkGreetList: true });
    if (!friend) throw new Error('未找到该候选人，请确认 uid 是否正确（来自 recommend）');
    const clicked = await clickCandidateInList(page, friend.uid);
    if (!clicked) throw new Error('无法在聊天列表中找到该用户');
    await page.wait({ time: 2 });
    const msgText = kwargs.text || '你好，请问您对这个职位感兴趣吗？';
    const sent = await typeAndSendMessage(page, msgText);
    if (!sent) throw new Error('找不到消息输入框');
    await page.wait({ time: 1 });
    return [{ status: '✅ 招呼已发送', detail: `已向 ${friend.name || '候选人'} 发送：${msgText}` }];
  },
});
