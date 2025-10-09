/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

'use client';

import { Database, Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { DEFAULT_VIDEO_SOURCES } from '@/lib/default-video-sources';
import { checkForUpdates, CURRENT_VERSION, UpdateStatus } from '@/lib/version';
import { showToast } from './GlobalToast';

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

  // 菜单面板内容
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

          {/* 视频源列表 */}
          <div className='space-y-3 mb-4'>
            {videoSources.length === 0 ? (
              <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                暂无视频源,点击下方按钮添加
              </div>
            ) : (
              videoSources.map((source) => (
                <div
                  key={source.key}
                  className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
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
              ))
            )}
          </div>

          {/* 编辑/添加表单 */}
          {editingSource && (
            <div className='mt-6 p-4 border-2 border-green-500 dark:border-green-600 rounded-lg bg-green-50/50 dark:bg-green-900/10'>
              <h4 className='font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                {isAddingSource ? '添加新视频源' : '编辑视频源'}
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
                    disabled={!isAddingSource}
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

          {/* 添加按钮 */}
          {!editingSource && (
            <div className='space-y-2'>
              <button
                onClick={handleAddSource}
                className='w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md transition-colors'
              >
                + 添加新视频源
              </button>
              <button
                onClick={handleEnableAllAvailableSources}
                className='w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md transition-colors'
              >
                🚀 启用所有可用视频源
              </button>
              <button
                onClick={() => {
                  if (confirm(`确定要重置为默认视频源吗?\n\n这将清除所有自定义配置,恢复 ${DEFAULT_VIDEO_SOURCES.length} 个默认视频源。`)) {
                    setVideoSources(DEFAULT_VIDEO_SOURCES);
                    localStorage.setItem('danmutv_video_sources', JSON.stringify(DEFAULT_VIDEO_SOURCES));
                    alert('已重置为默认视频源');
                  }
                }}
                className='w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors'
              >
                🔄 重置为默认视频源
              </button>
            </div>
          )}

          {/* 说明文字 */}
          <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md'>
            <p className='text-xs text-blue-800 dark:text-blue-300'>
              <strong>说明:</strong> 视频源配置保存在浏览器本地存储中。Key是视频源的唯一标识,添加后不可修改。API地址需要支持标准的采集接口格式。首次使用已自动加载 {DEFAULT_VIDEO_SOURCES.length} 个默认视频源。
            </p>
            <p className='text-xs text-blue-800 dark:text-blue-300 mt-2'>
              <strong>提示:</strong> 应用启动时会自动测速并保留最快的前20个视频源。点击"启用所有可用视频源"可以清除速度限制,使用所有可用的视频源(可能会降低搜索速度)。
            </p>
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
    </>
  );
};
