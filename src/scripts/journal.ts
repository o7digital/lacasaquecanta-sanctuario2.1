import inspiration from '../data/inspiration.json';
import { articlePath, categoryLabels, readingTime, type Content, type Locale, type JournalEvent } from '../lib/schema';
import { bookingUrl, localDay, plusDays, eventState } from '../lib/travel';

const payload = document.querySelector('#journal-data');
if (payload) start(JSON.parse(payload.textContent || '{}') as { lang: Locale; content: Content });

function start({ lang, content }: { lang: Locale; content: Content }) {
  const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
  const $$ = <T extends Element = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
  const t = (en: string, es: string) => lang === 'en' ? en : es;
  const pair = (p: string[]) => p[lang === 'en' ? 0 : 1];
  const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const icon = (name: string) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const read = (key: string, fallback: unknown): any => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const articles = content.articles, events = content.events;
  const validIds = (value: unknown, allowed: string[]) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && allowed.includes(v)) : [];
  let saved = validIds(read('sanctuario-saved', []), articles.map(a => a.id));
  let savedEvents = validIds(read('sanctuario-events', []), events.map(e => e.id));
  type Feeling = keyof typeof inspiration.plans;
  let savedPlan = read('sanctuario-plan', null) as Feeling | null;
  if (!savedPlan || !(savedPlan in inspiration.plans)) savedPlan = null;
  type Stay = { arrival: string; departure: string; property: string; notes: string };
  let stay = read('sanctuario-stay', null) as Stay | null;
  if (stay && (typeof stay !== 'object' || !['arrival', 'departure', 'property', 'notes'].every(k => typeof (stay as any)[k] === 'string'))) stay = null;
  let feeling: Feeling = 'slow', filter = 'all', expanded = false, toastTimer: ReturnType<typeof setTimeout>;
  const dialog = (id: string) => $<HTMLDialogElement>('#' + id);
  const show = (id: string) => { const d = dialog(id); if (d && !d.open) d.showModal(); };
  const close = (id: string) => dialog(id)?.close();
  const toast = (message: string) => { const el = $('#toast'); if (!el) return; el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000); };
  function updateSaved() {
    const count = saved.length + savedEvents.length + Number(Boolean(savedPlan)) + Number(Boolean(stay));
    $$('.saved-count').forEach(el => el.textContent = String(count));
    $$('[data-save]').forEach(el => { const active = saved.includes(el.dataset.save!); el.classList.toggle('is-saved', active); el.setAttribute('aria-pressed', String(active)); el.setAttribute('aria-label', active ? t('Remove from notebook', 'Quitar del cuaderno') : t('Save to notebook', 'Guardar en el cuaderno')); if (el.classList.contains('pill')) el.textContent = active ? t('Saved in my notebook', 'Guardado en mi cuaderno') : t('Keep this story', 'Guardar esta historia'); });
    $$('[data-save-event]').forEach(el => { const active = savedEvents.includes(el.dataset.saveEvent!); el.setAttribute('aria-pressed', String(active)); el.textContent = active ? t('Event saved', 'Evento guardado') : t('Keep this event', 'Guardar evento'); });
  }
  async function keepOffline(id: string) {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    const article = articles.find(a => a.id === id);
    if (!article) return;
    try {
      const href = articlePath(lang, id), response = await fetch(href);
      if (!response.ok) return;
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const urls = [href, article.image.src, ...[...doc.querySelectorAll('link[rel="stylesheet"],script[src]')].map(el => el.getAttribute('href') || el.getAttribute('src') || '')];
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'SAVE_PUBLIC_URLS', urls });
    } catch { /* A failed offline copy never undoes a local bookmark. */ }
  }
  function saveStory(id: string) {
    if (!articles.some(a => a.id === id)) return;
    const had = saved.includes(id);
    saved = had ? saved.filter(x => x !== id) : [...saved, id];
    const stored = write('sanctuario-saved', saved);
    if (!had) void keepOffline(id);
    updateSaved(); if (dialog('notebook')?.open) notebook();
    toast(stored ? had ? t('Removed from your notebook.', 'Se quitó de tu cuaderno.') : t('A little memory, saved on this device.', 'Un pequeño recuerdo, guardado en este dispositivo.') : t('Kept for this visit. Browser storage is unavailable.', 'Guardado durante esta visita. El almacenamiento del navegador no está disponible.'));
  }
  function notebook() {
    const target = $('#notebook-content'); if (!target) return;
    target.innerHTML = saved.map(id => { const a = articles.find(a => a.id === id)!; return `<div class="notebook-item"><img src="${esc(a.image.src)}" alt=""><a href="${articlePath(lang,id)}"><small>${esc(categoryLabels[a.category][lang])}</small>${esc(a.locales[lang].title)}</a><button class="icon-button" data-save="${id}" aria-label="${t('Remove', 'Quitar')}">${icon('close')}</button></div>`; }).join('') + savedEvents.map(id => { const e = events.find(e => e.id === id)!; return `<div class="saved-plan"><span class="eyebrow">${t('AROUND ZIHUA', 'EN ZIHUA')}</span><h3>${esc(e.title[lang])}</h3><p>${esc(e.start)} – ${esc(plusDays(e.end,-1))} · ${eventState(e)}</p><a class="text-link" href="/api/events/${id}.ics?lang=${lang}">${t('Add to calendar', 'Añadir al calendario')}</a>${eventState(e) === 'upcoming' ? `<button class="text-link" data-event="${id}">${t('Plan a stay', 'Planear una estancia')}</button>` : ''}<button class="icon-button" data-remove-event="${id}" aria-label="${t('Remove', 'Quitar')}">${icon('close')}</button></div>`; }).join('') + (savedPlan ? `<div class="saved-plan"><span class="eyebrow">${t('MY NEXT STAY', 'MI PRÓXIMA ESTANCIA')}</span><h3>${esc(pair(inspiration.plans[savedPlan].label))}</h3><p>${esc(inspiration.plans[savedPlan].moments.map(m => pair(m.title)).join(' · '))}</p><button class="text-link" id="book-saved-plan">${t('Make these moments part of my stay', 'Incluir estos momentos en mi estancia')}</button><button class="icon-button" id="remove-plan" aria-label="${t('Remove', 'Quitar')}">${icon('close')}</button></div>` : '') + (stay ? `<div class="saved-plan"><span class="eyebrow">${t('MY DATES & WISHES', 'MIS FECHAS Y DESEOS')}</span><h3>${esc(stay.property)}</h3><p>${esc(stay.arrival)} – ${esc(stay.departure)}</p><p>${esc(stay.notes)}</p><button class="text-link" id="restore-stay">${t('Continue planning', 'Seguir planeando')}</button><button class="icon-button" id="remove-stay" aria-label="${t('Remove', 'Quitar')}">${icon('close')}</button></div>` : '');
    if (!saved.length && !savedEvents.length && !savedPlan && !stay) target.innerHTML = `<div class="empty-notebook">${icon('bookmark')}<h3>${t('A place for your favourites.', 'Un lugar para tus favoritos.')}</h3><p>${t('Keep a story, a recipe, an event or the moments you would love on your next stay.', 'Guarda una historia, una receta, un evento o los momentos que te gustaría vivir en tu próxima estancia.')}</p></div>`;
    else target.innerHTML += `<button class="text-link" id="export-notebook">${t('Download my notebook', 'Descargar mi cuaderno')}</button>`;
    updateSaved();
  }
  function renderStories() {
    const grid = $('#story-grid'); if (!grid) return;
    const matches = articles.filter(a => filter === 'all' || a.category === filter || filter === 'taste' && ['chef','recipe'].includes(a.category) || filter === 'place' && a.category === 'hotel');
    const visible = expanded || filter !== 'all' ? matches : matches.slice(0,3);
    grid.classList.toggle('expanded', expanded);
    grid.innerHTML = visible.map((a,i) => `<article class="story-card ${i === 0 ? 'featured' : ''}"><div class="story-image"><a class="story-open" href="${articlePath(lang,a.id)}"><img src="${esc(a.image.src)}" alt="${esc(a.image.alt[lang])}" loading="lazy"></a><button class="bookmark" data-save="${a.id}" aria-label="${t('Save to notebook','Guardar en el cuaderno')}">${icon('bookmark')}</button></div><div class="story-copy"><span class="story-category">${esc(categoryLabels[a.category][lang])}</span><a class="story-open" href="${articlePath(lang,a.id)}"><h3>${esc(a.locales[lang].title)}</h3></a><p>${esc(a.locales[lang].intro)}</p><span class="story-meta">${readingTime(a.locales[lang].body)} ${t('MIN READ','MIN DE LECTURA')}</span></div></article>`).join('');
    if ($('#story-total')) $('#story-total')!.textContent = `${matches.length} ${t('stories to linger over','historias para leer sin prisa')}`;
    if ($('#all-stories')) $('#all-stories')!.hidden = expanded || filter !== 'all';
    $$('.filter').forEach(b => { const active = b.dataset.filter === filter; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
    updateSaved();
  }
  function renderPlan() {
    const el = $('#itinerary'); if (!el) return;
    el.innerHTML = inspiration.plans[feeling].moments.map(m => `<article class="moment"><img src="/assets/${m.image}" alt="${esc(pair(m.title))}" loading="lazy"><span class="small-label">${esc(pair(m.time))}</span><h3>${esc(pair(m.title))}</h3><p>${esc(pair(m.text))}</p></article>`).join('');
    $$('[data-feeling]').forEach(b => { const active = b.dataset.feeling === feeling; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
  }
  function mood(next: keyof typeof inspiration.moods) {
    if (!inspiration.moods[next] || !$('#cover-image')) return;
    const m = inspiration.moods[next]; $('#cover-image')!.style.backgroundImage = `url('/assets/${m.image}')`;
    $('#cover-title')!.innerHTML = pair(m.title); $('#cover-description')!.textContent = pair(m.description);
    $$('.mood-switch button').forEach(b => { const active = b.dataset.mood === next; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
  }
  const input = (id: string) => $<HTMLInputElement>('#' + id)!;
  function openBooking(event?: JournalEvent, notes = '', restore = false) {
    if (!dialog('booking') || event && eventState(event) !== 'upcoming') return;
    close('notebook');
    $('#booking-context')!.textContent = event ? event.title[lang] : t('Tell us when you would love to be here.', 'Cuéntanos cuándo te gustaría estar aquí.');
    input('arrival').min = localDay();
    input('arrival').value = restore && stay ? stay.arrival : event?.start || plusDays(localDay(),7);
    input('departure').value = restore && stay ? stay.departure : event?.end || plusDays(input('arrival').value,3);
    input('departure').min = plusDays(input('arrival').value,1);
    input('property').value = restore && stay ? stay.property : 'La Casa Que Canta';
    input('stay-notes').value = restore && stay ? stay.notes : notes || (event ? t('I would like to plan a stay around ', 'Me gustaría planear una estancia durante ') + event.title[lang] : '');
    $('#booking-result')!.textContent = ''; updateBookingLink(); show('booking');
  }
  function updateBookingLink() {
    const link = $<HTMLAnchorElement>('.direct-book'); if (!link) return;
    const property = input('property').value;
    link.href = bookingUrl(lang, property, input('arrival').value, input('departure').value);
    link.textContent = property === 'La Casa Que Canta' ? t('Or check hotel availability online', 'O consultar disponibilidad del hotel') : t('Explore the official villa website', 'Explorar el sitio oficial de la villa');
  }
  function validStay() {
    const arrival = input('arrival').value, departure = input('departure').value;
    if (!$<HTMLFormElement>('#booking-form')?.reportValidity()) return false;
    if (arrival < localDay() || departure <= arrival) { $('#booking-result')!.textContent = t('Choose a future arrival and a departure after arrival.', 'Elige una llegada futura y una salida posterior a la llegada.'); return false; }
    return true;
  }
  function keepStay() {
    if (!validStay()) return;
    stay = { arrival: input('arrival').value, departure: input('departure').value, property: input('property').value, notes: input('stay-notes').value };
    const ok = write('sanctuario-stay',stay); updateSaved();
    $('#booking-result')!.textContent = ok ? t('Dates and wishes saved on this device. No request has been sent.', 'Fechas y deseos guardados en este dispositivo. No se ha enviado una solicitud.') : t('Kept for this visit only. Browser storage is unavailable.', 'Guardado solo durante esta visita. El almacenamiento no está disponible.');
  }
  function search() {
    const normalize = (s: string) => s.toLocaleLowerCase(lang).normalize('NFD').replace(/\p{Diacritic}/gu,'');
    const q = normalize(input('search-input').value.trim());
    const matches = articles.filter(a => normalize(`${a.locales[lang].title} ${a.locales[lang].intro} ${a.locales[lang].body} ${categoryLabels[a.category][lang]}`).includes(q));
    $('#search-results')!.innerHTML = matches.length ? matches.map(a => `<a class="search-result" href="${articlePath(lang,a.id)}"><img src="${esc(a.image.src)}" alt=""><span><small>${esc(categoryLabels[a.category][lang])}</small>${esc(a.locales[lang].title)}</span></a>`).join('') : `<p>${t('No stories found. Try “chef”, “spa” or “villa”.', 'No encontramos historias. Prueba “chef”, “spa” o “villa”.')}</p>`;
  }
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('button,a'); if (!b) return;
    if (b.dataset.close) { close(b.dataset.close); return; }
    if (b.dataset.save) { saveStory(b.dataset.save); return; }
    if (b.dataset.saveEvent || b.dataset.removeEvent) {
      const id = b.dataset.saveEvent || b.dataset.removeEvent!;
      if (!events.some(x => x.id === id)) return;
      savedEvents = savedEvents.includes(id) ? savedEvents.filter(x => x !== id) : [...savedEvents,id];
      const ok = write('sanctuario-events',savedEvents); updateSaved(); if (dialog('notebook')?.open) notebook(); toast(ok ? t('Your notebook is up to date.', 'Tu cuaderno está actualizado.') : t('Kept for this visit only.', 'Guardado solo durante esta visita.')); return;
    }
    if (b.dataset.mood) { mood(b.dataset.mood as keyof typeof inspiration.moods); return; }
    if (b.dataset.filter) { filter = b.dataset.filter; renderStories(); return; }
    if (b.dataset.feeling && b.dataset.feeling in inspiration.plans) { feeling = b.dataset.feeling as Feeling; renderPlan(); return; }
    if (b.classList.contains('saved-trigger')) { notebook(); show('notebook'); return; }
    if (b.classList.contains('booking-trigger')) { openBooking(); return; }
    if (b.dataset.event) { openBooking(events.find(ev => ev.id === b.dataset.event)); return; }
    if (b.dataset.planFromStory) { const a = articles.find(a => a.id === b.dataset.planFromStory); if (a) openBooking(undefined, t('I was inspired by: ', 'Me inspiró: ') + a.locales[lang].title); return; }
    if (b.id === 'keep-stay') { keepStay(); return; }
    if (b.id === 'restore-stay') { openBooking(undefined,'',true); return; }
    if (b.id === 'remove-stay') { stay = null; write('sanctuario-stay',null); updateSaved(); notebook(); return; }
    if (b.id === 'book-saved-plan' && savedPlan) { openBooking(undefined,t('I would love these moments: ', 'Me encantaría vivir estos momentos: ') + inspiration.plans[savedPlan].moments.map(m => pair(m.title)).join(' · ')); return; }
    if (b.id === 'remove-plan') { savedPlan = null; write('sanctuario-plan',null); updateSaved(); notebook(); return; }
    if (b.id === 'export-notebook') {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ version:1, savedAt:new Date().toISOString(), articles:saved, events:savedEvents, inspiration:savedPlan, stay },null,2)],{type:'application/json'}));
      const a = document.createElement('a'); a.href = url; a.download = 'el-sanctuario-notebook.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); return;
    }
  });
  $('#all-stories')?.addEventListener('click', () => { expanded = true; renderStories(); });
  $('#save-itinerary')?.addEventListener('click', () => { savedPlan = feeling; const ok = write('sanctuario-plan',feeling); updateSaved(); toast(ok ? t('Your next chapter is saved in your notebook.', 'Tu próximo capítulo está guardado en tu cuaderno.') : t('Kept for this visit only.', 'Guardado solo durante esta visita.')); });
  $('#search-trigger')?.addEventListener('click', () => { search(); show('search-dialog'); input('search-input').focus(); });
  $('#search-input')?.addEventListener('input', search);
  ['arrival','departure','property'].forEach(id => $('#' + id)?.addEventListener('change', () => {
    if (id === 'arrival') { input('departure').min = plusDays(input('arrival').value,1); if (input('departure').value <= input('arrival').value) input('departure').value = plusDays(input('arrival').value,3); }
    updateBookingLink();
  }));
  $('#booking-form')?.addEventListener('submit', e => {
    e.preventDefault(); if (!validStay()) return;
    const subject = t('My next stay — ', 'Mi próxima estancia — ') + input('property').value;
    const body = t('Hello La Casa Que Canta team,\n\nI would like to ask about a stay.\n', 'Hola, equipo de La Casa Que Canta:\n\nMe gustaría consultar una estancia.\n') + '\n' + t('Property: ', 'Propiedad: ') + input('property').value + '\n' + t('Arrival: ', 'Llegada: ') + input('arrival').value + '\n' + t('Departure: ', 'Salida: ') + input('departure').value + '\n\n' + input('stay-notes').value + '\n\n' + t('Please let me know availability and rates. Thank you!', '¿Me pueden compartir disponibilidad y tarifas? ¡Gracias!');
    window.location.href = 'mailto:sales.reservations@lacasaquecanta.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    $('#booking-result')!.textContent = t('A draft opens in your email app. Send it to request availability. Nothing has been sent by this website and no booking is confirmed.', 'Se abre un borrador en tu aplicación de correo. Envíalo para consultar disponibilidad. El sitio no ha enviado ningún mensaje ni confirmado una reserva.');
  });
  $('#newsletter-form')?.addEventListener('submit', async e => {
    e.preventDefault(); const form = e.currentTarget as HTMLFormElement, button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    if (button.disabled) return;
    const result = $('#newsletter-result')!, interests = $$<HTMLInputElement>('input[name=interest]:checked').map(i => i.value);
    if (!interests.length) { result.textContent = t('Choose at least one interest.', 'Elige al menos un interés.'); return; }
    button.disabled = true; result.textContent = t('Sending your request…', 'Enviando tu solicitud…');
    try {
      const response = await fetch('/api/newsletter', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email:input('newsletter-email').value, language:lang, interests, consent:input('newsletter-consent').checked, website:form.querySelector<HTMLInputElement>('[name=website]')!.value }), signal:AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error === 'awaiting_validation' || data.error === 'not_configured' ? t('Subscriptions are awaiting hotel approval.', 'Las inscripciones están pendientes de aprobación del hotel.') : data.error === 'rate_limited' ? t('Please wait before trying again.', 'Espera un momento antes de volver a intentarlo.') : t('The service could not accept your request. Please try again later.', 'El servicio no pudo aceptar la solicitud. Inténtalo más tarde.'));
      if (data.state !== 'pending' && data.state !== 'existing') throw new Error(t('The service returned an unexpected response.', 'El servicio devolvió una respuesta inesperada.'));
      result.textContent = data.state === 'pending' ? t('Check your inbox and confirm your subscription. You are not subscribed until you confirm.', 'Revisa tu correo y confirma tu suscripción. No estarás suscrito hasta confirmar.') : t('This address is already known. Use Preferences & unsubscribe, or check your confirmation email.', 'Ya existe un registro con esta dirección. Usa Preferencias y baja, o revisa tu correo de confirmación.');
      write('sanctuario-interests',interests); input('newsletter-email').value = '';
    } catch (error) { result.textContent = error instanceof Error && error.name !== 'TimeoutError' ? error.message : t('The service is unavailable. Please try again later.', 'El servicio no está disponible. Inténtalo más tarde.'); }
    finally { button.disabled = false; }
  });
  $$<HTMLDialogElement>('dialog').forEach(d => d.addEventListener('click', e => { if (e.target !== d) return; const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); }));
  $('#share-story')?.addEventListener('click', async () => {
    try { if (navigator.share) await navigator.share({ title:document.title,url:location.href }); else { await navigator.clipboard.writeText(location.href); toast(t('Story link copied.', 'Enlace copiado.')); } }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) toast(t('Copy the address from your browser to share this story.', 'Copia la dirección de tu navegador para compartir esta historia.')); }
  });
  let installEvent: any;
  $('#install-trigger')?.addEventListener('click', () => show('install-dialog'));
  window.addEventListener('beforeinstallprompt', (event: Event) => { event.preventDefault(); installEvent = event; if ($('#install-app')) $('#install-app')!.hidden = false; });
  $('#install-app')?.addEventListener('click', async () => { if (!installEvent) return; await installEvent.prompt(); await installEvent.userChoice; installEvent = undefined; $('#install-app')!.hidden = true; });
  function clock() { const el = $('#bay-time'); if (el) el.textContent = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX',{ timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',hour12:false }).format(new Date()) + ' · Zihuatanejo'; }
  async function weather() {
    if (!$('#weather-temp')) return;
    try {
      if (!navigator.onLine) throw Error('offline');
      const response = await fetch('/api/weather',{signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw Error('unavailable');
      const data = await response.json(), c = data.current, d = data.daily;
      if (!Number.isFinite(c?.temperature_2m) || Date.parse(data.expiresAt) <= Date.now()) throw Error('outdated');
      $('#weather-temp')!.innerHTML = `${Math.round(c.temperature_2m)}<span>°</span>`;
      const code = c.weather_code;
      $('.weather-top use')?.setAttribute('href',code === 0 ? '#i-sun' : code <= 48 ? '#i-cloud' : '#i-rain');
      $('#weather-description')!.textContent = code === 0 ? t('Clear skies over the coast','Cielo despejado en la costa') : code <= 3 ? t('Clouds drifting over the bay','Nubes sobre la bahía') : code >= 95 ? t('Thunderstorms in the area','Tormentas en la zona') : code >= 51 ? t('Rain along the coast','Lluvia en la costa') : t('A softer coastal sky','Un cielo costero más suave');
      $('#weather-sunset')!.textContent = d.sunset[0].slice(11,16); $('#weather-wind')!.textContent = Math.round(c.wind_speed_10m) + ' km/h'; $('#weather-feels')!.textContent = Math.round(c.apparent_temperature) + '°C';
      $('#weather-updated')!.textContent = t('Updated ', 'Actualizado ') + c.time.replace('T',' ') + ' · Zihua · °C';
      $('#forecast')!.innerHTML = d.time.slice(1,5).map((day: string,i: number) => `<div class="forecast-day"><span>${new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX',{weekday:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))}</span><strong>${Math.round(d.temperature_2m_max[i+1])}° / ${Math.round(d.temperature_2m_min[i+1])}°</strong></div>`).join('');
    } catch { $('#weather-temp')!.textContent = '—'; $('#weather-description')!.textContent = t('Weather temporarily unavailable','Clima temporalmente no disponible'); $('#weather-updated')!.textContent = t('Current conditions could not be loaded.','No se pudieron cargar los datos actuales.'); ['#weather-sunset','#weather-wind','#weather-feels'].forEach(s => { if ($(s)) $(s)!.textContent = '—'; }); $('#forecast')!.innerHTML = ''; }
  }
  const hour = Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Mexico_City',hour:'2-digit',hour12:false}).format(new Date()));
  mood(hour >= 6 && hour < 16 ? 'morning' : hour >= 16 && hour < 19 ? 'golden' : 'evening');
  updateSaved(); renderPlan(); clock(); void weather();
  setInterval(() => { if (!document.hidden) clock(); },30000);
  setInterval(() => { if (!document.hidden) void weather(); },15 * 60000);
  const connection = () => { if ($('#offline-notice')) $('#offline-notice')!.hidden = navigator.onLine; if (!navigator.onLine) void weather(); };
  window.addEventListener('online', () => { connection(); void weather(); }); window.addEventListener('offline',connection); connection();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(() => {}); });
}
