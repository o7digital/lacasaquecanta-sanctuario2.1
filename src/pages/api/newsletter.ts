import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { subscribeMailchimp, subscriptionSchema } from '../../lib/newsletter';
const attempts = new Map<string, { count: number; expires: number }>();
export const POST: APIRoute = async ({ request, url }) => {
  const headers = { 'Cache-Control':'no-store' };
  const fail = (error: string, status: number) => Response.json({error},{status,headers});
  if (request.headers.get('origin') !== url.origin) return fail('origin',403);
  // Activation is a deliberate hotel decision, independent of available keys.
  if (process.env.NEWSLETTER_ENABLED !== 'true') return fail('awaiting_validation',503);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return fail('content_type',415);
  if (Number(request.headers.get('content-length')) > 3000) return fail('validation',413);
  const body = await request.text(); if (body.length > 3000) return fail('validation',413);
  let data;
  try { data = subscriptionSchema.parse(JSON.parse(body)); } catch { return fail('validation',400); }
  const key = process.env.MAILCHIMP_API_KEY, audience = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!key || !audience || !process.env.PUBLIC_NEWSLETTER_MANAGE_URL?.startsWith('https://')) return fail('not_configured',503);
  // Small per-instance burst guard. Provider/platform rate limits must also be
  // enabled before activation; this map is not a distributed rate limiter.
  const id = createHash('sha256').update(request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown').digest('hex');
  const now = Date.now();
  for (const [ip,value] of attempts) if (value.expires <= now) attempts.delete(ip);
  if (attempts.size > 5000) return fail('rate_limited',429);
  const previous = attempts.get(id) || {count:0,expires:now+3600000};
  if (previous.count >= 5) return fail('rate_limited',429);
  attempts.set(id,{...previous,count:previous.count+1});
  try {
    const state = await subscribeMailchimp(data,key,audience);
    return Response.json({state},{status:state === 'pending' ? 202 : 200,headers});
  } catch { return fail('provider_unavailable',502); }
};
