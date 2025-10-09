/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import SourceAvailabilityChecker from '../components/SourceAvailabilityChecker';

const inter = Inter({ subsets: ['latin'] });

// 动态生成 metadata
export async function generateMetadata(): Promise<Metadata> {
  const title = 'DanmuTV - 弹幕影视播放器';
  return {
    title: title,
    description: 'DanmuTV - 弹幕影视播放器',
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/favicon.ico', type: 'image/x-icon' },
      ],
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteName = 'DanmuTV';
  const announcement = '本应用仅提供影视信息搜索服务,所有内容均来自第三方网站。本站不存储任何视频资源。';
  
  // 运行时配置
  const runtimeConfig = {
    STORAGE_TYPE: 'localstorage',
    ENABLE_REGISTER: false,
    IMAGE_PROXY: '',
    DOUBAN_PROXY: '',
    DISABLE_YELLOW_FILTER: false,
    CUSTOM_CATEGORIES: [],
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <SiteProvider siteName={siteName} announcement={announcement}>
            <SourceAvailabilityChecker />
            {children}
            <GlobalErrorIndicator />
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
