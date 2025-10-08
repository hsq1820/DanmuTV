// 简化的运行时配置 - 用于 DanmuTV 桌面应用

const runtimeConfig = {
  custom_category: [] as Array<{
    name?: string;
    type: 'movie' | 'tv';
    query: string;
  }>,
};

export default runtimeConfig;
