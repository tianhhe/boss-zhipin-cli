/**
 * BOSS直聘 search — 求职者端搜索职位
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateTo, bossFetch, verbose, BOSS_DOMAIN } from './common.js';

const CITY_CODES: Record<string, string> = {
  '全国': '100010000', '北京': '101010100', '上海': '101020100',
  '广州': '101280100', '深圳': '101280600', '杭州': '101210100',
  '成都': '101270100', '南京': '101190100', '武汉': '101200100',
  '西安': '101110100', '苏州': '101190400', '长沙': '101250100',
  '天津': '101030100', '重庆': '101040100', '郑州': '101180100',
  '东莞': '101281600', '青岛': '101120200', '合肥': '101220100',
  '佛山': '101280800', '宁波': '101210400', '厦门': '101230200',
  '大连': '101070200', '珠海': '101280700', '无锡': '101190200',
  '济南': '101120100', '福州': '101230100', '昆明': '101290100',
  '哈尔滨': '101050100', '沈阳': '101070100', '石家庄': '101090100',
};

const EXP_MAP: Record<string, string> = {
  '不限': '0', '在校/应届': '108', '应届': '108',
  '1年以内': '101', '1-3年': '102', '3-5年': '103', '5-10年': '104', '10年以上': '105',
};

const DEGREE_MAP: Record<string, string> = {
  '不限': '0', '大专': '202', '本科': '203', '硕士': '204', '博士': '205',
};

const SALARY_MAP: Record<string, string> = {
  '不限': '0', '3K以下': '401', '3-5K': '402', '5-10K': '403',
  '10-15K': '404', '15-20K': '405', '20-30K': '406', '30-50K': '407', '50K以上': '408',
};

function resolveCity(input: string): string {
  if (!input) return '101010100';
  if (/^\d+$/.test(input)) return input;
  if (CITY_CODES[input]) return CITY_CODES[input];
  for (const [name, code] of Object.entries(CITY_CODES)) {
    if (name.includes(input)) return code;
  }
  return '101010100';
}

function resolveMap(input: string | undefined, map: Record<string, string>): string {
  if (!input) return '';
  if (map[input] !== undefined) return map[input];
  for (const [key, val] of Object.entries(map)) {
    if (key.includes(input)) return val;
  }
  return input;
}

cli({
  site: 'boss',
  name: 'search',
  description: 'BOSS直聘搜索职位（求职者端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: '搜索关键词，如：AI agent、前端、产品经理' },
    { name: 'city', default: '北京', help: '城市名或城市码，如：杭州、上海、101010100' },
    { name: 'experience', default: '', help: '经验要求：应届/1年以内/1-3年/3-5年/5-10年/10年以上' },
    { name: 'degree', default: '', help: '学历要求：大专/本科/硕士/博士' },
    { name: 'salary', default: '', help: '薪资范围：3K以下/3-5K/5-10K/10-15K/15-20K/20-30K/30-50K/50K以上' },
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 15, help: '返回数量' },
  ],
  columns: ['name', 'salary', 'company', 'area', 'experience', 'degree', 'skills', 'boss', 'security_id', 'url'],
  func: async (page, kwargs) => {
    requirePage(page);
    const cityCode = resolveCity(kwargs.city);
    verbose(`搜索：${kwargs.query}，城市：${kwargs.city}(${cityCode})`);

    await navigateTo(page, `https://${BOSS_DOMAIN}/web/geek/job?query=${encodeURIComponent(kwargs.query)}&city=${cityCode}`);
    await new Promise(r => setTimeout(r, 1000));

    const expVal = resolveMap(kwargs.experience, EXP_MAP);
    const degreeVal = resolveMap(kwargs.degree, DEGREE_MAP);
    const salaryVal = resolveMap(kwargs.salary, SALARY_MAP);

    const qs = new URLSearchParams({
      scene: '1',
      query: kwargs.query,
      city: cityCode,
      page: String(kwargs.page || 1),
      pageSize: '15',
    });
    if (expVal) qs.set('experience', expVal);
    if (degreeVal) qs.set('degree', degreeVal);
    if (salaryVal) qs.set('salary', salaryVal);

    const data = await bossFetch(page, `https://${BOSS_DOMAIN}/wapi/zpgeek/search/joblist.json?${qs}`);
    const jobs = data.zpData?.jobList || [];

    return jobs.slice(0, kwargs.limit || 15).map((j: any) => ({
      name: j.jobName || '',
      salary: j.salaryDesc || '',
      company: j.brandName || '',
      area: [j.cityName, j.areaDistrict, j.businessDistrict].filter(Boolean).join('·'),
      experience: j.jobExperience || '',
      degree: j.jobDegree || '',
      skills: (j.skills || []).join(', '),
      boss: `${j.bossName || ''} ${j.bossTitle || ''}`.trim(),
      security_id: j.securityId || '',
      url: j.encryptJobId ? `https://${BOSS_DOMAIN}/job_detail/${j.encryptJobId}.html` : '',
    }));
  },
});
