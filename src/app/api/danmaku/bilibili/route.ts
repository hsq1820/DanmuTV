/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractBV(input?: string | null): string | null {
  if (!input) return null;
  const m = input.match(/BV[0-9A-Za-z]+/i);
  return m ? m[0] : null;
}

function extractBangumi(
  input?: string | null
): { season_id?: string; media_id?: string } | null {
  if (!input) return null;
  const ss = input.match(/bangumi\/(?:play\/)?ss(\d+)/i);
  if (ss && ss[1]) return { season_id: ss[1] };
  const md = input.match(/bangumi\/(?:media\/)?md(\d+)/i);
  if (md && md[1]) return { media_id: md[1] };
  return null;
}

function extractEpId(input?: string | null): string | null {
  if (!input) return null;
  const ep = input.match(/bangumi\/play\/ep(\d+)/i);
  return ep && ep[1] ? ep[1] : null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get('link');
    const bv = searchParams.get('bv') || extractBV(link);
    const cidParam = searchParams.get('cid');
    const page = Number(searchParams.get('p') || '1'); // for BV 分P
    let mediaIdParam = searchParams.get('media_id');
    let seasonIdParam = searchParams.get('season_id');
    let epIdParam = searchParams.get('ep_id'); // 添加 ep_id 参数支持
    // 允许从 link 自动识别番剧 ss/md/ep
    if (!seasonIdParam && !mediaIdParam && !epIdParam && link) {
      const bangumi = extractBangumi(link);
      if (bangumi?.season_id) seasonIdParam = bangumi.season_id;
      if (bangumi?.media_id) mediaIdParam = bangumi.media_id;
      // 尝试提取 ep_id
      const epId = extractEpId(link);
      if (epId) epIdParam = epId;
    }
    const epIndex = Number(searchParams.get('ep') || '1'); // 选择集数（1基），用于番剧

    let cid: string | undefined = cidParam ?? undefined;

    if (!cid) {
      // 如果提供了 ep_id，通过 ep_id 获取 cid
      if (epIdParam) {
        // 支持 "ep733316" 或 "733316" 两种格式
        let epId = epIdParam;
        if (/^ep\d+$/i.test(epId)) {
          epId = epId.substring(2);
        }
        
        type EpViewResp = {
          code: number;
          message?: string;
          result?: {
            episodes?: Array<{ id?: number; cid?: number }>;
          };
        };
        const epResp = await fetch(
          `https://api.bilibili.com/pgc/view/web/season?ep_id=${encodeURIComponent(epId)}`,
          { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' }
        );
        if (!epResp.ok) {
          return NextResponse.json(
            { error: 'ep_id 解析失败' },
            { status: epResp.status }
          );
        }
        const epJson: EpViewResp = await epResp.json();
        if (epJson.code !== 0) {
          return NextResponse.json(
            { error: epJson.message || 'ep_id 解析失败' },
            { status: 400 }
          );
        }
        const episodes = epJson?.result?.episodes || [];
        // 在剧集列表中找到对应的 ep_id
        const targetEp = episodes.find(ep => String(ep.id) === epId);
        if (!targetEp?.cid) {
          return NextResponse.json(
            { error: '未找到该 ep_id 对应的 cid' },
            { status: 404 }
          );
        }
        cid = String(targetEp.cid);
      }
      
      // 优先支持番剧入口：media_id / season_id
      if (!cid) {
        let seasonId = seasonIdParam ? Number(seasonIdParam) : undefined;

        if (!seasonId && mediaIdParam) {
          // 通过 media_id 获取 season_id
          type ReviewUserResp = {
            code: number;
            result?: { media?: { season_id?: number | string } };
          };
          const reviewResp = await fetch(
            `https://api.bilibili.com/pgc/review/user?media_id=${encodeURIComponent(
              mediaIdParam
            )}`,
            { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' }
          );
          if (!reviewResp.ok) {
            return NextResponse.json(
              { error: 'media_id 解析 season_id 失败' },
              { status: reviewResp.status }
            );
          }
          const reviewJson: ReviewUserResp = await reviewResp.json();
          const sid = reviewJson?.result?.media?.season_id;
          if (!sid) {
            return NextResponse.json(
              { error: '未解析到 season_id' },
              { status: 404 }
            );
          }
          seasonId = typeof sid === 'string' ? Number(sid) : sid;
        }

        if (seasonId) {
          // 通过 season_id 解析主正片列表的 cid
          type SectionEpisode = { cid?: number; title?: string };
          type SeasonSectionResp = {
            code: number;
            result?: {
              main_section?: { episodes?: SectionEpisode[] };
              section?: Array<{ episodes?: SectionEpisode[] }>;
            };
          };
          const sectionResp = await fetch(
            `https://api.bilibili.com/pgc/web/season/section?season_id=${encodeURIComponent(
              String(seasonId)
            )}`,
            { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' }
          );
          if (!sectionResp.ok) {
            return NextResponse.json(
              { error: 'season_id 解析剧集失败' },
              { status: sectionResp.status }
            );
          }
          const sectionJson: SeasonSectionResp = await sectionResp.json();
          const episodes =
            sectionJson?.result?.main_section?.episodes &&
            Array.isArray(sectionJson.result.main_section.episodes)
              ? sectionJson.result.main_section.episodes
              : [];
          if (episodes.length === 0) {
            return NextResponse.json(
              { error: '未找到正片剧集列表' },
              { status: 404 }
            );
          }
          const idx = Math.max(
            0,
            Math.min(episodes.length - 1, (epIndex || 1) - 1)
          );
          const chosen = episodes[idx];
          cid = chosen?.cid != null ? String(chosen.cid) : undefined;
          if (!cid) {
            return NextResponse.json(
              { error: '该集未解析到 cid' },
              { status: 404 }
            );
          }
        }
      }
    }

    if (!cid) {
      // 普通视频入口：BV / link
      if (!bv) {
        return NextResponse.json(
          {
            error: '缺少可用参数（需要 cid 或 season_id/media_id/ep_id 或 bv/link）',
          },
          { status: 400 }
        );
      }
      // 获取 cid（默认第 1 页或指定 p）
      const viewResp = await fetch(
        `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(
          bv
        )}`,
        { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' }
      );
      if (!viewResp.ok) {
        return NextResponse.json(
          { error: '获取视频信息失败' },
          { status: viewResp.status }
        );
      }
      type BiliViewResponse = {
        code: number;
        message: string;
        ttl: number;
        data?: {
          pages?: Array<{ cid?: number; page?: number; part?: string }>;
        };
      };
      const viewJson: BiliViewResponse = await viewResp.json();
      const pagesList =
        viewJson && viewJson.data && Array.isArray(viewJson.data.pages)
          ? viewJson.data.pages
          : [];
      if (pagesList.length === 0) {
        return NextResponse.json(
          { error: '未找到视频分P信息' },
          { status: 404 }
        );
      }
      const idx = Math.max(0, Math.min(pagesList.length - 1, page - 1));
      const pageCid = pagesList[idx]?.cid;
      cid = pageCid != null ? String(pageCid) : undefined;
      if (!cid) {
        return NextResponse.json({ error: '未解析到 cid' }, { status: 404 });
      }
    }

    // 使用新的 XML 弹幕接口（按 cid）
    const xmlResp = await fetch(`https://comment.bilibili.com/${cid}.xml`, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        referer: 'https://www.bilibili.com/',
      },
      cache: 'no-store',
    });
    if (!xmlResp.ok) {
      return NextResponse.json(
        { error: '获取弹幕失败' },
        { status: xmlResp.status }
      );
    }
    const xmlText = await xmlResp.text();

    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    console.error('获取弹幕异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
