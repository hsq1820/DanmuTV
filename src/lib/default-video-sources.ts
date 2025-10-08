// 默认视频源配置 - 从原项目 config.json 导入

export interface VideoSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
  disabled?: boolean;
}

export const DEFAULT_VIDEO_SOURCES: VideoSource[] = [
  {
    key: 'dyttzy',
    name: '电影天堂资源',
    api: 'http://caiji.dyttzyapi.com/api.php/provide/vod',
    detail: 'http://caiji.dyttzyapi.com',
    disabled: false,
  },
  {
    key: 'heimuer',
    name: '黑木耳',
    api: 'https://json.heimuer.xyz/api.php/provide/vod',
    detail: 'https://heimuer.tv',
    disabled: false,
  },
  {
    key: 'ruyi',
    name: '如意资源',
    api: 'http://cj.rycjapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'bfzy',
    name: '暴风资源',
    api: 'https://bfzyapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'tyyszy',
    name: '天涯资源',
    api: 'https://tyyszy.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'ffzy',
    name: '非凡影视',
    api: 'http://ffzy5.tv/api.php/provide/vod',
    detail: 'http://ffzy5.tv',
    disabled: false,
  },
  {
    key: 'zy360',
    name: '360资源',
    api: 'https://360zy.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'maotaizy',
    name: '茅台资源',
    api: 'https://caiji.maotaizy.cc/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'wolong',
    name: '卧龙资源',
    api: 'https://wolongzyw.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'jisu',
    name: '极速资源',
    api: 'https://jszyapi.com/api.php/provide/vod',
    detail: 'https://jszyapi.com',
    disabled: false,
  },
  {
    key: 'dbzy',
    name: '豆瓣资源',
    api: 'https://dbzy.tv/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'mozhua',
    name: '魔爪资源',
    api: 'https://mozhuazy.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'mdzy',
    name: '魔都资源',
    api: 'https://www.mdzyapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'zuid',
    name: '最大资源',
    api: 'https://api.zuidapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'yinghua',
    name: '樱花资源',
    api: 'https://m3u8.apiyhzy.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'wujin',
    name: '无尽资源',
    api: 'https://api.wujinapi.me/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'wwzy',
    name: '旺旺短剧',
    api: 'https://wwzy.tv/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'ikun',
    name: 'iKun资源',
    api: 'https://ikunzyapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'lzi',
    name: '量子资源站',
    api: 'https://cj.lziapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'xiaomaomi',
    name: '小猫咪资源',
    api: 'https://zy.xmm.hk/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
];

/**
 * 初始化默认视频源到 localStorage
 * 仅在首次使用或没有配置时调用
 */
export function initializeDefaultVideoSources(): void {
  if (typeof window === 'undefined') return;

  const existingSources = localStorage.getItem('danmutv_video_sources');
  
  // 如果已经有配置,不覆盖
  if (existingSources) {
    console.log('视频源配置已存在,跳过初始化');
    return;
  }

  // 保存默认视频源
  localStorage.setItem(
    'danmutv_video_sources',
    JSON.stringify(DEFAULT_VIDEO_SOURCES)
  );
  
  console.log(`已初始化 ${DEFAULT_VIDEO_SOURCES.length} 个默认视频源`);
}

/**
 * 获取视频源配置
 * 如果没有配置,返回默认视频源
 */
export function getVideoSources(): VideoSource[] {
  if (typeof window === 'undefined') return DEFAULT_VIDEO_SOURCES;

  const saved = localStorage.getItem('danmutv_video_sources');
  
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('解析视频源配置失败:', e);
      return DEFAULT_VIDEO_SOURCES;
    }
  }

  return DEFAULT_VIDEO_SOURCES;
}

/**
 * 重置为默认视频源
 */
export function resetToDefaultVideoSources(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(
    'danmutv_video_sources',
    JSON.stringify(DEFAULT_VIDEO_SOURCES)
  );
  
  console.log('已重置为默认视频源');
}
