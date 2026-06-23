export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  response.status(200).json({
    imageMode: process.env.IMAGE_MODE || "each_scene",
    imageStorageMode: process.env.IMAGE_STORAGE_MODE || "browser",
  });
}
