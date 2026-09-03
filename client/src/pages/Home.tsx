import { useState } from 'react';
import { toast } from 'sonner';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';


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
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [notifCategory, setNotifCategory] = useState<Category>('activity');
  const [activeTab, setActiveTab] = useState<Category>('activity');

  // 雲端範本庫 Hook 與狀態
  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    isConfigured: isTemplatesConfigured,
    saveTemplate,
    deleteTemplate,
    incrementUsedCount,
  } = useTemplates();

  const [isTemplatesLibraryOpen, setIsTemplatesLibraryOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplToSave, setTplToSave] = useState<Omit<Template, 'id' | 'createdAt' | 'usedCount'> | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'usedCount'>('createdAt');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 排序後的範本列表
  const sortedTemplates = [...templates].sort((a, b) => {
    if (sortBy === 'usedCount') {
      return b.usedCount - a.usedCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 動態從範本庫取出所有唯一 tag
  const availableTags = Array.from(new Set(templates.map(t => t.tag)));

  // Tag 篩選（OR 邏輯）疊加在排序結果上
  const filteredTemplates = sortedTemplates.filter(tpl =>
    selectedTags.length === 0 || selectedTags.includes(tpl.tag)
  );

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleInitiateSaveTemplate = (notif: Notification) => {
    const defaultName = `${notif.tag}${notif.title.slice(0, 10)}`;
    setTplName(defaultName);
    setTplToSave({
      name: defaultName,
      tag: notif.tag,
      title: notif.title,
      subtitle: notif.subtitle,
      category: notif.category,
    });
    setIsSaveDialogOpen(true);
  };

  // 存為範本（草稿）— 資料來源為 draftNotification
  const handleInitiateSaveDraftTemplate = () => {
    if (!draftNotification) return;
    const selectedTag = draftNotification.tag;
    if (!selectedTag) { toast.error('請選擇或輸入活動標籤'); return; }
    const defaultName = `${selectedTag}${draftNotification.title.slice(0, 10)}`;
    setTplName(defaultName);
    setTplToSave({
      name: defaultName,
      tag: selectedTag,
      title: draftNotification.title,
      subtitle: draftNotification.subtitle,
      category: draftNotification.category,
    });
    setIsSaveDialogOpen(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!tplToSave) return;
    if (!tplName.trim()) {
      toast.error('請輸入範本名稱');
      return;
    }

    const success = await saveTemplate({
      ...tplToSave,
      name: tplName.trim(),
    });

    if (success) {
      setIsSaveDialogOpen(false);
      setTplToSave(null);
    }
  };

  const handleApplyTemplate = async (tpl: Template) => {
    setNotifCategory(tpl.category);
    
    const defaultTags = ['限時抽獎', '快閃優惠', '站點資訊', '會員服務', '全新商家'];
    if (defaultTags.includes(tpl.tag)) {
      setTag(tpl.tag);
      setCustomTag('');
    } else {
      setTag('custom');
      setCustomTag(tpl.tag);
    }
    
    setTitle(tpl.title);
    setSubtitle(tpl.subtitle);
    setSendTime(''); // 不套用日期時間
    
    await incrementUsedCount(tpl.id);
    
    setIsTemplatesLibraryOpen(false);
    setActiveTab(tpl.category);
    
    toast.success(`✓ 已套用範本「${tpl.name}」`);
  };


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


  const polishCopy = async () => {
    if (!title && !subtitle) { toast.error('請先輸入要潤飾的標題或副標'); return; }

    setIsPolishing(true);
    setAiSuggestions([]);
    setAiRecommendation('');
    try {
      let response = await fetch('/api/polish-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subtitle, campaignType })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'API 請求失敗');
      }

      if (Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      }
      if (data.recommendation) {
        setAiRecommendation(data.recommendation);
      }
    } catch (error: any) {
      console.error('API Error:', error);
      toast.error('AI 潤飾暫時無法使用');
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

            {/* 📚 範本庫摺疊區塊 */}
            <Collapsible
              open={isTemplatesLibraryOpen}
              onOpenChange={setIsTemplatesLibraryOpen}
              className="border border-purple-200 rounded-xl overflow-hidden shadow-sm bg-purple-50/20"
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100/70 transition-colors text-purple-900 font-semibold cursor-pointer">
                  <span className="flex items-center gap-2">📚 範本庫 {templates.length > 0 && `(${templates.length})`}</span>
                  <span>{isTemplatesLibraryOpen ? '▼' : '▶'}</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 border-t border-purple-100 bg-white">
                {!isTemplatesConfigured ? (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3.5 rounded-lg flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <strong>未啟用雲端範本庫</strong>
                      <p className="text-xs text-amber-500 mt-1 leading-normal">
                        請先設定環境變數 <code>VITE_TEMPLATES_API_URL</code> 以啟用雲端同步功能。
                      </p>
                    </div>
                  </div>
                ) : templatesLoading && templates.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    載入範本中...
                  </div>
                ) : templatesError ? (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3.5 rounded-lg flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">❌</span>
                    <div>
                      <strong>載入失敗</strong>
                      <p className="text-xs text-red-500 mt-1 leading-normal">{templatesError}</p>
                    </div>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400 leading-normal">
                    尚無儲存的範本。點擊已新增通知右側的 📌 來儲存範本！
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 排序及資訊列 */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">共 {templates.length} 筆範本（上限 50 筆）</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">排序：</span>
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as 'createdAt' | 'usedCount')}
                          className="border border-gray-300 rounded px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 text-gray-600 cursor-pointer"
                        >
                          <option value="createdAt">建立時間 (新到舊)</option>
                          <option value="usedCount">使用次數 (多到少)</option>
                        </select>
                      </div>
                    </div>

                    {/* Tag 篩選籤 */}
                    {availableTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {availableTags.map(tagItem => (
                          <button
                            key={tagItem}
                            onClick={() => toggleTag(tagItem)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors cursor-pointer ${
                              selectedTags.includes(tagItem)
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400 hover:text-purple-600'
                            }`}
                          >
                            {tagItem}
                          </button>
                        ))}
                        {selectedTags.length > 0 && (
                          <button
                            onClick={() => setSelectedTags([])}
                            className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                          >
                            ✕ 清除篩選
                          </button>
                        )}
                      </div>
                    )}

                    {/* 範本卡片 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                      {filteredTemplates.map(tpl => (
                        <div key={tpl.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow flex flex-col justify-between bg-gray-50/50">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <span className="font-bold text-sm text-gray-800 truncate" title={tpl.name}>
                                {tpl.name}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                tpl.category === 'announcement' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                tpl.category === 'activity' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                'bg-green-100 text-green-800 border border-green-200'
                              }`}>
                                {CATEGORY_LABELS[tpl.category]}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mb-3" title={tpl.title}>
                              {tpl.title}
                            </p>
                          </div>
                          <div className="flex justify-between items-center border-t border-gray-100 pt-2.5 mt-auto">
                            <span className="text-[10px] text-gray-400">
                              套用 {tpl.usedCount} 次
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApplyTemplate(tpl)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded font-semibold transition-colors cursor-pointer"
                              >
                                套用
                              </button>
                              
                              {/* 刪除確認的 AlertDialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 text-xs px-3 py-1 rounded font-semibold transition-colors cursor-pointer">
                                    刪除
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-sm">
                                  <AlertDialogHeader className="mb-4">
                                    <AlertDialogTitle className="text-lg font-bold text-gray-800">
                                      確認刪除此範本？
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs text-gray-500 mt-1 leading-normal">
                                      這將會從雲端永久刪除範本「<strong>{tpl.name}</strong>」，此動作無法復原。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-4">
                                    <AlertDialogCancel className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                                      取消
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteTemplate(tpl.id)}
                                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      確認刪除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>


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
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  標題文字 *
                </label>
                {title.length > 24 && (
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">標題過長，將被截斷</span>
                )}
              </div>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={50}
                placeholder="輸入通知標題，最多 50 字"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none min-h-20 ${
                  title.length > 24
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-300 focus:border-yellow-400 focus:ring-yellow-100'
                }`}
              />
              <div className={`text-xs text-right mt-1 ${title.length > 24 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                {title.length} / 24 (上限 50)
              </div>
            </div>

            {/* 副標 */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">副標說明文字</label>
                {subtitle.length > 20 && (
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">說明文字過長</span>
                )}
              </div>
              <textarea
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                maxLength={100}
                placeholder="輸入副標說明，最多 100 字"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none min-h-20 ${
                  subtitle.length > 20
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-300 focus:border-yellow-400 focus:ring-yellow-100'
                }`}
              />
              <div className={`text-xs text-right mt-1 ${subtitle.length > 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                {subtitle.length} / 20 (上限 100)
              </div>
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
                <div className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                  <span>🎯 點選套用（CTR 優化建議）：</span>
                  <button
                    onClick={() => { setAiSuggestions([]); setAiRecommendation(''); }}
                    className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded bg-gray-100 transition-colors"
                  >
                    關閉
                  </button>
                </div>
                {aiRecommendation && (
                  <div className="border border-amber-200 bg-amber-50 p-3.5 rounded-lg shadow-sm flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">💡</span>
                    <div className="text-xs text-amber-800 font-medium leading-relaxed">
                      {aiRecommendation}
                    </div>
                  </div>
                )}
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
                onClick={handleInitiateSaveDraftTemplate}
                disabled={!draftNotification}
                className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg font-medium hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                📌 存為範本（草稿）
              </button>
              <button
                onClick={copyText}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                📋 複製文案
              </button>
            </div>

            {/* 已新增通知列表 */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                已新增的通知 ({notifications.length}/{MAX_NOTIFICATIONS})
              </h3>
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">新增通知後將顯示於此</p>
              ) : (
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
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleInitiateSaveTemplate(n)}
                          className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded text-xs font-medium hover:bg-purple-200 transition-all flex items-center gap-0.5 cursor-pointer"
                          title="存為範本"
                        >
                          📌 存為範本
                        </button>
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600 transition-all cursor-pointer"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                      const isTitleExceeded = notif.title.length > 24;
                      const displayTitle = isTitleExceeded
                        ? `${notif.title.slice(0, 24)}...`
                        : notif.title;
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
                            <div className="flex items-start gap-1.5 mb-1">
                              {notif.tag && (
                                <span className="shrink-0 border border-red-500 text-red-500 px-1.5 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 leading-none">
                                  {notif.tag}
                                </span>
                              )}
                              <div
                                className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight"
                                title={notif.title}
                              >
                                {displayTitle}
                              </div>
                            </div>
                            {notif.subtitle && (
                              <div className="text-xs text-gray-600 mb-1 line-clamp-1" title={notif.subtitle}>
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
                              {isTitleExceeded && (
                                <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  已截斷 (超過24字)
                                </span>
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

      {/* 儲存範本的命名對話框 */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📌 儲存為範本
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1 leading-normal">
              設定範本名稱後，即可隨時在範本庫中快速套用此通知內容。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                範本名稱
              </label>
              <input
                type="text"
                value={tplName}
                onChange={e => setTplName(e.target.value)}
                placeholder="請輸入範本名稱"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-sm"
              />
            </div>
            <div className="bg-purple-50 text-purple-800 p-3.5 rounded-lg text-xs leading-relaxed">
              💡 預設名稱為：<strong>[標籤] + 標題前 10 字</strong>。儲存後可隨時在「📚 範本庫」中查看與套用。
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-4">
            <button
              onClick={() => setIsSaveDialogOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleConfirmSaveTemplate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              儲存範本
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
