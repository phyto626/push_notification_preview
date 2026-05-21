import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Template {
  id: string;
  name: string;
  tag: string;
  title: string;
  subtitle: string;
  category: 'announcement' | 'activity' | 'personal';
  createdAt: string;
  usedCount: number;
}

const API_URL = import.meta.env.VITE_TEMPLATES_API_URL || '';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = Boolean(API_URL);

  const fetchTemplates = useCallback(async () => {
    if (!isConfigured) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // doGet(getAll)
      const url = `${API_URL}?action=getAll`;
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.error) {
        throw new Error(data.error);
      }

      if (Array.isArray(data)) {
        // Map fields to ensure correct types
        const parsedTemplates = data.map((t: any) => ({
          ...t,
          usedCount: Number(t.usedCount) || 0,
        })) as Template[];
        setTemplates(parsedTemplates);
      } else {
        throw new Error('伺服器回傳格式錯誤');
      }
    } catch (err: any) {
      const msg = err.message || '無法連線至雲端範本庫';
      setError(msg);
      console.error('Fetch templates error:', err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  const saveTemplate = useCallback(async (templateData: Omit<Template, 'id' | 'createdAt' | 'usedCount'>) => {
    if (!isConfigured) {
      toast.error('請先設定環境變數 VITE_TEMPLATES_API_URL 以啟用範本庫功能');
      return false;
    }

    if (templates.length >= 50) {
      toast.error('範本庫已達 50 筆上限，請先刪除舊範本才能儲存');
      return false;
    }

    setLoading(true);
    try {
      const newTemplate = {
        action: 'save',
        ...templateData,
        id: Math.random().toString(36).substr(2, 9), // Generate temporary ID if none
        createdAt: new Date().toISOString(),
        usedCount: 0,
      };

      // To avoid CORS OPTIONS preflight issue in Apps Script, use text/plain
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`✓ 範本「${templateData.name}」已儲存`);
      await fetchTemplates(); // Refresh local templates cache
      return true;
    } catch (err: any) {
      const msg = err.message || '儲存範本失敗';
      toast.error(msg);
      console.error('Save template error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConfigured, templates.length, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!isConfigured) {
      toast.error('請先設定環境變數 VITE_TEMPLATES_API_URL');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'delete',
          id,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('✓ 範本已刪除');
      await fetchTemplates(); // Refresh cache
      return true;
    } catch (err: any) {
      const msg = err.message || '刪除範本失敗';
      toast.error(msg);
      console.error('Delete template error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConfigured, fetchTemplates]);

  const incrementUsedCount = useCallback(async (id: string) => {
    if (!isConfigured) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'incrementUsed',
          id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.error) {
          // Increment locally to avoid full fetch delay
          setTemplates(prev =>
            prev.map(t => (t.id === id ? { ...t, usedCount: t.usedCount + 1 } : t))
          );
        }
      }
    } catch (err) {
      console.error('Increment used count error:', err);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (isConfigured) {
      fetchTemplates();
    }
  }, [isConfigured, fetchTemplates]);

  return {
    templates,
    loading,
    error,
    isConfigured,
    fetchTemplates,
    saveTemplate,
    deleteTemplate,
    incrementUsedCount,
  };
}
