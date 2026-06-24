import { CHILD_SAFE_IMAGE_RULES, assertChildSafeStoryParts } from "./content-safety.js";

const CHARACTER_STYLE_PROMPT = [
  "固定角色：画面中可以出现两位故事向导，但只有 includeGuides 为 true 时才出现。",
  "小鹿女孩：浅米色鹿毛，大耳朵，小鹿角，黑色耳机挂在脖子上，白色连帽短袖，胸前是简化彩虹徽章但不要文字，浅绿色短裤，彩虹手环，活泼友善。",
  "小兔子男孩：灰白色兔毛，长耳朵，戴细框眼镜，浅蓝色连帽上衣，米色工装短裤，手里拿平板或故事书，彩虹手环，聪明温和。",
  "统一画风：2D 儿童绘本插画，柔和手绘线条，轻微水彩和 gouache 质感，暖光，清晰干净，适合小学高年级儿童，不幼稚，不写实，不要 3D 渲染。",
  CHILD_SAFE_IMAGE_RULES,
].join("\n");

const DEFAULT_STYLE_PROMPT = [
  "统一画风：2D 儿童绘本插画，柔和手绘线条，轻微水彩和 gouache 质感，暖光，清晰干净，适合小学高年级儿童，不幼稚，不写实，不要 3D 渲染。",
  "不要强行加入小鹿、小兔或任何品牌向导角色，只根据本幕剧情生成合理画面。",
  CHILD_SAFE_IMAGE_RULES,
].join("\n");

export async function generateStoryImage(payload, env = process.env) {
  const input = validateImagePayload(payload);
  const prompt = buildImagePrompt(input);
  const providers = getImageProviders(env);
  const errors = [];

  if (!providers.length) {
    const error = new Error("No image provider is configured");
    error.statusCode = 503;
    throw error;
  }

  for (const provider of providers) {
    try {
      const result = await generateImageWithProvider(provider, prompt);
      return {
        ...result,
        prompt,
        provider: provider.name,
        fallbackUsed: provider.name !== providers[0].name,
        attempts: errors.map((item) => ({
          provider: item.provider,
          message: item.message,
          statusCode: item.statusCode,
        })),
      };
    } catch (error) {
      errors.push({
        provider: provider.name,
        message: error.message || "Image provider failed",
        statusCode: error.statusCode || 500,
        detail: error.detail || null,
      });
    }
  }

  const finalError = new Error("Story image generation failed");
  finalError.statusCode = errors.some((item) => item.statusCode === 401) ? 401 : 502;
  finalError.detail = errors
    .map((item) => `${item.provider}: ${item.message}${item.detail ? ` (${truncateDetail(item.detail)})` : ""}`)
    .join("\n");
  finalError.attempts = errors;
  throw finalError;
}

async function generateImageWithProvider(provider, prompt) {
  if (provider.dialect === "gemini") {
    return generateGeminiImageWithProvider(provider, prompt);
  }

  return generateOpenAiCompatibleImageWithProvider(provider, prompt);
}

async function generateOpenAiCompatibleImageWithProvider(provider, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

  let response;
  try {
    response = await fetch(`${provider.baseUrl}/images/generations`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
      },
      body: JSON.stringify({
        model: provider.model,
        prompt,
        size: provider.size,
        response_format: "url",
      }),
    });
  } catch (error) {
    const wrapped = new Error(
      error.name === "AbortError"
        ? "Story image generation timed out"
        : "Story image generation request failed",
    );
    wrapped.statusCode = 504;
    wrapped.detail = error.message;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`${provider.name} image generation failed`);
    error.statusCode = response.status === 401 ? 401 : 502;
    error.detail = detail;
    throw error;
  }

  const data = await response.json();
  const imageUrl = pickImageUrl(data);
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error("Image response did not include image url");
  }

  return {
    imageUrl: imageUrl.trim(),
  };
}

async function generateGeminiImageWithProvider(provider, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

  let response;
  try {
    response = await fetch(buildGeminiGenerateContentUrl(provider), {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });
  } catch (error) {
    const wrapped = new Error(
      error.name === "AbortError"
        ? "Story image generation timed out"
        : "Story image generation request failed",
    );
    wrapped.statusCode = 504;
    wrapped.detail = error.message;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`${provider.name} image generation failed`);
    error.statusCode = response.status === 401 ? 401 : 502;
    error.detail = detail;
    throw error;
  }

  const data = await response.json();
  const imageUrl = pickGeminiImageUrl(data);
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    const error = new Error("Gemini image response did not include image data");
    error.statusCode = 502;
    error.detail = JSON.stringify(data).slice(0, 1000);
    throw error;
  }

  return {
    imageUrl: imageUrl.trim(),
  };
}

function getImageProviders(env) {
  const requested = String(env.IMAGE_PROVIDER || env.IMAGE_PROVIDERS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const order = requested.length
    ? requested
    : env.VOLCENGINE_IMAGE_API_KEY || env.ARK_IMAGE_API_KEY
      ? ["uu", "uu-fast", "uu-banana", "volcengine"]
      : ["uu", "uu-fast", "uu-banana"];

  return order.map((name) => createImageProvider(name, env)).filter(Boolean);
}

function createImageProvider(name, env) {
  if (name === "uu" || name === "openai") {
    const apiKey = env.IMAGE_API_KEY;
    if (!apiKey) return null;
    return {
      name: "uu",
      apiKey,
      baseUrl: String(env.IMAGE_BASE_URL || "https://uuapi.net/v1").replace(/\/+$/, ""),
      model: env.IMAGE_MODEL || "gpt-image-2",
      size: env.IMAGE_SIZE || "1536x1024",
      timeoutMs: Number(env.IMAGE_TIMEOUT_MS || 120000),
    };
  }

  if (name === "uu-fast" || name === "uu-gpt-fast") {
    const apiKey = env.UU_FAST_IMAGE_API_KEY;
    if (!apiKey) return null;
    return {
      name: "uu-fast",
      apiKey,
      baseUrl: String(env.UU_FAST_IMAGE_BASE_URL || env.IMAGE_BASE_URL || "https://uuapi.net/v1").replace(/\/+$/, ""),
      model: env.UU_FAST_IMAGE_MODEL || "gpt-image-2",
      size: env.UU_FAST_IMAGE_SIZE || env.IMAGE_SIZE || "1536x1024",
      timeoutMs: Number(env.UU_FAST_IMAGE_TIMEOUT_MS || env.IMAGE_TIMEOUT_MS || 120000),
    };
  }

  if (name === "uu-banana" || name === "banana" || name === "nano-banana") {
    const apiKey = env.UU_BANANA_IMAGE_API_KEY || env.NANO_BANANA_IMAGE_API_KEY || env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return {
      name: "uu-banana",
      dialect: "gemini",
      apiKey,
      baseUrl: String(env.UU_BANANA_IMAGE_BASE_URL || env.NANO_BANANA_IMAGE_BASE_URL || env.GOOGLE_GEMINI_BASE_URL || "https://uuapi.net").replace(/\/+$/, ""),
      model: env.UU_BANANA_IMAGE_MODEL || env.NANO_BANANA_IMAGE_MODEL || env.GEMINI_MODEL || "gemini-2.0-flash",
      size: env.UU_BANANA_IMAGE_SIZE || env.NANO_BANANA_IMAGE_SIZE || env.IMAGE_SIZE || "1536x1024",
      timeoutMs: Number(env.UU_BANANA_IMAGE_TIMEOUT_MS || env.NANO_BANANA_IMAGE_TIMEOUT_MS || env.IMAGE_TIMEOUT_MS || 120000),
    };
  }

  if (name === "volcengine" || name === "ark" || name === "seedream") {
    const apiKey = env.VOLCENGINE_IMAGE_API_KEY || env.ARK_IMAGE_API_KEY;
    if (!apiKey) return null;
    return {
      name: "volcengine",
      apiKey,
      baseUrl: String(env.VOLCENGINE_IMAGE_BASE_URL || env.ARK_IMAGE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/+$/, ""),
      model: env.VOLCENGINE_IMAGE_MODEL || env.ARK_IMAGE_MODEL || "doubao-seedream-5-0-260128",
      size: env.VOLCENGINE_IMAGE_SIZE || env.ARK_IMAGE_SIZE || "1920x1920",
      timeoutMs: Number(env.VOLCENGINE_IMAGE_TIMEOUT_MS || env.ARK_IMAGE_TIMEOUT_MS || env.IMAGE_TIMEOUT_MS || 120000),
    };
  }

  return null;
}

function buildGeminiGenerateContentUrl(provider) {
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const path = baseUrl.endsWith("/v1beta") || baseUrl.endsWith("/v1")
    ? `${baseUrl}/models/${encodeURIComponent(provider.model)}:generateContent`
    : `${baseUrl}/v1beta/models/${encodeURIComponent(provider.model)}:generateContent`;
  return `${path}?key=${encodeURIComponent(provider.apiKey)}`;
}

function pickImageUrl(data) {
  const first = data?.data?.[0] || data?.result?.data?.[0] || data?.images?.[0] || data?.result?.images?.[0];
  const raw =
    first?.url ||
    first?.image_url ||
    first?.imageUrl ||
    first?.b64_json ||
    first?.content ||
    data?.url ||
    data?.image_url ||
    data?.imageUrl;

  if (typeof raw !== "string") {
    return "";
  }

  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length > 1000 && !raw.startsWith("http") && !raw.startsWith("data:")) {
    return `data:image/png;base64,${raw}`;
  }

  return raw;
}

function pickGeminiImageUrl(data) {
  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      const inlineData = part?.inlineData || part?.inline_data;
      const raw = inlineData?.data;
      if (typeof raw === "string" && raw.length > 1000) {
        const mimeType = inlineData?.mimeType || inlineData?.mime_type || "image/png";
        return raw.startsWith("data:") ? raw : `data:${mimeType};base64,${raw}`;
      }
    }
  }

  return pickImageUrl(data);
}

function truncateDetail(detail) {
  return String(detail || "").replace(/\s+/g, " ").slice(0, 240);
}

function validateImagePayload(payload) {
  const title = String(payload?.title || "").trim();
  const text = String(payload?.text || "").trim();
  const imagePrompt = String(payload?.imagePrompt || "").trim();
  const genre = String(payload?.genre || "奇幻").trim() || "奇幻";
  const actNumber = clampNumber(payload?.actNumber, 1, 5);
  const includeGuides = payload?.includeGuides === true;

  if (!title && !text && !imagePrompt) {
    const error = new Error("Image prompt is empty");
    error.statusCode = 400;
    throw error;
  }

  assertChildSafeStoryParts([title, text, imagePrompt], "插图提示词");

  return { title, text, imagePrompt, genre, actNumber, includeGuides };
}

function buildImagePrompt({ title, text, imagePrompt, genre, actNumber, includeGuides }) {
  return [
    `请为 AI 互动故事冒险机生成第 ${actNumber} 幕插图。`,
    `故事类型：${genre}`,
    title ? `本幕标题：${title}` : "",
    text ? `本幕剧情：${text}` : "",
    imagePrompt ? `画面要求：${imagePrompt}` : "",
    includeGuides ? CHARACTER_STYLE_PROMPT : DEFAULT_STYLE_PROMPT,
    "构图要求：适合手机网页 4:3 插图框，主体清晰，画面中间有视觉焦点，边缘不要放重要信息。",
  ]
    .filter(Boolean)
    .join("\n");
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(number)));
}
