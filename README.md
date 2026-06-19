# AI 学习卡片生成器

面向小学高年级到初中生的手机网页工具。学生输入课文、知识点、笔记或错题内容后，系统生成复习卡片，支持翻卡自测、标记掌握情况和错卡再练。

## 第一版范围

- 文字输入学习材料。
- 拍照输入、语音输入入口保留，第一版提示下一版支持。
- 生成 6-10 张复习卡片。
- 翻卡自测：先查看答案，再标记“我会了 / 再复习”。
- 未完成自评的卡片不能跳过。
- 已答卡片可前后切换并修改状态。
- 复习总结与错卡再练。

## 本地预览

推荐使用本地开发服务：

```powershell
Set-Location E:\Codex\children
npm.cmd run dev
```

然后打开：

```text
http://localhost:3000
```

UI 阶段预览可以打开：

```text
http://localhost:3000?demo=1
```

顶部会出现“UI 预览”工具条，可以切换输入页、生成中、生成成功、生成失败、自测正面、自测背面、已答回看、复习总结、全部掌握等界面状态。

如果只想看静态界面，也可以直接用浏览器打开 `index.html`；此时 AI 接口不可用，会自动使用演示卡片。

如果看到 `Missing script: "dev"`，说明命令不在项目目录里运行。先执行：

```powershell
Set-Location E:\Codex\children
npm.cmd run
```

确认输出里能看到 `dev`，再执行 `npm.cmd run dev`。

## AI 生成配置

复制 `.env.example` 为 `.env.local`，并配置环境变量：

```text
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

未配置 `OPENAI_API_KEY` 时，前端会自动使用演示卡片，方便活动现场先展示流程。

如果使用中转 API，把 `OPENAI_BASE_URL` 改成中转服务的 `/v1` 地址。

部署到 Vercel 时，也需要在项目环境变量中配置 `OPENAI_API_KEY`、`OPENAI_MODEL` 和 `OPENAI_BASE_URL`。
