# AI 互动故事冒险机交接记录

日期：2026-06-24 晚
工作目录：`E:\Codex\children`
当前分支：`deploy-vercel`
线上地址：`https://story-adventure-273897-7-1307868230.sh.run.tcloudbase.com/`

## 当前项目状态

主项目已经从“AI 学习卡片生成器”切换为“AI 互动故事冒险机”，并已整理成可部署到腾讯云 CloudBase Run 的仓库。

- 新项目位于 `story-adventure/`
- 本地服务默认端口：`3100`
- 根路径 `http://localhost:3100/` 会跳转到 `story-adventure/index.html`
- GitHub 仓库：`https://github.com/zuming58/story-adventure`
- 最新已推送提交：`5be789d Improve storybook image completion and export`

## 已实现功能

- 手机优先 UI：封面页、输入页、生成中、故事幕、续写中、结局页、名字页、故事书页、错误页
- 5 幕互动故事流程：每幕 3 个选择，选择后继续生成下一幕
- DeepSeek 文本模型接入：
  - `OPENAI_BASE_URL=https://api.deepseek.com`
  - `OPENAI_MODEL=deepseek-chat`
  - Key 仅保存在 `.env.local`
- UU 生图接口接入：
  - `IMAGE_BASE_URL=https://uuapi.net/v1`
  - `IMAGE_MODEL=gpt-image-2`
  - Key 仅保存在 `.env.local`
- 火山 Ark / Seedream 生图兜底：
  - `IMAGE_PROVIDER=uu,volcengine`
  - UU 超时、524、502 或其他错误后，服务端自动调用火山兜底
  - 火山模型：`doubao-seedream-5-0-260128`
  - 火山尺寸：`1920x1920`，因为该模型不接受 `1024x1024`
- 儿童安全机制：
  - 输入和模型输出做基础安全词检查
  - Prompt 强制儿童绘本安全边界
  - 禁止色情、成人情感、血腥、重暴力、极端恐怖、自伤、危险模仿、仇恨等
- 故事连贯性机制：
  - 后端会把已生成每一幕正文和孩子选择传给模型
  - Prompt 要求后续幕必须承接前文，不得换主角、换目标、跳新故事
  - 结局只能使用前文出现过的人物、动物、怪物或物品角色，不得凭空出现“小林”这类人名
- 生图任务机制：
  - 前端先显示默认图
  - 后端创建图片任务
  - UU 和火山都失败时，才向前端标记失败
  - 前端轮询任务，成功后回填当前幕和故事书
  - 如果查询短暂失败，不直接判死，而是提示继续查询
  - 后台图片任务仍是 Node 内存任务；腾讯云会话亲和性已启用，但实例休眠/重启仍可能丢任务
- 本地保存机制：
  - 故事进度保存在浏览器 `localStorage`
  - 刷新后封面页可点“继续上次故事”
  - 重新开始会清空本机当前故事
- 专属故事书：
  - 结局后先输入孩子名字
  - 故事书标题和导出长图会显示孩子名字
- 导出长图：
  - 故事书页可导出一张 PNG 长图
  - 手机优先调用系统分享/保存面板；不支持时打开长图，用户长按保存
  - 导出前会检查 5 幕是否都有真实插图
  - 如果缺图，故事书页显示“补齐缺失插图”按钮
  - 用户仍可再次点击导出当前版本，避免现场卡死
- 故事书页滚动修复：
  - 图片轮询刷新不会再把页面自动滚回顶部
  - 在故事书页自动补图时会保留当前滚动位置
- 全局生图技能：
  - 已创建 `C:\Users\zuming\.codex\skills\uu-image-gen`
  - 已创建 `C:\Users\zuming\.codex\skills\seedream-image-gen`
  - 全局配置：`C:\Users\zuming\.codex\image-gen.env`
  - 火山技能已真实出图验证成功

## 本地启动

```powershell
Set-Location E:\Codex\children
npm.cmd run dev
```

打开：

```text
http://localhost:3100/story-adventure/index.html
```

UI 页面状态预览：

```text
http://localhost:3100/story-adventure/index.html?demo=1
```

注意：

- 必须用 `http://localhost:3100`，不要用 `file://` 打开，否则接口不会正常调用。
- 如果刚改过后端代码，需要停止旧 Node 服务后重新运行 `npm.cmd run dev`。
- 如果页面恢复了旧故事，先点“重新开始”，或者清浏览器本地存储。

## 关键文件

- `server.js`：本地 Node 服务、静态文件、API 路由、`.env.local` 读取
- `lib/story-adventure.js`：故事生成、DeepSeek 兼容调用、连贯性 prompt、结局规则
- `lib/story-images.js`：UU 生图请求和绘本风格 prompt
- `lib/story-images.js`：UU 优先、火山兜底的生图供应商链
- `lib/image-jobs.js`：图片任务状态管理
- `lib/content-safety.js`：儿童安全检查和安全规则文案
- `story-adventure/index.html`：页面结构
- `story-adventure/styles.css`：手机 UI 和 9:16 桌面预览
- `story-adventure/app.js`：前端状态机、保存恢复、生图轮询、导出长图
- `story-adventure/docs/PRD.md`：产品需求文档
- `story-adventure/docs/IMAGE_GENERATION_NOTES.md`：角色和生图风格说明
- `story-adventure/docs/DEPLOYMENT_PLAN.md`：明天上线准备清单

## 当前保存策略

本地版有三类保存：

- 故事进度：保存在当前浏览器的 `localStorage`
- 生成图片：保存到本机 `story-adventure/generated/`
- 最终作品：用户点击“导出长图”保存为 PNG

上线第一版建议：

- 不做登录
- 不做数据库
- 不做历史故事列表
- 每个孩子的故事进度继续存在自己手机浏览器里
- 最终作品通过“导出长图”保存到手机

## 当前线上环境变量要点

腾讯云需要配置：

```text
OPENAI_API_KEY=DeepSeek Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat

IMAGE_PROVIDER=uu,volcengine
IMAGE_API_KEY=UU Key
IMAGE_BASE_URL=https://uuapi.net/v1
IMAGE_MODEL=gpt-image-2
IMAGE_SIZE=1536x1024
IMAGE_TIMEOUT_MS=120000

VOLCENGINE_IMAGE_API_KEY=火山 Ark Key
VOLCENGINE_IMAGE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_IMAGE_MODEL=doubao-seedream-5-0-260128
VOLCENGINE_IMAGE_SIZE=1920x1920
VOLCENGINE_IMAGE_TIMEOUT_MS=120000

IMAGE_MODE=each_scene
IMAGE_STORAGE_MODE=browser
PORT=3100
NODE_ENV=production
```

## 明天优先测试

- 扫码进入
- 输入故事开头
- 生成 5 幕故事
- 检查故事前后连贯
- 检查不凭空出现未出现角色
- 检查每幕图片：UU 失败时是否火山兜底
- 故事书页如果有缺图，点“补齐缺失插图”
- 输入孩子名字
- 生成故事书
- 导出长图并保存到手机相册
- 检查故事书页补图时能否正常上下滑动，不再自动回到顶部

## 暂缓功能

这些功能有价值，但先不要阻塞上线：

- 英文故事版本
- 朗读故事 / TTS
- 语音输入
- 历史故事列表
- 账号登录
- 数据库保存
- 家长/老师作品墙
- A4 打印版排版

## 明天可直接对 Codex 说

继续 `E:\Codex\children` 的 AI 互动故事冒险机项目。先根据 `HANDOFF.md` 测试最新 `deploy-vercel` 版本，重点检查 UU+火山生图兜底、故事书补齐缺图、手机导出长图保存。
