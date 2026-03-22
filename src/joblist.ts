/**
 * BOSS直聘 joblist — 招聘端：查看我发布的职位列表
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToChat, bossFetch, verbose, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'joblist',
  description: 'BOSS直聘查看我发布的职位列表（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['name', 'salary', 'city', 'status', 'encrypt_job_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取职位列表...');
    await navigateToChat(page);
    const data = await bossFetch(page, `https://${BOSS_DOMAIN}/wapi/zpjob/job/chatted/jobList`);
    const jobs: any[] = data.zpData || [];
    return jobs.slice(0, kwargs.limit || 20).map((j: any) => ({
      name: j.jobName || '',
      salary: j.salaryDesc || '',
      city: j.address || '',
      status: j.jobOnlineStatus === 1 ? '在线' : '已关闭',
      encrypt_job_id: j.encryptJobId || '',
    }));
  },
});
