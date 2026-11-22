import type { APIRoute } from 'astro';
import { getContent } from '../../../lib/content';
import { calendar } from '../../../lib/travel';

export const GET: APIRoute = async ({ params, url }) => {
  const event = (await getContent()).events.find(x => x.id === params.id && x.status !== 'draft');
  if (!event) return new Response('Not found', { status: 404 });
  return new Response(calendar(event, url.searchParams.get('lang') === 'es' ? 'es' : 'en'), { headers: {
    'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="el-sanctuario-${event.id}.ics"`, 'Cache-Control': 'public, max-age=60',
  } });
};
