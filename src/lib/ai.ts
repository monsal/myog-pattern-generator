// Client for the AI photo analysis endpoint. Calls our /api function which
// proxies to Anthropic with the system prompt for pattern engineering.

export type AiPiece = {
  name: string;
  shape: "rectangle" | "trapezoid" | "polygon";
  proportionalWidth: number;
  proportionalHeight: number;
  confidence: number;
  notes?: string;
};

export type AiAnalysisResult = {
  bagType: string;
  pieces: AiPiece[];
  uncertainties: string[];
};

export async function analyzePhotos(
  images: File[],
  hint?: string
): Promise<AiAnalysisResult> {
  const payload = await Promise.all(
    images.map(async (file) => ({
      mediaType: file.type || "image/png",
      data: await fileToBase64(file),
    }))
  );
  const res = await fetch("/api/analyze-photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ images: payload, hint }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Analysis failed (${res.status})`);
  }
  return (await res.json()) as AiAnalysisResult;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
