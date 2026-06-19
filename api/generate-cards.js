export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const { subject, grade, material } = request.body || {};
  if (!material || String(material).trim().length < 12) {
    response.status(400).json({ error: "Material is too short" });
    return;
  }

  const prompt = [
    "你是面向小学高年级到初中生的学习卡片生成助手。",
    "请根据学生提供的学习材料生成 6-10 张复习卡片。",
    "每张卡片都要适合自测，问题清楚，答案简洁，提示能帮助学生回忆。",
    "如果材料是课文/短文，覆盖关键词、中心意思、细节理解、易混点。",
    "如果材料是知识点，覆盖定义、适用场景、例子、易错点。",
    "如果材料是错题，覆盖考点、错误原因、正确思路、变式提醒。",
    "只返回 JSON，格式为：{\"cards\":[{\"question\":\"...\",\"answer\":\"...\",\"hint\":\"...\",\"level\":\"简单|中等|较难\"}]}",
    `科目：${subject || "未选择"}`,
    `年级：${grade || "未选择"}`,
    `学习材料：${material}`,
  ].join("\n");

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "study_cards",
            schema: {
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
            },
            strict: true,
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      response.status(502).json({ error: "AI generation failed", detail });
      return;
    }

    const data = await aiResponse.json();
    const output = data.output_text || data.output?.[0]?.content?.[0]?.text;
    response.status(200).json(JSON.parse(output));
  } catch (error) {
    response.status(500).json({ error: "Unexpected generation error" });
  }
}
