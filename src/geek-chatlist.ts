/**
 * BOSS直聘 geek-chatlist — 求职者端：查看我的聊天列表
 *
 * 列出所有和 HR 的对话，包含最后一条消息和时间。
 * uid 可用于后续的 geek-send、geek-chatmsg 命令。
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToGeekJob, fetchGeekChatList, verbose, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'geek-chatlist',
  description: 'BOSS直聘查看我的聊天列表（求职者端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['boss_name', 'boss_title', 'company', 'job_name', 'last_msg', 'last_time', 'uid', 'security_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取求职者聊天列表...');

    await navigateToGeekJob(page, 2);

    const list = await fetchGeekChatList(page, { pageNum: kwargs.page || 1 });

    return list.slice(0, kwargs.limit || 20).map((f: any) => ({
      boss_name: f.bossName || f.name || '',
      boss_title: f.bossTitle || f.title || '',
      company: f.brandName || f.companyName || '',
      job_name: f.jobName || '',
      last_msg: f.lastMessageInfo?.text || f.lastMsg || '',
      last_time: f.lastTime || '',
      uid: f.encryptUid || '',
      security_id: f.securityId || '',
    }));
  },
});
