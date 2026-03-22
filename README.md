# boss-zhipin-cli

BOSS直聘 CLI 工具，支持 **招聘端** 和 **求职者端** 全部操作。

基于 [jackwener/opencli](https://github.com/jackwener/opencli) Browser Bridge，复用 Chrome 登录态，无需 API Key，零风控。

## 前置条件

1. 安装 [opencli](https://github.com/jackwener/opencli)：`npm install -g @jackwener/opencli`
2. 安装 Browser Bridge Chrome 扩展（见 opencli README）
3. Chrome 已登录 [www.zhipin.com](https://www.zhipin.com)

## 命令列表

### 求职者端（新增）

| 命令 | 描述 |
|------|------|
| `boss search <关键词>` | 搜索职位，支持城市/经验/学历/薪资筛选 |
| `boss detail <security-id>` | 查看职位详情 |
| `boss geek-inbox` | 查看收到的 HR 招呼列表 |
| `boss geek-apply` | 查看我的投递记录（含状态：已读/面试邀请等） |
| `boss geek-chatlist` | 查看与 HR 的聊天列表 |
| `boss geek-chatmsg <uid>` | 查看与某 HR 的聊天记录 |
| `boss geek-send <uid> <消息>` | 向 HR 发送消息 |

### 招聘端

| 命令 | 描述 |
|------|------|
| `boss recommend` | 查看推荐候选人列表 |
| `boss chatlist` | 查看聊天列表 |
| `boss chatmsg <uid>` | 查看与候选人的聊天记录 |
| `boss send <uid> <消息>` | 向候选人发送消息 |
| `boss greet` | 向候选人发送招呼 |
| `boss batchgreet` | 批量向推荐候选人发招呼 |
| `boss joblist` | 查看我发布的职位列表 |
| `boss stats` | 职位数据统计 |

## 使用示例

```bash
# 搜索 AI Agent 相关岗位（上海，3-5年，本科）
opencli boss search "AI agent" --city 上海 --experience 3-5年 --degree 本科

# 查看某职位详情（security-id 来自 search 结果）
opencli boss detail <security-id>

# 查看收到的 HR 招呼
opencli boss geek-inbox

# 查看投递记录，筛选"待面试"状态
opencli boss geek-apply --status 待面试

# 查看聊天列表
opencli boss geek-chatlist

# 向 HR 发消息（uid 来自 geek-chatlist 或 geek-inbox）
opencli boss geek-send <uid> "您好，我对这个职位很感兴趣，方便详细聊聊吗？"
```

## 安装到 opencli

将 `src/` 目录下的文件复制到 opencli 的 `src/clis/boss/` 目录，重新 build 即可。

或者克隆本仓库后在 opencli 项目中注册：

```bash
opencli register ./boss-zhipin-cli
```

## 典型 AI Agent 工作流

```
# Agent 帮你每天早上汇报求职进展
opencli boss geek-apply --status 待面试   # 有哪些面试等待确认
opencli boss geek-inbox --limit 5         # 今日新收到的招呼
opencli boss geek-chatlist --limit 10     # 有哪些对话有新消息
```

## License

MIT
