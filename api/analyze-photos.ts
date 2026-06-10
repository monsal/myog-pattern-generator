import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are an expert sewing pattern engineer specialising in outdoor gear and MYOG (Make Your Own Gear) construction. Analyse the provided image(s) of a bag or pack and identify the flat fabric panels that were sewn together to construct it. For each distinct structural panel you can identify, return its details as JSON. Focus only on the main fabric panels — ignore zippers, buckles, straps hardware, and non-fabric elements unless they are themselves a sewn fabric piece. If you see the same panel from multiple angles across multiple images, list it only once. For each piece return: a short name, a shape type (rectangle, trapezoid, or polygon), the approximate proportional dimensions as a fraction of the largest visible dimension (where the largest visible dimension = 1.0), a confidence score from 0 to 1, and any notes about uncertainty. Return only valid JSON, no other text.`;

type ImageInput = { mediaType: string; data: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "ANTHROPIC_API_KEY is not configured" });
  }
  const { images, hint } = (req.body ?? {}) as {
    images?: ImageInput[];
    hint?: string;
  };
  if (!images || images.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  const client = new Anthropic({ apiKey });
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as
          | "image/png"
          | "image/jpeg"
          | "image/gif"
          | "image/webp",
        data: img.data,
      },
    });
  }
  content.push({
    type: "text",
    text: hint
      ? `Hint from user: ${hint}\n\nReturn JSON only.`
      : "Return JSON only.",
  });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res
        .status(500)
        .json({ error: "Model did not return JSON", raw: text });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res
        .status(500)
        .json({ error: "Model JSON was not parseable", raw: text });
    }
    // Coerce to the shape the client expects so a partial model response
    // can't crash the UI. We always return arrays, even if empty.
    const safe = {
      bagType: typeof parsed.bagType === "string" ? parsed.bagType : "bag",
      pieces: Array.isArray(parsed.pieces)
        ? parsed.pieces
            .filter((p: any) => p && typeof p === "object")
            .map((p: any) => ({
              name: typeof p.name === "string" ? p.name : "Panel",
              shape:
                p.shape === "trapezoid" || p.shape === "polygon"
                  ? p.shape
                  : "rectangle",
              proportionalWidth:
                Number.isFinite(p.proportionalWidth) && p.proportionalWidth > 0
                  ? Math.min(1, p.proportionalWidth)
                  : 0.5,
              proportionalHeight:
                Number.isFinite(p.proportionalHeight) && p.proportionalHeight > 0
                  ? Math.min(1, p.proportionalHeight)
                  : 0.5,
              confidence: Number.isFinite(p.confidence)
                ? Math.max(0, Math.min(1, p.confidence))
                : 0.5,
              notes: typeof p.notes === "string" ? p.notes : undefined,
            }))
        : [],
      uncertainties: Array.isArray(parsed.uncertainties)
        ? parsed.uncertainties.filter((u: any) => typeof u === "string")
        : [],
    };
    return res.status(200).json(safe);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return res.status(500).json({ error: msg });
  }
}
