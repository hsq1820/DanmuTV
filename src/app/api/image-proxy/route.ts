import { NextResponse } from 'next/server';

export const runtime = 'edge';

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  // 如果是豆瓣图片，自动切换到官方精品CDN（阿里云）
  // 例如 http(s)://img[0-9].doubanio.com/view/photo/s_ratio_poster/public/p123456.jpg
  const doubanCdnPrefix = 'https://img9.doubanio.com';
  const doubanPattern = /^https?:\/\/img\d+\.doubanio\.com(\/.*)/;
  const match = imageUrl.match(doubanPattern);
  if (match) {
    imageUrl = doubanCdnPrefix + match[1];
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: imageResponse.statusText },
        { status: imageResponse.status }
      );
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return NextResponse.json(
        { error: 'Image response has no body' },
        { status: 500 }
      );
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头（可选）
    headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000'); // 缓存半年
    headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching image' },
      { status: 500 }
    );
  }
}
