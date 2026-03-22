/**
 * BOSS直聘 recommend — 招聘端：查看推荐候选人列表
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToChat, fetchRecommendList, verbose, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'recommend',
  description: 'BOSS直聘查看推荐候选人（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
    { name: 'job-id', default: '', help: '按职位过滤（空=全部）' },
  ],
  columns: ['name', 'job', 'salary', 'experience', 'degree', 'active_time', 'uid', 'security_id', 'job_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取推荐候选人...');
    await navigateToChat(page, 3);
    let candidates = await fetchRecommendList(page);
    if (kwargs['job-id']) {
      candidates = candidates.filter((f: any) => f.encryptJobId === kwargs['job-id']);
    }
    return candidates.slice(0, kwargs.limit || 20).map((f: any) => ({
      name: f.name || '',
      job: f.jobName || '',
      salary: f.salaryDesc || f.expectSalaryDesc || '',
      experience: f.experienceName || '',
      degree: f.degreeName || '',
      active_time: f.activeTimeDesc || '',
      uid: f.encryptUid || '',
      security_id: f.securityId || '',
      job_id: f.encryptJobId || '',
    }));
  },
});
