# AI 互动故事冒险机

面向小学高年级到初中生的手机网页互动故事应用。孩子输入故事开头后，系统生成 5 幕互动故事，每幕给出 3 个选择，并生成绘本风格插图，最后汇总成“我的故事书”并导出长图。

## 本地运行

```powershell
Set-Location E:\Codex\children
npm.cmd run dev
```

打开：

```text
http://localhost:3100
```

UI 状态预览：

```text
http://localhost:3100/story-adventure/index.html?demo=1
```

## 环境变量

本地开发使用 `.env.local`，不要提交到 Git。

```text
OPENAI_API_KEY=你的 DeepSeek Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat

IMAGE_API_KEY=你的 UU 生图 Key
IMAGE_BASE_URL=https://uuapi.net/v1
IMAGE_MODEL=gpt-image-2
IMAGE_SIZE=1024x1024
IMAGE_TIMEOUT_MS=120000
IMAGE_JOB_TIMEOUT_MS=300000
IMAGE_PROVIDER=uu,volcengine

VOLCENGINE_IMAGE_API_KEY=你的火山 Ark Key
VOLCENGINE_IMAGE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_IMAGE_MODEL=doubao-seedream-5-0-260128
VOLCENGINE_IMAGE_SIZE=1920x1920
VOLCENGINE_IMAGE_TIMEOUT_MS=120000

IMAGE_MODE=each_scene
IMAGE_STORAGE_MODE=browser
```

`IMAGE_PROVIDER=uu,volcengine` 表示优先调用 UU；如果 UU 超时或报错，再自动调用火山 Ark 兜底。

`IMAGE_MODE` 可选：

- `each_scene`：每幕都生成图片，效果好但消耗和等待时间更高。
- `cover_only`：只生成结局/封面图，更适合多人现场并发。

## 当前上线策略

当前 `deploy-vercel` 分支已经做过线上优化：

- 不需要数据库。
- 不需要账号登录。
- API Key 只放在服务端环境变量。
- 每个孩子的故事状态保存在自己手机浏览器 `localStorage`。
- 图片生成后保存到浏览器状态，不依赖服务器本地 `generated/` 目录。
- 最终作品通过“导出长图”保存到手机。

如果部署到腾讯云长运行 Node 服务，也可以直接运行本项目；如果使用云函数/serverless，需确认单次生图请求不会超过函数超时限制。

## 腾讯云 Node 服务部署要点

推荐使用一个能长期运行 Node 的环境，例如轻量应用服务器、CVM、CloudBase Webify/云托管等。

基本启动命令：

```bash
npm install
npm run start
```

服务默认监听：

```text
PORT=3100
```

生产环境需要配置 HTTPS 域名，现场二维码建议指向 HTTPS 地址。

## 主要目录

```text
api/story-adventure/      Vercel/Serverless API 入口
lib/                      AI 调用、安全检查、生图逻辑
story-adventure/          前端页面、样式和素材
server.js                 本地/Node 长运行服务入口
vercel.json               Vercel 路由配置
```

## 不要上传的内容

以下内容已在 `.gitignore` 中忽略，不应上传到公开仓库或服务器源码包：

```text
.env.local
backups/
presentation-*/
presentation-handoff.zip
story-adventure/generated/
```
