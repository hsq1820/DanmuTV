'use client';

import { useEffect } from 'react';

interface VideoSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
  disabled?: boolean;
}

interface SourceSpeedResult {
  key: string;
  name: string;
  responseTime: number; // 响应时间(毫秒), -1 表示失败
  isAvailable: boolean;
}

/**
 * 测试单个视频源的响应速度
 */
async function testSourceSpeed(source: VideoSource): Promise<SourceSpeedResult> {
  try {
    const testUrl = `${source.api}?ac=videolist&pg=1&t=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
    
    const startTime = performance.now();
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    
    const endTime = performance.now();
    clearTimeout(timeoutId);
    
    const responseTime = Math.round(endTime - startTime);
    
    return {
      key: source.key,
      name: source.name,
      responseTime: response.ok ? responseTime : -1,
      isAvailable: response.ok,
    };
  } catch (error) {
    // 请求失败或超时
    return {
      key: source.key,
      name: source.name,
      responseTime: -1,
      isAvailable: false,
    };
  }
}

/**
 * 测试所有视频源的速度并保留最快的前20个
 */
async function speedTestAllSources(): Promise<void> {
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

  // 只测试未被用户手动禁用的视频源
  const testSources = sources.filter(s => !s.disabled);
  
  if (testSources.length === 0) {
    console.warn('没有可测试的视频源');
    return;
  }

  console.log(`� 开始对 ${testSources.length} 个视频源进行测速...`);
  const startTime = Date.now();

  // 并发测试所有视频源
  const speedTestPromises = testSources.map(source => testSourceSpeed(source));

  try {
    const results = await Promise.all(speedTestPromises);
    
    // 过滤出可用的视频源
    const availableSources = results.filter(r => r.isAvailable);
    const unavailableSources = results.filter(r => !r.isAvailable);
    
    if (availableSources.length === 0) {
      console.error('❌ 所有视频源均不可用!');
      localStorage.removeItem('danmutv_blocked_sources');
      return;
    }
    
    // 按响应时间排序(从快到慢)
    availableSources.sort((a, b) => a.responseTime - b.responseTime);
    
    // 保留最快的前20个
    const topCount = Math.min(20, availableSources.length);
    const fastestSources = availableSources.slice(0, topCount);
    const slowSources = availableSources.slice(topCount);
    
    // 将速度慢的源和不可用的源加入屏蔽列表
    const blockedSourceKeys = [
      ...slowSources.map(s => s.key),
      ...unavailableSources.map(s => s.key)
    ];
    
    // 保存屏蔽列表
    if (blockedSourceKeys.length > 0) {
      localStorage.setItem('danmutv_blocked_sources', JSON.stringify(blockedSourceKeys));
    } else {
      localStorage.removeItem('danmutv_blocked_sources');
    }
    
    // 输出测速结果
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ 视频源测速完成 (耗时 ${totalTime}s):`);
    console.log(`   📊 总计: ${testSources.length} 个`);
    console.log(`   ✓ 可用: ${availableSources.length} 个`);
    console.log(`   ✗ 不可用: ${unavailableSources.length} 个`);
    console.log(`   🚀 已启用: ${fastestSources.length} 个 (最快的前${topCount}个)`);
    console.log(`   🔒 已屏蔽: ${blockedSourceKeys.length} 个 (速度慢或不可用)\n`);
    
    // 输出最快的前10个源的详细信息
    console.log('🏆 速度最快的视频源 TOP 10:');
    fastestSources.slice(0, 10).forEach((source, index) => {
      console.log(`   ${index + 1}. [${source.name}] ${source.responseTime}ms`);
    });
    
    // 输出不可用的源(如果有)
    if (unavailableSources.length > 0) {
      console.log(`\n⚠️ 不可用的视频源 (${unavailableSources.length}个):`);
      unavailableSources.forEach(source => {
        console.log(`   ❌ [${source.name}] (${source.key})`);
      });
    }
    
  } catch (error) {
    console.error('视频源测速失败:', error);
  }
}

/**
 * 视频源测速组件
 * 在应用启动时自动对所有视频源进行测速,保留最快的前20个
 */
export default function SourceAvailabilityChecker() {
  useEffect(() => {
    // 在组件挂载时执行一次测速
    const performSpeedTest = async () => {
      await speedTestAllSources();
    };
    
    performSpeedTest();
  }, []); // 空依赖数组，只在挂载时执行一次

  // 这个组件不渲染任何内容
  return null;
}
