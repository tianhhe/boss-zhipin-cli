/**
 * BOSS直聘 stats — 招聘端：职位数据统计
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToChat, bossFetch, fetchFriendList, verbose, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'stats',
  description: 'BOSS直聘职位数据统计（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'job-id', default: '', help: '指定职位 encryptJobId（空=全部）' },
  ],
  columns: ['job_name', 'salary', 'city', 'status', 'total_chats', 'encrypt_job_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取职位统计数据...');
    await navigateToChat(page);

    const jobData = await bossFetch(page, `https://${BOSS_DOMAIN}/wapi/zpjob/job/chatted/jobList`);
    const chatStats = await bossFetch(page, `https://${BOSS_DOMAIN}/wapi/zpchat/chatHelper/statistics`, { allowNonZero: true });
    const totalFriends = chatStats.zpData?.totalFriendCount || 0;

    let friendList: any[] = [];
    try { friendList = await fetchFriendList(page); } catch { /* ignore */ }

    const jobChatCounts: Record<string, number> = {};
    for (const f of friendList) {
      const jobName = f.jobName || 'unknown';
      jobChatCounts[jobName] = (jobChatCounts[jobName] || 0) + 1;
    }

    let jobs = jobData.zpData || [];
    if (kwargs['job-id']) jobs = jobs.filter((j: any) => j.encryptJobId === kwargs['job-id']);

    const results = jobs.map((j: any) => ({
      job_name: j.jobName || '',
      salary: j.salaryDesc || '',
      city: j.address || '',
      status: j.jobOnlineStatus === 1 ? '在线' : '已关闭',
      total_chats: String(jobChatCounts[j.jobName] || 0),
      encrypt_job_id: j.encryptJobId || '',
    }));

    if (!kwargs['job-id'] && results.length > 0) {
      results.push({ job_name: '--- 总计 ---', salary: '', city: '', status: `${jobs.length} 个职位`, total_chats: String(totalFriends), encrypt_job_id: '' });
    }

    return results;
  },
});
