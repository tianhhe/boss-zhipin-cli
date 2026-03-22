/**
 * BOSS直聘 geek-inbox — 求职者端：查看收到的 HR 招呼列表
 *
 * 对应 Boss 端的 recommend，这里是 geek 端收到招呼的列表。
 * 可用于：知道有哪些 HR 向你打招呼、一键筛选感兴趣的职位。
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToGeekJob, bossFetch, verbose, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'geek-inbox',
  description: 'BOSS直聘查看收到的 HR 招呼列表（求职者端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['boss_name', 'boss_title', 'company', 'job_name', 'salary', 'active_time', 'uid', 'security_id', 'job_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取收到的招呼列表...');

    await navigateToGeekJob(page, 2);

    // geek 端收到的招呼列表接口
    const url = `https://${BOSS_DOMAIN}/wapi/zpgeek/friend/getGeekNewGreetList.json?page=${kwargs.page || 1}`;
    const data = await bossFetch(page, url);

    const list: any[] = data.zpData?.greetRecSortList
      || data.zpData?.friendList
      || data.zpData?.recommendList
      || [];

    if (list.length === 0) {
      verbose('尝试备用接口...');
      // 备用：直接拉 geek 聊天列表，筛选未读 / 最近招呼
      const fallbackUrl = `https://${BOSS_DOMAIN}/wapi/zpgeek/friend/getGeekFriendListV2.json?page=${kwargs.page || 1}&status=0`;
      const fallbackData = await bossFetch(page, fallbackUrl);
      const fallbackList: any[] = fallbackData.zpData?.friendList || [];
      return fallbackList.slice(0, kwargs.limit || 20).map((f: any) => ({
        boss_name: f.bossName || f.name || '',
        boss_title: f.bossTitle || f.title || '',
        company: f.brandName || f.companyName || '',
        job_name: f.jobName || '',
        salary: f.salaryDesc || '',
        active_time: f.activeTimeDesc || f.lastTime || '',
        uid: f.encryptUid || '',
        security_id: f.securityId || '',
        job_id: f.encryptJobId || '',
      }));
    }

    return list.slice(0, kwargs.limit || 20).map((f: any) => ({
      boss_name: f.bossName || f.name || '',
      boss_title: f.bossTitle || f.title || '',
      company: f.brandName || f.companyName || '',
      job_name: f.jobName || '',
      salary: f.salaryDesc || '',
      active_time: f.activeTimeDesc || f.lastTime || '',
      uid: f.encryptUid || '',
      security_id: f.securityId || '',
      job_id: f.encryptJobId || '',
    }));
  },
});
