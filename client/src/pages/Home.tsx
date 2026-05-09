import { useState, useEffect } from 'react';

interface Notification {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  sendTime: string;
}

interface AiSuggestion {
  strategy: string;
  title: string;
  subtitle: string;
}

export default function Home() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tag, setTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [titleCount, setTitleCount] = useState(0);
  const [subtitleCount, setSubtitleCount] = useState(0);
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);

  const MAX_NOTIFICATIONS = 5;

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTag(e.target.value);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    setTitleCount(e.target.value.length);
  };

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSubtitle(e.target.value);
    setSubtitleCount(e.target.value.length);
  };

  const addNotification = () => {
    const selectedTag = tag === 'custom' ? customTag : tag;

    if (!selectedTag) {
      alert('請選擇或輸入活動標籤');
      return;
    }

    if (!title.trim()) {
      alert('請輸入標題文字');
      return;
    }

    if (notifications.length >= MAX_NOTIFICATIONS) {
      alert(`最多只能新增 ${MAX_NOTIFICATIONS} 則通知`);
      return;
    }

    const newNotification: Notification = {
      id: Date.now(),
      tag: selectedTag,
      title: title.trim(),
      subtitle: subtitle.trim(),
      sendTime
    };

    setNotifications([...notifications, newNotification]);
    resetForm();
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const resetForm = () => {
    setTag('');
    setCustomTag('');
    setTitle('');
    setSubtitle('');
    setSendTime('');
    setTitleCount(0);
    setSubtitleCount(0);
  };

  const loadDemoNotifications = () => {
    const demos: Notification[] = [
      {
        id: Date.now() + 1,
        tag: '獨家優惠',
        title: '🛒限時搶購！全館8折起！',
        subtitle: '手刀快搶，好物不等人！錯過這次再等明年。',
        sendTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      },
      {
        id: Date.now() + 2,
        tag: '會員專屬',
        title: '🎁你的專屬禮物已送達！',
        subtitle: '點擊領取，驚喜好禮等你開箱！數量有限！',
        sendTime: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
      },
      {
        id: Date.now() + 3,
        tag: '限時抽獎',
        title: '💰週週抽萬元購物金！',
        subtitle: '點我抽獎！每週最高可得 10,000 元購物金。',
        sendTime: new Date(Date.now() + 259200000).toISOString().slice(0, 16),
      }
    ];
    setNotifications(demos);
  };

  const polishCopy = async () => {
    if (!title && !subtitle) {
      alert('請先輸入要潤飾的標題或副標');
      return;
    }

    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      apiKey = prompt('請輸入您的 Gemini API Key (只需輸入一次，會記錄在瀏覽器中)：');
      if (apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey);
      } else {
        return;
      }
    }

    setIsPolishing(true);
    setAiSuggestions([]);
    try {
      const promptText = `你是一位資深的「品牌行銷人員」，專精於 App 推播策略。你的核心目標是設計出讓用戶在收到通知的瞬間感到「驚喜與好奇」的文案，從而大幅提升點擊率。

請嚴格遵守以下三大設計原則：
1. 字數控制：手機推播預覽通常只顯示前 18-22 個中文字，請確保最吸引人、最重要的資訊出現在前 20 字內，避免關鍵訊息被截斷。
2. 善用 Emoji：加入相關 Emoji 增加視覺層次感與親切感，使通知在列表中脫穎而出，但請適量，不要過度堆疊影響閱讀。
3. 營造對話感：使用口語化、去廣告感的語氣，嘗試以拋出問題或描述生活化場景的方式開場，讓用戶感覺是在與真人對話，而非接收群發廣告。

請針對以下原始文案，提供 3 組不同切入點的推播文案：
- 限時懸念感：製造時間壓迫感或懸念，誘發用戶立即點擊的衝動
- 利益直觀感：直接呈現用戶能獲得的具體利益或好處
- 生活共鳴感：從用戶生活情境切入，引發情感共鳴

請回傳單純的 JSON 陣列，不要包含任何 markdown 語法，格式為：
[
  {"strategy": "限時懸念感", "title": "標題（前20字最關鍵，總長限50字內）", "subtitle": "副標（口語化導讀，限100字內）"},
  {"strategy": "利益直觀感", "title": "...", "subtitle": "..."},
  {"strategy": "生活共鳴感", "title": "...", "subtitle": "..."}
]

原始標題：${title}
原始副標：${subtitle}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API 請求失敗');
      }

      const data = await response.json();
      let aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiResponseText) {
        aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const results = JSON.parse(aiResponseText);
        if (Array.isArray(results)) {
          setAiSuggestions(results);
        }
      }
    } catch (error: any) {
      alert('潤飾失敗：' + error.message);
      if (error.message.includes('API_KEY_INVALID')) {
        localStorage.removeItem('GEMINI_API_KEY');
      }
    } finally {
      setIsPolishing(false);
    }
  };

  const copyText = async () => {
    if (notifications.length === 0) {
      alert('還沒有通知可以複製');
      return;
    }

    const text = notifications.map(notif => {
      const lines = [
        `【${notif.tag}】`,
        notif.title
      ];
      if (notif.subtitle) lines.push(notif.subtitle);
      if (notif.sendTime) {
        lines.push(formatSendTime(notif.sendTime));
      }
      return lines.join('\n');
    }).join('\n\n---\n\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert('✓ 文案已複製到剪貼簿');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert('✓ 文案已複製到剪貼簿');
        } catch (err) {
          alert('複製失敗，您可能需要手動複製或改用 localhost 開啟工具');
        } finally {
          textArea.remove();
        }
      }
    } catch (err) {
      console.error(err);
      alert('複製失敗，請重試');
    }
  };

  const formatSendTime = (sendTime: string) => {
    if (!sendTime) return '未設定';
    const date = new Date(sendTime);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* 左側編輯區 */}
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">📝 編輯推播通知</h1>

          <div className="space-y-5">
            {/* 活動標籤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">活動標籤 *</label>
              <select
                value={tag}
                onChange={handleTagChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              >
                <option value="">-- 選擇標籤 --</option>
                <option value="限時抽獎">限時抽獎</option>
                <option value="快閃優惠">快閃優惠</option>
                <option value="站點資訊">站點資訊</option>
                <option value="會員服務">會員服務</option>
                <option value="全新商家">全新商家</option>
                <option value="custom">自訂輸入</option>
              </select>
            </div>

            {/* 自訂標籤 */}
            {tag === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自訂標籤</label>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="輸入自訂標籤"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            )}

            {/* 標題 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                標題文字 * <span className="text-xs text-gray-500">({titleCount}/50)</span>
              </label>
              <textarea
                value={title}
                onChange={handleTitleChange}
                maxLength={50}
                placeholder="輸入通知標題，最多 50 字"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 resize-none min-h-20"
              />
              <div className="text-xs text-gray-500 text-right mt-1">{titleCount} / 50 字</div>
            </div>

            {/* 副標 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">副標說明文字</label>
              <textarea
                value={subtitle}
                onChange={handleSubtitleChange}
                maxLength={100}
                placeholder="輸入副標說明，最多 100 字"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 resize-none min-h-20"
              />
              <div className="text-xs text-gray-500 text-right mt-1">{subtitleCount} / 100 字</div>
            </div>

            {/* AI 潤飾按鈕 */}
            <div className="flex justify-end mt-2">
              <button
                onClick={polishCopy}
                disabled={isPolishing || (!title && !subtitle)}
                className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 disabled:opacity-50 transition-all text-sm flex items-center gap-1 shadow-sm"
              >
                {isPolishing ? '✨ 潤飾中...' : '✨ AI 文案潤飾'}
              </button>
            </div>

            {/* AI 潤飾建議列表 */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span>💡 點選套用 AI 建議：</span>
                  <button 
                    onClick={() => setAiSuggestions([])}
                    className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded bg-gray-100 transition-colors"
                  >
                    關閉
                  </button>
                </div>
                <div className="grid gap-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        setTitle(suggestion.title);
                        setTitleCount(suggestion.title.length);
                        setSubtitle(suggestion.subtitle || '');
                        setSubtitleCount((suggestion.subtitle || '').length);
                        setAiSuggestions([]);
                      }}
                      className="border border-purple-200 bg-purple-50 hover:bg-purple-100 p-3 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="text-xs font-bold text-purple-600 mb-1">【{suggestion.strategy}】</div>
                      <div className="text-sm font-bold text-gray-800 mb-1">{suggestion.title}</div>
                      <div className="text-xs text-gray-600">{suggestion.subtitle}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 日期時間 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">發送日期時間</label>
              <input
                type="datetime-local"
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </div>

            {/* 按鈕 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={addNotification}
                disabled={notifications.length >= MAX_NOTIFICATIONS}
                className="flex-1 bg-yellow-400 text-gray-800 py-2 rounded-lg font-medium hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                + 新增通知
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadDemoNotifications}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                💡 載入範例
              </button>
              <button
                onClick={copyText}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                📋 複製文案
              </button>
            </div>

            {/* 通知列表 */}
            {notifications.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  已新增的通知 ({notifications.length}/{MAX_NOTIFICATIONS})
                </h3>
                <div className="space-y-2">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded border-l-4 border-yellow-400"
                    >
                      <div className="flex-1 min-w-0 text-sm text-gray-700">
                        <strong>{escapeHtml(notif.tag)}</strong>: {escapeHtml(notif.title)}
                      </div>
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="ml-3 bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600 transition-all"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右側手機預覽區 */}
        <div className="flex justify-center">
          <div className="w-96 bg-black rounded-3xl p-3 shadow-2xl">
            <div className="w-full h-96 bg-white rounded-2xl overflow-hidden flex flex-col">
              {/* 頂部標題列 */}
              <div className="bg-yellow-400 text-gray-800 px-5 py-4 flex items-center justify-between font-semibold">
                <span className="text-lg">←</span>
                <span className="text-lg">消息通知</span>
                <span className="text-lg">✕</span>
              </div>

              {/* 通知橫幅 */}
              <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-b border-gray-200 flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">ℹ</div>
                <span>尚未開啟消息通知，前往設定</span>
              </div>

              {/* Tab 欄 */}
              <div className="flex border-b border-gray-200">
                <div className="flex-1 text-center py-3 text-sm text-gray-400 cursor-pointer">公告</div>
                <div className="flex-1 text-center py-3 text-sm text-gray-800 font-semibold border-b-4 border-orange-500 cursor-pointer">活動</div>
                <div className="flex-1 text-center py-3 text-sm text-gray-400 cursor-pointer">個人</div>
              </div>

              {/* 通知內容 */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                    還沒有通知
                  </div>
                ) : (
                  <div>
                    {notifications.map(notif => (
                      <div key={notif.id} className="flex gap-3 p-3 border-b border-gray-100">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">
                          📢
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">
                            <span className="inline-block border border-red-500 text-red-500 px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5 align-middle" style={{ verticalAlign: 'text-bottom' }}>
                              {escapeHtml(notif.tag)}
                            </span>
                            {escapeHtml(notif.title)}
                          </div>
                          {notif.subtitle && (
                            <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                              {escapeHtml(notif.subtitle)}
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{formatSendTime(notif.sendTime)}</span>
                          </div>
                        </div>
                        <div className="text-blue-500 text-lg flex-shrink-0">›</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
