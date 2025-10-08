/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

export const API_CONFIG = {
  search: {
    path: '?ac=videolist&wd=',
    pagePath: '?ac=videolist&wd={query}&pg={page}',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
  },
  detail: {
    path: '?ac=videolist&ids=',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
  },
};

export async function getAvailableApiSites(): Promise<ApiSite[]> {
  if (typeof window !== 'undefined') {
    const sources = localStorage.getItem('danmutv_video_sources');
    if (sources) {
      try {
        return JSON.parse(sources);
      } catch (e) {
        console.error('解析视频源失败:', e);
      }
    }
  }
  return [];
}

export function getCacheTime(): number {
  return 7200;
}

export async function getConfig(): Promise<any> {
  return {
    SiteConfig: {
      SiteName: 'DanmuTV',
      SearchDownstreamMaxPage: 5,
      ImageProxy: '',
      DoubanProxy: '',
    },
    SourceConfig: await getAvailableApiSites(),
  };
}