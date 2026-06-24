import { CHILD_SAFE_STORY_RULES, assertChildSafeStoryParts, assertChildSafeText } from "./content-safety.js";

const SCENE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["scene"] },
    title: { type: "string" },
    text: { type: "string" },
    choices: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    imagePrompt: { type: "string" },
    summary: { type: "string" },
  },
  required: ["kind", "title", "text", "choices", "imagePrompt", "summary"],
};

const ENDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["ending"] },
    title: { type: "string" },
    type: { type: "string" },
    protagonist: { type: "string" },
    text: { type: "string" },
    imagePrompt: { type: "string" },
    summary: { type: "string" },
  },
  required: ["kind", "title", "type", "protagonist", "text", "imagePrompt", "summary"],
};

export async function generateStoryAdventure(payload, env = process.env) {
  const input = validateStoryPayload(payload);
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const prompt = buildStoryPrompt(input);
  const schema = input.mode === "ending" ? ENDING_SCHEMA : SCENE_SCHEMA;
  const baseUrl = String(env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const output = await requestAndValidateJson({ baseUrl, apiKey, model, prompt, schema, input });
  const parsed = JSON.parse(output);

  return input.mode === "ending" ? normalizeEnding(parsed, input) : normalizeScene(parsed, input);
}

async function requestAndValidateJson({ baseUrl, apiKey, model, prompt, schema, input }) {
  const attempts = [
    () => requestResponsesJson({ baseUrl, apiKey, model, prompt, schema, input }),
    () => requestChatJson({ baseUrl, apiKey, model, prompt, schema, input, strictSchema: true }),
    () => requestChatJson({ baseUrl, apiKey, model, prompt, schema, input, strictSchema: false }),
  ];
  const details = [];

  for (const attempt of attempts) {
    const result = await attempt();
    if (!result.ok) {
      details.push(result.detail);
      continue;
    }

    try {
      const parsed = JSON.parse(result.text);
      input.mode === "ending" ? normalizeEnding(parsed, input) : normalizeScene(parsed, input);
      return result.text;
    } catch (error) {
      details.push(error.message);
    }
  }

  const error = new Error("Story generation failed");
  error.statusCode = 502;
  error.detail = details.filter(Boolean).join("\n--- fallback ---\n");
  throw error;
}

async function requestResponsesJson({ baseUrl, apiKey, model, prompt, schema, input }) {
  const aiResponse = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: input.mode === "ending" ? "story_adventure_ending" : "story_adventure_scene",
          schema,
          strict: true,
        },
      },
    }),
  });

  if (!aiResponse.ok) {
    return { ok: false, detail: await aiResponse.text() };
  }

  const data = await aiResponse.json();
  return { ok: true, text: extractOutputText(data) };
}

async function requestChatJson({ baseUrl, apiKey, model, prompt, schema, input, strictSchema }) {
  const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: "你只输出符合要求的 JSON，不输出 Markdown、解释、代码块或多余文字。",
        },
        { role: "user", content: prompt },
      ],
      response_format: strictSchema
        ? {
            type: "json_schema",
            json_schema: {
              name: input.mode === "ending" ? "story_adventure_ending" : "story_adventure_scene",
              schema,
              strict: true,
            },
          }
        : { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    return { ok: false, detail: await aiResponse.text() };
  }

  const data = await aiResponse.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, detail: "Chat completion response did not include message content" };
  }

  return { ok: true, text };
}

function validateStoryPayload(payload) {
  const mode = String(payload?.mode || "scene").trim() === "ending" ? "ending" : "scene";
  const genre = String(payload?.genre || "奇幻").trim() || "奇幻";
  const opening = String(payload?.opening || "").trim();
  const actNumber = clampNumber(payload?.actNumber, 1, 5);
  const summary = String(payload?.summary || "").trim();
  const selectedChoice = String(payload?.selectedChoice || "").trim();
  const scenes = Array.isArray(payload?.scenes) ? payload.scenes.slice(0, 5) : [];
  const choices = Array.isArray(payload?.choices) ? payload.choices.slice(0, 5) : [];

  if (opening.length < 3) {
    const error = new Error("故事开头太短，请至少输入 3 个字。");
    error.statusCode = 400;
    throw error;
  }

  assertChildSafeText(opening, "故事开头");
  assertChildSafeText(selectedChoice, "剧情选择");

  return { mode, genre, opening, actNumber, summary, selectedChoice, scenes, choices };
}

function buildStoryPrompt(input) {
  const openingSignals = extractOpeningTokens(input.opening).slice(0, 10);
  const commonRules = [
    "你是给小学高年级到初中生玩的 AI 互动故事冒险机。",
    "请使用中文，语气有画面感、节奏轻快，整体像安全、明亮、有趣的儿童绘本。",
    CHILD_SAFE_STORY_RULES,
    "绝对不要套用固定示例故事；不要默认写发光地图、旧钟楼、星光徽章，除非孩子的开头明确写了这些元素。",
    "必须严格承接孩子输入的故事开头，保留其中的主角、地点、关键物品、事件、目标和语气。",
    "第一幕必须直接围绕孩子开头继续推进，不能另起炉灶，不能换成无关地点、无关道具或无关任务。",
    openingSignals.length
      ? `第一幕正文、标题、summary 或 imagePrompt 中，至少自然出现这些开头关键词中的 2 个：${openingSignals.join("、")}。`
      : "",
    "如果开头里出现了小怪物、小兔子、猫、机器人、门、钥匙、学校、储物柜等具体元素，第一幕必须继续写这些元素。",
    "每一幕都要训练孩子的因果逻辑和语文写作感：承接上一步选择，制造一个清楚的新发现、新问题或新选择。",
    "每一幕正文控制在 90-150 个中文汉字，适合手机阅读。",
    "插图提示词要适合儿童绘本/漫画风格，描述画面主体、场景、情绪和色彩，不要出现文字排版要求。",
    "只返回 JSON，不要输出 Markdown 或解释文字。",
    `故事类型：${input.genre}`,
    `孩子写的故事开头：${input.opening}`,
    `当前故事摘要：${input.summary || "暂无，正在生成第一幕。"}`,
    `孩子刚才选择：${input.selectedChoice || "暂无。"}`,
    `已经生成的幕数：${input.scenes.length}`,
    `已记录选择：${input.choices.join("；") || "暂无。"}`,
    `已生成故事全文：${formatSceneHistory(input)}`,
  ].filter(Boolean);

  if (input.mode === "ending") {
    return [
      ...commonRules,
      "必须返回 JSON 对象，字段固定为：kind, title, type, protagonist, text, imagePrompt, summary。",
      "kind 必须是字符串 ending。",
      "title/type/protagonist/text/imagePrompt/summary 都必须是非空字符串。",
      "现在请生成故事结局。",
      "结局要回收前文关键线索，让孩子觉得自己的选择有影响。",
      "结局只能使用孩子开头、前文摘要、已生成幕或孩子选择中已经出现过的人物、动物、怪物或物品角色。",
      "禁止凭空新增人名。无法判断同伴姓名时，只写“你和伙伴”或“你们”。",
      "结局必须解释或回收前文至少 2 个关键线索，不能突然改变地点、目标、主角关系或故事规则。",
      "结局正文控制在 120-180 个中文汉字。",
      "type 字段写成类似“友情结局”“勇气结局”“智慧结局”“搞笑结局”的短标签。",
    ].join("\n");
  }

  return [
    ...commonRules,
    "必须返回 JSON 对象，字段固定为：kind, title, text, choices, imagePrompt, summary。",
    "kind 必须是字符串 scene。",
    "title/text/imagePrompt/summary 都必须是非空字符串。",
    "choices 必须是正好 3 个字符串组成的数组。",
    `现在请生成第 ${input.actNumber} 幕 / 共 5 幕。`,
    "choices 必须正好 3 个，彼此差异明显，每个选项控制在 8-18 个中文汉字。",
    "新一幕必须读取并承接已生成故事全文，尤其是上一幕结尾和孩子刚才选择。",
    "每一幕都要保持同一个主线目标：延续开头的问题、角色线索、道具线索和孩子选择造成的结果。",
    "如果需要新增角色，必须由上一幕线索自然引出，并在本幕说明它为什么出现。",
    "不要推翻前文设定，不要让已经解决的问题重复出现，不要让角色突然忘记刚发生的事情。",
    "如果是第 5 幕，choices 也要给出 3 个结局方向选择，前端会在孩子选择后进入结局。",
    "summary 要用 1-2 句话更新故事摘要，便于下一幕继续。",
  ].join("\n");
}

function formatSceneHistory(input) {
  if (!input.scenes.length) {
    return "暂无，第一幕必须直接承接孩子写的故事开头。";
  }

  return input.scenes
    .map((scene, index) => {
      const title = String(scene?.title || `第 ${index + 1} 幕`).trim();
      const text = String(scene?.text || "").trim();
      const choice = String(input.choices[index] || "").trim();
      return `第 ${index + 1} 幕《${title}》：${text}${choice ? ` 孩子的选择：${choice}。` : ""}`;
    })
    .join("\n");
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const text = data.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text)
    ?.find((value) => typeof value === "string" && value.trim());

  if (!text) {
    throw new Error("AI response did not include text output");
  }

  return text;
}

function normalizeScene(scene, input) {
  const normalized = {
    kind: "scene",
    title: String(scene?.title || "").trim(),
    text: String(scene?.text || "").trim(),
    choices: Array.isArray(scene?.choices) ? scene.choices.map((choice) => String(choice || "").trim()).filter(Boolean) : [],
    imagePrompt: String(scene?.imagePrompt || "").trim(),
    summary: String(scene?.summary || "").trim(),
  };

  if (!normalized.title || !normalized.text || normalized.choices.length !== 3) {
    throw new Error("AI scene response is incomplete");
  }

  if (!normalized.imagePrompt) {
    normalized.imagePrompt = `${normalized.title}，儿童绘本风格插图`;
  }

  if (!normalized.summary) {
    normalized.summary = normalized.text;
  }

  assertChildSafeStoryParts(
    [normalized.title, normalized.text, ...normalized.choices, normalized.imagePrompt, normalized.summary],
    "AI 生成的故事内容",
  );

  assertSceneMatchesOpening(normalized, input);

  return normalized;
}

function normalizeEnding(ending) {
  const normalized = {
    kind: "ending",
    title: String(ending?.title || "").trim(),
    type: String(ending?.type || "").trim(),
    protagonist: String(ending?.protagonist || "").trim(),
    text: String(ending?.text || "").trim(),
    imagePrompt: String(ending?.imagePrompt || "").trim(),
    summary: String(ending?.summary || "").trim(),
  };

  if (!normalized.title || !normalized.type || !normalized.text) {
    throw new Error("AI ending response is incomplete");
  }

  if (!normalized.protagonist) {
    normalized.protagonist = "我和伙伴";
  }

  if (!normalized.imagePrompt) {
    normalized.imagePrompt = `${normalized.title}，温暖明亮的儿童绘本结局插图`;
  }

  if (!normalized.summary) {
    normalized.summary = normalized.text;
  }

  assertChildSafeStoryParts(
    [normalized.title, normalized.type, normalized.protagonist, normalized.text, normalized.imagePrompt, normalized.summary],
    "AI 生成的结局内容",
  );

  return normalized;
}

function assertSceneMatchesOpening(scene, input) {
  if (input.mode !== "scene" || input.actNumber !== 1) {
    return;
  }

  const tokens = extractOpeningTokens(input.opening);
  if (tokens.length < 4) {
    return;
  }

  const output = `${scene.title}\n${scene.text}\n${scene.summary}\n${scene.imagePrompt}`;
  const matched = tokens.filter((token) => output.includes(token));
  if (matched.length >= 2) {
    return;
  }

  throw new Error(`AI scene drifted from user opening; matched ${matched.length} opening keywords`);
}

function extractOpeningTokens(opening) {
  const generic = new Set([
    "一个",
    "一只",
    "一张",
    "一种",
    "一下",
    "发现",
    "突然",
    "自己",
    "我们",
    "你们",
    "他们",
    "这里",
    "那里",
    "这个",
    "那个",
    "什么",
    "怎么",
    "可以",
    "想让",
    "帮它",
    "找到",
    "最后",
    "开始",
    "时候",
    "边缘",
    "出现",
    "浮现",
  ]);
  const text = String(opening || "")
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "")
    .replace(/[我你他她它的了着过在和与把被给对从到里上下一会说想让帮]/g, "");
  const tokens = new Set();

  for (let size = 4; size >= 2; size -= 1) {
    for (let index = 0; index <= text.length - size; index += 1) {
      const token = text.slice(index, index + size);
      if (!generic.has(token)) {
        tokens.add(token);
      }
    }
  }

  return [...tokens].filter((token) => !generic.has(token)).slice(0, 24);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(number)));
}
