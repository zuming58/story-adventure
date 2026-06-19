const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          hint: { type: "string" },
          level: { type: "string", enum: ["简单", "中等", "较难"] },
        },
        required: ["question", "answer", "hint", "level"],
      },
    },
  },
  required: ["cards"],
};

export function validateCardPayload(payload) {
  const subject = String(payload?.subject || "未选择").trim();
  const grade = String(payload?.grade || "未选择").trim();
  const material = String(payload?.material || "").trim();

  if (material.length < 3) {
    const error = new Error("学习材料太短，请至少输入 3 个字。");
    error.statusCode = 400;
    throw error;
  }

  return { subject, grade, material };
}

export async function generateStudyCards(payload, env = process.env) {
  const input = validateCardPayload(payload);
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const prompt = buildPrompt(input);
  const baseUrl = String(env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const aiResponse = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "study_cards",
          schema: CARD_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    const error = new Error("AI generation failed");
    error.statusCode = 502;
    error.detail = detail;
    throw error;
  }

  const data = await aiResponse.json();
  const output = extractOutputText(data);
  const parsed = JSON.parse(output);

  return { cards: normalizeCards(parsed.cards) };
}

function buildPrompt({ subject, grade, material }) {
  return [
    "你是面向小学高年级到初中生的学习卡片生成助手。",
    "请根据学生提供的学习材料生成 6-10 张复习卡片。",
    "每张卡片都要适合自测，问题清楚，答案简洁，提示能帮助学生回忆。",
    "如果材料是课文/短文，覆盖关键词、中心意思、细节理解、易混点。",
    "如果材料是知识点，覆盖定义、适用场景、例子、易错点。",
    "如果材料是错题，覆盖考点、错误原因、正确思路、变式提醒。",
    "问题要符合学生年级，不要写超纲或过长的答案。",
    "只返回 JSON，不要输出 Markdown 或解释文字。",
    `科目：${subject}`,
    `年级：${grade}`,
    `学习材料：${material}`,
  ].join("\n");
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

function normalizeCards(cards) {
  if (!Array.isArray(cards)) {
    throw new Error("AI response cards field is invalid");
  }

  const normalized = cards
    .map((card) => ({
      question: String(card?.question || "").trim(),
      answer: String(card?.answer || "").trim(),
      hint: String(card?.hint || "").trim(),
      level: normalizeLevel(card?.level),
    }))
    .filter((card) => card.question && card.answer);

  if (normalized.length < 6 || normalized.length > 10) {
    throw new Error("AI response must contain 6-10 usable cards");
  }

  return normalized;
}

function normalizeLevel(level) {
  const value = String(level || "").trim();
  return ["简单", "中等", "较难"].includes(value) ? value : "中等";
}
