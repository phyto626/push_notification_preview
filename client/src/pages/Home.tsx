import { useState } from 'react';
import { toast } from 'sonner';

type Category = 'announcement' | 'activity' | 'personal';

interface Notification {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  sendTime: string;
  category: Category;
}

interface AiSuggestion {
  strategy: string;
  title: string;
  subtitle: string;
  reason: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  announcement: '公告',
  activity: '活動',
  personal: '個人',
};

const TABS: { key: Category; label: string }[] = [
  { key: 'announcement', label: '公告' },
  { key: 'activity', label: '活動' },
  { key: 'personal', label: '個人' },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'announcement', label: '📢 公告' },
  { key: 'activity', label: '🎯 活動' },
  { key: 'personal', label: '👤 個人' },
];

export default function Home() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tag, setTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [campaignType, setCampaignType] = useState('');
  const [notifCategory, setNotifCategory] = useState<Category>('activity');
  const [activeTab, setActiveTab] = useState<Category>('activity');

  const MAX_NOTIFICATIONS = 5;

  // F1: 草稿通知（從現有 state 衍生，不需額外 state）
  const draftNotification =
    title.trim()
      ? {
          id: -1 as const,
          tag: tag === 'custom' ? customTag : tag,
          title: title.trim(),
          subtitle: subtitle.trim(),
          sendTime,
          category: notifCategory,
        }
      : null;

  // F2: 依 activeTab 篩選已新增通知
  const filteredNotifications = notifications.filter(n => n.category === activeTab);

  // 預覽列表：草稿在最頂（若分類相符）+ 已篩選通知
  const previewNotifications: (Notification & { isDraft?: boolean })[] = [
    ...(draftNotification && draftNotification.category === activeTab
      ? [{ ...draftNotification, isDraft: true }]
      : []),
    ...filteredNotifications,
  ];

  // F2: 每個 Tab 的 Badge 數量
  const badgeCounts: Record<Category, number> = {
    announcement: notifications.filter(n => n.category === 'announcement').length,
    activity: notifications.filter(n => n.category === 'activity').length,
    personal: notifications.filter(n => n.category === 'personal').length,
  };

  const addNotification = () => {
    const selectedTag = tag === 'custom' ? customTag : tag;
    if (!selectedTag) { toast.error('請選擇或輸入活動標籤'); return; }
    if (!title.trim()) { toast.error('請輸入標題文字'); return; }
    if (notifications.length >= MAX_NOTIFICATIONS) {
      toast.error(`最多只能新增 ${MAX_NOTIFICATIONS} 則通知`);
      return;
    }
    const newNotif: Notification = {
      id: Date.now(),
      tag: selectedTag,
      title: title.trim(),
      subtitle: subtitle.trim(),
      sendTime,
      category: notifCategory,
    };
    setNotifications(prev => [...prev, newNotif]);
    setActiveTab(notifCategory); // F2: 自動跳至新通知所屬 Tab
    resetForm();
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const resetForm = () => {
    setTag('');
    setCustomTag('');
    setTitle('');
    setSubtitle('');
    setSendTime('');
  };

  const loadDemoNotifications = () => {
    const demos: Notification[] = [
      {
        id: Date.now() + 1,
        tag: '獨家優惠',
        title: '🛒限時搶購！全館8折起！',
        subtitle: '手刀快搶，好物不等人！錯過這次再等明年。',
        sendTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        category: 'activity',
      },
      {
        id: Date.now() + 2,
        tag: '會員專屬',
        title: '🎁你的專屬禮物已送達！',
        subtitle: '點擊領取，驚喜好禮等你開箱！數量有限！',
        sendTime: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
        category: 'activity',
      },
      {
        id: Date.now() + 3,
        tag: '限時抽獎',
        title: '💰週週抽萬元購物金！',
        subtitle: '點我抽獎！每週最高可得 10,000 元購物金。',
        sendTime: new Date(Date.now() + 259200000).toISOString().slice(0, 16),
        category: 'activity',
      },
    ];
    setNotifications(demos);
    setActiveTab('activity');
  };

  const polishCopy = async () => {
    if (!title && !subtitle) { toast.error('請先輸入要潤飾的標題或副標'); return; }

    setIsPolishing(true);
    setAiSuggestions([]);
    try {
      let response = await fetch('/api/polish-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subtitle, campaignType })
      });

      if (response.status === 401) {
        const apiKey = prompt('請輸入您的 Gemini API Key（只會用於本次請求，不會儲存在瀏覽器中）：');
        if (!apiKey) return;

        response = await fetch('/api/polish-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, subtitle, campaignType, apiKey })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'API 請求失敗');
      }

      if (Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      }
    } catch (error: any) {
      toast.error('潤飾失敗：' + error.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const copyText = async () => {
    if (notifications.length === 0) { toast.error('還沒有通知可以複製'); return; }
    const text = notifications
      .map(n => {
        const lines = [`【${n.tag}】`, n.title];
        if (n.subtitle) lines.push(n.subtitle);
        if (n.sendTime) lines.push(formatSendTime(n.sendTime));
        return lines.join('\n');
      })
      .join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('✓ 文案已複製到剪貼簿');
    } catch {
      toast.error('複製失敗，請重試');
    }
  };

  const formatSendTime = (t: string) => {
    if (!t) return '未設定';
    const d = new Date(t);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ── 左側編輯區 ── */}
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">📝 編輯推播通知</h1>
          <div className="space-y-5">

            {/* F2: 通知類型 Toggle Button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">通知類型 *</label>
              <div className="flex gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => { setNotifCategory(cat.key); setActiveTab(cat.key); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      notifCategory === cat.key
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-orange-400 hover:text-orange-500'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 活動標籤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">活動標籤 *</label>
              <select
                value={tag}
                onChange={e => setTag(e.target.value)}
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

            {tag === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自訂標籤</label>
                <input
                  type="text"
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  placeholder="輸入自訂標籤"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            )}

            {/* 活動類型（AI 優化用） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                活動類型{' '}
                <span className="text-xs text-purple-500 font-normal">（AI 優化參考）</span>
              </label>
              <select
                value={campaignType}
                onChange={e => setCampaignType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              >
                <option value="">-- 不指定（通用優化）--</option>
                <option value="促銷折扣">💰 促銷折扣</option>
                <option value="抽獎活動">🎁 抽獎活動</option>
                <option value="新品上架">🆕 新品上架</option>
                <option value="會員專屬">👑 會員專屬</option>
                <option value="限時搶購">⚡ 限時搶購</option>
                <option value="品牌資訊">📢 品牌資訊</option>
              </select>
            </div>

            {/* 標題 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                標題文字 *{' '}
                <span className="text-xs text-gray-500">({title.length}/50)</span>
              </label>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={50}
                placeholder="輸入通知標題，最多 50 字"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 resize-none min-h-20"
              />
              <div className="text-xs text-gray-500 text-right mt-1">{title.length} / 50 字</div>
            </div>

            {/* 副標 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">副標說明文字</label>
              <textarea
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                maxLength={100}
                placeholder="輸入副標說明，最多 100 字"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 resize-none min-h-20"
              />
              <div className="text-xs text-gray-500 text-right mt-1">{subtitle.length} / 100 字</div>
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

            {/* AI 潤飾建議 */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span>🎯 點選套用（CTR 優化建議）：</span>
                  <button
                    onClick={() => setAiSuggestions([])}
                    className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded bg-gray-100 transition-colors"
                  >
                    關閉
                  </button>
                </div>
                <div className="grid gap-3">
                  {aiSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setTitle(s.title);
                        setSubtitle(s.subtitle || '');
                        setAiSuggestions([]);
                      }}
                      className="border border-purple-200 bg-purple-50 hover:bg-purple-100 p-3 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          ⚡ {s.strategy}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 mb-1">{s.title}</div>
                      <div className="text-xs text-gray-500 mb-2">{s.subtitle}</div>
                      {s.reason && (
                        <div className="text-xs text-purple-600 bg-white border border-purple-100 rounded px-2 py-1">
                          💡 {s.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 發送時間 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">發送日期時間</label>
              <input
                type="datetime-local"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </div>

            {/* 操作按鈕 */}
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

            {/* 已新增通知列表 */}
            {notifications.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  已新增的通知 ({notifications.length}/{MAX_NOTIFICATIONS})
                </h3>
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded border-l-4 border-yellow-400"
                    >
                      <div className="flex-1 min-w-0 text-sm text-gray-700">
                        <span className="text-xs text-gray-400 bg-gray-200 rounded px-1.5 py-0.5 mr-1.5">
                          {CATEGORY_LABELS[n.category]}
                        </span>
                        <strong>{n.tag}</strong>: {n.title}
                      </div>
                      <button
                        onClick={() => deleteNotification(n.id)}
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

        {/* ── 右側手機預覽區 ── */}
        <div className="flex justify-center sticky top-5">
          <div className="w-96 bg-black rounded-3xl p-3 shadow-2xl">
            <div className="w-full h-[520px] bg-white rounded-2xl overflow-hidden flex flex-col">

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

              {/* F2: Tab 欄（可點擊 + Badge） */}
              <div className="flex border-b border-gray-200">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 relative py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-gray-800 border-b-4 border-orange-500'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                    {badgeCounts[tab.key] > 0 && (
                      <span className="absolute top-1.5 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                        {badgeCounts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* F1 + F2: 通知列表 */}
              <div className="flex-1 overflow-y-auto">
                {previewNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 text-sm gap-2">
                    <span className="text-3xl">📭</span>
                    <span>
                      {title.trim() === '' ? '輸入標題即時預覽' : '此分類沒有通知'}
                    </span>
                  </div>
                ) : (
                  <div>
                    {previewNotifications.map(notif => {
                      const isDraft = notif.id === -1;
                      return (
                        <div
                          key={notif.id}
                          className={`flex gap-3 p-3 border-b border-gray-100 transition-colors ${
                            isDraft
                              ? 'bg-yellow-50 border-l-4 border-l-orange-400'
                              : ''
                          }`}
                        >
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">
                            📢
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">
                              {notif.tag && (
                                <span className="inline-block border border-red-500 text-red-500 px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5 align-middle">
                                  {notif.tag}
                                </span>
                              )}
                              {notif.title}
                            </div>
                            {notif.subtitle && (
                              <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                                {notif.subtitle}
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-gray-400 items-center">
                              {isDraft ? (
                                <span className="bg-orange-100 text-orange-500 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                  預覽中
                                </span>
                              ) : (
                                <span>{formatSendTime(notif.sendTime)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-blue-500 text-lg flex-shrink-0">›</div>
                        </div>
                      );
                    })}
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
