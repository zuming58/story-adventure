import { generateStudyCards } from "../lib/study-cards.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await generateStudyCards(request.body || {});
    response.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    response.status(statusCode).json({
      error: error.message || "Unexpected generation error",
      detail: error.detail,
    });
  }
}
