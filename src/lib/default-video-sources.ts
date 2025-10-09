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
    key: 'heimuer2',
    name: '黑木耳点播',
    api: 'https://json02.heimuer.xyz/api.php/provide/vod',
    detail: 'https://json02.heimuer.xyz',
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
    key: 'ffzynew',
    name: '非凡资源',
    api: 'https://cj.ffzyapi.com/api.php/provide/vod',
    detail: 'https://cj.ffzyapi.com',
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
    key: 'wolong2',
    name: '卧龙点播',
    api: 'https://collect.wolongzyw.com/api.php/provide/vod',
    detail: 'https://collect.wolongzyw.com',
    disabled: false,
  },
  {
    key: 'wolong3',
    name: '卧龙资源2',
    api: 'https://collect.wolongzy.cc/api.php/provide/vod',
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
    key: 'dbzy2',
    name: '豆瓣资源2',
    api: 'https://caiji.dbzy.tv/api.php/provide/vod',
    detail: 'https://caiji.dbzy.tv',
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
    key: 'mdzy2',
    name: '魔都动漫',
    api: 'https://caiji.moduapi.cc/api.php/provide/vod',
    detail: 'https://caiji.moduapi.cc',
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
    key: 'zuiddb',
    name: '最大点播',
    api: 'http://zuidazy.me/api.php/provide/vod',
    detail: 'http://zuidazy.me',
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
    key: 'wujin2',
    name: '无尽资源2',
    api: 'https://api.wujinapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'wujin3',
    name: '无尽资源3',
    api: 'https://api.wujinapi.net/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'wujin4',
    name: '无尽资源4',
    api: 'https://api.wujinapi.cc/api.php/provide/vod',
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
    key: 'wwzy2',
    name: '旺旺资源',
    api: 'https://api.wwzy.tv/api.php/provide/vod',
    detail: 'https://api.wwzy.tv',
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
  {
    key: '1080zy',
    name: '1080资源',
    api: 'https://api.1080zyku.com/inc/api_mac10.php',
    detail: 'https://api.1080zyku.com',
    disabled: false,
  },
  {
    key: 'ckzy',
    name: 'CK资源',
    api: 'https://ckzy.me/api.php/provide/vod',
    detail: 'https://ckzy.me',
    disabled: false,
  },
  {
    key: 'ukuapi',
    name: 'U酷资源',
    api: 'https://api.ukuapi.com/api.php/provide/vod',
    detail: 'https://api.ukuapi.com',
    disabled: false,
  },
  {
    key: 'ukuapi88',
    name: 'U酷资源88',
    api: 'https://api.ukuapi88.com/api.php/provide/vod',
    detail: 'https://api.ukuapi88.com',
    disabled: false,
  },
  {
    key: 'yayazy',
    name: '丫丫点播',
    api: 'https://cj.yayazy.net/api.php/provide/vod',
    detail: 'https://cj.yayazy.net',
    disabled: false,
  },
  {
    key: 'guangsu',
    name: '光速资源',
    api: 'https://api.guangsuapi.com/api.php/provide/vod',
    detail: 'https://api.guangsuapi.com',
    disabled: false,
  },
  {
    key: 'xinlang',
    name: '新浪点播',
    api: 'https://api.xinlangapi.com/xinlangapi.php/provide/vod',
    detail: 'https://api.xinlangapi.com',
    disabled: false,
  },
  {
    key: 'niuniu',
    name: '牛牛点播',
    api: 'https://api.niuniuzy.me/api.php/provide/vod',
    detail: 'https://api.niuniuzy.me',
    disabled: false,
  },
  {
    key: 'baiduyun',
    name: '百度云资源',
    api: 'https://api.apibdzy.com/api.php/provide/vod',
    detail: 'https://api.apibdzy.com',
    disabled: false,
  },
  {
    key: 'suoni',
    name: '索尼资源',
    api: 'https://suoniapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'hongniu',
    name: '红牛资源',
    api: 'https://www.hongniuzy2.com/api.php/provide/vod',
    detail: 'https://www.hongniuzy2.com',
    disabled: false,
  },
  {
    key: 'hongniu3',
    name: '红牛资源3',
    api: 'https://www.hongniuzy3.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'huya',
    name: '虎牙资源',
    api: 'https://www.huyaapi.com/api.php/provide/vod',
    detail: 'https://www.huyaapi.com',
    disabled: false,
  },
  {
    key: 'haohua',
    name: '豪华资源',
    api: 'https://hhzyapi.com/api.php/provide/vod',
    detail: 'https://hhzyapi.com',
    disabled: false,
  },
  {
    key: 'subo',
    name: '速博资源',
    api: 'https://subocaiji.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'jinying',
    name: '金鹰点播',
    api: 'https://jinyingzy.com/api.php/provide/vod',
    detail: 'https://jinyingzy.com',
    disabled: false,
  },
  {
    key: 'jinyingzy',
    name: '金鹰资源',
    api: 'https://jyzyapi.com/api.php/provide/vod',
    detail: 'https://jyzyapi.com',
    disabled: false,
  },
  {
    key: 'shandian',
    name: '閃電资源',
    api: 'https://sdzyapi.com/api.php/provide/vod',
    detail: 'https://sdzyapi.com',
    disabled: false,
  },
  {
    key: 'piaoling',
    name: '飘零资源',
    api: 'https://p2100.net/api.php/provide/vod',
    detail: 'https://p2100.net',
    disabled: false,
  },
  {
    key: 'iqiyi',
    name: 'iqiyi资源',
    api: 'https://www.iqiyizyapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'fengchao',
    name: '蜂巢片库',
    api: 'https://api.fczy888.me/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'dadi',
    name: '大地资源',
    api: 'https://dadiapi.com/api.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'kuaiche',
    name: '快车资源',
    api: 'https://caiji.kuaichezy.org/api.php/provide',
    detail: '',
    disabled: false,
  },
  {
    key: 'youzhizy',
    name: '优质资源',
    api: 'https://api.yzzy-api.com/inc/ldg_api_all.php/provide/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'fantuan',
    name: '饭团影视',
    api: 'https://www.fantuan.tv/api.php/provide/vod/',
    detail: '',
    disabled: false,
  },
  {
    key: 'taopian',
    name: '淘片资源',
    api: 'https://taopianapi.com/cjapi/sda/vod',
    detail: '',
    disabled: false,
  },
  {
    key: 'huawei8',
    name: '华为吧资源',
    api: 'https://huawei8.live/api.php/provide/vod',
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
