// 크롤러 어댑터 모음
// - creepypasta: 해외 영어 소스
// - naver_blog: 네이버 검색 API (선택)
// - generic_rss: RSS 기반 공개 피드 (ScaryStories 등)

import * as cheerio from 'cheerio';
import type { CrawlSource } from './types';

export interface RawStory {
  title: string;
  content: string;
  url: string;
  language: 'ko' | 'en';
  imageUrl?: string | null;
}

const UA =
  'Mozilla/5.0 (compatible; SimyaBot/1.0; +https://simya.app) AppleWebKit/537.36 (KHTML, like Gecko)';

async function fetchHtml(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Fetch ${url} -> ${res.status}`);
  return res.text();
}

// ----- Creepypasta ----------------------------------------------------------
// https://www.creepypasta.com/ — 영어. 메인 페이지에서 최신 글 링크 추출.
export async function crawlCreepypastaList(source: CrawlSource): Promise<RawStory[]> {
  const html = await fetchHtml(source.url);
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href*="creepypasta.com/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    // 글 상세 URL 패턴만. 목록/카테고리는 제외.
    if (/\/\d{4}\/\d{2}\//.test(href) || /\/[a-z0-9-]+-\d+\/?$/.test(href)) {
      const abs = href.startsWith('http') ? href : new URL(href, source.url).toString();
      links.add(abs.split('#')[0]);
    }
  });

  const out: RawStory[] = [];
  const list = Array.from(links).slice(0, 8);
  for (const url of list) {
    try {
      const story = await fetchCreepypastaArticle(url);
      if (story && story.content.length > 200) out.push(story);
    } catch (e) {
      console.warn('[crawl] creepypasta article failed', url, e);
    }
  }
  return out;
}

async function fetchCreepypastaArticle(url: string): Promise<RawStory | null> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const title =
    $('h1.entry-title').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim();
  // 본문 후보: .entry-content 가 가장 흔함. fallback 으로 article.
  const $content = $('div.entry-content').first();
  let content = '';
  if ($content.length) {
    content = $content
      .find('p')
      .map((_, p) => $(p).text().trim())
      .get()
      .filter(Boolean)
      .join('\n\n');
  }
  if (!content) {
    content = $('article p')
      .map((_, p) => $(p).text().trim())
      .get()
      .filter(Boolean)
      .join('\n\n');
  }
  content = content.replace(/\s{3,}/g, '\n\n').trim();
  if (content.length < 200) return null;

  // featured image 추출
  const imageUrl = extractFeaturedImage($, url);
  return { title, content, url, language: 'en', imageUrl };
}

/** OG/Twitter meta 또는 본문 첫 이미지 추출 */
function extractFeaturedImage($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('article img').first().attr('src'),
    $('img').first().attr('src'),
  ].filter((s): s is string => !!s && s.length > 0);

  for (const c of candidates) {
    try {
      const abs = c.startsWith('http') ? c : new URL(c, baseUrl).toString();
      // 너무 작은 아이콘/스프라이트 무시 (선택)
      return abs;
    } catch {
      continue;
    }
  }
  return null;
}

// ----- Naver Blog Search (선택) --------------------------------------------
export async function crawlNaverBlogSearch(source: CrawlSource): Promise<RawStory[]> {
  const meta = (source.meta as { query?: string; display?: number }) ?? {};
  const query = meta.query || '공포이야기 실화';
  const display = Math.min(meta.display ?? 10, 20);
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('[crawl] NAVER_CLIENT_ID/SECRET not set, skipping naver_blog source');
    return [];
  }

  const url = `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(query)}&display=${display}&sort=date`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });
  if (!res.ok) {
    console.warn('[crawl] naver blog search failed', res.status);
    return [];
  }
  const data = (await res.json()) as { items?: Array<{ title: string; link: string; description: string; postdate: string }> };
  const items = data.items ?? [];

  const out: RawStory[] = [];
  for (const it of items.slice(0, 5)) {
    // 네이버 블로그는 iframe 으로 본문 노출 → 실제 글 가져오기는 어려움.
    // description 을 본문으로 사용 (HTML 태그 / 엔티티 제거).
    const cleaned = stripHtml(it.description).trim();
    if (cleaned.length < 200) continue;
    out.push({
      title: stripHtml(it.title).trim() || '(제목 없음)',
      content: cleaned,
      url: it.link,
      language: 'ko',
      imageUrl: null, // snippet 만으론 이미지 추출 어려움
    });
  }
  return out;
}

// ----- Generic RSS ----------------------------------------------------------
// 표준 RSS 2.0 / Atom. 예: scary stories, no sleep podcast 등.
export async function crawlRss(source: CrawlSource): Promise<RawStory[]> {
  const xml = await fetchHtml(source.url);
  const $ = cheerio.load(xml, { xmlMode: true });
  const out: RawStory[] = [];
  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().trim();
    const link = $(el).find('link').first().text().trim();
    const desc = $(el).find('description').text();
    const content = stripHtml(desc).trim();
    if (content.length > 200) {
      out.push({ title, content, url: link, language: 'en' });
    }
  });
  // Atom
  $('entry').each((_, el) => {
    const title = $(el).find('title').first().text().trim();
    const link = $(el).find('link').first().attr('href') || '';
    const content = $(el).find('content').text() || $(el).find('summary').text();
    const cleaned = stripHtml(content).trim();
    if (cleaned.length > 200) {
      out.push({ title, content: cleaned, url: link, language: 'en' });
    }
  });
  return out.slice(0, 8);
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

export async function crawlSource(source: CrawlSource): Promise<RawStory[]> {
  try {
    switch (source.type) {
      case 'creepypasta_list':
        return await crawlCreepypastaList(source);
      case 'naver_blog':
        return await crawlNaverBlogSearch(source);
      case 'rss':
        return await crawlRss(source);
      case 'reddit_subreddit':
        return await crawlReddit(source);
      default:
        console.warn('[crawl] unknown source type:', source.type);
        return [];
    }
  } catch (e) {
    console.error('[crawl] source failed', source.id, source.url, e);
    return [];
  }
}

// ----- Reddit ---------------------------------------------------------------
// reddit.com JSON API — 인증 불요, User-Agent 만 신중히. r/nosleep, r/scarystories 등.
// 응답: { data: { children: [{ data: { title, selftext, url, permalink, ... } }] } }
export async function crawlReddit(source: CrawlSource): Promise<RawStory[]> {
  const meta = (source.meta as { subreddit?: string; sort?: 'top' | 'new' | 'hot'; time?: 'day' | 'week' | 'month' | 'all'; limit?: number }) ?? {};
  const sub = meta.subreddit || 'nosleep';
  const sort = meta.sort || 'top';
  const t = meta.time || 'week';
  const limit = Math.min(meta.limit ?? 10, 25);

  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/${sort}.json?t=${t}&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'webapp:simya-app:v1.0 (by /u/simya_admin)',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    console.warn('[crawl] reddit failed', sub, res.status);
    return [];
  }
  const json = (await res.json()) as {
    data?: { children?: Array<{ data?: RedditPost }> };
  };
  const posts = json.data?.children ?? [];

  const out: RawStory[] = [];
  for (const p of posts) {
    const d = p.data;
    if (!d) continue;
    // 너무 짧거나 (제목만) NSFW 면 스킵
    const body = (d.selftext || '').trim();
    if (body.length < 300) continue;
    if (d.over_18) continue;
    if (d.stickied) continue;

    out.push({
      title: (d.title || '').trim(),
      content: body,
      url: `https://www.reddit.com${d.permalink}`,
      language: 'en',
      imageUrl: d.url_overridden_by_dest && /\.(jpg|jpeg|png|webp|gif)$/i.test(d.url_overridden_by_dest)
        ? d.url_overridden_by_dest
        : null,
    });
  }
  return out;
}

interface RedditPost {
  title: string;
  selftext: string;
  permalink: string;
  url_overridden_by_dest?: string;
  over_18?: boolean;
  stickied?: boolean;
}
