import { CHILD_SAFE_IMAGE_RULES, assertChildSafeStoryParts } from "./content-safety.js";

const CHARACTER_STYLE_PROMPT = [
  "固定角色：画面中可以出现两位故事向导。",
  "小鹿女孩：浅米色鹿毛，大耳朵，小鹿角，黑色耳机挂在脖子上，白色连帽短袖，胸前简化彩虹徽章但不要文字，浅绿色短裤，彩虹手环，活泼友善。",
  "小兔子男孩：灰白色兔毛，长耳朵，戴细框眼镜，浅蓝色连帽上衣，米色工装短裤，手里拿平板或故事书，彩虹手环，聪明温和。",
  "统一画风：2D 儿童绘本插画，柔和手绘线条，轻微水彩和 gouache 质感，温暖光照，清晰干净，适合小学高年级儿童，不幼稚，不写实，不要 3D 渲染。",
  CHILD_SAFE_IMAGE_RULES,
].join("\n");

const DEFAULT_STYLE_PROMPT = [
  "统一画风：2D 儿童绘本插画，柔和手绘线条，轻微水彩和 gouache 质感，温暖光照，清晰干净，适合小学高年级儿童，不幼稚，不写实，不要 3D 渲染。",
  CHILD_SAFE_IMAGE_RULES,
].join("\n");

export async function generateStoryImage(payload, env = process.env) {
  const input = validateImagePayload(payload);
  const apiKey = env.IMAGE_API_KEY;

  if (!apiKey) {
    const error = new Error("IMAGE_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const baseUrl = String(env.IMAGE_BASE_URL || "https://uuapi.net/v1").replace(/\/+$/, "");
  const model = env.IMAGE_MODEL || "gpt-image-2";
  const size = env.IMAGE_SIZE || "1024x1024";
  const timeoutMs = Number(env.IMAGE_TIMEOUT_MS || 120000);
  const prompt = buildImagePrompt(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        response_format: "url",
      }),
    });
  } catch (error) {
    const wrapped = new Error(error.name === "AbortError" ? "Story image generation timed out" : "Story image generation request failed");
    wrapped.statusCode = 504;
    wrapped.detail = error.message;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error("Story image generation failed");
    error.statusCode = response.status === 401 ? 401 : 502;
    error.detail = detail;
    throw error;
  }

  const data = await response.json();
  const imageUrl = data?.data?.[0]?.url;
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error("Image response did not include image url");
  }

  return {
    imageUrl: imageUrl.trim(),
    prompt,
  };
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
    "构图要求：适合手机网页 4:3 插图框，主体清楚，画面中间有视觉焦点，边缘不要放重要信息。",
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
