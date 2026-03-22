---
name: boss-zhipin
description: >
  BOSS直聘 AI 求职助手。搜索岗位 → 结合本地简历智能筛选 → 生成打招呼语 → 用户确认后发送 → 飞书表格全程追踪状态。
  Triggers: 找工作, 投简历, boss直聘, 搜岗位, 打招呼, 求职, job hunting, boss zhipin.
---

# BOSS直聘 求职 AI Agent

## 前置准备

### 1. 安装 opencli Browser Bridge
```bash
npm install -g @jackwener/opencli
# 下载 Chrome 扩展并安装，Chrome 登录 zhipin.com
```

### 2. 配置本地简历文件
在本地创建个人简历文件（**不要放进公共仓库**）：
```bash
mkdir -p ~/.boss-zhipin
# 将简历内容写入（纯文本，包含：技能、经历、求职意向）
nano ~/.boss-zhipin/resume.md
```

`~/.boss-zhipin/resume.md` 格式示例：
```markdown
# 简历

## 基本信息
姓名：XXX | 学历：XX大学 XX专业 | 求职城市：北京/上海

## 求职意向
岗位方向：内容运营 / 社媒运营 / 品牌增长
薪资期望：10-20K
排除：纯销售、客服、硬件

## 核心技能
- ...

## 工作经历
...
```

### 3. 配置飞书表格
飞书文档地址存入本地配置：
```bash
echo '{"wiki_url": "https://my.feishu.cn/wiki/YOUR_WIKI_ID"}' > ~/.boss-zhipin/config.json
```

飞书表格需包含以下列（Agent 自动创建/识别）：
`公司` | `岗位` | `薪资` | `匹配度` | `匹配原因` | `注意点` | `状态` | `打招呼语` | `发送时间` | `HR uid` | `备注`

---

## 完整求职流程

### 第一步：读取简历和配置

```bash
# Agent 首先读取本地简历
cat ~/.boss-zhipin/resume.md
cat ~/.boss-zhipin/config.json
```

从简历中提取：**求职意向**、**核心技能关键词**、**排除条件**，作为后续筛选依据。

---

### 第二步：搜索岗位

根据简历中的求职意向生成搜索词：

```bash
opencli boss search "内容运营" --city 北京 --limit 30 -f json > /tmp/boss_jobs.json
opencli boss search "社媒运营" --city 北京 --limit 20 -f json >> /tmp/boss_jobs.json
# 可根据简历意向追加更多关键词
```

---

### 第三步：获取 JD 详情 + 智能筛选

```bash
python3 ~/.boss-zhipin/scripts/screen-jobs.py \
  --resume ~/.boss-zhipin/resume.md \
  --input /tmp/boss_jobs.json \
  --output /tmp/boss_screened.json
```

脚本对每个岗位调用 `opencli boss detail <security_id>` 获取完整 JD，然后结合简历内容对每个岗位打分（0-100），输出：

```json
[{
  "job_name": "内容运营",
  "company": "xxx",
  "salary": "8-12K",
  "score": 85,
  "match_reasons": "小红书运营经验匹配；数据复盘能力吻合",
  "concern": "要求3年以上，略高",
  "security_id": "xxx",
  "uid": "xxx",
  "job_id": "xxx",
  "boss_active": "24小时内活跃",
  "jd_summary": "负责小红书内容获客，需有达人合作经验..."
}]
```

**筛选规则（Agent 执行）：**
1. 岗位名称与简历求职方向匹配（内容/运营/品牌/社媒/AI等）
2. JD 要求与简历能力的具体重叠点（逐条对比）
3. 薪资在简历期望范围内 ±30%
4. 命中简历中的排除条件 → 直接丢弃（不进推荐列表）
5. 优先 Boss 活跃时间在 72h 内

---

### 第四步：写入飞书表格，等待用户确认

```bash
python3 ~/.boss-zhipin/scripts/feishu-tracker.py \
  --action add-batch \
  --input /tmp/boss_screened.json
```

**⚠️ 此处暂停。**

告知用户：「已将 XX 个匹配岗位写入飞书表格，请查看后将想投递的岗位状态改为『已确认』，然后告诉我继续。」

飞书文档：从 `~/.boss-zhipin/config.json` 中读取 `wiki_url`。

---

### 第五步：生成打招呼语

用户确认后，读取飞书表格中「已确认」状态的岗位：

```bash
python3 ~/.boss-zhipin/scripts/feishu-tracker.py --action get-confirmed > /tmp/confirmed_jobs.json

python3 ~/.boss-zhipin/scripts/gen-greeting.py \
  --resume ~/.boss-zhihn/resume.md \
  --input /tmp/confirmed_jobs.json \
  --output /tmp/greetings.json
```

**打招呼语规则（必须严格遵守）：**

- 总字数：50–80 字
- **前 18 个字是重点**：直接亮出最契合该 JD 的能力，禁止用「你好」「你们公司」「贵司」开头
- 结尾一个具体问句，引导 HR 回复
- 针对具体 JD 内容，不可用通用模板
- 口语化，有人味，不要简历腔

**生成示例：**

> JD 强调：小红书内容获客 + 数据驱动
> → 「小红书素人投放独立负责过，CTR 跑到 12%，A/B 沉淀了封面策略。看到你们在做内容获客，想聊聊有没有匹配方向？」（前18字：小红书素人投放独立负责过）

> JD 强调：AI 工具落地 + 运营提效
> → 「搭过文案供稿智能体，把产出效率提了 50%。你们岗位提到 AI 工具落地，有实操经验，方便聊聊吗？」（前18字：搭过文案供稿智能体）

生成后将打招呼语更新进飞书表格「打招呼语」列。

**⚠️ 再次暂停。**

告知用户：「打招呼语已生成并写入飞书表格，请确认或直接修改表格中的内容，确认后告诉我发送。」

---

### 第六步：发送打招呼语

用户确认发送后，逐条执行：

```bash
# 从飞书表格读取最终打招呼语（用户可能已修改）
python3 ~/.boss-zhipin/scripts/feishu-tracker.py --action get-confirmed > /tmp/to_send.json

# 逐条发送
opencli boss geek-send <uid> "<打招呼语>"

# 立即更新状态
python3 ~/.boss-zhipin/scripts/feishu-tracker.py \
  --action update-status \
  --job-id <job_id> \
  --status 已打招呼
```

每发送一条，立即更新飞书状态，不批量攒到最后。

---

### 第七步：持续追踪进展

定期（每天或用户要求时）：

```bash
# 拉最新聊天和投递状态
opencli boss geek-chatlist -f json > /tmp/chatlist.json
opencli boss geek-apply -f json > /tmp/apply.json

# 同步更新飞书表格
python3 ~/.boss-zhipin/scripts/feishu-tracker.py \
  --action sync-status \
  --chatlist /tmp/chatlist.json \
  --apply /tmp/apply.json
```

**状态流转：**
```
待确认 → 已确认 → 已打招呼 → 已读/沟通中 → 约面试 → 已面试 → 录用 / 拒绝
                                ↓
                          3天无回复 → 标注「冷」
```

---

## 单步快捷操作

```bash
# 查看今天收到的 HR 招呼
opencli boss geek-inbox --limit 10

# 查看所有投递进展
opencli boss geek-apply

# 筛选待面试
opencli boss geek-apply --status 待面试

# 向 HR 发一条跟进消息（uid 来自 geek-chatlist）
opencli boss geek-send <uid> "请问面试安排在哪天方便？"

# 查看某段聊天记录
opencli boss geek-chatmsg <uid>
```

---

## 注意事项

1. 简历文件 `~/.boss-zhipin/resume.md` 是本地私有文件，**不要提交到任何公共仓库**
2. 飞书表格是唯一的投递状态记录，所有操作都必须同步
3. **发送前必须经用户两次确认**（岗位确认 + 打招呼语确认），不得跳过
4. 每个岗位只发一次打招呼，`feishu-tracker.py` 会检查重复
5. 发送后立即更新飞书，不延迟
