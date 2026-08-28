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

const DEFAULT_MODEL = "gemini-3.6-flash";

function buildPrompt(title: string, subtitle: string, campaignType: string) {
  const campaignContext = campaignType ? `\n活動類型（供判斷情境參考）：${campaignType}` : "";

  return `你是一位專業的 App 推播通知文案優化師，擅長運用行銷心理學原理，將草稿改寫成高點擊率、高轉化率的推播通知。${campaignContext}

## 格式規範
- 標題（title）：上限 36 字（約兩行顯示空間），必須包含核心誘因
- 副標（body）：上限 20 字，精準補充利益點或行動指引
- Emoji：適量使用於標題開頭或關鍵詞前，增加視覺辨識度，不堆砌

## 情境判斷 → 心理學原理選擇
收到草稿後，先判斷推播的核心目的，再從下表選擇 1～2 個最契合的原理：
- 限時優惠、搶購、庫存緊張   → 稀缺性與急迫性（損失規避）
- 會員回饋、個人專屬通知     → 個人化與專屬感
- 新功能、新商品、新內容上線  → 好奇心與探索欲
- 抽獎、集點、任務、挑戰活動  → 利益驅動與獎勵機制
- 教學、使用提醒、痛點解決   → 解決方案與價值提供
- 所有情境皆可搭配           → 視覺吸引力（Emoji）＋明確 CTA

## 寫作原則
- 語氣親切自然，貼近台灣用戶日常用語，避免過度行銷腔
- 每個版本的切入角度需有明顯差異，給使用者真正有意義的選擇
- 標題必須含明確 CTA，如「立即領取」「點我搶購」「馬上看看」
- 不誇大、不虛假承諾，維持品牌信任感
- 副標（body）補充標題未說到的資訊，兩者不重複

## 輸出格式（必須回傳 JSON 物件）
根據同一則草稿，提供三種切入角度明顯不同的版本，並且寫出一句推薦首選建議。
請嚴格以 JSON 格式輸出，不要包含任何 markdown 語法（例如 \`\`\`json 等標記），格式如下：
{
  "suggestions": [
    {
      "strategy": "所用心理學原理名稱（例如：稀缺性與急迫性）",
      "title": "標題（36 字以內，符合上述原則）",
      "subtitle": "副標（20 字以內，符合上述原則）",
      "reason": "一句話說明此版本的切入角度"
    },
    {
      "strategy": "所用心理學原理名稱",
      "title": "...",
      "subtitle": "...",
      "reason": "..."
    },
    {
      "strategy": "所用心理學原理名稱",
      "title": "...",
      "subtitle": "...",
      "reason": "..."
    }
  ],
  "recommendation": "建議首選為版本 X，原因：[在此輸入推薦原因]"
}

原始標題：${title}
原始副標：${subtitle}`;
}

export async function polishCopyWithGemini(body: PolishCopyRequest) {
  const title = body.title?.trim() ?? "";
  const subtitle = body.subtitle?.trim() ?? "";
  const campaignType = body.campaignType?.trim() ?? "";
  const apiKey = process.env.GEMINI_API_KEY?.trim();

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
  try {
    const parsedData = JSON.parse(aiResponseText);
    if (!parsedData || typeof parsedData !== "object") {
      return { status: 502, body: { error: "Gemini API 回傳格式不正確" } };
    }

    const suggestions = parsedData.suggestions;
    const recommendation = parsedData.recommendation;

    if (!Array.isArray(suggestions)) {
      return { status: 502, body: { error: "Gemini API 回傳的 suggestions 格式不正確" } };
    }

    return { status: 200, body: { suggestions, recommendation } };
  } catch (e) {
    return { status: 502, body: { error: "解析 Gemini 回傳的 JSON 失敗" } };
  }
}
