// 简化的存储接口 - 用于 DanmuTV 桌面应用(仅客户端存储)

export async function getStorage() {
  // 桌面应用使用 localStorage,不需要服务器端存储
  return {
    get: async (key: string) => {
      if (typeof window === 'undefined') return null;
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    },
    set: async (key: string, value: any) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    },
    delete: async (key: string) => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    },
  };
}

export default {
  getStorage,
};
