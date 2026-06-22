# AI 互动故事冒险机

手机优先的互动故事网页。孩子输入故事开头、选择故事类型后，页面会优先调用本地 AI 接口生成 5 幕互动故事、每幕插图提示词、结局和故事书；没有配置 AI 或接口失败时，会自动使用内置演示故事兜底。

## 本地预览

推荐从项目根目录启动本地服务：

```text
npm.cmd run dev
```

然后打开：

```text
http://localhost:3100/story-adventure/index.html
```

也可以直接用浏览器打开纯前端 Demo：

```text
story-adventure/index.html
```

UI 状态预览：

```text
http://localhost:3100/story-adventure/index.html?demo=1
```

预览工具条可以切换：封面、输入页、生成中、故事幕、续写中、结局、故事书和失败页。

## 当前范围

- 已接入真实文本模型接口，配置沿用根目录 `.env.local`。
- 已接入 UU/OpenAI 兼容生图接口，配置沿用根目录 `.env.local` 的 `IMAGE_*` 变量。
- 语音输入只做入口和提示。
- 每幕图片先显示默认图，再通过后台任务异步生成真实插图；成功后保存到 `story-adventure/generated/` 并回填故事书。
- 故事书支持导出一张竖向 PNG 长图，方便现场保存作品。
- 故事固定 5 幕，每幕固定 3 个选择，最后生成故事书。
- 首页第一屏是封面页，点击“开始冒险”后进入故事输入页。

## 文档

PRD 位于：

```text
story-adventure/docs/PRD.md
```
