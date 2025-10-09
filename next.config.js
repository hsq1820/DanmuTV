/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export' 以支持 API 路由
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  // Electron 环境下的基础路径配置
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  
  // Webpack配置:排除客户端依赖在服务器端的打包
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 服务器端排除这些客户端库
      config.externals = config.externals || [];
      config.externals.push({
        'artplayer': 'commonjs artplayer',
        'hls.js': 'commonjs hls.js',
        'artplayer-plugin-danmuku': 'commonjs artplayer-plugin-danmuku',
      });
    }
    return config;
  },
};

module.exports = nextConfig;

