/**
 * BOSS直聘 batchgreet — 招聘端：批量向推荐候选人发招呼
 */
import { cli, Strategy } from '@jackwener/opencli';
import {
  requirePage, navigateToChat, fetchRecommendList,
  clickCandidateInList, typeAndSendMessage, verbose, BOSS_DOMAIN,
} from './common.js';

cli({
  site: 'boss',
  name: 'batchgreet',
  description: 'BOSS直聘批量向推荐候选人发招呼（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'job-id', default: '', help: '按职位过滤（空=全部职位）' },
    { name: 'limit', type: 'int', default: 5, help: '最多招呼几人' },
    { name: 'text', default: '', help: '自定义招呼语（空=使用默认）' },
  ],
  columns: ['name', 'status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);
    const limit = kwargs.limit || 5;
    const text = kwargs.text || '你好，请问您对这个职位感兴趣吗？';
    verbose(`批量招呼最多 ${limit} 位候选人...`);
    await navigateToChat(page, 3);

    let candidates = await fetchRecommendList(page);
    if (kwargs['job-id']) {
      candidates = candidates.filter((f: any) => f.encryptJobId === kwargs['job-id']);
    }
    candidates = candidates.slice(0, limit);

    if (candidates.length === 0) {
      return [{ name: '-', status: '⚠️ 无候选人', detail: '当前没有待招呼的推荐候选人' }];
    }

    const results: any[] = [];
    for (const c of candidates) {
      try {
        const clicked = await clickCandidateInList(page, c.uid);
        if (!clicked) { results.push({ name: c.name || '-', status: '❌ 跳过', detail: '聊天列表中未找到' }); continue; }
        await page.wait({ time: 2 });
        const sent = await typeAndSendMessage(page, text);
        if (!sent) { results.push({ name: c.name || '-', status: '❌ 失败', detail: '找不到输入框' }); continue; }
        await page.wait({ time: 1.5 });
        results.push({ name: c.name || '-', status: '✅ 已发送', detail: text });
      } catch (e: any) {
        results.push({ name: c.name || '-', status: '❌ 失败', detail: e.message?.substring(0, 80) || '未知错误' });
      }
    }
    return results;
  },
});
