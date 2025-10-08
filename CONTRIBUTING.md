# 贡献指南

感谢你考虑为 DanmuTV 做出贡献!

## 项目起源

DanmuTV 基于 [MoonTV](https://github.com/MoonTechLab/LunaTV) 项目二次开发。

**主要改动**:
- 添加完整的弹幕系统支持
- 移除云端存储，改用本地 localStorage
- 移除下载功能和用户系统
- 优化 Electron 打包体积
- 改进用户交互体验

## 开发环境

### 必需工具
- Node.js >= 18
- pnpm >= 8

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm dev
```

## 项目结构

```
DanmuTV/
├── electron/              # Electron 主进程
│   └── main.js           # 应用启动、窗口管理
├── src/
│   ├── app/              # Next.js 应用路由
│   │   ├── page.tsx      # 首页
│   │   ├── search/       # 搜索页
│   │   ├── douban/       # 豆瓣推荐
│   │   └── play/         # 播放页（核心功能）
│   ├── components/       # React 组件
│   │   ├── UserMenu.tsx  # 视频源管理
│   │   └── ...
│   └── lib/              # 工具库
│       ├── db.client.ts  # 本地存储封装
│       ├── client-search.ts # 客户端搜索
│       └── default-video-sources.ts # 默认视频源
└── public/               # 静态资源
```

## 核心功能说明

### 弹幕系统
- 位置: `src/app/play/page.tsx`
- 插件: `artplayer-plugin-danmuku`
- 支持格式: Bilibili XML
- 关键函数:
  - `loadDanmakuFromBilibili()` - 从 B站加载弹幕
  - `buildDanmakuFilter()` - 构建弹幕过滤器
  - `reloadDanmakuWithFilter()` - 应用过滤重载弹幕

### 本地存储
- 位置: `src/lib/db.client.ts`
- 存储方式: `localStorage`
- 数据类型:
  - `danmutv_play_records` - 播放记录
  - `danmutv_favorites` - 收藏列表
  - `danmutv_search_history` - 搜索历史
  - `danmaku_keywords` - 关键词屏蔽
  - `danmaku_limit_per_sec` - 密度限制

### 视频源管理
- 位置: `src/components/UserMenu.tsx`
- 默认源: `src/lib/default-video-sources.ts`
- 用户可添加、编辑、删除视频源

## 代码规范

### TypeScript
- 使用严格模式
- 为公共函数添加类型注解
- 避免使用 `any`

### React
- 优先使用函数组件
- 合理使用 `useCallback` 和 `useMemo`
- 提取可复用组件

### 样式
- 使用 Tailwind CSS
- 遵循响应式设计原则
- 支持亮色/暗色主题

## 提交规范

### Commit 格式
```
<type>(<scope>): <subject>

<body>
```

**Type**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**示例**:
```
feat(danmaku): 添加弹幕密度限制功能

- 添加每秒弹幕数量限制
- 支持自定义限制数值
- 自动保存用户配置
```

## 打包测试

### Windows
```bash
pnpm electron:build:win
```

### 检查打包体积
```bash
Get-ChildItem release\win-unpacked -Recurse | Measure-Object -Property Length -Sum
```

### 测试清单
- [ ] 搜索功能正常
- [ ] 视频播放正常
- [ ] 弹幕加载正常
- [ ] 关键词屏蔽有效
- [ ] 密度限制有效
- [ ] 播放记录保存
- [ ] 收藏功能正常
- [ ] 应用重启后数据保留

## 常见问题

### localStorage 不持久化
- 确保 `electron/main.js` 使用固定端口 (39527)
- 检查 `userData` 路径是否正确

### 弹幕不显示
- 检查弹幕插件是否正确加载
- 确认弹幕数据格式正确
- 查看控制台错误信息

### 打包体积过大
- 确保排除了其他平台的 SWC 模块
- 检查 `package.json` 的 `files` 配置

## 发布流程

1. 更新版本号 (`package.json`)
2. 更新 `README.md` 的版本信息
3. 运行完整测试
4. 打包所有平台
5. 创建 GitHub Release
6. 上传打包文件

## 许可证

MIT License - 继承自 MoonTV

## 联系方式

- GitHub Issues: 报告 Bug 或提出功能建议
- Pull Requests: 欢迎提交代码贡献

---

再次感谢你的贡献! 🎉
