/* eslint-disable no-console */

'use client';

const CURRENT_VERSION = '20251008155053';

// 版本检查结果枚举
export enum UpdateStatus {
  HAS_UPDATE = 'has_update', // 有新版本
  NO_UPDATE = 'no_update', // 无新版本
  FETCH_FAILED = 'fetch_failed', // 获取失败
}

// 版本检查已禁用 - 个人站点

/**
 * 检查是否有新版本可用
 * @returns Promise<UpdateStatus> - 返回版本检查状态
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  // 个人站点禁用版本检查
  return UpdateStatus.NO_UPDATE;
}

// 版本检查相关函数已移除 - 个人站点无需远程版本检查

// 导出当前版本号供其他地方使用
export { CURRENT_VERSION };
