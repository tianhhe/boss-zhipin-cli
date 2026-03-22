/**
 * BOSS直聘 geek-apply — 求职者端：查看我的投递记录
 *
 * 展示所有已投递职位的状态：投递时间、进度（已读/已投/面试邀请等）。
 * 用于让 AI Agent 自动追踪投递进展，不需要手动打开 App。
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToGeekJob, bossFetch, verbose, BOSS_DOMAIN } from './common.js';

// BOSS 直聘投递状态码映射
const APPLY_STATUS: Record<number, string> = {
  0:  '已投递',
  1:  '已查看',
  2:  '沟通中',
  3:  '待面试',
  4:  '已面试',
  5:  '已录用',
  6:  '不合适',
  7:  '已拒绝',
  8:  '已过期',
};

cli({
  site: 'boss',
  name: 'geek-apply',
  description: 'BOSS直聘查看我的投递记录（求职者端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
    { name: 'status', default: '', help: '筛选状态：沟通中/待面试/已查看/不合适（空=全部）' },
  ],
  columns: ['job_name', 'company', 'salary', 'status', 'apply_time', 'boss_name', 'boss_title', 'uid', 'job_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取投递记录...');

    await navigateToGeekJob(page, 2);

    const url = `https://${BOSS_DOMAIN}/wapi/zpgeek/resume/deliver/list.json?page=${kwargs.page || 1}&pageSize=20`;
    const data = await bossFetch(page, url);

    let list: any[] = data.zpData?.deliverList || data.zpData?.list || [];

    // 状态筛选
    if (kwargs.status) {
      const statusTarget = kwargs.status;
      list = list.filter((item: any) => {
        const statusText = APPLY_STATUS[item.deliverStatus] || '';
        return statusText.includes(statusTarget);
      });
    }

    return list.slice(0, kwargs.limit || 20).map((item: any) => ({
      job_name: item.jobName || '',
      company: item.brandName || item.companyName || '',
      salary: item.salaryDesc || item.jobSalary || '',
      status: APPLY_STATUS[item.deliverStatus] ?? `未知(${item.deliverStatus})`,
      apply_time: item.deliverTime
        ? new Date(item.deliverTime).toLocaleDateString('zh-CN')
        : item.deliverDate || '',
      boss_name: item.bossName || '',
      boss_title: item.bossTitle || '',
      uid: item.encryptUid || item.bossEncryptUid || '',
      job_id: item.encryptJobId || '',
    }));
  },
});
