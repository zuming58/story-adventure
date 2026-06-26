# 腾讯云部署说明

## 推荐方案

优先选择能长期运行 Node.js 的服务：

- 轻量应用服务器 Lighthouse
- 云服务器 CVM
- CloudBase 云托管

不建议第一版直接使用普通云函数，原因是生图请求可能比较慢，函数超时和并发配置更麻烦。

## 服务器准备

需要：

- Node.js 18 或更高版本
- Git
- 一个 HTTPS 域名

## 部署步骤

1. 拉取代码：

```bash
git clone -b deploy-vercel https://github.com/zuming58/story-adventure.git
cd story-adventure
```

2. 安装依赖：

```bash
npm install
```

当前项目没有第三方运行依赖，但保留该步骤方便后续扩展。

3. 配置环境变量。

不要把 Key 写进前端代码。可以使用服务器环境变量，或创建服务器本地 `.env.local`：

```text
OPENAI_API_KEY=你的 DeepSeek Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat

IMAGE_API_KEY=你的 UU 生图 Key
IMAGE_BASE_URL=https://uuapi.net/v1
IMAGE_MODEL=gpt-image-2
IMAGE_SIZE=1024x1024
IMAGE_TIMEOUT_MS=120000
IMAGE_PROVIDER=uu,uu-fast,uu-banana,volcengine

UU_FAST_IMAGE_API_KEY=你的 UU gpt快速生图 Key
UU_FAST_IMAGE_BASE_URL=https://uuapi.net/v1
UU_FAST_IMAGE_MODEL=gpt-image-2
UU_FAST_IMAGE_SIZE=1024x1024
UU_FAST_IMAGE_TIMEOUT_MS=120000

UU_BANANA_IMAGE_API_KEY=你的 UU Nano Banana / Gemini Key
UU_BANANA_IMAGE_BASE_URL=https://uuapi.net
UU_BANANA_IMAGE_MODEL=gemini-2.0-flash
UU_BANANA_IMAGE_SIZE=1536x1024
UU_BANANA_IMAGE_TIMEOUT_MS=120000

# 也兼容这组变量名
GOOGLE_GEMINI_BASE_URL=https://uuapi.net
GEMINI_API_KEY=你的 UU Nano Banana / Gemini Key
GEMINI_MODEL=gemini-2.0-flash

VOLCENGINE_IMAGE_API_KEY=你的火山 Ark Key
VOLCENGINE_IMAGE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_IMAGE_MODEL=doubao-seedream-5-0-260128
VOLCENGINE_IMAGE_SIZE=1920x1920
VOLCENGINE_IMAGE_TIMEOUT_MS=120000

IMAGE_MODE=each_scene
IMAGE_STORAGE_MODE=browser
IMAGE_JOB_CONCURRENCY=2
IMAGE_MAX_JOBS=300
STORY_SESSION_CONCURRENCY=8
STORY_SESSION_TTL_MS=600000
STORY_COMPLETED_COOLDOWN_MS=1200000
PORT=3100
```

`IMAGE_PROVIDER=uu,uu-fast,uu-banana,volcengine` 表示优先调用原 UU 生图；失败、超时或返回错误时，服务端依次调用 UU gpt快速生图、UU Nano Banana Gemini 兼容接口，最后再用火山 Ark 兜底。Key 只放服务端环境变量，不会暴露给扫码用户。
`uu-banana` 不走 `/images/generations`，而是走 Gemini 兼容的 `generateContent`；如果 UU 返回 `No available Gemini accounts`，服务端会继续调用后面的火山 Ark 兜底。
当前 UU GPT 两个通道建议使用 `1024x1024`，本地测试比 `1536x1024` 更稳定；火山 Seedream 兜底仍可使用自己的高分辨率尺寸。
`uu-fast` 只需要单独配置 `UU_FAST_IMAGE_API_KEY`；如果不配置 fast 专用 URL、模型、尺寸和超时，会自动继承 `IMAGE_BASE_URL`、`IMAGE_MODEL`、`IMAGE_SIZE`、`IMAGE_TIMEOUT_MS`。
`IMAGE_JOB_CONCURRENCY=2` 表示服务端最多同时跑 2 个生图任务，其余手机请求会排队，适合现场多人同时扫码，避免一次性打爆上游生图 API。现场如果仍然拥堵，可临时改成 `1`；如果通道很顺，可改成 `3`。
`STORY_SESSION_CONCURRENCY=8` 表示现场最多同时放 8 组进入故事生成流程，后面的家庭会停在“排队中”页面。现场笔记本如果也点开始生成，会占其中 1 个通道；只停在首页或输入页不占。想测试排队机制时，可以临时改成 `1`，用两台手机测试第二台是否进入等待页；正式现场再改回 `8`。
`STORY_SESSION_TTL_MS=600000` 表示页面 10 分钟没有心跳后释放名额；正常等待故事或等待插图时页面会持续心跳，不会被误踢。
`STORY_COMPLETED_COOLDOWN_MS=1200000` 表示同一浏览器完成一次故事后 20 分钟内不能重新开始新故事，但仍可继续查看和导出上次故事。
进入故事书页后，只有 5 幕插图都补齐成功才会主动释放体验通道；如果图片失败并等待手动重试，会继续占用，直到补齐或页面关闭后超过 TTL。

4. 启动服务：

```bash
npm run start
```

5. 配置反向代理。

用 Nginx/Caddy/腾讯云应用网关把 HTTPS 域名代理到：

```text
http://127.0.0.1:3100
```

6. 生成二维码。

二维码指向你的 HTTPS 域名，例如：

```text
https://your-domain.example.com/
```

## 现场并发建议

`IMAGE_MODE=each_scene` 会给每一幕生图。20 个孩子同时玩时，生图接口可能排队或失败。

如果现场明显变慢，把环境变量改成：

```text
IMAGE_MODE=cover_only
```

然后重启服务。这样只生成结局/封面图，更稳。

## 验收清单

- 手机扫码能打开首页
- 首页、输入页、故事幕在 9:16 手机上可操作
- DeepSeek 能生成真实故事
- 每幕图片能生成或失败兜底
- 刷新后能继续上次故事
- 结局后能输入孩子名字
- 故事书能导出长图
- 浏览器前端源码里看不到 API Key
