/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import Artplayer from 'artplayer';
// @ts-ignore
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import Hls from 'hls.js';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Heart,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type PointerEvent as ReactPointerEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  deleteSkipConfig,
  generateStorageKey,
  getAllPlayRecords,
  getSkipConfig,
  isFavorited,
  saveFavorite,
  savePlayRecord,
  saveSkipConfig,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { searchFromAllSources, getVideoDetail } from '@/lib/client-search';
import { SearchResult } from '@/lib/types';
import { getVideoResolutionFromM3u8, processImageUrl } from '@/lib/utils';

import EpisodeSelector from '@/components/EpisodeSelector';
import { triggerGlobalError } from '@/components/GlobalErrorIndicator';
import PageLayout from '@/components/PageLayout';

// 扩展 HTMLVideoElement 类型以支持 hls 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

function PlayPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // -----------------------------------------------------------------------------
  // 状态变量（State）
  // -----------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<
    'searching' | 'preferring' | 'fetching' | 'ready'
  >('searching');
  const [loadingMessage, setLoadingMessage] = useState('正在搜索播放源...');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchResult | null>(null);

  // 收藏状态
  const [favorited, setFavorited] = useState(false);

  // 跳过片头片尾配置
  const [skipConfig, setSkipConfig] = useState<{
    enable: boolean;
    intro_time: number;
    outro_time: number;
  }>({
    enable: false,
    intro_time: 0,
    outro_time: 0,
  });
  const skipConfigRef = useRef(skipConfig);
  useEffect(() => {
    skipConfigRef.current = skipConfig;
  }, [
    skipConfig,
    skipConfig.enable,
    skipConfig.intro_time,
    skipConfig.outro_time,
  ]);

  // 跳过检查的时间间隔控制
  const lastSkipCheckRef = useRef(0);

  // 去广告开关（从 localStorage 继承，默认 true）
  const [blockAdEnabled, setBlockAdEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('enable_blockad');
      if (v !== null) return v === 'true';
    }
    return true;
  });
  const blockAdEnabledRef = useRef(blockAdEnabled);
  useEffect(() => {
    blockAdEnabledRef.current = blockAdEnabled;
  }, [blockAdEnabled]);

  // 视频基本信息
  const [videoTitle, setVideoTitle] = useState(searchParams.get('title') || '');
  const [videoYear, setVideoYear] = useState(searchParams.get('year') || '');
  const [videoCover, setVideoCover] = useState('');
  // 当前源和ID
  const [currentSource, setCurrentSource] = useState(
    searchParams.get('source') || ''
  );
  const [currentId, setCurrentId] = useState(searchParams.get('id') || '');

  // 搜索所需信息
  const [searchTitle] = useState(searchParams.get('stitle') || '');
  const [searchType] = useState(searchParams.get('stype') || '');

  // 是否需要优选
  const [needPrefer, setNeedPrefer] = useState(
    searchParams.get('prefer') === 'true'
  );
  const needPreferRef = useRef(needPrefer);
  useEffect(() => {
    needPreferRef.current = needPrefer;
  }, [needPrefer]);
  // 集数相关
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);
  const videoYearRef = useRef(videoYear);
  const detailRef = useRef<SearchResult | null>(detail);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);

  // 同步最新值到 refs
  useEffect(() => {
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
    videoYearRef.current = videoYear;
  }, [
    currentSource,
    currentId,
    detail,
    currentEpisodeIndex,
    videoTitle,
    videoYear,
  ]);

  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');

  // 弹幕相关状态
  const [danmakuEnabled, setDanmakuEnabled] = useState(false);
  const [danmakuOffset, setDanmakuOffset] = useState(0); // 秒，可正可负
  const danmakuPluginRef = useRef<any>(null);
  const danmakuFileRef = useRef<File | null>(null); // 存储本地弹幕文件
  // 弹幕高级加载面板
  const [danmakuPanelOpen, setDanmakuPanelOpen] = useState(false);
  type DanmakuSourceType =
    | 'bv'
    | 'link'
    | 'season_id'
    | 'media_id'
    | 'cid'
    | 'local';
  const [danmakuSourceType, setDanmakuSourceType] =
    useState<DanmakuSourceType>('link');
  const [danmakuInput, setDanmakuInput] = useState('');
  const [danmakuEp, setDanmakuEp] = useState<number>(1); // season/media 专用（1基）
  const [danmakuP, setDanmakuP] = useState<number>(1); // BV 分P（1基）
  const [danmakuLoading, setDanmakuLoading] = useState(false);
  const [danmakuMsg, setDanmakuMsg] = useState<string | null>(null);
  // 弹幕优化：密度限制与关键词屏蔽
  const [danmakuLimitPerSec, setDanmakuLimitPerSec] = useState<number>(() => {
    try {
      const v =
        typeof window !== 'undefined'
          ? localStorage.getItem('danmaku_limit_per_sec')
          : null;
      const n = v ? Number(v) : 50; // 默认 50 条/秒
      return Number.isFinite(n) && n >= 0 ? n : 50;
    } catch {
      return 50;
    }
  });
  const [danmakuKeywords, setDanmakuKeywords] = useState<string>(() => {
    try {
      return typeof window !== 'undefined'
        ? localStorage.getItem('danmaku_keywords') || ''
        : '';
    } catch {
      return '';
    }
  });
  // 当插件未就绪时暂存待加载的数据源（URL 解析为数组后再存）；同样记录最近一次成功加载的数据源
  const pendingDanmakuDataRef = useRef<any[] | null>(null);
  const lastDanmakuDataRef = useRef<any[] | null>(null);

  // 弹幕加载历史记录
  type DanmakuHistory = {
    type: DanmakuSourceType;
    value: string; // cid/bv/season_id/media_id 或 url
    ep?: number; // season/media 的集数
    p?: number; // BV 的分P
    timestamp: number;
  };

  // 剧集弹幕配置（按剧保存 season_id/media_id）
  type SeriesDanmakuConfig = {
    type: 'season_id' | 'media_id';
    value: string;
    timestamp: number;
  };

  // 获取当前剧集的唯一标识（用于剧集弹幕配置）
  const getSeriesKey = (): string | null => {
    // 优先使用 site_id + detail_id（来自详情页的播放）
    const siteId = searchParams.get('site_id');
    const detailId = searchParams.get('detail_id');
    if (siteId && detailId) {
      return `series_${siteId}_${detailId}`;
    }

    // 其次使用 source + id（直接播放页面）
    const source = searchParams.get('source');
    const id = searchParams.get('id');
    if (source && id) {
      return `series_${source}_${id}`;
    }

    // 无法确定剧集标识
    return null;
  };

  // 获取当前播放的集数（从 URL 或 state）
  const getCurrentEpisode = (): number => {
    // 从当前播放的集数索引获取（1-based）
    return currentEpisodeIndex + 1;
  };

  // 获取当前视频的唯一标识（用于保存弹幕历史）
  const getVideoKey = (): string => {
    // 优先使用 source_id（如果有的话）
    const sourceId = searchParams.get('source_id');
    if (sourceId) return `source_${sourceId}`;

    // 其次使用 site_id + detail_id（来自详情页）
    const siteId = searchParams.get('site_id');
    const detailId = searchParams.get('detail_id');
    if (siteId && detailId) {
      const episode = getCurrentEpisode();
      return `site_${siteId}_${detailId}_ep${episode}`;
    }

    // 再次使用 source + id（直接播放页面）
    const source = searchParams.get('source');
    const id = searchParams.get('id');
    if (source && id) {
      const episode = getCurrentEpisode();
      return `video_${source}_${id}_ep${episode}`;
    }

    // 兜底使用视频标题（如果有的话）
    if (videoTitle) {
      return `title_${videoTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}`;
    }

    // 最后兜底
    return `video_${Date.now()}`;
  };

  // 保存剧集弹幕配置（season_id/media_id）
  const saveSeriesDanmakuConfig = (
    type: 'season_id' | 'media_id',
    value: string
  ) => {
    try {
      const seriesKey = getSeriesKey();
      if (!seriesKey) {
        console.log('[danmaku] 无法确定剧集标识，不保存剧集配置');
        return;
      }
      const config: SeriesDanmakuConfig = {
        type,
        value,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        `danmaku_series_${seriesKey}`,
        JSON.stringify(config)
      );
      console.log('[danmaku] 已保存剧集弹幕配置', { seriesKey, config });
    } catch (e) {
      console.warn('[danmaku] 保存剧集弹幕配置失败', e);
    }
  };

  // 读取剧集弹幕配置
  const loadSeriesDanmakuConfig = (): SeriesDanmakuConfig | null => {
    try {
      const seriesKey = getSeriesKey();
      if (!seriesKey) return null;
      const stored = localStorage.getItem(`danmaku_series_${seriesKey}`);
      if (!stored) return null;
      const config = JSON.parse(stored) as SeriesDanmakuConfig;
      console.log('[danmaku] 读取到剧集弹幕配置', { seriesKey, config });
      return config;
    } catch (e) {
      console.warn('[danmaku] 读取剧集弹幕配置失败', e);
      return null;
    }
  };

  // 保存弹幕加载历史
  const saveDanmakuHistory = (
    type: DanmakuSourceType,
    value: string,
    ep?: number,
    p?: number
  ) => {
    try {
      const key = getVideoKey();
      const history: DanmakuHistory = {
        type,
        value,
        ep,
        p,
        timestamp: Date.now(),
      };
      localStorage.setItem(`danmaku_history_${key}`, JSON.stringify(history));
      console.log('[danmaku] 已保存加载历史', { key, history });

      // 如果是剧集类型，同时保存剧集配置
      if (type === 'season_id' || type === 'media_id') {
        saveSeriesDanmakuConfig(type, value);
      } else if (type === 'link') {
        // 尝试从 link 中提取 season_id 或 media_id
        const ssMatch = value.match(/\/ss(\d+)/);
        const mdMatch = value.match(/\/md(\d+)/);
        if (ssMatch) {
          saveSeriesDanmakuConfig('season_id', ssMatch[1]);
        } else if (mdMatch) {
          saveSeriesDanmakuConfig('media_id', mdMatch[1]);
        }
      }
    } catch (e) {
      console.warn('[danmaku] 保存加载历史失败', e);
    }
  };

  // 读取弹幕加载历史
  const loadDanmakuHistory = (): DanmakuHistory | null => {
    try {
      const key = getVideoKey();
      const stored = localStorage.getItem(`danmaku_history_${key}`);
      if (!stored) return null;
      const history = JSON.parse(stored) as DanmakuHistory;
      console.log('[danmaku] 读取到加载历史', { key, history });
      return history;
    } catch (e) {
      console.warn('[danmaku] 读取加载历史失败', e);
      return null;
    }
  };

  // 构造弹幕过滤器：关键词屏蔽 + 每秒密度限制
  const buildDanmakuFilter = (keywords?: string, limitPerSec?: number) => {
    const kw = (keywords ?? danmakuKeywords ?? '')
      .split(/[,\n;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const kwSet = new Set(kw);
    const limit = Number(limitPerSec ?? danmakuLimitPerSec) || 0; // 0 表示不限
    const perSecondCounter = new Map<number, number>();

    return (item: any) => {
      if (!item || !item.text) return false;
      // 关键词过滤
      if (kwSet.size > 0) {
        const textLower = String(item.text).toLowerCase();
        let blocked = false;
        kwSet.forEach((k) => {
          if (!blocked && k && textLower.includes(k)) blocked = true;
        });
        if (blocked) return false;
      }
      // 密度限制（按弹幕出现时间的秒粒度）
      if (limit > 0) {
        const sec = Math.max(0, Math.floor(Number(item.time) || 0));
        const c = (perSecondCounter.get(sec) || 0) + 1;
        perSecondCounter.set(sec, c);
        if (c > limit) return false;
      }
      return true;
    };
  };

  // 获取弹幕插件实例（兼容不同安装方式）
  const getDanmakuPlugin = (): any | null => {
    const direct = danmakuPluginRef.current;
    if (direct && typeof direct.load === 'function') return direct;
    const art: any = artPlayerRef.current as any;
    if (art && art.plugins) {
      const plugins = art.plugins;

      // 优先检查常见路径: plugins.artplayerPluginDanmuku
      if (
        plugins.artplayerPluginDanmuku &&
        typeof plugins.artplayerPluginDanmuku.load === 'function'
      ) {
        return plugins.artplayerPluginDanmuku;
      }

      // 递归查找 plugins 下所有对象，防止循环引用
      const findDanmaku = (obj: any, visited = new Set()): any | null => {
        if (!obj || typeof obj !== 'object') return null;
        if (visited.has(obj)) return null;
        visited.add(obj);
        // 只要求 load 方法存在
        if (typeof obj.load === 'function') {
          return obj;
        }
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (val && typeof val === 'object') {
            const found = findDanmaku(val, visited);
            if (found) return found;
          }
        }
        return null;
      };
      // 先查 plugins 自身
      const found = findDanmaku(plugins);
      if (found) return found;

      // 再查 plugins 的每个 key
      if (Array.isArray(plugins)) {
        for (const cand of plugins) {
          const found = findDanmaku(cand);
          if (found) return found;
        }
      } else if (typeof plugins === 'object') {
        for (const key of Object.keys(plugins)) {
          const cand = plugins[key];
          const found = findDanmaku(cand);
          if (found) return found;
        }
      }
    }
    return null;
  };

  // 同步弹幕插件属性时加判空保护
  const safeSet = (obj: any, key: string, value: any) => {
    if (obj && typeof obj === 'object') {
      try {
        obj[key] = value;
      } catch (e) {
        console.warn('同步弹幕插件属性失败', key, e);
      }
    }
  };
  const showPlayerNotice = (text: string, duration = 2400) => {
    try {
      const art: any = artPlayerRef.current as any;
      if (!art) return;
      // 方式一：函数形式
      const fn = art.notice?.show;
      if (typeof fn === 'function') {
        try {
          fn.call(art.notice, text, duration);
          return;
        } catch {
          // ignore
        }
      }
      // 方式二：属性赋值（某些版本是 setter）
      try {
        if (art.notice && 'show' in art.notice) {
          (art.notice as any).show = text;
          return;
        }
      } catch {
        // ignore
      }
      // 方式三：DOM 兜底层
      const host: HTMLElement | null = (artRef.current as any) || null;
      if (!host) return;
      let el = host.querySelector('.danmaku-toast') as HTMLElement | null;
      if (!el) {
        el = document.createElement('div');
        el.className = 'danmaku-toast';
        Object.assign(el.style, {
          position: 'absolute',
          left: '12px',
          top: '12px',
          zIndex: '100000',
          background: 'rgba(0,0,0,0.65)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '12px',
          pointerEvents: 'none',
          transition: 'opacity .2s ease',
          opacity: '0',
          maxWidth: '70%',
        } as CSSStyleDeclaration);
        const computed = window.getComputedStyle(host);
        if (computed.position === 'static') {
          host.style.position = 'relative';
        }
        host.appendChild(el);
      }
      el.textContent = text;
      el.style.opacity = '1';
      // @ts-ignore 临时属性存放计时器
      window.clearTimeout(el._hideTimer);
      // @ts-ignore
      el._hideTimer = window.setTimeout(() => {
        if (el) el.style.opacity = '0';
      }, duration);
    } catch {
      // ignore
    }
  };

  // 自定义输入对话框(替代 prompt,因为 Electron 不支持 prompt)
  const showInputDialog = (message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      // 创建对话框遮罩
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
      `;

      // 创建对话框
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #2a2a2a;
        border-radius: 8px;
        padding: 24px;
        min-width: 400px;
        max-width: 600px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;

      // 创建消息文本
      const messageEl = document.createElement('div');
      messageEl.style.cssText = `
        color: #fff;
        font-size: 14px;
        margin-bottom: 16px;
        white-space: pre-wrap;
        line-height: 1.5;
      `;
      messageEl.textContent = message;

      // 创建输入框
      const input = document.createElement('textarea');
      input.value = defaultValue;
      input.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        min-height: 60px;
        box-sizing: border-box;
        outline: none;
      `;
      input.addEventListener('focus', () => {
        input.style.borderColor = '#3b82f6';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = '#444';
      });

      // 创建按钮容器
      const buttons = document.createElement('div');
      buttons.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 16px;
      `;

      // 取消按钮
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '取消';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: #444;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#555';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#444';
      });
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(null);
      });

      // 确定按钮
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = '确定';
      confirmBtn.style.cssText = `
        padding: 8px 16px;
        background: #3b82f6;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.background = '#2563eb';
      });
      confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.background = '#3b82f6';
      });
      confirmBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(input.value);
      });

      // 组装对话框
      buttons.appendChild(cancelBtn);
      buttons.appendChild(confirmBtn);
      dialog.appendChild(messageEl);
      dialog.appendChild(input);
      dialog.appendChild(buttons);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // 自动聚焦并选中文本
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);

      // 支持回车确认
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          confirmBtn.click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelBtn.click();
        }
      });

      // 点击遮罩关闭
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cancelBtn.click();
        }
      });
    });
  };

  // 解析工具：B站 XML
  const parseBilibiliXml = (xmlText: string): any[] => {
    try {
      const list: any[] = [];
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const nodes = Array.from(doc.getElementsByTagName('d'));
      nodes.forEach((node) => {
        const p = node.getAttribute('p') || '';
        const parts = p.split(',');
        const time = Number.parseFloat(parts[0] || '0') || 0;
        const colorDec = Number.parseInt(parts[3] || '16777215', 10);
        const color = `#${(colorDec >>> 0).toString(16).padStart(6, '0')}`;
        const text = node.textContent || '';
        if (text) list.push({ text, time, color, mode: 0 });
      });
      return list.sort((a, b) => a.time - b.time);
    } catch {
      return [];
    }
  };

  // 解析工具：ASS（极简实现，仅取起始时间和文本）
  const parseASSToDanmaku = (assText: string): any[] => {
    const lines = assText.split(/\r?\n/);
    const res: any[] = [];
    const timeToSec = (t: string) => {
      const m = t.trim().match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/);
      if (!m) return 0;
      const h = Number(m[1] || 0);
      const mi = Number(m[2] || 0);
      const s = Number(m[3] || 0);
      const cs = Number(m[4] || 0);
      return h * 3600 + mi * 60 + s + cs / 100;
    };
    for (const line of lines) {
      if (!line.startsWith('Dialogue:')) continue;
      const m = line.match(
        /^Dialogue:[^,]*,([^,]*),([^,]*),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)$/
      );
      if (!m) continue;
      const start = timeToSec(m[1]);
      let text = m[3] || '';
      text = text.replace(/{[^}]*}/g, '').replace(/\\N/g, '\n');
      if (text) res.push({ text, time: start, color: '#ffffff', mode: 0 });
    }
    return res.sort((a, b) => a.time - b.time);
  };

  // 解析入口：根据内容识别 XML/ASS/JSON
  const parseDanmakuText = (text: string): any[] => {
    const t = text.trim();
    if (!t) return [];
    if (t.startsWith('<')) {
      // B站 XML
      return parseBilibiliXml(t);
    }
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        const data = JSON.parse(t);
        if (Array.isArray(data)) return data;
      } catch {
        /* ignore */
      }
    }
    // 兜底按 ASS 解析
    return parseASSToDanmaku(t);
  };

  // 从 URL 加载并解析为数组
  const loadDanmakuFromUrl = async (url: string) => {
    if (!url) return;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      throw new Error(`请求失败 ${r.status}: ${msg.slice(0, 120)}`);
    }
    const text = await r.text();
    let data = parseDanmakuText(text);
    console.log('[danmaku] 解析弹幕', { url, dataLen: data.length });
    if (!data.length) throw new Error('弹幕解析为空');

    // 手动应用过滤器
    const filter = buildDanmakuFilter();
    const originalCount = data.length;
    data = data.filter(filter);
    const filteredCount = data.length;
    const blockedCount = originalCount - filteredCount;
    console.log('[danmaku] 过滤后', {
      原始: originalCount,
      保留: filteredCount,
      屏蔽: blockedCount,
    });

    const plugin = getDanmakuPlugin();
    if (plugin && typeof plugin.load === 'function') {
      // 不在这里清空，交由调用方（自动加载useEffect）负责清空
      try {
        await plugin.load(data);
        console.log('[danmaku] plugin.load(data) 成功', data.length);
      } catch (e) {
        console.warn('[danmaku] 以数组加载弹幕失败，尝试回退为 URL 加载', e);
        try {
          await plugin.load(url);
          console.log('[danmaku] plugin.load(url) 成功');
        } catch (e2) {
          console.error('[danmaku] URL 加载弹幕仍失败', e2);
          throw e2;
        }
      }
      safeSet(plugin.config, 'visible', true);
      if (typeof plugin.update === 'function') plugin.update();

      const msg =
        blockedCount > 0
          ? `弹幕已加载：保留 ${filteredCount} 条，屏蔽 ${blockedCount} 条`
          : `弹幕已加载：${filteredCount} 条`;
      showPlayerNotice(msg, 2600);
    } else {
      console.warn('[danmaku] 插件未就绪，pending', data.length);
      pendingDanmakuDataRef.current = data;
      // 兜底：1秒后强制重试
      setTimeout(() => {
        const p = getDanmakuPlugin();
        if (
          p &&
          typeof p.load === 'function' &&
          pendingDanmakuDataRef.current
        ) {
          try {
            p.load(pendingDanmakuDataRef.current);
            showPlayerNotice(
              `弹幕已加载：${pendingDanmakuDataRef.current.length} 条`,
              2600
            );
            pendingDanmakuDataRef.current = null;
            console.log('[danmaku] 兜底重试成功');
          } catch (e) {
            console.error('[danmaku] 兜底重试失败', e);
          }
        }
      }, 1000);
    }
    // 保存原始数据用于重新过滤
    lastDanmakuDataRef.current = parseDanmakuText(text);
  };

  // 从文本内容加载(用于本地文件)
  const loadDanmakuFromText = async (text: string) => {
    let data = parseDanmakuText(text);
    console.log('[danmaku] 解析本地弹幕', { dataLen: data.length });
    if (!data.length) throw new Error('弹幕解析为空');

    // 手动应用过滤器
    const filter = buildDanmakuFilter();
    const originalCount = data.length;
    data = data.filter(filter);
    const filteredCount = data.length;
    const blockedCount = originalCount - filteredCount;
    console.log('[danmaku] 过滤后', {
      原始: originalCount,
      保留: filteredCount,
      屏蔽: blockedCount,
    });

    const plugin = getDanmakuPlugin();
    if (plugin && typeof plugin.load === 'function') {
      // 不在这里清空，交由调用方负责清空
      try {
        await plugin.load(data);
        console.log('[danmaku] plugin.load(data) 成功', data.length);
      } catch (e) {
        console.warn('[danmaku] 以数组加载本地弹幕失败，尝试回退为文本加载', e);
        try {
          await plugin.load(text);
          console.log('[danmaku] plugin.load(text) 成功');
        } catch (e2) {
          console.error('[danmaku] 文本加载本地弹幕仍失败', e2);
          throw e2;
        }
      }
      safeSet(plugin.config, 'visible', true);
      if (typeof plugin.update === 'function') plugin.update();

      const msg =
        blockedCount > 0
          ? `弹幕已加载：保留 ${filteredCount} 条，屏蔽 ${blockedCount} 条`
          : `弹幕已加载：${filteredCount} 条`;
      showPlayerNotice(msg, 2600);
    } else {
      console.warn('[danmaku] 插件未就绪，pending', data.length);
      pendingDanmakuDataRef.current = data;
      setTimeout(() => {
        const p = getDanmakuPlugin();
        if (
          p &&
          typeof p.load === 'function' &&
          pendingDanmakuDataRef.current
        ) {
          try {
            p.load(pendingDanmakuDataRef.current);
            showPlayerNotice(
              `弹幕已加载：${pendingDanmakuDataRef.current.length} 条`,
              2600
            );
            pendingDanmakuDataRef.current = null;
            console.log('[danmaku] 兜底重试成功');
          } catch (e) {
            console.error('[danmaku] 兜底重试失败', e);
          }
        }
      }, 1000);
    }
    // 保存原始数据用于重新过滤
    lastDanmakuDataRef.current = parseDanmakuText(text);
  };

  // 重新以当前过滤规则加载上一次弹幕源
  const reloadDanmakuWithFilter = async (keywords?: string, limitPerSec?: number): Promise<string> => {
    const data = lastDanmakuDataRef.current || pendingDanmakuDataRef.current;
    if (!data || !data.length) return '无弹幕源';
    try {
      const plugin = getDanmakuPlugin();
      if (plugin) {
        // 手动应用过滤器,使用传入的参数或当前状态
        const filter = buildDanmakuFilter(keywords, limitPerSec);
        const beforeCount = data.length;
        const filteredData = data.filter(filter);
        const afterCount = filteredData.length;
        const blockedCount = beforeCount - afterCount;

        console.log('[danmaku] 过滤统计:', {
          原始: beforeCount,
          保留: afterCount,
          屏蔽: blockedCount,
          关键词: keywords ?? danmakuKeywords,
          密度限制: limitPerSec ?? danmakuLimitPerSec,
        });

        // 先清空之前的弹幕（直接重置内部数据）
        try {
          // 尝试多种清空方法
          if (plugin.danmus) {
            plugin.danmus = [];
          }
          if (plugin.dan) {
            plugin.dan = [];
          }
          // 调用 hide 方法（如果存在）
          if (typeof plugin.hide === 'function') {
            plugin.hide();
          }
          // 最后尝试 load 空数组
          await plugin.load([]);
          console.log('[danmaku] 清空之前的弹幕');
        } catch (e) {
          console.warn('[danmaku] 清空弹幕失败', e);
        }

        // 加载过滤后的数据
        await plugin.load(filteredData);
        if (typeof plugin.update === 'function') plugin.update();

        const msg =
          blockedCount > 0
            ? `弹幕过滤已应用：保留 ${afterCount} 条，屏蔽 ${blockedCount} 条`
            : `弹幕过滤已应用：共 ${afterCount} 条`;
        showPlayerNotice(msg, 2500);
        return '已应用并重载';
      }
      pendingDanmakuDataRef.current = data;
      return '插件未就绪，稍后自动应用';
    } catch (e: any) {
      console.error('重载弹幕失败', e);
      const msg = e?.message || '重载失败';
      triggerGlobalError(msg);
      return '失败';
    }
  };

  // 总集数
  const totalEpisodes = detail?.episodes?.length || 0;
  const episodeList = detail?.episodes ?? [];

  const [availableSources, setAvailableSources] = useState<SearchResult[]>([]);
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(
    null
  );

  // 优选和测速开关
  const [optimizationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableOptimization');
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return true;
  });

  // 保存优选时的测速结果，避免EpisodeSelector重复测速
  const [precomputedVideoInfo, setPrecomputedVideoInfo] = useState<
    Map<string, { quality: string; loadSpeed: string; pingTime: number }>
  >(new Map());

  // 折叠状态（仅在 lg 及以上屏幕有效）
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] =
    useState(false);

  // 换源加载状态
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadingStage, setVideoLoadingStage] = useState<
    'initing' | 'sourceChanging'
  >('initing');

  // 播放进度保存相关
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  const artPlayerRef = useRef<any>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  // 播放恢复与个性化设置引用
  const resumeTimeRef = useRef<number | null>(null);
  const lastVolumeRef = useRef<number>(0.7);
  const lastPlaybackRateRef = useRef<number>(1);

  const resolveM3u8PlaylistUrl = async (
    originalUrl: string,
    depth = 0
  ): Promise<string> => {
    if (!originalUrl || depth > 3) return originalUrl;

    try {
      const response = await fetch(originalUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const manifestText = await response.text();

      if (/#EXTINF/i.test(manifestText)) {
        return originalUrl;
      }

      const lines = manifestText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const variantCandidates: Array<{ url: string; bandwidth?: number }> = [];

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('#EXT-X-STREAM-INF')) {
          let bandwidth: number | undefined;
          const attrPart = line.includes(':') ? line.split(':')[1] : '';
          if (attrPart) {
            attrPart.split(',').forEach((attr) => {
              const [rawKey, rawValue] = attr.split('=');
              if (!rawKey || !rawValue) return;
              const key = rawKey.trim().toUpperCase();
              const value = rawValue.trim().replace(/^"|"$/g, '');
              if (key === 'BANDWIDTH') {
                const parsed = Number.parseInt(value, 10);
                if (!Number.isNaN(parsed)) {
                  bandwidth = parsed;
                }
              }
            });
          }

          let playlistLine: string | null = null;
          let j = i + 1;
          while (j < lines.length) {
            const candidate = lines[j];
            if (!candidate) {
              j += 1;
              continue;
            }
            if (candidate.startsWith('#')) {
              j += 1;
              continue;
            }
            playlistLine = candidate;
            break;
          }

          if (playlistLine) {
            try {
              const resolved = new URL(playlistLine, originalUrl).toString();
              variantCandidates.push({ url: resolved, bandwidth });
            } catch (err) {
              console.warn('无法解析子清单地址:', playlistLine, err);
            }
          }
        } else if (!line.startsWith('#')) {
          try {
            const resolved = new URL(line, originalUrl).toString();
            variantCandidates.push({ url: resolved });
          } catch (err) {
            console.warn('无法解析播放地址行:', line, err);
          }
        }
      }

      if (variantCandidates.length === 0) {
        return originalUrl;
      }

      variantCandidates.sort((a, b) => (b.bandwidth ?? 0) - (a.bandwidth ?? 0));
      const bestCandidate = variantCandidates[0];

      if (!bestCandidate?.url || bestCandidate.url === originalUrl) {
        return originalUrl;
      }

      return resolveM3u8PlaylistUrl(bestCandidate.url, depth + 1);
    } catch (err) {
      console.error('解析下载链接失败:', err);
      return originalUrl;
    }
  };

  const resolveDownloadUrls = async (urls: string[]): Promise<string[]> => {
    const resolved: string[] = [];
    for (const url of urls) {
      const finalUrl = await resolveM3u8PlaylistUrl(url);
      if (finalUrl) {
        resolved.push(finalUrl);
      }
    }
    return resolved;
  };

  // -----------------------------------------------------------------------------
  // 工具函数（Utils）
  // -----------------------------------------------------------------------------

  // 播放源优选函数
  const preferBestSource = async (
    sources: SearchResult[]
  ): Promise<SearchResult> => {
    if (sources.length === 1) return sources[0];

    // 将播放源均分为两批，并发测速各批，避免一次性过多请求
    const batchSize = Math.ceil(sources.length / 2);
    const allResults: Array<{
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number };
    } | null> = [];

    for (let start = 0; start < sources.length; start += batchSize) {
      const batchSources = sources.slice(start, start + batchSize);
      const batchResults = await Promise.all(
        batchSources.map(async (source) => {
          try {
            // 检查是否有第一集的播放地址
            if (!source.episodes || source.episodes.length === 0) {
              console.warn(`播放源 ${source.source_name} 没有可用的播放地址`);
              return null;
            }

            const episodeUrl =
              source.episodes.length > 1
                ? source.episodes[1]
                : source.episodes[0];
            const testResult = await getVideoResolutionFromM3u8(episodeUrl);

            return {
              source,
              testResult,
            };
          } catch (error) {
            return null;
          }
        })
      );
      allResults.push(...batchResults);
    }

    // 等待所有测速完成，包含成功和失败的结果
    // 保存所有测速结果到 precomputedVideoInfo，供 EpisodeSelector 使用（包含错误结果）
    const newVideoInfoMap = new Map<
      string,
      {
        quality: string;
        loadSpeed: string;
        pingTime: number;
        hasError?: boolean;
      }
    >();
    allResults.forEach((result, index) => {
      const source = sources[index];
      const sourceKey = `${source.source}-${source.id}`;

      if (result) {
        // 成功的结果
        newVideoInfoMap.set(sourceKey, result.testResult);
      }
    });

    // 过滤出成功的结果用于优选计算
    const successfulResults = allResults.filter(Boolean) as Array<{
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number };
    }>;

    setPrecomputedVideoInfo(newVideoInfoMap);

    if (successfulResults.length === 0) {
      console.warn('所有播放源测速都失败，使用第一个播放源');
      return sources[0];
    }

    // 找出所有有效速度的最大值，用于线性映射
    const validSpeeds = successfulResults
      .map((result) => {
        const speedStr = result.testResult.loadSpeed;
        if (speedStr === '未知' || speedStr === '测量中...') return 0;

        const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2];
        return unit === 'MB/s' ? value * 1024 : value; // 统一转换为 KB/s
      })
      .filter((speed) => speed > 0);

    const maxSpeed = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 1024; // 默认1MB/s作为基准

    // 找出所有有效延迟的最小值和最大值，用于线性映射
    const validPings = successfulResults
      .map((result) => result.testResult.pingTime)
      .filter((ping) => ping > 0);

    const minPing = validPings.length > 0 ? Math.min(...validPings) : 50;
    const maxPing = validPings.length > 0 ? Math.max(...validPings) : 1000;

    // 计算每个结果的评分
    const resultsWithScore = successfulResults.map((result) => ({
      ...result,
      score: calculateSourceScore(
        result.testResult,
        maxSpeed,
        minPing,
        maxPing
      ),
    }));

    // 按综合评分排序，选择最佳播放源
    resultsWithScore.sort((a, b) => b.score - a.score);

    console.log('播放源评分排序结果:');
    resultsWithScore.forEach((result, index) => {
      console.log(
        `${index + 1}. ${
          result.source.source_name
        } - 评分: ${result.score.toFixed(2)} (${result.testResult.quality}, ${
          result.testResult.loadSpeed
        }, ${result.testResult.pingTime}ms)`
      );
    });

    return resultsWithScore[0].source;
  };

  // 计算播放源综合评分
  const calculateSourceScore = (
    testResult: {
      quality: string;
      loadSpeed: string;
      pingTime: number;
    },
    maxSpeed: number,
    minPing: number,
    maxPing: number
  ): number => {
    let score = 0;

    // 分辨率评分 (40% 权重)
    const qualityScore = (() => {
      switch (testResult.quality) {
        case '4K':
          return 100;
        case '2K':
          return 85;
        case '1080p':
          return 75;
        case '720p':
          return 60;
        case '480p':
          return 40;
        case 'SD':
          return 20;
        default:
          return 0;
      }
    })();
    score += qualityScore * 0.4;

    // 下载速度评分 (40% 权重) - 基于最大速度线性映射
    const speedScore = (() => {
      const speedStr = testResult.loadSpeed;
      if (speedStr === '未知' || speedStr === '测量中...') return 30;

      // 解析速度值
      const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
      if (!match) return 30;

      const value = parseFloat(match[1]);
      const unit = match[2];
      const speedKBps = unit === 'MB/s' ? value * 1024 : value;

      // 基于最大速度线性映射，最高100分
      const speedRatio = speedKBps / maxSpeed;
      return Math.min(100, Math.max(0, speedRatio * 100));
    })();
    score += speedScore * 0.4;

    // 网络延迟评分 (20% 权重) - 基于延迟范围线性映射
    const pingScore = (() => {
      const ping = testResult.pingTime;
      if (ping <= 0) return 0; // 无效延迟给默认分

      // 如果所有延迟都相同，给满分
      if (maxPing === minPing) return 100;

      // 线性映射：最低延迟=100分，最高延迟=0分
      const pingRatio = (maxPing - ping) / (maxPing - minPing);
      return Math.min(100, Math.max(0, pingRatio * 100));
    })();
    score += pingScore * 0.2;

    return Math.round(score * 100) / 100; // 保留两位小数
  };

  // 更新视频地址
  const updateVideoUrl = (
    detailData: SearchResult | null,
    episodeIndex: number
  ) => {
    if (
      !detailData ||
      !detailData.episodes ||
      episodeIndex >= detailData.episodes.length
    ) {
      setVideoUrl('');
      return;
    }
    const newUrl = detailData?.episodes[episodeIndex] || '';
    if (newUrl !== videoUrl) {
      setVideoUrl(newUrl);
    }
  };

  const ensureVideoSource = (video: HTMLVideoElement | null, url: string) => {
    if (!video || !url) return;
    const sources = Array.from(video.getElementsByTagName('source'));
    const existed = sources.some((s) => s.src === url);
    if (!existed) {
      // 移除旧的 source，保持唯一
      sources.forEach((s) => s.remove());
      const sourceEl = document.createElement('source');
      sourceEl.src = url;
      video.appendChild(sourceEl);
    }

    // 始终允许远程播放（AirPlay / Cast）
    video.disableRemotePlayback = false;
    // 如果曾经有禁用属性，移除之
    if (video.hasAttribute('disableRemotePlayback')) {
      video.removeAttribute('disableRemotePlayback');
    }
  };

  // 去广告相关函数
  function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';

    // 按行分割M3U8内容
    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 只过滤#EXT-X-DISCONTINUITY标识
      if (!line.includes('#EXT-X-DISCONTINUITY')) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  // 跳过片头片尾配置相关函数
  const handleSkipConfigChange = async (newConfig: {
    enable: boolean;
    intro_time: number;
    outro_time: number;
  }) => {
    if (!currentSourceRef.current || !currentIdRef.current) return;

    try {
      setSkipConfig(newConfig);
      if (!newConfig.enable && !newConfig.intro_time && !newConfig.outro_time) {
        await deleteSkipConfig(currentSourceRef.current, currentIdRef.current);
        artPlayerRef.current.setting.update({
          name: '跳过片头片尾',
          html: '跳过片头片尾',
          switch: skipConfigRef.current.enable,
          onSwitch: function (item: any) {
            const newConfig = {
              ...skipConfigRef.current,
              enable: !item.switch,
            };
            handleSkipConfigChange(newConfig);
            return !item.switch;
          },
        });
        artPlayerRef.current.setting.update({
          name: '设置片头',
          html: '设置片头',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L17 12" stroke="#ffffff" stroke-width="2"/><path d="M17 6L17 18" stroke="#ffffff" stroke-width="2"/></svg>',
          tooltip:
            skipConfigRef.current.intro_time === 0
              ? '设置片头时间'
              : `${formatTime(skipConfigRef.current.intro_time)}`,
          onClick: function () {
            const currentTime = artPlayerRef.current?.currentTime || 0;
            if (currentTime > 0) {
              const newConfig = {
                ...skipConfigRef.current,
                intro_time: currentTime,
              };
              handleSkipConfigChange(newConfig);
              return `${formatTime(currentTime)}`;
            }
          },
        });
        artPlayerRef.current.setting.update({
          name: '设置片尾',
          html: '设置片尾',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="#ffffff" stroke-width="2"/><path d="M7 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
          tooltip:
            skipConfigRef.current.outro_time >= 0
              ? '设置片尾时间'
              : `-${formatTime(-skipConfigRef.current.outro_time)}`,
          onClick: function () {
            const outroTime =
              -(
                artPlayerRef.current?.duration -
                artPlayerRef.current?.currentTime
              ) || 0;
            if (outroTime < 0) {
              const newConfig = {
                ...skipConfigRef.current,
                outro_time: outroTime,
              };
              handleSkipConfigChange(newConfig);
              return `-${formatTime(-outroTime)}`;
            }
          },
        });
      } else {
        await saveSkipConfig(
          currentSourceRef.current,
          currentIdRef.current,
          newConfig
        );
      }
      console.log('跳过片头片尾配置已保存:', newConfig);
    } catch (err) {
      console.error('保存跳过片头片尾配置失败:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (hours === 0) {
      // 不到一小时，格式为 00:00
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      // 超过一小时，格式为 00:00:00
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config: any) {
      super(config);
      const load = this.load.bind(this);
      this.load = function (context: any, config: any, callbacks: any) {
        // 拦截manifest和level请求
        if (
          (context as any).type === 'manifest' ||
          (context as any).type === 'level'
        ) {
          const onSuccess = callbacks.onSuccess;
          callbacks.onSuccess = function (
            response: any,
            stats: any,
            context: any
          ) {
            // 如果是m3u8文件，处理内容以移除广告分段
            if (response.data && typeof response.data === 'string') {
              // 过滤掉广告段 - 实现更精确的广告过滤逻辑
              response.data = filterAdsFromM3U8(response.data);
            }
            return onSuccess(response, stats, context, null);
          };
        }
        // 执行原始load方法
        load(context, config, callbacks);
      };
    }
  }

  // 当集数索引变化时自动更新视频地址
  useEffect(() => {
    updateVideoUrl(detail, currentEpisodeIndex);
  }, [detail, currentEpisodeIndex]);

  // 进入页面时直接获取全部源信息
  useEffect(() => {
    const fetchSourceDetail = async (
      source: string,
      id: string
    ): Promise<SearchResult[]> => {
      try {
        // 使用客户端方法获取详情
        const detailData = await getVideoDetail(source, id);
        if (!detailData) {
          throw new Error('获取视频详情失败');
        }
        
        // 转换为 SearchResult 格式
        const episodes: string[] = [];
        if (detailData.vod_play_url) {
          const playUrls = detailData.vod_play_url.split('$$$')[0];
          const episodeList = playUrls.split('#').filter((ep: string) => ep.trim());
          episodes.push(...episodeList.map((ep: string) => ep.split('$')[1] || ep));
        }
        
        const result: SearchResult = {
          id: String(detailData.vod_id),
          title: detailData.vod_name,
          poster: detailData.vod_pic || '',
          episodes: episodes,
          source: source,
          source_name: detailData.source_name || source,
          year: String(detailData.vod_year || 'unknown'),
          type_name: detailData.type_name || detailData.vod_class || '',
          desc: detailData.vod_content || '',
        };
        
        setAvailableSources([result]);
        return [result];
      } catch (err) {
        console.error('获取视频详情失败:', err);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };
    const fetchSourcesData = async (query: string): Promise<SearchResult[]> => {
      // 根据搜索词获取全部源信息
      try {
        // 使用客户端搜索
        const results = await searchFromAllSources(query.trim());

        // 处理搜索结果，根据规则过滤
        const filteredResults = results.filter(
          (result: SearchResult) =>
            result.title.replaceAll(' ', '').toLowerCase() ===
              videoTitleRef.current.replaceAll(' ', '').toLowerCase() &&
            (videoYearRef.current
              ? result.year.toLowerCase() === videoYearRef.current.toLowerCase()
              : true) &&
            (searchType
              ? (searchType === 'tv' && result.episodes.length > 1) ||
                (searchType === 'movie' && result.episodes.length === 1)
              : true)
        );
        setAvailableSources(filteredResults);
        return filteredResults;
      } catch (err) {
        setSourceSearchError(err instanceof Error ? err.message : '搜索失败');
        setAvailableSources([]);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };

    const initAll = async () => {
      if (!currentSource && !currentId && !videoTitle && !searchTitle) {
        setError('缺少必要参数');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadingStage(currentSource && currentId ? 'fetching' : 'searching');
      setLoadingMessage(
        currentSource && currentId
          ? '🎬 正在获取视频详情...'
          : '🔍 正在搜索播放源...'
      );

      let sourcesInfo = await fetchSourcesData(searchTitle || videoTitle);
      if (
        currentSource &&
        currentId &&
        !sourcesInfo.some(
          (source) => source.source === currentSource && source.id === currentId
        )
      ) {
        sourcesInfo = await fetchSourceDetail(currentSource, currentId);
      }
      if (sourcesInfo.length === 0) {
        setError('未找到匹配结果');
        setLoading(false);
        return;
      }

      let detailData: SearchResult = sourcesInfo[0];
      // 指定源和id且无需优选
      if (currentSource && currentId && !needPreferRef.current) {
        const target = sourcesInfo.find(
          (source) => source.source === currentSource && source.id === currentId
        );
        if (target) {
          detailData = target;
        } else {
          setError('未找到匹配结果');
          setLoading(false);
          return;
        }
      }

      // 未指定源和 id 或需要优选，且开启优选开关
      if (
        (!currentSource || !currentId || needPreferRef.current) &&
        optimizationEnabled
      ) {
        setLoadingStage('preferring');
        setLoadingMessage('⚡ 正在优选最佳播放源...');

        detailData = await preferBestSource(sourcesInfo);
      }

      console.log(detailData.source, detailData.id);

      setNeedPrefer(false);
      setCurrentSource(detailData.source);
      setCurrentId(detailData.id);
      setVideoYear(detailData.year);
      setVideoTitle(detailData.title || videoTitleRef.current);
      setVideoCover(detailData.poster);
      setDetail(detailData);
      if (currentEpisodeIndex >= detailData.episodes.length) {
        setCurrentEpisodeIndex(0);
      }

      // 规范URL参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', detailData.source);
      newUrl.searchParams.set('id', detailData.id);
      newUrl.searchParams.set('year', detailData.year);
      newUrl.searchParams.set('title', detailData.title);
      newUrl.searchParams.delete('prefer');
      window.history.replaceState({}, '', newUrl.toString());

      setLoadingStage('ready');
      setLoadingMessage('✨ 准备就绪，即将开始播放...');

      // 短暂延迟让用户看到完成状态
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };

    initAll();
  }, []);

  // 播放记录处理
  useEffect(() => {
    // 仅在初次挂载时检查播放记录
    const initFromHistory = async () => {
      if (!currentSource || !currentId) return;

      try {
        const allRecords = await getAllPlayRecords();
        const key = generateStorageKey(currentSource, currentId);
        const record = allRecords[key];

        if (record) {
          const targetIndex = record.index - 1;
          const targetTime = record.play_time;

          // 更新当前选集索引
          if (targetIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(targetIndex);
          }

          // 保存待恢复的播放进度，待播放器就绪后跳转
          resumeTimeRef.current = targetTime;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }
    };

    initFromHistory();
  }, []);

  // 跳过片头片尾配置处理
  useEffect(() => {
    // 仅在初次挂载时检查跳过片头片尾配置
    const initSkipConfig = async () => {
      if (!currentSource || !currentId) return;

      try {
        const config = await getSkipConfig(currentSource, currentId);
        if (config) {
          setSkipConfig(config);
        }
      } catch (err) {
        console.error('读取跳过片头片尾配置失败:', err);
      }
    };

    initSkipConfig();
  }, []);

  // 处理换源
  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string
  ) => {
    try {
      // 显示换源加载状态
      setVideoLoadingStage('sourceChanging');
      setIsVideoLoading(true);

      // 记录当前播放进度（仅在同一集数切换时恢复）
      const currentPlayTime = artPlayerRef.current?.currentTime || 0;
      console.log('换源前当前播放时间:', currentPlayTime);

      // 清除前一个历史记录
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await deletePlayRecord(
            currentSourceRef.current,
            currentIdRef.current
          );
          console.log('已清除前一个播放记录');
        } catch (err) {
          console.error('清除播放记录失败:', err);
        }
      }

      // 清除并设置下一个跳过片头片尾配置
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await deleteSkipConfig(
            currentSourceRef.current,
            currentIdRef.current
          );
          await saveSkipConfig(newSource, newId, skipConfigRef.current);
        } catch (err) {
          console.error('清除跳过片头片尾配置失败:', err);
        }
      }

      const newDetail = availableSources.find(
        (source) => source.source === newSource && source.id === newId
      );
      if (!newDetail) {
        setError('未找到匹配结果');
        return;
      }

      // 尝试跳转到当前正在播放的集数
      let targetIndex = currentEpisodeIndex;

      // 如果当前集数超出新源的范围，则跳转到第一集
      if (!newDetail.episodes || targetIndex >= newDetail.episodes.length) {
        targetIndex = 0;
      }

      // 如果仍然是同一集数且播放进度有效，则在播放器就绪后恢复到原始进度
      if (targetIndex !== currentEpisodeIndex) {
        resumeTimeRef.current = 0;
      } else if (
        (!resumeTimeRef.current || resumeTimeRef.current === 0) &&
        currentPlayTime > 1
      ) {
        resumeTimeRef.current = currentPlayTime;
      }

      // 更新URL参数（不刷新页面）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', newSource);
      newUrl.searchParams.set('id', newId);
      newUrl.searchParams.set('year', newDetail.year);
      window.history.replaceState({}, '', newUrl.toString());

      setVideoTitle(newDetail.title || newTitle);
      setVideoYear(newDetail.year);
      setVideoCover(newDetail.poster);
      setCurrentSource(newSource);
      setCurrentId(newId);
      setDetail(newDetail);
      setCurrentEpisodeIndex(targetIndex);
    } catch (err) {
      // 隐藏换源加载状态
      setIsVideoLoading(false);
      setError(err instanceof Error ? err.message : '换源失败');
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 集数切换
  // ---------------------------------------------------------------------------
  // 处理集数切换
  const handleEpisodeChange = (episodeNumber: number) => {
    if (episodeNumber >= 0 && episodeNumber < totalEpisodes) {
      // 在更换集数前保存当前播放进度
      if (artPlayerRef.current && artPlayerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(episodeNumber);
    }
  };

  const handlePreviousEpisode = () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx > 0) {
      if (artPlayerRef.current && !artPlayerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(idx - 1);
    }
  };

  const handleNextEpisode = () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx < d.episodes.length - 1) {
      if (artPlayerRef.current && !artPlayerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(idx + 1);
    }
  };

  // ---------------------------------------------------------------------------
  // 键盘快捷键
  // ---------------------------------------------------------------------------
  // 处理全局快捷键
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // 忽略输入框中的按键事件
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    )
      return;

    // Alt + 左箭头 = 上一集
    if (e.altKey && e.key === 'ArrowLeft') {
      if (detailRef.current && currentEpisodeIndexRef.current > 0) {
        handlePreviousEpisode();
        e.preventDefault();
      }
    }

    // Alt + 右箭头 = 下一集
    if (e.altKey && e.key === 'ArrowRight') {
      const d = detailRef.current;
      const idx = currentEpisodeIndexRef.current;
      if (d && idx < d.episodes.length - 1) {
        handleNextEpisode();
        e.preventDefault();
      }
    }

    // 左箭头 = 快退
    if (!e.altKey && e.key === 'ArrowLeft') {
      if (artPlayerRef.current && artPlayerRef.current.currentTime > 5) {
        artPlayerRef.current.currentTime -= 10;
        e.preventDefault();
      }
    }

    // 右箭头 = 快进
    if (!e.altKey && e.key === 'ArrowRight') {
      if (
        artPlayerRef.current &&
        artPlayerRef.current.currentTime < artPlayerRef.current.duration - 5
      ) {
        artPlayerRef.current.currentTime += 10;
        e.preventDefault();
      }
    }

    // 上箭头 = 音量+
    if (e.key === 'ArrowUp') {
      if (artPlayerRef.current && artPlayerRef.current.volume < 1) {
        artPlayerRef.current.volume =
          Math.round((artPlayerRef.current.volume + 0.1) * 10) / 10;
        showPlayerNotice(
          `音量: ${Math.round(artPlayerRef.current.volume * 100)}`,
          1200
        );
        e.preventDefault();
      }
    }

    // 下箭头 = 音量-
    if (e.key === 'ArrowDown') {
      if (artPlayerRef.current && artPlayerRef.current.volume > 0) {
        artPlayerRef.current.volume =
          Math.round((artPlayerRef.current.volume - 0.1) * 10) / 10;
        showPlayerNotice(
          `音量: ${Math.round(artPlayerRef.current.volume * 100)}`,
          1200
        );
        e.preventDefault();
      }
    }

    // 空格 = 播放/暂停
    if (e.key === ' ') {
      if (artPlayerRef.current) {
        artPlayerRef.current.toggle();
        e.preventDefault();
      }
    }

    // f 键 = 切换全屏
    if (e.key === 'f' || e.key === 'F') {
      if (artPlayerRef.current) {
        artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
        e.preventDefault();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 播放记录相关
  // ---------------------------------------------------------------------------
  // 保存播放进度
  const saveCurrentPlayProgress = async () => {
    if (
      !artPlayerRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current ||
      !detailRef.current?.source_name
    ) {
      return;
    }

    const player = artPlayerRef.current;
    const currentTime = player.currentTime || 0;
    const duration = player.duration || 0;

    // 如果播放时间太短（少于5秒）或者视频时长无效，不保存
    if (currentTime < 1 || !duration) {
      return;
    }

    try {
      await savePlayRecord(currentSourceRef.current, currentIdRef.current, {
        title: videoTitleRef.current,
        source_name: detailRef.current?.source_name || '',
        year: detailRef.current?.year,
        cover: detailRef.current?.poster || '',
        index: currentEpisodeIndexRef.current + 1, // 转换为1基索引
        total_episodes: detailRef.current?.episodes.length || 1,
        play_time: Math.floor(currentTime),
        total_time: Math.floor(duration),
        save_time: Date.now(),
        search_title: searchTitle,
      });

      lastSaveTimeRef.current = Date.now();
      console.log('播放进度已保存:', {
        title: videoTitleRef.current,
        episode: currentEpisodeIndexRef.current + 1,
        year: detailRef.current?.year,
        progress: `${Math.floor(currentTime)}/${Math.floor(duration)}`,
      });
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };

  useEffect(() => {
    // 页面即将卸载时保存播放进度
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
    };

    // 页面可见性变化时保存播放进度
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentEpisodeIndex, detail, artPlayerRef.current]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 收藏相关
  // ---------------------------------------------------------------------------
  // 每当 source 或 id 变化时检查收藏状态
  useEffect(() => {
    if (!currentSource || !currentId) return;
    (async () => {
      try {
        const fav = await isFavorited(currentSource, currentId);
        setFavorited(fav);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    })();
  }, [currentSource, currentId]);

  // 监听收藏数据更新事件
  useEffect(() => {
    if (!currentSource || !currentId) return;

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (favorites: Record<string, any>) => {
        const key = generateStorageKey(currentSource, currentId);
        const isFav = !!favorites[key];
        setFavorited(isFav);
      }
    );

    return unsubscribe;
  }, [currentSource, currentId]);

  // 切换收藏
  const handleToggleFavorite = async () => {
    if (
      !videoTitleRef.current ||
      !detailRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current
    )
      return;

    try {
      if (favorited) {
        // 如果已收藏，删除收藏
        await deleteFavorite(currentSourceRef.current, currentIdRef.current);
        setFavorited(false);
      } else {
        // 如果未收藏，添加收藏
        await saveFavorite(currentSourceRef.current, currentIdRef.current, {
          title: videoTitleRef.current,
          source_name: detailRef.current?.source_name || '',
          year: detailRef.current?.year,
          cover: detailRef.current?.poster || '',
          total_episodes: detailRef.current?.episodes.length || 1,
          save_time: Date.now(),
          search_title: searchTitle,
        });
        setFavorited(true);
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  useEffect(() => {
    if (
      !Artplayer ||
      !Hls ||
      !videoUrl ||
      loading ||
      currentEpisodeIndex === null ||
      !artRef.current
    ) {
      return;
    }

    // 确保选集索引有效
    if (
      !detail ||
      !detail.episodes ||
      currentEpisodeIndex >= detail.episodes.length ||
      currentEpisodeIndex < 0
    ) {
      setError(`选集索引无效，当前共 ${totalEpisodes} 集`);
      return;
    }

    if (!videoUrl) {
      setError('视频地址无效');
      return;
    }
    console.log(videoUrl);

    // 检测是否为WebKit浏览器
    const isWebkit =
      typeof window !== 'undefined' &&
      typeof (window as any).webkitConvertPointFromNodeToPage === 'function';

    // 非WebKit浏览器且播放器已存在，使用switch方法切换
    if (!isWebkit && artPlayerRef.current) {
      artPlayerRef.current.switch = videoUrl;
      artPlayerRef.current.title = `${videoTitle} - 第${
        currentEpisodeIndex + 1
      }集`;
      artPlayerRef.current.poster = videoCover;
      if (artPlayerRef.current?.video) {
        ensureVideoSource(
          artPlayerRef.current.video as HTMLVideoElement,
          videoUrl
        );
      }
      return;
    }

    // WebKit浏览器或首次创建：销毁之前的播放器实例并创建新的
    if (artPlayerRef.current) {
      if (artPlayerRef.current.video && artPlayerRef.current.video.hls) {
        artPlayerRef.current.video.hls.destroy();
      }
      // 销毁播放器实例
      artPlayerRef.current.destroy();
      artPlayerRef.current = null;
    }

    try {
      // 创建新的播放器实例
      Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
      Artplayer.USE_RAF = true;

      artPlayerRef.current = new Artplayer({
        container: artRef.current,
        url: videoUrl,
        poster: videoCover,
        volume: 0.7,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: false,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: false,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: false,
        mutex: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        theme: '#22c55e',
        lang: 'zh-cn',
        hotkey: false,
        fastForward: true,
        autoOrientation: true,
        lock: true,
        moreVideoAttr: {
          crossOrigin: 'anonymous',
        },
        // 直接在构造时安装弹幕插件，避免实例上无 use 方法
        plugins: [
          artplayerPluginDanmuku({
            danmuku: '',
            speed: 5,
            opacity: 1,
            fontSize: 25,
            synchronousPlayback: true,
            visible: danmakuEnabled,
            offset: danmakuOffset,
          } as any),
        ],
        // HLS 支持配置
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (!Hls) {
              console.error('HLS.js 未加载');
              return;
            }

            if (video.hls) {
              video.hls.destroy();
            }
            const hls = new Hls({
              debug: false, // 关闭日志
              enableWorker: true, // WebWorker 解码，降低主线程压力
              lowLatencyMode: true, // 开启低延迟 LL-HLS

              /* 缓冲/内存相关 */
              maxBufferLength: 30, // 前向缓冲最大 30s，过大容易导致高延迟
              backBufferLength: 30, // 仅保留 30s 已播放内容，避免内存占用
              maxBufferSize: 60 * 1000 * 1000, // 约 60MB，超出后触发清理

              /* 自定义loader */
              loader: blockAdEnabledRef.current
                ? CustomHlsJsLoader
                : Hls.DefaultConfig.loader,
            });

            hls.loadSource(url);
            hls.attachMedia(video);
            video.hls = hls;

            ensureVideoSource(video, url);

            hls.on(Hls.Events.ERROR, function (event: any, data: any) {
              console.error('HLS Error:', event, data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('网络错误，尝试恢复...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('媒体错误，尝试恢复...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.log('无法恢复的错误');
                    hls.destroy();
                    break;
                }
              }
            });
          },
        },
        icons: {
          loading:
            '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cGF0aCBkPSJNMjUuMjUxIDYuNDYxYy0xMC4zMTggMC0xOC42ODMgOC4zNjUtMTguNjgzIDE4LjY4M2g0LjA2OGMwLTguMDcgNi41NDUtMTQuNjE1IDE0LjYxNS0xNC42MTVWNi40NjF6IiBmaWxsPSIjMDA5Njg4Ij48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIGF0dHJpYnV0ZVR5cGU9IlhNTCIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHRvPSIzNjAgMjUgMjUiIHR5cGU9InJvdGF0ZSIvPjwvcGF0aD48L3N2Zz4=">',
        },
        settings: [
          {
            html: '去广告',
            icon: '<text x="50%" y="50%" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">AD</text>',
            tooltip: blockAdEnabled ? '已开启' : '已关闭',
            onClick() {
              const newVal = !blockAdEnabled;
              try {
                localStorage.setItem('enable_blockad', String(newVal));
                if (artPlayerRef.current) {
                  resumeTimeRef.current = artPlayerRef.current.currentTime;
                  if (
                    artPlayerRef.current.video &&
                    artPlayerRef.current.video.hls
                  ) {
                    artPlayerRef.current.video.hls.destroy();
                  }
                  artPlayerRef.current.destroy();
                  artPlayerRef.current = null;
                }
                setBlockAdEnabled(newVal);
              } catch (_) {
                // ignore
              }
              return newVal ? '当前开启' : '当前关闭';
            },
          },
          {
            name: '跳过片头片尾',
            html: '跳过片头片尾',
            switch: skipConfigRef.current.enable,
            onSwitch: function (item) {
              const newConfig = {
                ...skipConfigRef.current,
                enable: !item.switch,
              };
              handleSkipConfigChange(newConfig);
              return !item.switch;
            },
          },
          {
            html: '删除跳过配置',
            onClick: function () {
              handleSkipConfigChange({
                enable: false,
                intro_time: 0,
                outro_time: 0,
              });
              return '';
            },
          },
          {
            name: '设置片头',
            html: '设置片头',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L17 12" stroke="#ffffff" stroke-width="2"/><path d="M17 6L17 18" stroke="#ffffff" stroke-width="2"/></svg>',
            tooltip:
              skipConfigRef.current.intro_time === 0
                ? '设置片头时间'
                : `${formatTime(skipConfigRef.current.intro_time)}`,
            onClick: function () {
              const currentTime = artPlayerRef.current?.currentTime || 0;
              if (currentTime > 0) {
                const newConfig = {
                  ...skipConfigRef.current,
                  intro_time: currentTime,
                };
                handleSkipConfigChange(newConfig);
                return `${formatTime(currentTime)}`;
              }
            },
          },
          {
            name: '设置片尾',
            html: '设置片尾',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="#ffffff" stroke-width="2"/><path d="M7 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
            tooltip:
              skipConfigRef.current.outro_time >= 0
                ? '设置片尾时间'
                : `-${formatTime(-skipConfigRef.current.outro_time)}`,
            onClick: function () {
              const outroTime =
                -(
                  artPlayerRef.current?.duration -
                  artPlayerRef.current?.currentTime
                ) || 0;
              if (outroTime < 0) {
                const newConfig = {
                  ...skipConfigRef.current,
                  outro_time: outroTime,
                };
                handleSkipConfigChange(newConfig);
                return `-${formatTime(-outroTime)}`;
              }
            },
          },
        ],
        // 控制栏配置
        controls: [
          {
            position: 'left',
            index: 13,
            html: '<i class="art-icon flex"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
            tooltip: '播放下一集',
            click: function () {
              handleNextEpisode();
            },
          },
          {
            name: 'danmaku-settings',
            position: 'right',
            index: 20,
            html: `
              <div class="art-danmaku-settings-wrapper" style="position: relative;">
                <span style="font-size: 16px; font-weight: bold;">弹</span>
                <div class="art-danmaku-menu" style="
                  display: none;
                  position: absolute;
                  bottom: 100%;
                  right: 0;
                  margin-bottom: 10px;
                  background: rgba(0, 0, 0, 0.9);
                  border-radius: 4px;
                  padding: 5px 0;
                  min-width: 200px;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                  z-index: 100;
                ">
                  <div class="art-danmaku-menu-item" data-action="load" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">加载弹幕</div>
                  <div class="art-danmaku-menu-item" data-action="offset-left-1" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">对轴 - 左1秒</div>
                  <div class="art-danmaku-menu-item" data-action="offset-left-5" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">对轴 - 左5秒</div>
                  <div class="art-danmaku-menu-item" data-action="offset-right-1" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">对轴 - 右1秒</div>
                  <div class="art-danmaku-menu-item" data-action="offset-right-5" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">对轴 - 右5秒</div>
                  <div class="art-danmaku-menu-item" data-action="keywords" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">关键词屏蔽</div>
                  <div class="art-danmaku-menu-item" data-action="density" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">密度限制(条/秒)</div>
                  <div class="art-danmaku-menu-item" data-action="apply-filter" style="padding: 8px 16px; cursor: pointer; white-space: nowrap; font-size: 14px; color: #fff;">应用当前过滤规则</div>
                </div>
              </div>
            `,
            tooltip: '弹幕设置',
            // @ts-ignore: style is supported by Artplayer controls
            style: {
              color: danmakuEnabled ? '#00aeec' : '#fff',
            },
            mounted: function (element: HTMLElement) {
              const wrapper = element.querySelector(
                '.art-danmaku-settings-wrapper'
              );
              const menu = element.querySelector(
                '.art-danmaku-menu'
              ) as HTMLElement;

              if (!wrapper || !menu) return;

              let hideTimeout: any = null;

              // 显示菜单
              const showMenu = () => {
                if (hideTimeout) {
                  clearTimeout(hideTimeout);
                  hideTimeout = null;
                }
                menu.style.display = 'block';
              };

              // 隐藏菜单（延迟执行）
              const hideMenu = () => {
                hideTimeout = setTimeout(() => {
                  menu.style.display = 'none';
                }, 200);
              };

              // 按钮悬停事件
              wrapper.addEventListener('mouseenter', showMenu);
              wrapper.addEventListener('mouseleave', hideMenu);

              // 菜单悬停事件 - 保持显示
              menu.addEventListener('mouseenter', showMenu);
              menu.addEventListener('mouseleave', hideMenu);

              // 菜单项悬停高亮
              const items = menu.querySelectorAll('.art-danmaku-menu-item');
              items.forEach((item) => {
                item.addEventListener('mouseenter', () => {
                  (item as HTMLElement).style.backgroundColor =
                    'rgba(255, 255, 255, 0.1)';
                });
                item.addEventListener('mouseleave', () => {
                  (item as HTMLElement).style.backgroundColor = 'transparent';
                });
              });

              // 点击事件处理
              menu.addEventListener('click', async (e) => {
                const target = e.target as HTMLElement;
                if (!target.classList.contains('art-danmaku-menu-item')) return;

                const action = target.getAttribute('data-action');
                if (hideTimeout) {
                  clearTimeout(hideTimeout);
                }
                menu.style.display = 'none';

                switch (action) {
                  case 'load':
                    if (!danmakuEnabled) setDanmakuEnabled(true);
                    setDanmakuPanelOpen(true);
                    break;

                  case 'offset-left-1': {
                    const newOffset = danmakuOffset - 1;
                    setDanmakuOffset(newOffset);
                    const plugin = getDanmakuPlugin();
                    if (plugin) {
                      plugin.config.offset = newOffset;
                      if (typeof plugin.update === 'function') {
                        plugin.update();
                      }
                      showPlayerNotice(`弹幕对轴：${newOffset}秒`, 1500);
                    }
                    break;
                  }

                  case 'offset-left-5': {
                    const newOffset = danmakuOffset - 5;
                    setDanmakuOffset(newOffset);
                    const plugin = getDanmakuPlugin();
                    if (plugin) {
                      plugin.config.offset = newOffset;
                      if (typeof plugin.update === 'function') {
                        plugin.update();
                      }
                      showPlayerNotice(`弹幕对轴：${newOffset}秒`, 1500);
                    }
                    break;
                  }

                  case 'offset-right-1': {
                    const newOffset = danmakuOffset + 1;
                    setDanmakuOffset(newOffset);
                    const plugin = getDanmakuPlugin();
                    if (plugin) {
                      plugin.config.offset = newOffset;
                      if (typeof plugin.update === 'function') {
                        plugin.update();
                      }
                      showPlayerNotice(`弹幕对轴：${newOffset}秒`, 1500);
                    }
                    break;
                  }

                  case 'offset-right-5': {
                    const newOffset = danmakuOffset + 5;
                    setDanmakuOffset(newOffset);
                    const plugin = getDanmakuPlugin();
                    if (plugin) {
                      plugin.config.offset = newOffset;
                      if (typeof plugin.update === 'function') {
                        plugin.update();
                      }
                      showPlayerNotice(`弹幕对轴：${newOffset}秒`, 1500);
                    }
                    break;
                  }

                  case 'keywords': {
                    const currentKeywords = danmakuKeywords
                      .split(/[,\n;\s]+/)
                      .filter(Boolean)
                      .join(', ');
                    const promptText = currentKeywords
                      ? `当前屏蔽关键词：\n${currentKeywords}\n\n请修改关键词（用逗号/空格/分号/换行分隔）：`
                      : '请输入要屏蔽的关键词（用逗号/空格/分号/换行分隔）：';

                    const keywords = await showInputDialog(promptText, danmakuKeywords);
                    if (keywords === null) break; // 用户取消
                    
                    // 立即更新状态
                    setDanmakuKeywords(keywords);
                    try {
                      localStorage.setItem('danmaku_keywords', keywords);
                    } catch (e) {
                      console.error('[DanmuTV] 保存关键词失败:', e);
                    }

                    // 直接使用新值重新加载弹幕(不依赖状态更新)
                    await reloadDanmakuWithFilter(keywords, danmakuLimitPerSec);
                    
                    if (!keywords.trim()) {
                      showPlayerNotice('已清空关键词屏蔽', 1500);
                    }
                    break;
                  }

                  case 'density': {
                    const val = await showInputDialog(
                      '每秒最大弹幕数(0 表示不限)',
                      String(danmakuLimitPerSec)
                    );
                    if (val === null) break; // 用户取消
                    
                    const n = Math.max(0, Number(val) || 0);
                    setDanmakuLimitPerSec(n);
                    try {
                      localStorage.setItem('danmaku_limit_per_sec', String(n));
                    } catch (e) {
                      console.error('[DanmuTV] 保存密度限制失败:', e);
                    }
                    
                    // 直接使用新值重新加载弹幕(不依赖状态更新)
                    await reloadDanmakuWithFilter(danmakuKeywords, n);
                    break;
                  }

                  case 'apply-filter':
                    await reloadDanmakuWithFilter();
                    break;
                }
              });
            },
          },
        ],
      });

      // 监听播放器事件
      artPlayerRef.current.on('ready', () => {
        setError(null);
        // 挂到 window.art 方便调试
        try {
          // @ts-ignore
          window.art = artPlayerRef.current;
        } catch (e) {
          // 忽略 window.art 挂载失败
        }
        // 插件 ready 后兜底重试 pending 弹幕
        if (pendingDanmakuDataRef.current) {
          const plugin = getDanmakuPlugin();
          if (plugin && typeof plugin.load === 'function') {
            try {
              plugin.load(pendingDanmakuDataRef.current);
              showPlayerNotice(
                `弹幕已加载：${pendingDanmakuDataRef.current.length} 条`,
                2600
              );
              pendingDanmakuDataRef.current = null;
              console.log('[danmaku] ready 钩子兜底重试成功');
            } catch (e) {
              console.error('[danmaku] ready 钩子兜底重试失败', e);
            }
          } else {
            console.warn('[danmaku] 兜底重试时插件依然未获取到');
          }
        }
      });

      artPlayerRef.current.on('video:volumechange', () => {
        lastVolumeRef.current = artPlayerRef.current.volume;
      });
      artPlayerRef.current.on('video:ratechange', () => {
        lastPlaybackRateRef.current = artPlayerRef.current.playbackRate;
      });

      // 监听视频可播放事件，这时恢复播放进度更可靠
      artPlayerRef.current.on('video:canplay', () => {
        // 若存在需要恢复的播放进度，则跳转
        if (resumeTimeRef.current && resumeTimeRef.current > 0) {
          try {
            const duration = artPlayerRef.current.duration || 0;
            let target = resumeTimeRef.current;
            if (duration && target >= duration - 2) {
              target = Math.max(0, duration - 5);
            }
            artPlayerRef.current.currentTime = target;
            console.log('成功恢复播放进度到:', resumeTimeRef.current);
          } catch (err) {
            console.warn('恢复播放进度失败:', err);
          }
        }
        resumeTimeRef.current = null;

        setTimeout(() => {
          if (
            Math.abs(artPlayerRef.current.volume - lastVolumeRef.current) > 0.01
          ) {
            artPlayerRef.current.volume = lastVolumeRef.current;
          }
          if (
            Math.abs(
              artPlayerRef.current.playbackRate - lastPlaybackRateRef.current
            ) > 0.01 &&
            isWebkit
          ) {
            artPlayerRef.current.playbackRate = lastPlaybackRateRef.current;
          }
          // 不在 canplay 阶段清空提示，避免覆盖“弹幕已加载”提示
        }, 0);

        // 隐藏换源加载状态
        setIsVideoLoading(false);
      });

      // 监听视频时间更新事件，实现跳过片头片尾
      artPlayerRef.current.on('video:timeupdate', () => {
        if (!skipConfigRef.current.enable) return;

        const currentTime = artPlayerRef.current.currentTime || 0;
        const duration = artPlayerRef.current.duration || 0;
        const now = Date.now();

        // 限制跳过检查频率为1.5秒一次
        if (now - lastSkipCheckRef.current < 1500) return;
        lastSkipCheckRef.current = now;

        // 跳过片头
        if (
          skipConfigRef.current.intro_time > 0 &&
          currentTime < skipConfigRef.current.intro_time
        ) {
          artPlayerRef.current.currentTime = skipConfigRef.current.intro_time;
          showPlayerNotice(
            `已跳过片头 (${formatTime(skipConfigRef.current.intro_time)})`,
            1800
          );
        }

        // 跳过片尾
        if (
          skipConfigRef.current.outro_time < 0 &&
          duration > 0 &&
          currentTime >
            artPlayerRef.current.duration + skipConfigRef.current.outro_time
        ) {
          if (
            currentEpisodeIndexRef.current <
            (detailRef.current?.episodes?.length || 1) - 1
          ) {
            handleNextEpisode();
          } else {
            artPlayerRef.current.pause();
          }
          showPlayerNotice(
            `已跳过片尾 (${formatTime(skipConfigRef.current.outro_time)})`,
            1800
          );
        }
      });

      artPlayerRef.current.on('error', (err: any) => {
        console.error('播放器错误:', err);
        if (artPlayerRef.current.currentTime > 0) {
          return;
        }
      });

      // 监听视频播放结束事件，自动播放下一集
      artPlayerRef.current.on('video:ended', () => {
        const d = detailRef.current;
        const idx = currentEpisodeIndexRef.current;
        if (d && d.episodes && idx < d.episodes.length - 1) {
          setTimeout(() => {
            setCurrentEpisodeIndex(idx + 1);
          }, 1000);
        }
      });

      artPlayerRef.current.on('video:timeupdate', () => {
        const now = Date.now();
        let interval = 5000;
        if (process.env.NEXT_PUBLIC_STORAGE_TYPE === 'd1') {
          interval = 10000;
        }
        if (process.env.NEXT_PUBLIC_STORAGE_TYPE === 'upstash') {
          interval = 20000;
        }
        if (now - lastSaveTimeRef.current > interval) {
          saveCurrentPlayProgress();
          lastSaveTimeRef.current = now;
        }
      });

      artPlayerRef.current.on('pause', () => {
        saveCurrentPlayProgress();
      });

      if (artPlayerRef.current?.video) {
        ensureVideoSource(
          artPlayerRef.current.video as HTMLVideoElement,
          videoUrl
        );
      }

      // 获取弹幕插件实例并同步设置
      try {
        const pluginInst = getDanmakuPlugin();
        danmakuPluginRef.current = pluginInst;
        if (pluginInst) {
          pluginInst.config.visible = danmakuEnabled;
          pluginInst.config.offset = danmakuOffset;
          if (typeof pluginInst.update === 'function') pluginInst.update();
          if (pendingDanmakuDataRef.current) {
            try {
              pluginInst.load(pendingDanmakuDataRef.current);
              showPlayerNotice(
                `弹幕已加载：${pendingDanmakuDataRef.current.length} 条`,
                2600
              );
            } catch (e) {
              console.error('延迟加载弹幕失败', e);
              triggerGlobalError('延迟加载弹幕失败');
            }
            pendingDanmakuDataRef.current = null;
          }
        } else {
          // 若此时还未获取到，延时再取一次
          setTimeout(() => {
            const p2 = getDanmakuPlugin();
            danmakuPluginRef.current = p2;
            if (p2) {
              p2.config.visible = danmakuEnabled;
              p2.config.offset = danmakuOffset;
              if (typeof p2.update === 'function') p2.update();
              if (pendingDanmakuDataRef.current) {
                try {
                  p2.load(pendingDanmakuDataRef.current);
                  showPlayerNotice(
                    `弹幕已加载：${pendingDanmakuDataRef.current.length} 条`,
                    2600
                  );
                } catch (e) {
                  console.error('延迟加载弹幕失败', e);
                  triggerGlobalError('延迟加载弹幕失败');
                }
                pendingDanmakuDataRef.current = null;
              }
            }
          }, 0);
        }
      } catch (e) {
        console.warn('同步弹幕插件失败', e);
      }
    } catch (err) {
      console.error('创建播放器失败:', err);
      setError('播放器初始化失败');
    }
  }, [Artplayer, Hls, videoUrl, loading, blockAdEnabled]);

  // 当组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  // 当开关变化时,同步插件的可见性
  useEffect(() => {
    const plugin = getDanmakuPlugin();
    if (plugin) {
      plugin.config.visible = danmakuEnabled;
      if (typeof plugin.update === 'function') {
        plugin.update();
      }
    }
  }, [danmakuEnabled]);

  // 当偏移变化时，同步到插件
  useEffect(() => {
    const plugin = getDanmakuPlugin();
    if (plugin) {
      plugin.config.offset = danmakuOffset;
      if (typeof plugin.update === 'function') {
        plugin.update();
      }
      console.log(`[danmaku] offset 已同步: ${danmakuOffset}秒`);
    }
  }, [danmakuOffset]);

  // 自动加载弹幕历史记录
  useEffect(() => {
    if (!artPlayerRef.current) return;

    // 自动加载弹幕
    const autoLoad = async () => {
      // 首先强制清空当前弹幕（每次切换集数都清空）
      const plugin = getDanmakuPlugin();
      if (plugin) {
        try {
          console.log(
            '[danmaku] 切换集数，清空弹幕（使用官方API）',
            currentEpisodeIndex
          );

          // 使用官方推荐的方式：config + load 组合
          plugin.config({
            danmuku: [], // 空数组表示清空弹幕库
          });
          plugin.load(); // 加载空弹幕库，实现清空效果

          // 清空历史数据引用
          lastDanmakuDataRef.current = null;

          console.log('[danmaku] 弹幕库已切换为空');
        } catch (e) {
          console.warn('[danmaku] 清空弹幕失败', e);
        }
      }

      try {
        // 优先检查剧集配置（适用于同一剧的不同集）
        const seriesConfig = loadSeriesDanmakuConfig();
        if (seriesConfig) {
          const currentEp = getCurrentEpisode();
          const videoKey = getVideoKey();
          console.log('[danmaku] 检测到剧集配置，自动加载', {
            seriesConfig,
            currentEp,
            videoKey,
            currentEpisodeIndex,
          });

          let url = '';
          if (seriesConfig.type === 'season_id') {
            url = `/api/danmaku/bilibili?season_id=${encodeURIComponent(
              seriesConfig.value
            )}&ep=${encodeURIComponent(String(currentEp))}`;
          } else if (seriesConfig.type === 'media_id') {
            url = `/api/danmaku/bilibili?media_id=${encodeURIComponent(
              seriesConfig.value
            )}&ep=${encodeURIComponent(String(currentEp))}`;
          }

          if (url) {
            await loadDanmakuFromUrl(url);
            setDanmakuEnabled(true); // 自动开启弹幕
            console.log('[danmaku] 剧集弹幕自动加载成功');
            return;
          }
        }

        // 其次检查单集历史记录
        const history = loadDanmakuHistory();
        const videoKey = getVideoKey();
        const currentEp = getCurrentEpisode();

        console.log('[danmaku] 检查单集历史记录', {
          videoKey,
          currentEp,
          currentEpisodeIndex,
          hasHistory: !!history,
        });

        if (!history) {
          console.log('[danmaku] 无历史记录');
          return;
        }

        console.log('[danmaku] 自动加载历史记录', history);

        let url = '';
        if (history.type === 'cid') {
          url = `/api/danmaku/bilibili?cid=${encodeURIComponent(
            history.value
          )}`;
        } else if (history.type === 'bv') {
          url = `/api/danmaku/bilibili?bv=${encodeURIComponent(
            history.value
          )}&p=${encodeURIComponent(String(history.p || 1))}`;
        } else if (history.type === 'season_id') {
          url = `/api/danmaku/bilibili?season_id=${encodeURIComponent(
            history.value
          )}&ep=${encodeURIComponent(String(history.ep || 1))}`;
        } else if (history.type === 'media_id') {
          url = `/api/danmaku/bilibili?media_id=${encodeURIComponent(
            history.value
          )}&ep=${encodeURIComponent(String(history.ep || 1))}`;
        } else if (history.type === 'link') {
          url = `/api/danmaku/bilibili?link=${encodeURIComponent(
            history.value
          )}`;
        } else {
          console.log('[danmaku] 不支持的历史记录类型:', history.type);
          return;
        }

        await loadDanmakuFromUrl(url);
        setDanmakuEnabled(true); // 自动开启弹幕
        console.log('[danmaku] 历史记录弹幕自动加载成功');
      } catch (e) {
        console.warn('[danmaku] 自动加载失败', e);
      }
    };

    // 延迟一点时间等待播放器完全初始化
    const timer = setTimeout(autoLoad, 1500);
    return () => clearTimeout(timer);
  }, [currentEpisodeIndex]); // 只依赖集数变化

  if (loading) {
    return (
      <PageLayout activePath='/play'>
        <div className='flex items-center justify-center min-h-screen bg-transparent'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 动画影院图标 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                <div className='text-white text-4xl'>
                  {loadingStage === 'searching' && '🔍'}
                  {loadingStage === 'preferring' && '⚡'}
                  {loadingStage === 'fetching' && '🎬'}
                  {loadingStage === 'ready' && '✨'}
                </div>
                {/* 旋转光环 */}
                <div className='absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
              </div>

              {/* 浮动粒子效果 */}
              <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
                <div className='absolute top-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce'></div>
                <div
                  className='absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce'
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <div
                  className='absolute bottom-3 left-6 w-1 h-1 bg-lime-400 rounded-full animate-bounce'
                  style={{ animationDelay: '1s' }}
                ></div>
              </div>
            </div>

            {/* 进度指示器 */}
            <div className='mb-6 w-80 mx-auto'>
              <div className='flex justify-center space-x-2 mb-4'>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    loadingStage === 'searching' || loadingStage === 'fetching'
                      ? 'bg-green-500 scale-125'
                      : loadingStage === 'preferring' ||
                        loadingStage === 'ready'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    loadingStage === 'preferring'
                      ? 'bg-green-500 scale-125'
                      : loadingStage === 'ready'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    loadingStage === 'ready'
                      ? 'bg-green-500 scale-125'
                      : 'bg-gray-300'
                  }`}
                ></div>
              </div>

              {/* 进度条 */}
              <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out'
                  style={{
                    width:
                      loadingStage === 'searching' ||
                      loadingStage === 'fetching'
                        ? '33%'
                        : loadingStage === 'preferring'
                        ? '66%'
                        : '100%',
                  }}
                ></div>
              </div>
            </div>

            {/* 加载消息 */}
            <div className='space-y-2'>
              <p className='text-xl font-semibold text-gray-800 dark:text-gray-200 animate-pulse'>
                {loadingMessage}
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/play'>
        <div className='flex items-center justify-center min-h-screen bg-transparent'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 错误图标 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                <div className='text-white text-4xl'>😵</div>
                {/* 脉冲效果 */}
                <div className='absolute -inset-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl opacity-20 animate-pulse'></div>
              </div>

              {/* 浮动错误粒子 */}
              <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
                <div className='absolute top-2 left-2 w-2 h-2 bg-red-400 rounded-full animate-bounce'></div>
                <div
                  className='absolute top-4 right-4 w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce'
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <div
                  className='absolute bottom-3 left-6 w-1 h-1 bg-yellow-400 rounded-full animate-bounce'
                  style={{ animationDelay: '1s' }}
                ></div>
              </div>
            </div>

            {/* 错误信息 */}
            <div className='space-y-4 mb-8'>
              <h2 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
                哎呀，出现了一些问题
              </h2>
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                <p className='text-red-600 dark:text-red-400 font-medium'>
                  {error}
                </p>
              </div>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                请检查网络连接或尝试刷新页面
              </p>
            </div>

            {/* 操作按钮 */}
            <div className='space-y-3'>
              <button
                onClick={() =>
                  videoTitle
                    ? router.push(`/search?q=${encodeURIComponent(videoTitle)}`)
                    : router.back()
                }
                className='w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl'
              >
                {videoTitle ? '🔍 返回搜索' : '← 返回上页'}
              </button>

              <button
                onClick={() => window.location.reload()}
                className='w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200'
              >
                🔄 重新尝试
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout activePath='/play'>
        <div className='flex flex-col gap-3 py-4 px-5 lg:px-[3rem] 2xl:px-20'>
          {/* 第一行：影片标题 */}
          <div className='py-1'>
            <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              {videoTitle || '影片标题'}
              {totalEpisodes > 1 && (
                <span className='text-gray-500 dark:text-gray-400'>
                  {` > 第 ${currentEpisodeIndex + 1} 集`}
                </span>
              )}
            </h1>
          </div>
          {/* 第二行：播放器和选集 */}
          <div className='space-y-2'>
            {/* 折叠控制 - 仅在 lg 及以上屏幕显示 */}
            <div className='hidden lg:flex justify-end'>
              <button
                onClick={() =>
                  setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)
                }
                className='group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200'
                title={
                  isEpisodeSelectorCollapsed ? '显示选集面板' : '隐藏选集面板'
                }
              >
                <svg
                  className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                    isEpisodeSelectorCollapsed ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M9 5l7 7-7 7'
                  />
                </svg>
                <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                  {isEpisodeSelectorCollapsed ? '显示' : '隐藏'}
                </span>

                {/* 精致的状态指示点 */}
                <div
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full transition-all duration-200 ${
                    isEpisodeSelectorCollapsed
                      ? 'bg-orange-400 animate-pulse'
                      : 'bg-green-400'
                  }`}
                ></div>
              </button>
            </div>

            <div
              className={`grid gap-4 lg:h-[500px] xl:h-[650px] 2xl:h-[750px] transition-all duration-300 ease-in-out ${
                isEpisodeSelectorCollapsed
                  ? 'grid-cols-1'
                  : 'grid-cols-1 md:grid-cols-4'
              }`}
            >
              {/* 播放器 */}
              <div
                className={`h-full transition-all duration-300 ease-in-out rounded-xl border border-white/0 dark:border-white/30 ${
                  isEpisodeSelectorCollapsed ? 'col-span-1' : 'md:col-span-3'
                }`}
              >
                <div className='relative w-full h-[300px] lg:h-full'>
                  <div
                    ref={artRef}
                    className='bg-black w-full h-full rounded-xl overflow-hidden shadow-lg'
                  ></div>

                  {/* 换源加载蒙层 */}
                  {isVideoLoading && (
                    <div className='absolute inset-0 bg-black/85 backdrop-blur-sm rounded-xl flex items-center justify-center z-[500] transition-all duration-300'>
                      <div className='text-center max-w-md mx-auto px-6'>
                        {/* 动画影院图标 */}
                        <div className='relative mb-8'>
                          <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                            <div className='text-white text-4xl'>🎬</div>
                            {/* 旋转光环 */}
                            <div className='absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
                          </div>

                          {/* 浮动粒子效果 */}
                          <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
                            <div className='absolute top-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce'></div>
                            <div
                              className='absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce'
                              style={{ animationDelay: '0.5s' }}
                            ></div>
                            <div
                              className='absolute bottom-3 left-6 w-1 h-1 bg-lime-400 rounded-full animate-bounce'
                              style={{ animationDelay: '1s' }}
                            ></div>
                          </div>
                        </div>

                        {/* 换源消息 */}
                        <div className='space-y-2'>
                          <p className='text-xl font-semibold text-white animate-pulse'>
                            {videoLoadingStage === 'sourceChanging'
                              ? '🔄 切换播放源...'
                              : '🔄 视频加载中...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 选集和换源 - 在移动端始终显示，在 lg 及以上可折叠 */}
              <div
                className={`h-[300px] lg:h-full md:overflow-hidden transition-all duration-300 ease-in-out ${
                  isEpisodeSelectorCollapsed
                    ? 'md:col-span-1 lg:hidden lg:opacity-0 lg:scale-95'
                    : 'md:col-span-1 lg:opacity-100 lg:scale-100'
                }`}
              >
                <EpisodeSelector
                  totalEpisodes={totalEpisodes}
                  value={currentEpisodeIndex + 1}
                  onChange={handleEpisodeChange}
                  onSourceChange={handleSourceChange}
                  currentSource={currentSource}
                  currentId={currentId}
                  videoTitle={searchTitle || videoTitle}
                  availableSources={availableSources}
                  sourceSearchLoading={sourceSearchLoading}
                  sourceSearchError={sourceSearchError}
                  precomputedVideoInfo={precomputedVideoInfo}
                />
              </div>
            </div>
          </div>

          {/* 详情展示 */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {/* 文字区 */}
            <div className='md:col-span-3'>
              <div className='p-6 flex flex-col min-h-0'>
                {/* 标题 */}
                <h1 className='text-3xl font-bold mb-2 tracking-wide flex items-center flex-shrink-0 text-center md:text-left w-full'>
                  {videoTitle || '影片标题'}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite();
                    }}
                    className='ml-3 flex-shrink-0 hover:opacity-80 transition-opacity'
                  >
                    <FavoriteIcon filled={favorited} />
                  </button>
                </h1>

                {/* 关键信息行 */}
                <div className='flex flex-wrap items-center gap-3 text-base mb-4 opacity-80 flex-shrink-0'>
                  {detail?.class && (
                    <span className='text-green-600 font-semibold'>
                      {detail.class}
                    </span>
                  )}
                  {(detail?.year || videoYear) && (
                    <span>{detail?.year || videoYear}</span>
                  )}
                  {detail?.source_name && (
                    <span className='border border-gray-500/60 px-2 py-[1px] rounded'>
                      {detail.source_name}
                    </span>
                  )}
                  {detail?.type_name && <span>{detail.type_name}</span>}
                </div>
                {/* 剧情简介 */}
                {detail?.desc && (
                  <div
                    className='mt-0 text-base leading-relaxed opacity-90 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide'
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {detail.desc}
                  </div>
                )}
              </div>
            </div>

            {/* 封面展示 */}
            <div className='hidden md:block md:col-span-1 md:order-first'>
              <div className='pl-0 py-4 pr-6'>
                <div className='bg-gray-300 dark:bg-gray-700 aspect-[2/3] flex items-center justify-center rounded-xl overflow-hidden'>
                  {videoCover ? (
                    <img
                      src={processImageUrl(videoCover)}
                      alt={videoTitle}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span className='text-gray-600 dark:text-gray-400'>
                      封面图片
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>


      {danmakuPanelOpen && (
        <div className='fixed inset-0 z-[710] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm'>
          <div className='relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:text-gray-100'>
            <button
              onClick={() => setDanmakuPanelOpen(false)}
              className='absolute right-3 top-3 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              aria-label='关闭弹幕面板'
            >
              <X className='h-4 w-4' />
            </button>

            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              在线弹幕
            </h2>

            <div className='mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'>
              <p className='font-medium'>💡 推荐使用剧集弹幕</p>
              <p className='mt-1 text-xs'>
                对于连续剧，建议使用含"ss"或"md"的番剧链接、season_id 或
                media_id 加载弹幕。
                系统会自动记住该剧的弹幕配置，切换集数时自动加载对应弹幕。
              </p>
            </div>

            <div className='mt-4 space-y-3'>
              <div className='flex items-center gap-3'>
                <label className='w-24 text-sm text-gray-600 dark:text-gray-400'>
                  类型
                </label>
                <select
                  value={danmakuSourceType}
                  onChange={(e) => setDanmakuSourceType(e.target.value as any)}
                  className='flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800'
                >
                  <option value='link'>链接</option>
                  <option value='bv'>BV</option>
                  <option value='season_id'>season_id</option>
                  <option value='media_id'>media_id</option>
                  <option value='cid'>cid</option>
                  <option value='local'>本地</option>
                </select>
              </div>
              {danmakuSourceType !== 'local' ? (
                <div className='flex items-center gap-3'>
                  <label className='w-24 text-sm text-gray-600 dark:text-gray-400'>
                    输入
                  </label>
                  <input
                    value={danmakuInput}
                    onChange={(e) => setDanmakuInput(e.target.value)}
                    placeholder={
                      danmakuSourceType === 'bv'
                        ? '例如 BV1xx411c7mD 或含 BV 的链接'
                        : danmakuSourceType === 'season_id'
                        ? '例如 33802'
                        : danmakuSourceType === 'media_id'
                        ? '例如 28237168'
                        : danmakuSourceType === 'cid'
                        ? '例如 210288241'
                        : '粘贴 B站链接（含 BV/番剧 ss 或 md）或任意可解析链接'
                    }
                    className='flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800'
                  />
                </div>
              ) : (
                <div className='flex items-center gap-3'>
                  <label className='w-24 text-sm text-gray-600 dark:text-gray-400'>
                    文件
                  </label>
                  <input
                    type='file'
                    accept='.xml,.XML,.ass,.ASS,.json,.JSON'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        danmakuFileRef.current = file;
                        setDanmakuInput(file.name);
                      }
                    }}
                    className='flex-1 text-sm text-gray-600 dark:text-gray-400'
                  />
                </div>
              )}

              {(danmakuSourceType === 'season_id' ||
                danmakuSourceType === 'media_id') && (
                <div className='flex items-center gap-3'>
                  <label className='w-24 text-sm text-gray-600 dark:text-gray-400'>
                    集数(ep)
                  </label>
                  <input
                    type='number'
                    min={1}
                    value={danmakuEp}
                    onChange={(e) =>
                      setDanmakuEp(Math.max(1, Number(e.target.value) || 1))
                    }
                    className='w-28 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800'
                  />
                </div>
              )}
              {danmakuSourceType === 'bv' && (
                <div className='flex items-center gap-3'>
                  <label className='w-24 text-sm text-gray-600 dark:text-gray-400'>
                    分P(p)
                  </label>
                  <input
                    type='number'
                    min={1}
                    value={danmakuP}
                    onChange={(e) =>
                      setDanmakuP(Math.max(1, Number(e.target.value) || 1))
                    }
                    className='w-28 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800'
                  />
                </div>
              )}

              {danmakuMsg ? (
                <div className='text-sm text-amber-700 dark:text-amber-300'>
                  {danmakuMsg}
                </div>
              ) : null}

              <div className='mt-2 flex justify-end gap-2'>
                <button
                  onClick={() => setDanmakuPanelOpen(false)}
                  className='rounded-md border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                >
                  取消
                </button>
                <button
                  disabled={danmakuLoading}
                  onClick={async () => {
                    try {
                      setDanmakuLoading(true);
                      setDanmakuMsg(null);
                      if (!danmakuEnabled) setDanmakuEnabled(true);

                      // 处理本地文件上传
                      if (danmakuSourceType === 'local') {
                        const file = danmakuFileRef.current;
                        if (!file) throw new Error('请选择文件');
                        const text = await file.text();
                        await loadDanmakuFromText(text);
                        setDanmakuMsg('已加载');
                        setTimeout(() => setDanmakuPanelOpen(false), 300);
                        return;
                      }

                      // 处理在线弹幕
                      let url = '';
                      if (danmakuSourceType === 'cid') {
                        const cid = danmakuInput.trim();
                        if (!cid) throw new Error('请输入 cid');
                        url = `/api/danmaku/bilibili?cid=${encodeURIComponent(
                          cid
                        )}`;
                      } else if (danmakuSourceType === 'bv') {
                        const v = danmakuInput.trim();
                        if (!v) throw new Error('请输入 BV 或含 BV 的链接');
                        url = `/api/danmaku/bilibili?bv=${encodeURIComponent(
                          v
                        )}&p=${encodeURIComponent(String(danmakuP))}`;
                      } else if (danmakuSourceType === 'season_id') {
                        const id = danmakuInput.trim();
                        if (!id) throw new Error('请输入 season_id');
                        url = `/api/danmaku/bilibili?season_id=${encodeURIComponent(
                          id
                        )}&ep=${encodeURIComponent(String(danmakuEp))}`;
                      } else if (danmakuSourceType === 'media_id') {
                        const id = danmakuInput.trim();
                        if (!id) throw new Error('请输入 media_id');
                        url = `/api/danmaku/bilibili?media_id=${encodeURIComponent(
                          id
                        )}&ep=${encodeURIComponent(String(danmakuEp))}`;
                      } else {
                        // link：支持 BV 普链，或番剧 ss/md 链接
                        const link = danmakuInput.trim();
                        if (!link) throw new Error('请输入链接');
                        url = `/api/danmaku/bilibili?link=${encodeURIComponent(
                          link
                        )}`;
                      }

                      // 直接把 API URL 交由插件加载，避免前端解析失败
                      await loadDanmakuFromUrl(url);

                      // 保存加载历史
                      saveDanmakuHistory(
                        danmakuSourceType,
                        danmakuInput.trim(),
                        danmakuSourceType === 'season_id' ||
                          danmakuSourceType === 'media_id'
                          ? danmakuEp
                          : undefined,
                        danmakuSourceType === 'bv' ? danmakuP : undefined
                      );

                      // 标记成功并关闭面板（若插件未就绪，会延迟应用）
                      setDanmakuMsg('已加载');
                      setTimeout(() => setDanmakuPanelOpen(false), 300);
                    } catch (e: any) {
                      console.error('加载在线弹幕失败', e);
                      const msg = e?.message || '加载失败';
                      setDanmakuMsg(msg);
                      triggerGlobalError(msg);
                    } finally {
                      setDanmakuLoading(false);
                    }
                  }}
                  className='rounded-md border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-blue-600 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-blue-500 disabled:hover:bg-blue-500'
                >
                  {danmakuLoading ? '加载中...' : '加载弹幕'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// FavoriteIcon 组件
const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <svg
        className='h-7 w-7'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          fill='#ef4444' /* Tailwind red-500 */
          stroke='#ef4444'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return (
    <Heart className='h-7 w-7 stroke-[1] text-gray-600 dark:text-gray-300' />
  );
};

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayPageClient />
    </Suspense>
  );
}
