'use client';

import { useEffect, useRef } from 'react';
import { showToast } from './GlobalToast';

// 全局标记，防止多个组件实例同时执行测速
let isSpeedTestRunning = false;

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      mode: 'cors', // 明确指定 CORS 模式
      credentials: 'omit', // 不发送凭证
    });
    
    const endTime = performance.now();
    clearTimeout(timeoutId);
    
    const responseTime = Math.round(endTime - startTime);
    
    // 检查响应是否成功
    if (!response.ok) {
      console.warn(`[${source.name}] HTTP ${response.status}: ${response.statusText}`);
      return {
        key: source.key,
        name: source.name,
        responseTime: -1,
        isAvailable: false,
      };
    }
    
    return {
      key: source.key,
      name: source.name,
      responseTime: responseTime,
      isAvailable: true,
    };
  } catch (error) {
    // 详细的错误日志
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('aborted')) {
      console.warn(`[${source.name}] 超时 (>8s)`);
    } else if (errorMsg.includes('Failed to fetch')) {
      console.warn(`[${source.name}] 网络错误或CORS限制`);
    } else {
      console.warn(`[${source.name}] 错误: ${errorMsg}`);
    }
    
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
 * 导出此函数以便手动调用
 */
export async function speedTestAllSources(): Promise<void> {
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
    
    // 显示 Toast 通知
    const toastMessage = `当前可用视频源 ${availableSources.length} 个，已启用速度最快的前 ${fastestSources.length} 个。如需启用所有可用视频源，请在设置→管理视频源中启用`;
    
    showToast(toastMessage, 'success', 8000); // 显示8秒
    
  } catch (error) {
    console.error('视频源测速失败:', error);
  }
}

/**
 * 视频源测速组件
 * 在应用启动时自动对所有视频源进行测速,保留最快的前20个
 */
export default function SourceAvailabilityChecker() {
  const hasRunRef = useRef(false);
  
  useEffect(() => {
    const SPEED_TEST_KEY = 'source_speed_test_timestamp';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时有效期
    
    const performSpeedTest = async () => {
      // 防止重复执行（组件级别）
      if (hasRunRef.current) {
        console.log('[SourceAvailabilityChecker] 本组件已执行过，跳过');
        return;
      }
      
      // 防止并发执行（全局级别）
      if (isSpeedTestRunning) {
        console.log('[SourceAvailabilityChecker] 测速正在进行中，跳过');
        return;
      }
      
      if (typeof window !== 'undefined') {
        try {
          const lastTestTime = localStorage.getItem(SPEED_TEST_KEY);
          if (lastTestTime) {
            const timeSinceLastTest = Date.now() - Number(lastTestTime);
            if (timeSinceLastTest < CACHE_DURATION) {
              console.log('[SourceAvailabilityChecker] 测速结果仍在有效期内，跳过（剩余', 
                Math.round((CACHE_DURATION - timeSinceLastTest) / 1000 / 60), '分钟）');
              hasRunRef.current = true;
              return;
            }
          }
        } catch (e) {
          console.warn('[SourceAvailabilityChecker] 读取测速缓存失败', e);
        }
      }
      
      // 标记为已执行
      hasRunRef.current = true;
      isSpeedTestRunning = true;
      
      try {
        await speedTestAllSources();
        
        // 保存测速完成时间
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SPEED_TEST_KEY, String(Date.now()));
          } catch (e) {
            console.warn('[SourceAvailabilityChecker] 保存测速时间失败', e);
          }
        }
      } finally {
        // 无论成功失败都要解除锁定
        isSpeedTestRunning = false;
      }
    };
    
    performSpeedTest();
  }, []); // 空依赖数组，只在挂载时执行一次

  // 这个组件不渲染任何内容
  return null;
}
