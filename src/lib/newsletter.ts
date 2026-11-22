import { z } from 'zod';

export const interestIds = ['chef', 'hotel', 'culture', 'stays'] as const;
export const subscriptionSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  language: z.enum(['en', 'es']),
  interests: z.array(z.enum(interestIds)).min(1).max(4),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
type Subscription = z.infer<typeof subscriptionSchema>;
export async function subscribeMailchimp(data: Subscription, key: string, audience: string, requester = fetch) {
  const region = key.split('-').at(-1);
  if (!region || !/^us\d+$/.test(region) || !/^[a-zA-Z0-9]+$/.test(audience)) throw new Error('Newsletter configuration invalid');
  // POST creates a new pending subscriber only. It cannot resubscribe an opted-out
  // contact or modify an existing subscriber's preferences without verification.
  const response = await requester(`https://${region}.api.mailchimp.com/3.0/lists/${audience}/members`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`el-sanctuario:${key}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_address: data.email, status: 'pending', language: data.language, tags: [...data.interests.map(x => `sanctuario:${x}`), 'source:el-sanctuario'],
      marketing_permissions: undefined }),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (response.status === 400 && result.title === 'Member Exists') return 'existing' as const;
  if (!response.ok || result.status !== 'pending' || !result.id) throw new Error('Newsletter provider rejected subscription');
  return 'pending' as const;
}
