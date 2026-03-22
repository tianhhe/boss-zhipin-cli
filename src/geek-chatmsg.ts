/**
 * BOSS直聘 geek-chatmsg — 求职者端：查看与 HR 的聊天记录
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToGeekJob, bossFetch, findGeekFriendByUid, verbose, BOSS_DOMAIN } from './common.js';

const TYPE_MAP: Record<number, string> = {
  1: '文本', 2: '图片', 3: '招呼', 4: '简历', 5: '系统',
  6: '名片', 7: '语音', 8: '视频', 9: '表情',
};

cli({
  site: 'boss',
  name: 'geek-chatmsg',
  description: 'BOSS直聘查看与 HR 的聊天记录（求职者端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, positional: true, help: 'HR 的 encryptUid（来自 geek-chatlist）' },
    { name: 'page', type: 'int', default: 1, help: '页码' },
  ],
  columns: ['from', 'type', 'text', 'time'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose(`获取与 ${kwargs.uid} 的聊天记录...`);

    await navigateToGeekJob(page, 2);

    const friend = await findGeekFriendByUid(page, kwargs.uid);
    if (!friend) throw new Error('未找到该 HR，请确认 uid 是否正确（来自 geek-chatlist）');

    const gid = friend.uid || friend.bossUid;
    const securityId = encodeURIComponent(friend.securityId || '');
    const msgUrl = `https://${BOSS_DOMAIN}/wapi/zpchat/geek/historyMsg?gid=${gid}&securityId=${securityId}&page=${kwargs.page}&c=20&src=0`;

    const msgData = await bossFetch(page, msgUrl);
    const messages: any[] = msgData.zpData?.messages || msgData.zpData?.historyMsgList || [];

    return messages.map((m: any) => {
      const fromObj = m.from || {};
      const isSelf = typeof fromObj === 'object' ? fromObj.uid !== (friend.uid || friend.bossUid) : false;
      return {
        from: isSelf ? '我' : (typeof fromObj === 'object' ? (fromObj.name || friend.bossName || 'HR') : 'HR'),
        type: TYPE_MAP[m.type] || `其他(${m.type})`,
        text: m.text || m.body?.text || '',
        time: m.time ? new Date(m.time).toLocaleString('zh-CN') : '',
      };
    });
  },
});
