// 简化的 AdminConfig 类型定义 - 用于 DanmuTV 桌面应用

export interface AdminConfig {
  SiteConfig: {
    SiteName: string;
    Announcement: string;
    ImageProxy: string;
    DoubanProxy: string;
    DisableYellowFilter: boolean;
  };
  SourceConfig: Array<{
    key: string;
    name: string;
    api: string;
    detail: string;
    disabled?: boolean;
    from?: string;
  }>;
  CustomCategories: Array<{
    name: string;
    type: 'movie' | 'tv';
    query: string;
    disabled?: boolean;
    from?: string;
  }>;
  UserConfig: {
    AllowRegister: boolean;
    Users: Array<{
      username: string;
      password: string;
      role: string;
    }>;
  };
}
