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
```

未配置文本 Key 时，前端会使用演示故事；未配置图片 Key 或图片生成失败时，会保留默认插图，不阻断故事流程。故事插图现在通过后台任务生成，完成后会保存到 `story-adventure/generated/` 并自动回填到故事书里；该目录不会提交到 Git。

故事书页的“导出长图”会在浏览器里生成 PNG，电脑端自动下载，手机端会尽量打开长图方便长按保存。
