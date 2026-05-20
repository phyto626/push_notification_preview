interface PolishCopyRequest {
  title?: string;
  subtitle?: string;
  campaignType?: string;
}

interface GeminiError {
  error?: {
    message?: string;
  };
}

const DEFAULT_MODEL = "gemini-3-flash-preview";

function buildPrompt(title: string, subtitle: string, campaignType: string) {
  const campaignContext = campaignType ? `\n活動類型：${campaignType}（請根據此類型調整文案的心理策略）` : "";

  return `你是一位頂尖的 App 推播點擊率（CTR）優化專家，精通消費者心理學與行動行銷。你的唯一目標是：讓用戶看到通知的瞬間，無法抑制地想點進去。${campaignContext}

## 三大 CTR 設計原則

1. 前20字法則：手機通知預覽只顯示前 18-22 個中文字。「鉤子」必須在前20字內命中用戶，後面的字是加分，不是重點。
2. 心理觸發器：每個版本必須明確運用一種心理機制（好奇缺口、FOMO 損失規避、利益具體化、社交認同、生活場景共鳴），不能混用，要集中火力。
3. 去廣告感：禁止使用「限時」「獨家」「立即」「快來」等廣告詞彙開頭。改用提問、場景描述、或像朋友傳訊的口吻——讓用戶以為這條通知是專門為他發的。

## 請提供 3 組文案，每組使用不同心理觸發器

- 好奇缺口（Curiosity Gap）：製造資訊不完整感，讓用戶「不點就不知道答案」
- 損失規避（FOMO）：強調「不點就會錯過」，利用人類厭惡損失的本能
- 具體利益（Benefit Clarity）：直接告訴用戶點擊後能得到什麼具體好處，數字化、可視化

請回傳單純的 JSON 陣列，不要包含任何 markdown 語法，格式為：
[
  {
    "strategy": "好奇缺口",
    "title": "標題（前20字必須有鉤子，總長限50字內）",
    "subtitle": "副標（延續好奇或補充細節，口語化，限100字內）",
    "reason": "一句話說明這個版本如何觸發點擊心理（15字內）"
  },
  {"strategy": "損失規避", "title": "...", "subtitle": "...", "reason": "..."},
  {"strategy": "具體利益", "title": "...", "subtitle": "...", "reason": "..."}
]

原始標題：${title}
原始副標：${subtitle}`;
}

export async function polishCopyWithGemini(body: PolishCopyRequest) {
  const title = body.title?.trim() ?? "";
  const subtitle = body.subtitle?.trim() ?? "";
  const campaignType = body.campaignType?.trim() ?? "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!title && !subtitle) {
    return { status: 400, body: { error: "請先輸入要潤飾的標題或副標" } };
  }

  if (!apiKey) {
    return { status: 503, body: { error: "後端尚未設定 GEMINI_API_KEY，AI 潤飾功能暫時無法使用" } };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const promptText = buildPrompt(title, subtitle, campaignType);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as GeminiError;
    return {
      status: response.status,
      body: { error: err.error?.message || "Gemini API 請求失敗" },
    };
  }

  const data = await response.json();
  let aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiResponseText) {
    return { status: 502, body: { error: "Gemini API 沒有回傳文案建議" } };
  }

  aiResponseText = aiResponseText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const suggestions = JSON.parse(aiResponseText);
  if (!Array.isArray(suggestions)) {
    return { status: 502, body: { error: "Gemini API 回傳格式不正確" } };
  }

  return { status: 200, body: { suggestions } };
}
