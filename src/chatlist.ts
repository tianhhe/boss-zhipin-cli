/**
 * BOSS直聘 chatlist — 招聘端：查看聊天列表
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToChat, fetchFriendList, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'chatlist',
  description: 'BOSS直聘查看聊天列表（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
    { name: 'job-id', default: '0', help: '按职位过滤（0=全部）' },
  ],
  columns: ['name', 'job', 'last_msg', 'last_time', 'uid', 'security_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    await navigateToChat(page);
    const friends = await fetchFriendList(page, {
      pageNum: kwargs.page || 1,
      jobId: kwargs['job-id'] || '0',
    });
    return friends.slice(0, kwargs.limit || 20).map((f: any) => ({
      name: f.name || '',
      job: f.jobName || '',
      last_msg: f.lastMessageInfo?.text || '',
      last_time: f.lastTime || '',
      uid: f.encryptUid || '',
      security_id: f.securityId || '',
    }));
  },
});
