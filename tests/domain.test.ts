import { test } from 'node:test';
import assert from 'node:assert/strict';
import edition from '../src/data/journal.json';
import { contentSchema } from '../src/lib/schema';
import { publicContent, renderBody } from '../src/lib/content';
import { calendar, bookingUrl, eventState } from '../src/lib/travel';
import { subscribeMailchimp, subscriptionSchema } from '../src/lib/newsletter';
import { normalizeWeather } from '../src/lib/weather';
import { POST } from '../src/pages/api/newsletter';

test('editorial publication rejects incomplete translations, unsafe media and duplicate IDs', () => {
  const original = contentSchema.parse(edition);
  const incomplete = structuredClone(original); incomplete.articles[0].locales.es.title = '';
  assert.equal(contentSchema.safeParse(incomplete).success,false);
  const unsafe = structuredClone(original); unsafe.articles[0].image.src = 'javascript:alert(1)';
  assert.equal(contentSchema.safeParse(unsafe).success,false);
  const duplicate = structuredClone(original); duplicate.articles.push(duplicate.articles[0]);
  assert.equal(contentSchema.safeParse(duplicate).success,false);
  const drafts = structuredClone(original); drafts.articles[0].status = 'draft'; drafts.articles[1].status = 'review'; drafts.events[0].status = 'draft';
  const visible = publicContent(drafts);
  assert.equal(visible.articles.length,original.articles.length-2);
  assert.equal(visible.events.length,original.events.length-1);
});
test('public article rendering strips script, handlers, unsafe links and tracking embeds', () => {
  const html = renderBody('# Hello\n\n<script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://bad.example"></iframe>\n\n[unsafe](javascript:alert(1))\n\n[safe](https://www.lacasaquecanta.com/)');
  assert.doesNotMatch(html,/<script|onerror|javascript:|<iframe|<img/);
  assert.match(html,/https:\/\/www.lacasaquecanta.com/);
});
test('multi-day calendars use exclusive end, folded UTF-8 lines, stable IDs and cancellation status', () => {
  const event = contentSchema.parse(edition).events.find(e => e.id === 'sail')!;
  const ics = calendar({...event,status:'cancelled'},'es',new Date('2026-11-22T16:00:00Z'));
  assert.match(ics,/DTSTART;VALUE=DATE:20270214\r\n/); assert.match(ics,/DTEND;VALUE=DATE:20270228\r\n/);
  assert.match(ics,/STATUS:CANCELLED/); assert.equal(eventState(event,'2027-02-28'),'past');
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
test('hotel booking preserves validated IDs and dates, while villas use their official sites', () => {
  const url = new URL(bookingUrl('es','La Casa Que Canta','2099-02-14','2099-02-28'));
  assert.equal(url.searchParams.get('hotel'),'78821'); assert.equal(url.searchParams.get('arrive'),'2099-02-14');
  assert.equal(url.searchParams.get('locale'),'es-MX'); assert.equal(url.searchParams.has('room'),false);
  assert.equal(bookingUrl('en','El Ensueño'),'https://www.el-ensueno.com/');
  assert.equal(bookingUrl('en','El Murmullo'),'https://www.el-murmullo.com/');
  assert.equal(new URL(bookingUrl('en','La Casa Que Canta','2000-01-01','2000-01-02')).searchParams.has('arrive'),false);
});
test('newsletter requires consent and creates only a genuine provider-confirmed pending record', async () => {
  const data = {email:'reader@example.com',language:'es',interests:['chef','culture'],consent:true} as const;
  assert.equal(subscriptionSchema.safeParse({...data,consent:false}).success,false);
  assert.equal(subscriptionSchema.safeParse({...data,website:'spam'}).success,false);
  const parsed = subscriptionSchema.parse(data);
  let submitted: any;
  const pending = await subscribeMailchimp(parsed,'test-us1','audience',async (_url,init) => { submitted = JSON.parse(init!.body as string); return Response.json({status:'pending',id:'member'}); });
  assert.equal(pending,'pending'); assert.equal(submitted.status,'pending'); assert.equal(submitted.language,'es');
  assert.deepEqual(submitted.tags,['sanctuario:chef','sanctuario:culture','source:el-sanctuario']);
  assert.equal(await subscribeMailchimp(parsed,'test-us1','audience',async () => Response.json({title:'Member Exists'},{status:400})),'existing');
  await assert.rejects(() => subscribeMailchimp(parsed,'test-us1','audience',async () => Response.json({status:'subscribed',id:'member'})));
  await assert.rejects(() => subscribeMailchimp(parsed,'test-us1','audience',async () => Response.json({title:'failure'},{status:500})));
});
test('newsletter is deliberately blocked until validation and rejects cross-origin requests', async () => {
  const previous = process.env.NEWSLETTER_ENABLED; process.env.NEWSLETTER_ENABLED = 'false';
  try {
    const request = new Request('https://journal.example/api/newsletter',{method:'POST',headers:{Origin:'https://journal.example','Content-Type':'application/json'},body:'{}'});
    const response = await POST({request,url:new URL(request.url)} as any);
    assert.equal(response.status,503); assert.deepEqual(await response.json(),{error:'awaiting_validation'});
    const blocked = await POST({request:new Request(request.url,{method:'POST',headers:{Origin:'https://other.example'}}),url:new URL(request.url)} as any);
    assert.equal(blocked.status,403);
  } finally { if (previous === undefined) delete process.env.NEWSLETTER_ENABLED; else process.env.NEWSLETTER_ENABLED = previous; }
});
test('weather validation rejects stale or invalid conditions rather than inventing a fallback', () => {
  const value = {utc_offset_seconds:-21600,current:{time:'2026-11-22T10:00',temperature_2m:28,apparent_temperature:30,weather_code:1,wind_speed_10m:12},daily:{time:['2026-11-22','2026-11-23','2026-11-24','2026-11-25','2026-11-26'],sunset:['2026-11-22T18:00'],temperature_2m_max:[28,29,30,31,32],temperature_2m_min:[22,23,24,25,26]}};
  assert.equal(normalizeWeather(value,new Date('2026-11-22T16:00:00Z')).current.temperature_2m,28);
  assert.throws(() => normalizeWeather(value,new Date('2026-11-23T16:00:00Z')));
  assert.throws(() => normalizeWeather({...value,current:{...value.current,temperature_2m:null}},new Date('2026-11-22T16:00:00Z')));
});
