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
IMAGE_SIZE=1536x1024
IMAGE_TIMEOUT_MS=120000
IMAGE_PROVIDER=uu,volcengine

VOLCENGINE_IMAGE_API_KEY=你的火山 Ark Key
VOLCENGINE_IMAGE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_IMAGE_MODEL=doubao-seedream-5-0-260128
VOLCENGINE_IMAGE_SIZE=1920x1920
VOLCENGINE_IMAGE_TIMEOUT_MS=120000

IMAGE_MODE=each_scene
IMAGE_STORAGE_MODE=browser
PORT=3100
```

`IMAGE_PROVIDER=uu,volcengine` 表示优先调用 UU 生图；UU 失败、超时或返回错误时，服务端会自动调用火山 Ark 兜底。Key 只放服务端环境变量，不会暴露给扫码用户。

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
