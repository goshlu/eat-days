import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { getAffiliateClickKey } from '@/lib/affiliate';
import { createRequestLogger } from '@/lib/logger';

interface AffiliateClickRequest {
  keyword?: string;
  provider?: string;
  href?: string;
  userId?: string;
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const body = (await req.json()) as AffiliateClickRequest;
    const keyword = body.keyword?.trim();
    const provider = body.provider || 'meituan';

    if (!keyword) {
      return Response.json({ error: 'keyword is required' }, { status: 400 });
    }

    const clickKey = getAffiliateClickKey(keyword);
    const totalKey = `affiliate:${provider}:clicks:total`;
    const day = new Date().toISOString().slice(0, 10);
    const dailyKey = `affiliate:${provider}:clicks:${day}`;

    const [keywordClicks, totalClicks, dailyClicks] = await Promise.all([
      redis.incr(clickKey),
      redis.incr(totalKey),
      redis.incr(dailyKey),
    ]);

    logger.info(
      {
        provider,
        keyword,
        href: body.href,
        userId: body.userId,
        keywordClicks,
        totalClicks,
        dailyClicks,
      },
      'Affiliate click tracked',
    );

    return Response.json({
      success: true,
      data: {
        provider,
        keyword,
        keywordClicks,
        totalClicks,
        dailyClicks,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Affiliate click tracking failed');
    return Response.json({ error: 'Failed to track affiliate click' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword')?.trim();
  const provider = req.nextUrl.searchParams.get('provider') || 'meituan';

  if (!keyword) {
    return Response.json({ error: 'keyword is required' }, { status: 400 });
  }

  const count = await redis.get<number>(getAffiliateClickKey(keyword));
  const total = await redis.get<number>(`affiliate:${provider}:clicks:total`);

  return Response.json({
    success: true,
    data: {
      provider,
      keyword,
      clicks: count || 0,
      totalClicks: total || 0,
    },
  });
}
