/**
 * BOSS直聘 chatmsg — 招聘端：查看与候选人的聊天记录
 */
import { cli, Strategy } from '@jackwener/opencli';
import { requirePage, navigateToChat, bossFetch, findFriendByUid, BOSS_DOMAIN } from './common.js';

const TYPE_MAP: Record<number, string> = {
  1: '文本', 2: '图片', 3: '招呼', 4: '简历', 5: '系统',
  6: '名片', 7: '语音', 8: '视频', 9: '表情',
};

cli({
  site: 'boss',
  name: 'chatmsg',
  description: 'BOSS直聘查看与候选人的聊天记录（招聘端）',
  domain: BOSS_DOMAIN,
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, positional: true, help: '候选人 encryptUid（来自 chatlist）' },
    { name: 'page', type: 'int', default: 1, help: '页码' },
  ],
  columns: ['from', 'type', 'text', 'time'],
  func: async (page, kwargs) => {
    requirePage(page);
    await navigateToChat(page);
    const friend = await findFriendByUid(page, kwargs.uid);
    if (!friend) throw new Error('未找到该候选人');
    const gid = friend.uid;
    const securityId = encodeURIComponent(friend.securityId);
    const msgData = await bossFetch(page, `https://${BOSS_DOMAIN}/wapi/zpchat/boss/historyMsg?gid=${gid}&securityId=${securityId}&page=${kwargs.page}&c=20&src=0`);
    const messages: any[] = msgData.zpData?.messages || msgData.zpData?.historyMsgList || [];
    return messages.map((m: any) => {
      const fromObj = m.from || {};
      const isSelf = typeof fromObj === 'object' ? fromObj.uid !== friend.uid : false;
      return {
        from: isSelf ? '我' : (typeof fromObj === 'object' ? fromObj.name : friend.name),
        type: TYPE_MAP[m.type] || `其他(${m.type})`,
        text: m.text || m.body?.text || '',
        time: m.time ? new Date(m.time).toLocaleString('zh-CN') : '',
      };
    });
  },
});
