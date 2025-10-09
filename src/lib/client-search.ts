// 客户端搜索工具 - 直接从 localStorage 读取视频源配置进行搜索

import { SearchResult } from './types';

interface VideoSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
  disabled?: boolean;
}

/**
 * 从单个视频源搜索
 */
async function searchFromSource(
  source: VideoSource,
  query: string
): Promise<SearchResult[]> {
  try {
    const searchUrl = `${source.api}?ac=videolist&wd=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`搜索失败 [${source.name}]:`, response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.list || !Array.isArray(data.list)) {
      return [];
    }

    // 转换为统一格式
    return data.list.map((item: any) => {
      // 解析播放地址为episodes数组
      const episodes: string[] = [];
      if (item.vod_play_url) {
        const playUrls = item.vod_play_url.split('$$$')[0]; // 取第一个播放源
        const episodeList = playUrls.split('#').filter((ep: string) => ep.trim());
        episodes.push(...episodeList.map((ep: string) => ep.split('$')[1] || ep));
      }
      
      return {
        id: String(item.vod_id),
        title: item.vod_name,
        poster: item.vod_pic || '',
        episodes: episodes,
        source: source.key,
        source_name: source.name,
        year: String(item.vod_year || 'unknown'),
        type_name: item.type_name || item.vod_class || '',
        desc: item.vod_content || '',
      } as SearchResult;
    });
  } catch (error) {
    console.error(`搜索错误 [${source.name}]:`, error);
    return [];
  }
}

/**
 * 从所有启用的视频源搜索
 */
export async function searchFromAllSources(query: string): Promise<SearchResult[]> {
  if (!query || typeof window === 'undefined') {
    return [];
  }

  // 从 localStorage 读取视频源配置
  const savedSources = localStorage.getItem('danmutv_video_sources');
  
  if (!savedSources) {
    console.warn('未找到视频源配置');
    return [];
  }

  let sources: VideoSource[];
  try {
    sources = JSON.parse(savedSources);
  } catch (e) {
    console.error('解析视频源配置失败:', e);
    return [];
  }

  // 获取被临时屏蔽的视频源列表
  const blockedSourcesStr = localStorage.getItem('danmutv_blocked_sources');
  let blockedSources: string[] = [];
  if (blockedSourcesStr) {
    try {
      blockedSources = JSON.parse(blockedSourcesStr);
    } catch (e) {
      console.error('解析屏蔽源列表失败:', e);
    }
  }

  // 只使用启用且未被屏蔽的视频源
  const enabledSources = sources.filter(s => !s.disabled && !blockedSources.includes(s.key));
  
  if (enabledSources.length === 0) {
    console.warn('没有可用的视频源');
    return [];
  }

  console.log(`正在从 ${enabledSources.length} 个视频源搜索: "${query}"`);

  // 并发搜索所有视频源
  const searchPromises = enabledSources.map(source => 
    searchFromSource(source, query)
  );

  try {
    const results = await Promise.all(searchPromises);
    const flattenedResults = results.flat();
    
    console.log(`搜索完成,找到 ${flattenedResults.length} 个结果`);
    
    return flattenedResults;
  } catch (error) {
    console.error('搜索失败:', error);
    return [];
  }
}

/**
 * 获取视频详情
 */
export async function getVideoDetail(
  sourceKey: string,
  videoId: string | number
): Promise<any> {
  if (typeof window === 'undefined') {
    return null;
  }

  // 从 localStorage 读取视频源配置
  const savedSources = localStorage.getItem('danmutv_video_sources');
  
  if (!savedSources) {
    console.warn('未找到视频源配置');
    return null;
  }

  let sources: VideoSource[];
  try {
    sources = JSON.parse(savedSources);
  } catch (e) {
    console.error('解析视频源配置失败:', e);
    return null;
  }

  // 检查该视频源是否被临时屏蔽
  const blockedSourcesStr = localStorage.getItem('danmutv_blocked_sources');
  if (blockedSourcesStr) {
    try {
      const blockedSources: string[] = JSON.parse(blockedSourcesStr);
      if (blockedSources.includes(sourceKey)) {
        console.warn(`视频源 ${sourceKey} 已被临时屏蔽，跳过获取详情`);
        return null;
      }
    } catch (e) {
      console.error('解析屏蔽源列表失败:', e);
    }
  }

  // 找到对应的视频源
  const source = sources.find(s => s.key === sourceKey);
  
  if (!source) {
    console.warn(`未找到视频源: ${sourceKey}`);
    return null;
  }

  try {
    const detailUrl = source.detail || source.api;
    const url = `${detailUrl}?ac=videolist&ids=${videoId}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`获取详情失败 [${source.name}]:`, response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.list || !Array.isArray(data.list) || data.list.length === 0) {
      return null;
    }

    return data.list[0];
  } catch (error) {
    console.error(`获取详情错误 [${source.name}]:`, error);
    return null;
  }
}
