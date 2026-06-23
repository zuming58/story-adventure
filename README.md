# AI 互动故事冒险机

面向小学高年级到初中生的手机网页互动故事应用。孩子输入故事开头后，系统生成 5 幕互动故事，每幕给出 3 个选择，并异步生成绘本风格插图，最后汇总成“我的故事书”。

旧的 AI 学习卡片项目已归档到：

```text
study-card-archive/
```

## 本地预览

推荐使用本地开发服务：

```powershell
Set-Location E:\Codex\children
npm.cmd run dev
```

然后打开：

```text
http://localhost:3100
```

也可以直接打开故事项目路径：

```text
http://localhost:3100/story-adventure/index.html
```

UI 状态预览：

```text
http://localhost:3100/story-adventure/index.html?demo=1
```

## AI 配置

`.env.local` 保存本地私密配置，不提交 Git。

文本故事生成：

```text
OPENAI_API_KEY=你的文本模型 Key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

UU 生图：

```text
IMAGE_API_KEY=你的 UU API Key
IMAGE_BASE_URL=https://uuapi.net/v1
IMAGE_MODEL=gpt-image-2
IMAGE_SIZE=1024x1024
IMAGE_TIMEOUT_MS=120000
IMAGE_JOB_TIMEOUT_MS=300000
IMAGE_MODE=each_scene
IMAGE_STORAGE_MODE=browser
```

未配置文本 Key 时，前端会使用演示故事；未配置图片 Key 或图片生成失败时，会保留默认插图，不阻断故事流程。

故事书页的“导出长图”会在浏览器里生成 PNG，电脑端自动下载，手机端会尽量打开长图方便长按保存。

`develop` 分支保留本地演示版的后台图片任务和 `story-adventure/generated/` 保存能力。`deploy-vercel` 分支用于线上部署优化：前端直接调用图片接口并把图片保存到浏览器状态，不依赖 `story-adventure/generated/`。`IMAGE_MODE=each_scene` 表示每幕生成图片；如现场并发压力较大，可在 Vercel 改为 `cover_only`。
