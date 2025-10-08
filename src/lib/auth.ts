// 简化的认证接口 - 用于 DanmuTV 桌面应用(无需认证)

export interface AuthInfo {
  username: string;
  role?: 'owner' | 'admin' | 'user';
}

export function getAuthInfoFromBrowserCookie(): AuthInfo | null {
  // 桌面应用不需要用户认证,返回默认用户
  return {
    username: 'default_user',
    role: 'owner',
  };
}

export default {
  getAuthInfoFromBrowserCookie,
};
