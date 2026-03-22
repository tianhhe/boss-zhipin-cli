/**
 * BOSS直聘 detail — 查看职位详情（求职者端）
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateTo, bossFetch, verbose, BOSS_DOMAIN } from './common.js';

cli({
  site: 'boss',
  name: 'detail',
  description: 'BOSS直聘查看职位详情',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'security-id', required: true, positional: true, help: '职位 securityId（来自 search 结果）' },
  ],
  columns: [
    'name', 'salary', 'experience', 'degree', 'city', 'district',
    'description', 'skills', 'welfare',
    'boss_name', 'boss_title', 'active_time',
    'company', 'industry', 'scale', 'stage', 'url',
  ],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取职位详情...');

    await navigateTo(page, `https://${BOSS_DOMAIN}/web/geek/job`);

    const data = await bossFetch(page, `https://${BOSS_DOMAIN}/wapi/zpgeek/job/detail.json?securityId=${encodeURIComponent(kwargs['security-id'])}`);
    const zpData = data.zpData || {};
    const jobInfo = zpData.jobInfo || {};
    const bossInfo = zpData.bossInfo || {};
    const brandComInfo = zpData.brandComInfo || {};

    if (!jobInfo.jobName) throw new Error('该职位信息不存在或已下架');

    return [{
      name: jobInfo.jobName || '',
      salary: jobInfo.salaryDesc || '',
      experience: jobInfo.experienceName || '',
      degree: jobInfo.degreeName || '',
      city: jobInfo.locationName || '',
      district: [jobInfo.areaDistrict, jobInfo.businessDistrict].filter(Boolean).join('·'),
      description: jobInfo.postDescription || '',
      skills: (jobInfo.showSkills || []).join(', '),
      welfare: (brandComInfo.labels || []).join(', '),
      boss_name: bossInfo.name || '',
      boss_title: bossInfo.title || '',
      active_time: bossInfo.activeTimeDesc || '',
      company: brandComInfo.brandName || bossInfo.brandName || '',
      industry: brandComInfo.industryName || '',
      scale: brandComInfo.scaleName || '',
      stage: brandComInfo.stageName || '',
      url: jobInfo.encryptId ? `https://${BOSS_DOMAIN}/job_detail/${jobInfo.encryptId}.html` : '',
    }];
  },
});
