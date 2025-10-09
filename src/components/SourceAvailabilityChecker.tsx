'use client';

import { useEffect } from 'react';

interface VideoSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
  disabled?: boolean;
}

/**
 * 检查单个视频源的有效性
 */
async function checkSourceAvailability(source: VideoSource): Promise<boolean> {
  try {
    // 使用一个简单的请求来测试视频源的可用性
    const testUrl = `${source.api}?ac=videolist&pg=1&t=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 只要能返回响应就认为源可用
    return response.ok;
  } catch (error) {
    // 静默失败,不打印过多日志
    return false;
  }
}

/**
 * 检查所有视频源的有效性并将不可用的源保存到 localStorage
 */
async function checkAllSourcesAvailability(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  // 从 localStorage 读取视频源配置
  const savedSources = localStorage.getItem('danmutv_video_sources');
  
  if (!savedSources) {
    console.warn('未找到视频源配置');
    return;
  }

  let sources: VideoSource[];
  try {
    sources = JSON.parse(savedSources);
  } catch (e) {
    console.error('解析视频源配置失败:', e);
    return;
  }

  // 只检查启用的视频源
  const enabledSources = sources.filter(s => !s.disabled);
  
  if (enabledSources.length === 0) {
    return;
  }

  console.log(`🔍 开始检查 ${enabledSources.length} 个视频源的有效性...`);

  // 并发检查所有视频源
  const checkPromises = enabledSources.map(async (source) => {
    const isAvailable = await checkSourceAvailability(source);
    return { key: source.key, name: source.name, isAvailable };
  });

  try {
    const results = await Promise.all(checkPromises);
    
    const blockedSourceKeys: string[] = [];
    let availableCount = 0;
    
    results.forEach(({ key, name, isAvailable }) => {
      if (!isAvailable) {
        blockedSourceKeys.push(key);
        console.warn(`❌ 视频源 [${name}] (${key}) 无法访问，已临时屏蔽`);
      } else {
        availableCount++;
      }
    });
    
    // 将不可用的源保存到 localStorage，仅对本次会话有效
    if (blockedSourceKeys.length > 0) {
      localStorage.setItem('danmutv_blocked_sources', JSON.stringify(blockedSourceKeys));
      console.log(`✅ 视频源检查完成: ${availableCount} 个可用, ${blockedSourceKeys.length} 个不可用（已临时屏蔽）`);
    } else {
      // 清除之前的屏蔽记录
      localStorage.removeItem('danmutv_blocked_sources');
      console.log(`✅ 视频源检查完成: 所有 ${availableCount} 个视频源均可用`);
    }
  } catch (error) {
    console.error('检查视频源有效性失败:', error);
  }
}

/**
 * 视频源有效性检查组件
 * 在应用启动时自动检查所有视频源的可用性
 */
export default function SourceAvailabilityChecker() {
  useEffect(() => {
    // 在组件挂载时执行一次检查
    const checkSources = async () => {
      await checkAllSourcesAvailability();
    };
    
    checkSources();
  }, []); // 空依赖数组，只在挂载时执行一次

  // 这个组件不渲染任何内容
  return null;
}
