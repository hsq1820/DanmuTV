/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

'use client';

import { Database, Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { DEFAULT_VIDEO_SOURCES } from '@/lib/default-video-sources';
import { checkForUpdates, CURRENT_VERSION, UpdateStatus } from '@/lib/version';
import { showToast } from './GlobalToast';
import { speedTestAllSources } from './SourceAvailabilityChecker';

interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

export const UserMenu: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isVideoSourceOpen, setIsVideoSourceOpen] = useState(false);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [storageType, setStorageType] = useState<string>('localstorage');
  const [mounted, setMounted] = useState(false);

  // 设置相关状态
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true);
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('');
  const [imageProxyUrl, setImageProxyUrl] = useState('');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [enableImageProxy, setEnableImageProxy] = useState(false);
  const [doubanDataSource, setDoubanDataSource] = useState(
    'cmliussss-cdn-tencent'
  );
  const [doubanImageProxyType, setDoubanImageProxyType] = useState(
    'cmliussss-cdn-tencent'
  );
  const [doubanImageProxyUrl, setDoubanImageProxyUrl] = useState('');
  const [isDoubanDropdownOpen, setIsDoubanDropdownOpen] = useState(false);
  const [isDoubanImageProxyDropdownOpen, setIsDoubanImageProxyDropdownOpen] =
    useState(false);

  // 豆瓣数据源选项
  const doubanDataSourceOptions = [
    { value: 'direct', label: '直连（服务器直接请求豆瓣）' },
    { value: 'cors-proxy-zwei', label: 'Cors Proxy By Zwei' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  // 豆瓣图片代理选项
  const doubanImageProxyTypeOptions = [
    { value: 'direct', label: '直连（浏览器直接请求豆瓣）' },
    { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
    { value: 'img3', label: '豆瓣官方精品 CDN（阿里云）' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  // 修改密码相关状态
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 视频源管理相关状态
  interface VideoSource {
    key: string;
    name: string;
    api: string;
    detail?: string;  // 改为可选
    disabled?: boolean;
  }
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [editingSource, setEditingSource] = useState<VideoSource | null>(null);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isSpeedTesting, setIsSpeedTesting] = useState(false); // 测速状态

  // 版本检查相关状态
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取存储类型
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 桌面应用不需要认证信息
      setAuthInfo({ username: 'DanmuTV 用户', role: 'owner' });

      const type =
        (window as any).RUNTIME_CONFIG?.STORAGE_TYPE || 'localstorage';
      setStorageType(type);
    }
  }, []);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAggregateSearch = localStorage.getItem(
        'defaultAggregateSearch'
      );
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      const savedDoubanProxyUrl = localStorage.getItem('doubanProxyUrl');
      const defaultDoubanProxy =
        (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '';
      if (savedDoubanProxyUrl !== null) {
        setDoubanProxyUrl(savedDoubanProxyUrl);
      } else if (defaultDoubanProxy) {
        setDoubanProxyUrl(defaultDoubanProxy);
      }

      const savedEnableImageProxy = localStorage.getItem('enableImageProxy');
      const defaultImageProxy =
        (window as any).RUNTIME_CONFIG?.IMAGE_PROXY || '';
      if (savedEnableImageProxy !== null) {
        setEnableImageProxy(JSON.parse(savedEnableImageProxy));
      } else if (defaultImageProxy) {
        setEnableImageProxy(true);
      }

      const savedImageProxyUrl = localStorage.getItem('imageProxyUrl');
      if (savedImageProxyUrl !== null) {
        setImageProxyUrl(savedImageProxyUrl);
      } else if (defaultImageProxy) {
        setImageProxyUrl(defaultImageProxy);
      }

      const savedEnableOptimization =
        localStorage.getItem('enableOptimization');
      if (savedEnableOptimization !== null) {
        setEnableOptimization(JSON.parse(savedEnableOptimization));
      }

      const savedDoubanDataSource = localStorage.getItem('doubanDataSource');
      const defaultDoubanDataSourceType =
        (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
        'cors-proxy-zwei'; // 默认使用 Cors Proxy By Zwei
      if (savedDoubanDataSource !== null) {
        setDoubanDataSource(savedDoubanDataSource);
      } else if (defaultDoubanDataSourceType) {
        setDoubanDataSource(defaultDoubanDataSourceType);
      }

      const savedDoubanImageProxyType = localStorage.getItem(
        'doubanImageProxyType'
      );
      const defaultDoubanImageProxyType =
        (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
        'direct'; // 默认直连
      if (savedDoubanImageProxyType !== null) {
        setDoubanImageProxyType(savedDoubanImageProxyType);
      } else if (defaultDoubanImageProxyType) {
        setDoubanImageProxyType(defaultDoubanImageProxyType);
      }

      const savedDoubanImageProxyUrl = localStorage.getItem(
        'doubanImageProxyUrl'
      );
      const defaultDoubanImageProxyUrl =
        (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY || '';
      if (savedDoubanImageProxyUrl !== null) {
        setDoubanImageProxyUrl(savedDoubanImageProxyUrl);
      } else if (defaultDoubanImageProxyUrl) {
        setDoubanImageProxyUrl(defaultDoubanImageProxyUrl);
      }

      // 加载视频源配置 - 如果没有配置则使用默认视频源
      const savedSources = localStorage.getItem('danmutv_video_sources');
      if (savedSources) {
        try {
          const parsedSources = JSON.parse(savedSources);
          setVideoSources(parsedSources);
          console.log(`已加载 ${parsedSources.length} 个视频源配置`);
        } catch (e) {
          console.error('解析视频源配置失败,使用默认配置:', e);
          setVideoSources(DEFAULT_VIDEO_SOURCES);
          localStorage.setItem('danmutv_video_sources', JSON.stringify(DEFAULT_VIDEO_SOURCES));
        }
      } else {
        // 首次使用,初始化默认视频源
        console.log(`首次使用,初始化 ${DEFAULT_VIDEO_SOURCES.length} 个默认视频源`);
        setVideoSources(DEFAULT_VIDEO_SOURCES);
        localStorage.setItem('danmutv_video_sources', JSON.stringify(DEFAULT_VIDEO_SOURCES));
      }
    }
  }, []);

  // 版本检查
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const status = await checkForUpdates();
        setUpdateStatus(status);
      } catch (error) {
        console.warn('版本检查失败:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdate();
  }, []);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('注销请求失败:', error);
    }
    window.location.href = '/';
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleChangePassword = () => {
    setIsOpen(false);
    setIsChangePasswordOpen(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCloseChangePassword = () => {
    setIsChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSubmitChangePassword = async () => {
    setPasswordError('');

    // 验证密码
    if (!newPassword) {
      setPasswordError('新密码不得为空');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || '修改密码失败');
        return;
      }

      // 修改成功，关闭弹窗并登出
      setIsChangePasswordOpen(false);
      await handleLogout();
    } catch (error) {
      setPasswordError('网络错误，请稍后重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleVideoSource = () => {
    setIsOpen(false);
    setIsVideoSourceOpen(true);
  };

  const handleCloseVideoSource = () => {
    setIsVideoSourceOpen(false);
  };

  // 设置相关的处理函数
  const handleAggregateToggle = (value: boolean) => {
    setDefaultAggregateSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(value));
    }
  };

  const handleDoubanProxyUrlChange = (value: string) => {
    setDoubanProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrl', value);
    }
  };

  const handleImageProxyUrlChange = (value: string) => {
    setImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imageProxyUrl', value);
    }
  };

  const handleOptimizationToggle = (value: boolean) => {
    setEnableOptimization(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableOptimization', JSON.stringify(value));
    }
  };

  const handleDoubanDataSourceChange = (value: string) => {
    setDoubanDataSource(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataSource', value);
    }
  };

  const handleDoubanImageProxyTypeChange = (value: string) => {
    setDoubanImageProxyType(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyType', value);
    }
  };

  const handleDoubanImageProxyUrlChange = (value: string) => {
    setDoubanImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyUrl', value);
    }
  };

  const handleImageProxyToggle = (value: boolean) => {
    setEnableImageProxy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableImageProxy', JSON.stringify(value));
    }
  };

  const handleResetSettings = () => {
    const defaultImageProxy = (window as any).RUNTIME_CONFIG?.IMAGE_PROXY || '';
    const defaultDoubanProxy =
      (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '';

    setDefaultAggregateSearch(true);
    setEnableOptimization(true);
    setDoubanProxyUrl(defaultDoubanProxy);
    setEnableImageProxy(!!defaultImageProxy);
    setImageProxyUrl(defaultImageProxy);
    setDoubanDataSource('cors-proxy-zwei'); // 重置为 Cors Proxy By Zwei
    setDoubanImageProxyType('direct'); // 重置为直连

    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem('enableOptimization', JSON.stringify(true));
      localStorage.setItem('doubanProxyUrl', defaultDoubanProxy);
      localStorage.setItem(
        'enableImageProxy',
        JSON.stringify(!!defaultImageProxy)
      );
      localStorage.setItem('imageProxyUrl', defaultImageProxy);
      localStorage.setItem('doubanDataSource', 'cors-proxy-zwei');
      localStorage.setItem('doubanImageProxyType', 'direct');
    }
  };

  // 视频源管理相关函数
  const handleSaveVideoSources = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('danmutv_video_sources', JSON.stringify(videoSources));
    }
  };

  const handleAddSource = () => {
    setEditingSource({
      key: '',
      name: '',
      api: '',
      detail: '',
      disabled: false,
    });
    setIsAddingSource(true);
  };

  const handleEditSource = (source: VideoSource) => {
    setEditingSource({ ...source });
    setIsAddingSource(false);
  };

  const handleDeleteSource = (key: string) => {
    const newSources = videoSources.filter(s => s.key !== key);
    setVideoSources(newSources);
    localStorage.setItem('danmutv_video_sources', JSON.stringify(newSources));
  };

  const handleSaveSource = () => {
    if (!editingSource) return;
    
    if (!editingSource.key || !editingSource.name || !editingSource.api) {
      alert('请填写完整的视频源信息(key、名称、API地址为必填项)');
      return;
    }

    let newSources: VideoSource[];
    if (isAddingSource) {
      // 检查key是否重复
      if (videoSources.some(s => s.key === editingSource.key)) {
        alert('该Key已存在,请使用其他Key');
        return;
      }
      newSources = [...videoSources, editingSource];
    } else {
      newSources = videoSources.map(s => 
        s.key === editingSource.key ? editingSource : s
      );
    }
    
    setVideoSources(newSources);
    localStorage.setItem('danmutv_video_sources', JSON.stringify(newSources));
    setEditingSource(null);
    setIsAddingSource(false);
  };

  const handleCancelEditSource = () => {
    setEditingSource(null);
    setIsAddingSource(false);
  };

  const handleToggleSourceStatus = (key: string) => {
    const newSources = videoSources.map(s => 
      s.key === key ? { ...s, disabled: !s.disabled } : s
    );
    setVideoSources(newSources);
    localStorage.setItem('danmutv_video_sources', JSON.stringify(newSources));
  };

  const handleEnableAllAvailableSources = () => {
    if (confirm('确定要启用所有可用视频源吗?\n\n这将清除测速时的屏蔽列表,所有未手动禁用的视频源都将被启用。建议仅在需要更多视频源时使用。')) {
      // 清除测速时设置的屏蔽列表
      localStorage.removeItem('danmutv_blocked_sources');
      
      showToast(
        '已启用所有可用视频源!刷新页面后生效,搜索时将使用所有未被手动禁用的视频源。',
        'success',
        6000
      );
    }
  };

  // 手动触发视频源测速
  const handleManualSpeedTest = async () => {
    if (isSpeedTesting) {
      showToast('测速正在进行中，请稍候...', 'info', 2000);
      return;
    }

    if (!confirm('确定要开始视频源测速吗?\n\n这将测试所有未禁用的视频源,并保留速度最快的前20个。测速过程可能需要几秒钟。')) {
      return;
    }

    setIsSpeedTesting(true);
    showToast('开始视频源测速，请稍候...', 'info', 3000);

    try {
      // 清除之前的测速时间戳，强制重新测速
      localStorage.removeItem('source_speed_test_timestamp');
      
      // 执行测速
      await speedTestAllSources();
      
      showToast('视频源测速完成！已保留速度最快的前20个源。', 'success', 5000);
    } catch (error) {
      console.error('视频源测速失败:', error);
      showToast('视频源测速失败，请稍后重试', 'error', 5000);
    } finally {
      setIsSpeedTesting(false);
    }
  };

  // 桌面应用不需要管理面板和修改密码功能
  const showAdminPanel = false;
  const showChangePassword = false;

  // 角色中文映射
  const getRoleText = (role?: string) => {
    switch (role) {
      case 'owner':
        return '站长';
      case 'admin':
        return '管理员';
      case 'user':
        return '用户';
      default:
        return '';
    }
  };

  // 弹幕下载相关 state
  const [isDanmakuDownloadOpen, setIsDanmakuDownloadOpen] = useState(false);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [danmakuFormat, setDanmakuFormat] = useState('xml');
  const [danmakuLoading, setDanmakuLoading] = useState(false);
  const [danmakuError, setDanmakuError] = useState('');
  const [danmakuSavePath, setDanmakuSavePath] = useState('');
  const [showNameInput, setShowNameInput] = useState('');
  const [danmakuDuration, setDanmakuDuration] = useState('5'); // SRT/ASS 显示时长
  
  // 解析后的集列表
  interface EpisodeItem {
    title: string;
    cid: number;
    section?: string;
    selected?: boolean;
  }
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [baseTitle, setBaseTitle] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  
  // 拖动选择和Shift选择相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null);
  const [dragInitialState, setDragInitialState] = useState<boolean>(false);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // 初始化默认保存路径
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[弹幕下载] 检查 Electron API:', !!(window as any).electronAPI);
      if ((window as any).electronAPI) {
        console.log('[弹幕下载] Electron API 可用，获取桌面路径...');
        (window as any).electronAPI.getDesktopPath().then((desktopPath: string) => {
          const defaultPath = `${desktopPath}/弹幕`;
          console.log('[弹幕下载] 默认保存路径:', defaultPath);
          setDanmakuSavePath(defaultPath);
        }).catch((err: any) => {
          console.error('[弹幕下载] 获取桌面路径失败:', err);
          setDanmakuSavePath('弹幕'); // 降级到相对路径
        });
      } else {
        console.warn('[弹幕下载] Electron API 不可用，可能未在 Electron 环境中运行');
        setDanmakuSavePath('弹幕');
      }
    }
  }, []);

  // 选择保存目录
  const handleSelectDirectory = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const selected = await (window as any).electronAPI.selectDirectory(danmakuSavePath);
      if (selected) {
        setDanmakuSavePath(selected);
      }
    }
  };

  // 识别输入类型并解析
  const handleResolveInput = async () => {
    const input = danmakuInput.trim();
    if (!input) {
      setDanmakuError('请输入ID或链接');
      return;
    }

    setIsResolving(true);
    setDanmakuError('');
    setEpisodes([]);

    try {
      const { kind, value } = detectInputKind(input);
      console.log('[弹幕下载] 识别类型:', kind, '值:', value);

      let title = '';
      let items: EpisodeItem[] = [];
      let thirdPartyUrlData: string | undefined;
      let thirdPartyDanmakuData: any[] | undefined;

      if (kind === 'media_id') {
        const data = await parseMediaId(value);
        title = data.title;
        items = data.episodes;
      } else if (kind === 'season_id') {
        const data = await parseSeasonId(value);
        title = data.title;
        items = data.episodes;
      } else if (kind === 'ep_id') {
        const data = await parseEpId(value);
        title = data.title;
        items = data.episodes;
      } else if (kind === 'bvid') {
        const data = await parseBvid(value);
        title = data.title;
        items = data.episodes;
      } else if (kind === 'cid') {
        title = `cid_${value}`;
        items = [{ title: `CID ${value}`, cid: parseInt(value), section: '单集', selected: true }];
      } else if (kind === 'third_party') {
        const data = await parseThirdPartyUrl(value);
        title = data.title;
        items = data.episodes;
        thirdPartyUrlData = data.thirdPartyUrl;
        thirdPartyDanmakuData = data.thirdPartyData;
      } else {
        throw new Error('不支持的输入类型，仅支持B站链接/ID和第三方平台链接（芒果TV、腾讯、优酷、爱奇艺、巴哈姆特）');
      }

      setBaseTitle(title);
      setEpisodes(items.map(item => ({ ...item, selected: true })));
      setDanmakuError('');
      
      // 保存第三方平台数据（如果有）
      if (thirdPartyUrlData && thirdPartyDanmakuData) {
        (window as any).__thirdPartyDanmakuCache = {
          url: thirdPartyUrlData,
          data: thirdPartyDanmakuData,
        };
      } else {
        delete (window as any).__thirdPartyDanmakuCache;
      }
      
      showToast(`解析完成，共 ${items.length} 条`, 'success');
    } catch (e: any) {
      console.error('[弹幕下载] 解析失败:', e);
      setDanmakuError(e?.message || '解析失败');
    } finally {
      setIsResolving(false);
    }
  };

  // 输入类型识别
  const detectInputKind = (text: string): { kind: string; value: string } => {
    const t = text.trim();
    
    // URL 处理
    if (t.startsWith('http')) {
      try {
        const url = new URL(t);
        const hostname = url.hostname.toLowerCase();
        const path = url.pathname;
        
        // B站链接判断
        const isBilibiliDomain = hostname.includes('bilibili.com') || hostname.includes('b23.tv');
        
        if (isBilibiliDomain) {
          // BV号：/video/BVxxxx
          const bvMatch = path.match(/\/video\/(BV[0-9A-Za-z]{10,})/i);
          if (bvMatch) return { kind: 'bvid', value: bvMatch[1] };
          
          // 番剧：/bangumi/media/mdxxxx
          const mdMatch = path.match(/\/bangumi\/(?:media\/)?(md\d+)/i);
          if (mdMatch) return { kind: 'media_id', value: mdMatch[1].substring(2) };
          
          // 季：/bangumi/season/ssxxxx
          const ssMatch = path.match(/\/bangumi\/(?:season\/)?(ss\d+)/i);
          if (ssMatch) return { kind: 'season_id', value: ssMatch[1].substring(2) };
          
          // 集：/bangumi/play/epxxxx
          const epMatch = path.match(/\/bangumi\/play\/(ep\d+)/i);
          if (epMatch) return { kind: 'ep_id', value: epMatch[1].substring(2) };
          
          // 查询参数
          const bvid = url.searchParams.get('bvid');
          if (bvid) return { kind: 'bvid', value: bvid };
          
          const cid = url.searchParams.get('cid');
          if (cid && /^\d+$/.test(cid)) return { kind: 'cid', value: cid };
        } else {
          // 第三方平台链接（芒果TV、腾讯视频、优酷、爱奇艺、巴哈姆特等）
          return { kind: 'third_party', value: t };
        }
      } catch (e) {
        // 继续尝试正则匹配
      }
    }
    
    // 纯文本
    if (/^BV[0-9A-Za-z]{10}$/i.test(t)) return { kind: 'bvid', value: t };
    if (/^md\d+$/i.test(t)) return { kind: 'media_id', value: t.substring(2) };
    if (/^ss\d+$/i.test(t)) return { kind: 'season_id', value: t.substring(2) };
    if (/^ep\d+$/i.test(t)) return { kind: 'ep_id', value: t.substring(2) };
    if (/^\d{5,}$/.test(t)) return { kind: 'cid', value: t };
    
    return { kind: 'unknown', value: t };
  };

  // 解析各种ID
  const parseMediaId = async (mediaId: string) => {
    const resp = await fetch(`https://api.bilibili.com/pgc/review/user?media_id=${mediaId}`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(data.message || '接口返回错误');
    const seasonId = data.result.media.season_id;
    const title = data.result.media.title || `season_${seasonId}`;
    const seasonData = await parseSeasonId(seasonId);
    return { title, episodes: seasonData.episodes };
  };

  const parseSeasonId = async (seasonId: string) => {
    const resp = await fetch(`https://api.bilibili.com/pgc/web/season/section?season_id=${seasonId}`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(data.message || '接口返回错误');
    
    const result = data.result || {};
    const episodes: EpisodeItem[] = [];
    
    // 主分区（正片）
    const main = result.main_section || {};
    const title = main.title || `season_${seasonId}`;
    (main.episodes || []).forEach((ep: any) => {
      episodes.push({
        title: `${ep.title || ''} ${ep.long_title || ''}`.trim() || String(ep.id),
        cid: parseInt(ep.cid),
        section: main.title || '正片',
      });
    });
    
    // 其他分区
    (result.section || []).forEach((sec: any) => {
      const secTitle = sec.title || '其他';
      (sec.episodes || []).forEach((ep: any) => {
        episodes.push({
          title: `${ep.title || ''} ${ep.long_title || ''}`.trim() || String(ep.id),
          cid: parseInt(ep.cid),
          section: secTitle,
        });
      });
    });
    
    return { title, episodes };
  };

  const parseEpId = async (epId: string) => {
    const resp = await fetch(`https://api.bilibili.com/pgc/view/web/season?ep_id=${epId}`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(data.message || '接口返回错误');
    
    const result = data.result || {};
    const seasonTitle = result.season_title || `season_${result.season_id}`;
    const episodes: EpisodeItem[] = [];
    
    (result.episodes || []).forEach((ep: any) => {
      episodes.push({
        title: `${ep.title || ''} ${ep.long_title || ''}`.trim() || String(ep.id),
        cid: parseInt(ep.cid),
        section: '正片',
      });
    });
    
    return { title: seasonTitle, episodes };
  };

  const parseBvid = async (bvid: string) => {
    const resp = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(data.message || '接口返回错误');
    
    const videoData = data.data || {};
    const title = videoData.title || bvid;
    const episodes: EpisodeItem[] = [];
    
    (videoData.pages || []).forEach((p: any) => {
      episodes.push({
        title: p.part || `P${p.page}`,
        cid: parseInt(p.cid),
        section: 'PAGES',
      });
    });
    
    return { title, episodes };
  };

  // 解析第三方平台链接（芒果TV、腾讯视频、优酷、爱奇艺、巴哈姆特等）
  const parseThirdPartyUrl = async (url: string) => {
    try {
      const apiUrl = `https://fc.lyz05.cn/?url=${encodeURIComponent(url)}`;
      const resp = await fetch(apiUrl);
      
      if (!resp.ok) {
        throw new Error(`HTTP错误: ${resp.status}`);
      }
      
      // 先获取文本内容，判断是 XML 还是 JSON
      const textContent = await resp.text();
      
      let danmakuData: any[] = [];
      let title = '';
      
      // 判断返回格式
      if (textContent.trim().startsWith('<')) {
        // XML 格式（Bilibili 格式）
        console.log('[弹幕下载] 第三方平台返回 XML 格式');
        danmakuData = parseXmlToDanmakuEntries(textContent);
        
        if (danmakuData.length === 0) {
          throw new Error('未获取到弹幕数据，该视频可能没有弹幕');
        }
      } else {
        // JSON 格式
        console.log('[弹幕下载] 第三方平台返回 JSON 格式');
        try {
          const jsonData = JSON.parse(textContent);
          
          if (jsonData.code !== 0 && jsonData.code !== 200) {
            throw new Error(jsonData.message || jsonData.msg || '第三方平台解析失败');
          }
          
          // API 返回的弹幕数据格式
          danmakuData = jsonData.danmaku || jsonData.data || [];
          title = jsonData.title || '';
          
          if (!Array.isArray(danmakuData) || danmakuData.length === 0) {
            throw new Error('未获取到弹幕数据，该视频可能没有弹幕');
          }
        } catch (parseError: any) {
          throw new Error(`解析JSON失败: ${parseError.message}`);
        }
      }
      
      // 从URL中提取平台名称作为标题的一部分
      let platformName = '第三方平台';
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname.includes('mgtv.com')) platformName = '芒果TV';
        else if (hostname.includes('qq.com') || hostname.includes('v.qq.com')) platformName = '腾讯视频';
        else if (hostname.includes('youku.com')) platformName = '优酷';
        else if (hostname.includes('iqiyi.com')) platformName = '爱奇艺';
        else if (hostname.includes('gamer.com.tw')) platformName = '巴哈姆特';
      } catch (e) {
        // 忽略URL解析错误
      }
      
      // 如果没有从JSON中获取到标题，使用平台名称
      if (!title) {
        title = `${platformName}视频`;
      }
      
      // 第三方平台通常返回单个视频的弹幕，不分集
      // 但我们需要构造一个伪CID来下载
      // 直接使用 -1 作为特殊标记，在下载时直接使用API URL
      const episodes: EpisodeItem[] = [{
        title: title,
        cid: -1, // 特殊标记：使用第三方API
        section: platformName,
      }];
      
      return { title, episodes, thirdPartyUrl: url, thirdPartyData: danmakuData };
    } catch (e: any) {
      console.error('[弹幕下载] 第三方平台解析失败:', e);
      throw new Error(e.message || '第三方平台解析失败，请检查链接是否正确');
    }
  };

  // 处理集数点击(支持Shift范围选择)
  const handleEpisodeClick = (index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastClickedIndex !== null) {
      // Shift + 点击：范围选择 (始终选中范围内的所有项)
      event.preventDefault();
      event.stopPropagation();
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const newEps = [...episodes];
      for (let i = start; i <= end; i++) {
        newEps[i].selected = true;
      }
      setEpisodes(newEps);
      // 不更新 lastClickedIndex，保持原来的锚点
    }
    // 普通点击由 handleMouseUp 处理，这里不再处理
  };

  // 处理拖动开始
  const handleMouseDown = (index: number, event: React.MouseEvent) => {
    if (event.shiftKey) return; // Shift点击时不触发拖动
    event.preventDefault(); // 防止文本选择
    setDragStartIndex(index);
    setDragEndIndex(index);
    // 记录起始点的状态，拖动时将切换为相反状态
    setDragInitialState(!episodes[index].selected);
  };

  // 处理拖动经过
  const handleMouseEnter = (index: number) => {
    if (dragStartIndex === null) return;
    
    // 只有当鼠标移动到不同的项时才认为是拖动
    if (index !== dragStartIndex && !isDragging) {
      setIsDragging(true);
    }
    
    // 更新拖动结束位置
    setDragEndIndex(index);
  };

  // 处理拖动结束
  const handleMouseUp = () => {
    if (dragStartIndex !== null) {
      if (isDragging && dragEndIndex !== null) {
        // 发生了拖动，应用范围选择
        const start = Math.min(dragStartIndex, dragEndIndex);
        const end = Math.max(dragStartIndex, dragEndIndex);
        const newEps = [...episodes];
        for (let i = start; i <= end; i++) {
          newEps[i].selected = dragInitialState;
        }
        setEpisodes(newEps);
        setLastClickedIndex(dragStartIndex);
      } else {
        // 没有拖动，单击处理
        const newEps = [...episodes];
        newEps[dragStartIndex].selected = !newEps[dragStartIndex].selected;
        setEpisodes(newEps);
        setLastClickedIndex(dragStartIndex);
      }
    }
    
    setIsDragging(false);
    setDragStartIndex(null);
    setDragEndIndex(null);
  };

  // 添加全局鼠标释放监听
  useEffect(() => {
    if (dragStartIndex !== null) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [dragStartIndex, dragEndIndex, isDragging, episodes, dragInitialState]);

  // 下载弹幕
  const handleDanmakuDownload = async () => {
    const selectedEps = episodes.filter(ep => ep.selected);
    if (selectedEps.length === 0) {
      setDanmakuError('请先解析并选择要下载的集数');
      return;
    }

    setDanmakuLoading(true);
    setDanmakuError('');

    try {
      const folderName = sanitizeFilename(showNameInput || baseTitle || 'danmu');
      const saveDir = `${danmakuSavePath}/${folderName}`;
      const format = danmakuFormat;
      const duration = parseFloat(danmakuDuration) || 5.0;

      let successCount = 0;
      let failCount = 0;

      // 检查是否为第三方平台数据
      const thirdPartyCache = (window as any).__thirdPartyDanmakuCache;
      const isThirdParty = thirdPartyCache && selectedEps.length === 1 && selectedEps[0].cid === -1;

      for (let i = 0; i < selectedEps.length; i++) {
        const ep = selectedEps[i];
        try {
          let xmlData = '';
          
          // 第三方平台特殊处理
          if (isThirdParty && ep.cid === -1) {
            console.log('[弹幕下载] 使用第三方平台缓存数据');
            // 第三方平台缓存的数据是 DanmakuEntry[] 格式，需要转换为 XML
            const danmakuEntries = thirdPartyCache.data as DanmakuEntry[];
            xmlData = '<?xml version="1.0" encoding="UTF-8"?><i>';
            danmakuEntries.forEach((entry: DanmakuEntry) => {
              // 转义 XML 特殊字符
              const escapedText = entry.text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
              xmlData += `<d p="${entry.time},${entry.mode},${entry.size},${entry.color},0,0,0,0">${escapedText}</d>`;
            });
            xmlData += '</i>';
          } else {
            // B站弹幕下载
            const xmlUrl = `https://comment.bilibili.com/${ep.cid}.xml`;
            const resp = await fetch(xmlUrl);
            if (!resp.ok) throw new Error('下载失败');
            xmlData = await resp.text();
          }

          // 文件名：分区_标题_cid（第三方平台不包含cid）
          const fileName = isThirdParty 
            ? sanitizeFilename(ep.title)
            : sanitizeFilename(`${ep.section || ''}_${ep.title}_cid${ep.cid}`.replace(/^_/, ''));

          let fileData = '';
          let fileExt = format;

          if (format === 'xml') {
            fileData = xmlData;
          } else if (format === 'srt') {
            const entries = parseXmlToDanmakuEntries(xmlData);
            fileData = convertToSRT(entries, duration);
          } else if (format === 'ass') {
            const entries = parseXmlToDanmakuEntries(xmlData);
            fileData = convertToASS(entries, duration);
          }

          // 保存文件
          if (typeof window !== 'undefined' && (window as any).electronAPI) {
            const fullPath = `${saveDir}/${fileName}.${fileExt}`;
            const result = await (window as any).electronAPI.saveFile(fullPath, fileData);
            if (!result.success) throw new Error(result.error);
            console.log(`[${i+1}/${selectedEps.length}] 已保存: ${result.filePath}`);
          } else {
            // 浏览器降级下载
            const blob = new Blob([fileData], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${fileName}.${fileExt}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }

          successCount++;
        } catch (e: any) {
          console.error(`[${i+1}/${selectedEps.length}] 失败: cid=${ep.cid}`, e);
          failCount++;
        }
      }

      setIsDanmakuDownloadOpen(false);
      showToast(
        `下载完成！成功 ${successCount} 条，失败 ${failCount} 条\n保存目录：${saveDir}`,
        successCount > 0 ? 'success' : 'error',
        6000
      );
    } catch (e: any) {
      setDanmakuError(e?.message || '下载失败');
    } finally {
      setDanmakuLoading(false);
    }
  };

  // 获取默认保存路径
  const getDefaultSavePath = async (): Promise<string> => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const desktop = await (window as any).electronAPI.getDesktopPath();
        return `${desktop}/danmu`;
      } catch (e) {
        return 'danmu';
      }
    }
    return 'danmu';
  };

  // 文件名清理
  const sanitizeFilename = (name: string): string => {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim().substring(0, 120);
  };

  // 解析XML为弹幕条目
  interface DanmakuEntry {
    time: number;
    mode: number;
    size: number;
    color: number;
    text: string;
  }

  const parseXmlToDanmakuEntries = (xmlText: string): DanmakuEntry[] => {
    const entries: DanmakuEntry[] = [];
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const dElements = xmlDoc.querySelectorAll('d');
      
      dElements.forEach(d => {
        const p = d.getAttribute('p');
        if (!p) return;
        
        const parts = p.split(',');
        if (parts.length < 4) return;
        
        try {
          entries.push({
            time: parseFloat(parts[0]),
            mode: parseInt(parts[1]),
            size: parseInt(parts[2]),
            color: parseInt(parts[3]),
            text: (d.textContent || '').replace(/[\r\n]/g, ' '),
          });
        } catch (e) {
          // 跳过解析失败的弹幕
        }
      });
    } catch (e) {
      console.error('解析XML失败:', e);
    }
    
    entries.sort((a, b) => a.time - b.time);
    return entries;
  };

  // 转换为SRT格式
  const convertToSRT = (entries: DanmakuEntry[], duration: number): string => {
    let srt = '';
    entries.forEach((entry, index) => {
      const start = formatSRTTimestamp(entry.time);
      const end = formatSRTTimestamp(entry.time + duration);
      srt += `${index + 1}\n${start} --> ${end}\n${entry.text}\n\n`;
    });
    return srt;
  };

  const formatSRTTimestamp = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  // 转换为ASS格式
  const convertToASS = (entries: DanmakuEntry[], duration: number): string => {
    let ass = `[Script Info]
; Script generated by DanmuTV
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Danmaku, Microsoft YaHei, 36, &H00FFFFFF, &H000000FF, &H00222222, &H64000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 0, 8, 10, 10, 10, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    entries.forEach(entry => {
      const start = formatASSTimestamp(entry.time);
      const end = formatASSTimestamp(entry.time + duration);
      
      // 对齐方式：mode 4 底部，mode 5 顶部，其他默认顶部
      let align = '{\\an8}'; // 默认顶部
      if (entry.mode === 4) align = '{\\an2}'; // 底部
      else if (entry.mode === 5) align = '{\\an8}'; // 顶部
      
      const text = entry.text.replace(/[{}]/g, ''); // 移除特殊字符
      ass += `Dialogue: 0,${start},${end},Danmaku,,0,0,0,,${align}${text}\n`;
    });

    return ass;
  };

  const formatASSTimestamp = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.round((seconds - Math.floor(seconds)) * 100); // centiseconds
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };
  const menuPanel = (
    <>
      {/* 背景遮罩 - 普通菜单无需模糊 */}
      <div
        className='fixed inset-0 bg-transparent z-[1000]'
        onClick={handleCloseMenu}
      />

      {/* 菜单面板 */}
      <div className='fixed top-14 right-4 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-[1001] border border-gray-200/50 dark:border-gray-700/50 overflow-hidden select-none'>
        {/* 用户信息区域 - 桌面应用简化显示 */}
        <div className='px-3 py-3 border-b border-gray-200 dark:border-gray-700'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <div className='font-semibold text-gray-900 dark:text-gray-100 text-sm'>
                DanmuTV
              </div>
              <div className='text-[10px] text-gray-400 dark:text-gray-500'>
                桌面版
              </div>
            </div>
          </div>
        </div>

        {/* 菜单项 */}
        <div className='py-1'>
          {/* 视频源管理按钮 */}
          <button
            onClick={handleVideoSource}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
          >
            <Database className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>视频源管理</span>
          </button>


          {/* 弹幕下载按钮 */}
          <button
            onClick={() => setIsDanmakuDownloadOpen(true)}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
          >
            <Database className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>弹幕下载</span>
          </button>

          {/* 设置按钮 */}
          <button
            onClick={handleSettings}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
          >
            <Settings className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>设置</span>
          </button>

          {/* 桌面应用不需要管理面板和修改密码功能 */}

          {/* 分割线 */}
          <div className='my-1 border-t border-gray-200 dark:border-gray-700'></div>

          {/* 分割线 - 桌面应用不需要登出按钮 */}
          <div className='my-1 border-t border-gray-200 dark:border-gray-700'></div>

          {/* 版本信息 - 桌面应用移除 GitHub 链接 */}
          <div className='w-full px-3 py-2 text-center flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs'>
            <div className='flex items-center gap-1'>
              <span className='font-mono'>v{CURRENT_VERSION}</span>
              {!isChecking &&
                updateStatus &&
                updateStatus !== UpdateStatus.FETCH_FAILED && (
                  <div
                    className={`w-2 h-2 rounded-full -translate-y-2 ${
                      updateStatus === UpdateStatus.HAS_UPDATE
                        ? 'bg-yellow-500'
                        : updateStatus === UpdateStatus.NO_UPDATE
                        ? 'bg-green-400'
                        : ''
                    }`}
                  ></div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 设置面板内容
  const settingsPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={handleCloseSettings}
      />

      {/* 设置面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1001] p-6'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              本地设置
            </h3>
            <button
              onClick={handleResetSettings}
              className='px-2 py-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
              title='重置为默认设置'
            >
              重置
            </button>
          </div>
          <button
            onClick={handleCloseSettings}
            className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            aria-label='Close'
          >
            <X className='w-full h-full' />
          </button>
        </div>

        {/* 设置项 */}
        <div className='space-y-6'>
          {/* 默认聚合搜索结果 */}
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                默认聚合搜索结果
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                搜索时默认按标题和年份聚合显示结果
              </p>
            </div>
            <label className='flex items-center cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  className='sr-only peer'
                  checked={defaultAggregateSearch}
                  onChange={(e) => handleAggregateToggle(e.target.checked)}
                />
                <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
              </div>
            </label>
          </div>

          {/* 优选和测速 */}
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                启用优选和测速
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                如出现播放器劫持问题可关闭
              </p>
            </div>
            <label className='flex items-center cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  className='sr-only peer'
                  checked={enableOptimization}
                  onChange={(e) => handleOptimizationToggle(e.target.checked)}
                />
                <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
              </div>
            </label>
          </div>

          {/* 分割线 */}
          <div className='border-t border-gray-200 dark:border-gray-700'></div>

          {/* 豆瓣数据源配置 */}
          <div className='space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                豆瓣数据源
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                选择豆瓣数据的获取方式
              </p>
            </div>
            <div className='relative'>
              <button
                onClick={() => setIsDoubanDropdownOpen(!isDoubanDropdownOpen)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-left bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors'
              >
                {doubanDataSourceOptions.find(
                  (opt) => opt.value === doubanDataSource
                )?.label || '直连（服务器直接请求豆瓣）'}
                <span className='absolute right-3 top-1/2 -translate-y-1/2'>
                  ▼
                </span>
              </button>
              {isDoubanDropdownOpen && (
                <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50'>
                  {doubanDataSourceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleDoubanDataSourceChange(option.value);
                        setIsDoubanDropdownOpen(false);
                      }}
                      className='w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md'
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 自定义代理地址 */}
          {doubanDataSource === 'custom' && (
            <div className='space-y-3'>
              <div>
                <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  自定义豆瓣代理地址
                </h4>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  输入自定义代理服务器地址
                </p>
              </div>
              <input
                type='text'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                placeholder='例如: https://proxy.example.com/fetch?url='
                value={doubanProxyUrl}
                onChange={(e) => handleDoubanProxyUrlChange(e.target.value)}
              />
            </div>
          )}

          {/* 豆瓣图片代理配置 */}
          <div className='space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                豆瓣图片代理
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                选择豆瓣图片的代理方式
              </p>
            </div>
            <div className='relative'>
              <button
                onClick={() =>
                  setIsDoubanImageProxyDropdownOpen(
                    !isDoubanImageProxyDropdownOpen
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-left bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors'
              >
                {doubanImageProxyTypeOptions.find(
                  (opt) => opt.value === doubanImageProxyType
                )?.label || '豆瓣 CDN By CMLiussss（腾讯云）'}
                <span className='absolute right-3 top-1/2 -translate-y-1/2'>
                  ▼
                </span>
              </button>
              {isDoubanImageProxyDropdownOpen && (
                <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50'>
                  {doubanImageProxyTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleDoubanImageProxyTypeChange(option.value);
                        setIsDoubanImageProxyDropdownOpen(false);
                      }}
                      className='w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md'
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 自定义豆瓣图片代理地址 */}
          {doubanImageProxyType === 'custom' && (
            <div className='space-y-3'>
              <div>
                <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  自定义豆瓣图片代理地址
                </h4>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  输入自定义图片代理服务器地址
                </p>
              </div>
              <input
                type='text'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                placeholder='例如: https://imageproxy.example.com/?url='
                value={doubanImageProxyUrl}
                onChange={(e) =>
                  handleDoubanImageProxyUrlChange(e.target.value)
                }
              />
            </div>
          )}

          {/* 分割线 */}
          <div className='border-t border-gray-200 dark:border-gray-700'></div>

          {/* 图片代理开关 */}
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                启用图片代理
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                启用后，所有图片加载将通过代理服务器
              </p>
            </div>
            <label className='flex items-center cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  className='sr-only peer'
                  checked={enableImageProxy}
                  onChange={(e) => handleImageProxyToggle(e.target.checked)}
                />
                <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
              </div>
            </label>
          </div>

          {/* 图片代理地址设置 */}
          <div className='space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                图片代理地址
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                仅在启用图片代理时生效
              </p>
            </div>
            <input
              type='text'
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                enableImageProxy
                  ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 placeholder-gray-400 dark:placeholder-gray-600 cursor-not-allowed'
              }`}
              placeholder='例如: https://imageproxy.example.com/?url='
              value={imageProxyUrl}
              onChange={(e) => handleImageProxyUrlChange(e.target.value)}
              disabled={!enableImageProxy}
            />
          </div>
        </div>

        {/* 底部说明 */}
        <div className='mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
            这些设置保存在本地浏览器中
          </p>
        </div>
      </div>
    </>
  );

  // 视频源管理面板内容
  const videoSourcePanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={handleCloseVideoSource}
      />

      {/* 面板容器 */}
      <div className='fixed inset-x-4 md:left-1/2 md:-translate-x-1/2 top-[10vh] md:w-[700px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-[1001] overflow-hidden select-none flex flex-col'>
        <div className='p-6 overflow-y-auto flex-1'>
          {/* 标题栏 */}
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              视频源管理
            </h3>
            <button
              onClick={handleCloseVideoSource}
              className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              aria-label='Close'
            >
              <X className='w-full h-full' />
            </button>
          </div>

          {/* 添加/编辑/管理按钮区域 */}
          {!editingSource && (
            <div className='space-y-2.5 mb-4'>
              <button
                onClick={handleAddSource}
                className='w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm hover:shadow-md'
              >
                <span className='text-lg'>+</span>
                <span>添加新视频源</span>
              </button>
              <button
                onClick={handleManualSpeedTest}
                disabled={isSpeedTesting}
                className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                  isSpeedTesting
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white hover:shadow-md'
                }`}
              >
                <span className='text-lg'>{isSpeedTesting ? '⏳' : '⚡'}</span>
                <span>{isSpeedTesting ? '测速中...' : '手动优选视频源'}</span>
              </button>
              <button
                onClick={handleEnableAllAvailableSources}
                className='w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md'
              >
                <span className='text-lg'>🚀</span>
                <span>启用所有可用视频源</span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`确定要重置为默认视频源吗?\n\n这将清除所有自定义配置,恢复 ${DEFAULT_VIDEO_SOURCES.length} 个默认视频源。`)) {
                    setVideoSources(DEFAULT_VIDEO_SOURCES);
                    localStorage.setItem('danmutv_video_sources', JSON.stringify(DEFAULT_VIDEO_SOURCES));
                    showToast('已重置为默认视频源', 'success', 3000);
                  }
                }}
                className='w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white shadow-sm hover:shadow-md'
              >
                <span className='text-lg'>🔄</span>
                <span>重置为默认视频源</span>
              </button>
            </div>
          )}

          {/* 添加表单 - 显示在按钮下方、说明上方 */}
          {editingSource && isAddingSource && (
            <div className='mb-4 p-4 border-2 border-green-500 dark:border-green-600 rounded-lg bg-green-50/50 dark:bg-green-900/10'>
              <h4 className='font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                ➕ 添加新视频源
              </h4>
              <div className='space-y-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Key (唯一标识) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    placeholder='例如: kkdy'
                    value={editingSource.key}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, key: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    名称 <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    placeholder='例如: 快看电影'
                    value={editingSource.name}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    API地址 <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    placeholder='例如: https://api.example.com/api.php/provide/vod'
                    value={editingSource.api}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, api: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    详情地址 (可选)
                  </label>
                  <input
                    type='text'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    placeholder='留空则使用API地址'
                    value={editingSource.detail || ''}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, detail: e.target.value })
                    }
                  />
                </div>
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={handleSaveSource}
                    className='flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md transition-colors'
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEditSource}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors'
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 说明文字 */}
          <div className='mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <p className='text-xs text-blue-800 dark:text-blue-300 leading-relaxed'>
              <strong>💡 说明：</strong>视频源配置保存在浏览器本地存储中。Key是视频源的唯一标识,添加后不可修改。API地址需要支持标准的采集接口格式。首次使用已自动加载 {DEFAULT_VIDEO_SOURCES.length} 个默认视频源。
            </p>
            <p className='text-xs text-blue-800 dark:text-blue-300 mt-2 leading-relaxed'>
              <strong>⚙️ 功能说明：</strong>应用启动时会自动测速并保留最快的前20个视频源。点击"⚡ 手动优选视频源"可以立即重新测速。点击"🚀 启用所有可用视频源"可以清除速度限制,使用所有可用的视频源(可能会降低搜索速度)。
            </p>
          </div>

          {/* 视频源列表 */}
          <div className='space-y-3 mb-4'>
            {videoSources.length === 0 ? (
              <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                暂无视频源,点击上方按钮添加
              </div>
            ) : (
              videoSources.map((source) => (
                <React.Fragment key={source.key}>
                  {/* 视频源卡片 */}
                  <div className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='font-semibold text-gray-900 dark:text-gray-100'>
                            {source.name}
                          </span>
                          <span className='text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'>
                            {source.key}
                          </span>
                          {source.disabled && (
                            <span className='text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'>
                              已禁用
                            </span>
                          )}
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                          <span className='font-medium'>API: </span>
                          <span className='break-all'>{source.api}</span>
                        </div>
                        {source.detail && (
                          <div className='text-sm text-gray-600 dark:text-gray-400'>
                            <span className='font-medium'>详情: </span>
                            <span className='break-all'>{source.detail}</span>
                          </div>
                        )}
                      </div>
                      <div className='flex gap-2 ml-4'>
                        <button
                          onClick={() => handleToggleSourceStatus(source.key)}
                          className='px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                        >
                          {source.disabled ? '启用' : '禁用'}
                        </button>
                        <button
                          onClick={() => handleEditSource(source)}
                          className='px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors'
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除视频源"${source.name}"吗?`)) {
                              handleDeleteSource(source.key);
                            }
                          }}
                          className='px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 编辑表单 - 显示在被编辑的视频源下方 */}
                  {editingSource && !isAddingSource && editingSource.key === source.key && (
                    <div className='p-4 border-2 border-blue-500 dark:border-blue-600 rounded-lg bg-blue-50/50 dark:bg-blue-900/10'>
                      <h4 className='font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                        ✏️ 编辑视频源
                      </h4>
                      <div className='space-y-3'>
                        <div>
                          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                            Key (唯一标识) <span className='text-red-500'>*</span>
                          </label>
                          <input
                            type='text'
                            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            placeholder='例如: kkdy'
                            value={editingSource.key}
                            disabled
                          />
                          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Key不可修改</p>
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                            名称 <span className='text-red-500'>*</span>
                          </label>
                          <input
                            type='text'
                            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            placeholder='例如: 快看电影'
                            value={editingSource.name}
                            onChange={(e) =>
                              setEditingSource({ ...editingSource, name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                            API地址 <span className='text-red-500'>*</span>
                          </label>
                          <input
                            type='text'
                            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            placeholder='例如: https://api.example.com/api.php/provide/vod'
                            value={editingSource.api}
                            onChange={(e) =>
                              setEditingSource({ ...editingSource, api: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                            详情地址 (可选)
                          </label>
                          <input
                            type='text'
                            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            placeholder='留空则使用API地址'
                            value={editingSource.detail || ''}
                            onChange={(e) =>
                              setEditingSource({ ...editingSource, detail: e.target.value })
                            }
                          />
                        </div>
                        <div className='flex gap-2 pt-2'>
                          <button
                            onClick={handleSaveSource}
                            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md transition-colors'
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEditSource}
                            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors'
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );

  // 修改密码面板内容
  const changePasswordPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={handleCloseChangePassword}
      />

      {/* 修改密码面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1001] p-6'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
            修改密码
          </h3>
          <button
            onClick={handleCloseChangePassword}
            className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            aria-label='Close'
          >
            <X className='w-full h-full' />
          </button>
        </div>

        {/* 表单 */}
        <div className='space-y-4'>
          {/* 新密码输入 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              新密码
            </label>
            <input
              type='password'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
              placeholder='请输入新密码'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={passwordLoading}
            />
          </div>

          {/* 确认密码输入 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              确认密码
            </label>
            <input
              type='password'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
              placeholder='请再次输入新密码'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={passwordLoading}
            />
          </div>

          {/* 错误信息 */}
          {passwordError && (
            <div className='text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800'>
              {passwordError}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className='flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={handleCloseChangePassword}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors'
            disabled={passwordLoading}
          >
            取消
          </button>
          <button
            onClick={handleSubmitChangePassword}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={passwordLoading || !newPassword || !confirmPassword}
          >
            {passwordLoading ? '修改中...' : '确认修改'}
          </button>
        </div>

        {/* 底部说明 */}
        <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
            修改密码后需要重新登录
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className='relative'>
        <button
          onClick={handleMenuClick}
          className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors'
          aria-label='User Menu'
        >
          <Settings className='w-full h-full' />
        </button>
        {updateStatus === UpdateStatus.HAS_UPDATE && (
          <div className='absolute top-[2px] right-[2px] w-2 h-2 bg-yellow-500 rounded-full'></div>
        )}
      </div>

      {/* 使用 Portal 将菜单面板渲染到 document.body */}
      {isOpen && mounted && createPortal(menuPanel, document.body)}

      {/* 使用 Portal 将设置面板渲染到 document.body */}
      {isSettingsOpen && mounted && createPortal(settingsPanel, document.body)}

      {/* 使用 Portal 将视频源管理面板渲染到 document.body */}
      {isVideoSourceOpen && mounted && createPortal(videoSourcePanel, document.body)}

      {/* 使用 Portal 将修改密码面板渲染到 document.body */}
      {isChangePasswordOpen &&
        mounted &&
        createPortal(changePasswordPanel, document.body)}

      {/* 弹幕下载弹窗（主菜单全局渲染） */}
      {isDanmakuDownloadOpen &&
        mounted &&
        createPortal(
          <div className='fixed inset-0 z-[1100] flex items-center justify-center'>
            <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setIsDanmakuDownloadOpen(false)} />
            <div className='relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-[95vw] max-w-3xl max-h-[85vh] z-[1101] flex flex-col'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200'>弹幕下载</h3>
                <button onClick={() => setIsDanmakuDownloadOpen(false)} className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors' aria-label='Close'>
                  <X className='w-full h-full' />
                </button>
              </div>
              
              <div className='flex-1 overflow-y-auto'>
                <div className='space-y-4'>
                  {/* 输入和解析 */}
                  <div>
                    <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>链接/ID（支持 B站/芒果TV/腾讯/优酷/爱奇艺/巴哈姆特）</label>
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                        placeholder='如 https://www.bilibili.com/video/BV1xx 或 https://www.mgtv.com/...'
                        value={danmakuInput}
                        onChange={e => setDanmakuInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleResolveInput()}
                      />
                      <button
                        onClick={handleResolveInput}
                        className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors whitespace-nowrap disabled:opacity-60'
                        disabled={isResolving || !danmakuInput}
                      >
                        {isResolving ? '解析中...' : '解析'}
                      </button>
                    </div>
                  </div>

                  {/* 集列表 */}
                  {episodes.length > 0 && (
                    <div>
                      <div className='flex items-center justify-between mb-2'>
                        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                          已解析 {episodes.length} 集
                        </label>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => setEpisodes(episodes.map(ep => ({ ...ep, selected: true })))}
                            className='px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                          >
                            全选
                          </button>
                          <button
                            onClick={() => setEpisodes(episodes.map(ep => ({ ...ep, selected: false })))}
                            className='px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'
                          >
                            全不选
                          </button>
                        </div>
                      </div>
                      <div className='border border-gray-300 dark:border-gray-600 rounded-md max-h-64 overflow-y-auto'>
                        {episodes.map((ep, index) => {
                          // 计算是否在拖动范围内(用于预览)
                          const isInDragRange = isDragging && 
                            dragStartIndex !== null && 
                            dragEndIndex !== null &&
                            index >= Math.min(dragStartIndex, dragEndIndex) &&
                            index <= Math.max(dragStartIndex, dragEndIndex);
                          
                          // 确定显示状态：拖动时显示预览状态，否则显示实际状态
                          const displaySelected = isInDragRange ? dragInitialState : ep.selected;
                          
                          return (
                            <div
                              key={index}
                              className={`flex items-center px-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors ${
                                displaySelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              } ${isInDragRange ? 'ring-2 ring-blue-300 dark:ring-blue-700 ring-inset' : ''}`}
                              onClick={(e) => handleEpisodeClick(index, e)}
                              onMouseDown={(e) => handleMouseDown(index, e)}
                              onMouseEnter={() => handleMouseEnter(index)}
                              onMouseUp={handleMouseUp}
                              style={{ userSelect: 'none' }}
                            >
                              <input
                                type='checkbox'
                                checked={displaySelected || false}
                                onChange={() => {}}
                                className='mr-2 pointer-events-none'
                              />
                              <div className='flex-1 text-sm text-gray-900 dark:text-gray-100'>
                                {ep.title}
                              </div>
                              <div className='text-xs text-gray-500 dark:text-gray-400 mr-2'>
                                CID: {ep.cid}
                              </div>
                              {ep.section && (
                                <div className='text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded'>
                                  {ep.section}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 剧名（可选） */}
                  <div>
                    <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                      自定义文件夹名（可选）
                    </label>
                    <input
                      type='text'
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                      placeholder={`留空则使用：${baseTitle || '默认名称'}`}
                      value={showNameInput}
                      onChange={e => setShowNameInput(e.target.value)}
                    />
                  </div>

                  {/* 保存目录 */}
                  <div>
                    <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>保存目录</label>
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                        placeholder='保存路径'
                        value={danmakuSavePath}
                        onChange={e => setDanmakuSavePath(e.target.value)}
                      />
                      <button
                        onClick={handleSelectDirectory}
                        className='px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors whitespace-nowrap'
                      >
                        浏览...
                      </button>
                    </div>
                  </div>

                  {/* 格式和时长 */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>弹幕格式</label>
                      <select
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                        value={danmakuFormat}
                        onChange={e => setDanmakuFormat(e.target.value)}
                      >
                        <option value='xml'>XML (原始弹幕)</option>
                        <option value='srt'>SRT (字幕格式)</option>
                        <option value='ass'>ASS (特效字幕)</option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300'>
                        显示时长(秒) {danmakuFormat === 'xml' && <span className='text-xs text-gray-400'>(仅SRT/ASS有效)</span>}
                      </label>
                      <input
                        type='number'
                        min='1'
                        max='60'
                        step='0.5'
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                        value={danmakuDuration}
                        onChange={e => setDanmakuDuration(e.target.value)}
                        disabled={danmakuFormat === 'xml'}
                      />
                    </div>
                  </div>

                  {/* 错误提示 */}
                  {danmakuError && (
                    <div className='text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800'>
                      {danmakuError}
                    </div>
                  )}

                  {/* 下载按钮 */}
                  <button
                    className='w-full py-2 px-4 rounded bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors shadow flex items-center justify-center disabled:opacity-60'
                    onClick={handleDanmakuDownload}
                    disabled={episodes.length === 0 || !episodes.some(ep => ep.selected) || danmakuLoading}
                  >
                    {danmakuLoading ? '下载中...' : `下载弹幕 (已选 ${episodes.filter(ep => ep.selected).length} 集)`}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
