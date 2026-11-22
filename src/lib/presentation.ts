import { load } from 'cheerio';
import template from '../templates/journal.html?raw';
import { articlePath, categoryLabels, readingTime, type Article, type Content, type Locale } from './schema';
import { eventState, plusDays } from './travel';
import inspiration from '../data/inspiration.json';

export const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const newsletterEnabled = () => process.env.NEWSLETTER_ENABLED === 'true' && Boolean(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID && process.env.PUBLIC_NEWSLETTER_MANAGE_URL?.startsWith('https://'));
export function storyCard(article: Article, lang: Locale, index: number) {
  const text = article.locales[lang], title = escape(text.title), href = articlePath(lang, article.id);
  return `<article class="story-card ${index === 0 ? 'featured' : ''}" data-category="${article.category}"><div class="story-image"><a class="story-open" href="${href}"><img src="${escape(article.image.src)}" alt="${escape(article.image.alt[lang])}" loading="lazy"></a><button class="bookmark" data-save="${article.id}" aria-label="${lang === 'en' ? 'Save to notebook' : 'Guardar en el cuaderno'}" aria-pressed="false"><svg class="icon" aria-hidden="true"><use href="#i-bookmark"/></svg></button></div><div class="story-copy"><span class="story-category">${escape(categoryLabels[article.category][lang])}</span><a class="story-open" href="${href}"><h3>${title}</h3></a><p>${escape(text.intro)}</p><span class="story-meta">${readingTime(text.body)} ${lang === 'en' ? 'MIN READ' : 'MIN DE LECTURA'}</span></div></article>`;
}
export function journalMarkup(content: Content, lang: Locale, articleId?: string) {
  const $ = load(template, null, false);
  $('[data-en]').each((_, el) => { const node = $(el); node.html(node.attr(`data-${lang}`) || ''); });
  $('[data-placeholder-en]').each((_, el) => { const node = $(el); node.attr('placeholder', node.attr(lang === 'en' ? 'data-placeholder-en' : 'data-placeholder-es') || ''); });
  const t = (en: string, es: string) => lang === 'en' ? en : es;
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', hour12: false }).format(new Date()));
  const mood = hour >= 6 && hour < 16 ? 'morning' : hour >= 16 && hour < 19 ? 'golden' : 'evening';
  const cover = inspiration.moods[mood], index = lang === 'en' ? 0 : 1;
  $('#cover-title').html(cover.title[index]);
  $('#cover-description').text(cover.description[index]);
  $('#cover-image').attr('style', `background-image:url('/assets/${cover.image}')`);
  $('.mood-switch button').each((_, el) => { const node = $(el), active = node.attr('data-mood') === mood; node.toggleClass('active',active).attr('aria-pressed',String(active)); });
  $('#bay-time').text(new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',hour12:false }).format(new Date()) + ' · Zihuatanejo');
  const counterpart = articleId ? articlePath(lang === 'en' ? 'es' : 'en', articleId) : `/${lang === 'en' ? 'es' : 'en'}/`;
  $('#language').replaceWith(`<a class="language" id="language" href="${counterpart}" hreflang="${lang === 'en' ? 'es' : 'en'}" aria-label="${t('Cambiar a español', 'Switch to English')}">${lang.toUpperCase()} <span>/ ${lang === 'en' ? 'ES' : 'EN'}</span></a>`);
  $('.skip').text(t('Skip to the journal', 'Saltar a la revista'));
  $('.saved-trigger').attr('aria-label', t('Open your notebook', 'Abrir tu cuaderno'));
  $('#search-trigger').attr('aria-label', t('Search the journal', 'Buscar en la revista'));
  $('#search-input').attr('aria-label', t('Search stories', 'Buscar historias'));
  $('#story-grid').html(content.articles.slice(0, 3).map((a, i) => storyCard(a, lang, i)).join(''));
  $('#story-total').text(`${content.articles.length} ${t('stories to linger over', 'historias para leer sin prisa')}`);
  $('[data-story]').each((_, el) => {
    const node = $(el), id = node.attr('data-story')!;
    if (!content.articles.some(a => a.id === id)) { node.remove(); return; }
    node.replaceWith(`<a class="${escape(node.attr('class') || '')}" href="${articlePath(lang, id)}">${node.html()}</a>`);
  });
  $('.filter-row').append(`<button class="filter" data-filter="recipe" aria-pressed="false">${t('Recipes to keep', 'Recetas para guardar')}</button>`);
  const sailArt = $('.sail-illustration').first().prop('outerHTML');
  $('.event-grid').html(content.events.map(ev => {
    const state = eventState(ev), cancelled = state === 'cancelled', past = state === 'past';
    const date = (day: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'));
    const label = cancelled ? t('Cancelled', 'Cancelado') : past ? t('Past event', 'Evento pasado') : t('Upcoming', 'Próximamente');
    const category = {music:t('Music','Música'),community:t('Community','Comunidad'),culture:t('Culture','Cultura')}[ev.category];
    return `<article class="event-card" data-event-status="${state}">${ev.id === 'sail' && sailArt ? sailArt : `<div class="event-image"><img src="/assets/${ev.id === 'guitar' ? 'guitar' : 'bay'}.jpg" alt="" loading="lazy"></div>`}<div class="event-body"><p class="eyebrow">${escape(date(ev.start))} – ${escape(date(plusDays(ev.end, -1)))} · ${label}</p><h3>${escape(ev.title[lang])}</h3><p>${escape(ev.description[lang])}</p><p class="caption">${escape(ev.location[lang])} · ${category}</p><a class="source-link" href="${escape(ev.source)}" target="_blank" rel="noopener">${t('Organizer & programme', 'Organizador y programa')}</a><p class="caption">${t('Last checked', 'Última revisión')}: ${date(ev.verifiedAt)}</p><div class="event-actions"><a class="text-link" href="/api/events/${ev.id}.ics?lang=${lang}">${t('Add to calendar', 'Añadir al calendario')}</a><button class="text-link" data-save-event="${ev.id}" aria-pressed="false">${t('Keep this event', 'Guardar evento')}</button>${!cancelled && !past ? `<button class="text-link" data-event="${ev.id}">${t('Plan a stay around it', 'Planear una estancia')}</button>` : ''}</div></div></article>`;
  }).join(''));
  $('.agenda-year').text([...new Set(content.events.map(e => e.start.slice(0,4)))].sort().join(' · '));
  const chef = content.articles.find(a => a.category === 'chef');
  if (chef) {
    $('.chef-copy > p:not(.eyebrow)').text(chef.locales[lang].intro);
    $('.chef-copy a.pill').attr('href',articlePath(lang,chef.id));
    if (chef.locales[lang].title !== t('The sea writes the first line.','El mar escribe la primera línea.')) $('.chef-copy h2').text(chef.locales[lang].title);
    if (chef.status === 'published') $('.chef-copy .editorial-disclosure').remove();
  } else $('#chef').remove();
  $('#reader').remove();
  $('#newsletter-form input[value="zihua"]').attr('value', 'culture');
  $('.newsletter-interests').append(`<label><input type="checkbox" name="interest" value="hotel"><span>${t('News from the house', 'Noticias de la casa')}</span></label>`);
  $('#newsletter-form .preview-note').remove();
  $('#newsletter-form').append(`<label class="consent"><input type="checkbox" id="newsletter-consent" required><span>${t('I agree to receive the journal by email. I can unsubscribe at any time.', 'Acepto recibir la revista por correo. Puedo darme de baja cuando quiera.')} <a href="https://www.lacasaquecanta.com/privacy-policy" target="_blank" rel="noopener">${t('Privacy', 'Privacidad')}</a></span></label><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>`);
  $('#newsletter-email').attr('maxlength', '254');
  if (!newsletterEnabled()) {
    $('#newsletter-form button[type=submit]').attr('disabled', 'disabled').text(t('Awaiting activation', 'Pendiente de activación'));
    $('#newsletter-form').append(`<p class="preview-note">${t('The journal by email is awaiting hotel approval. Subscriptions are not open yet.', 'La revista por correo está pendiente de aprobación del hotel. Las inscripciones aún no están abiertas.')}</p>`);
    $('#newsletter-email').attr('disabled', 'disabled');
    $('#newsletter-consent').attr('disabled', 'disabled');
  } else {
    $('#newsletter-form').append(`<p class="preview-note">${t('Confirm your subscription in the email we send you.', 'Confirma tu suscripción desde el correo que recibirás.')}</p>`);
    const manage = process.env.PUBLIC_NEWSLETTER_MANAGE_URL!;
    $('#newsletter-form').append(`<a class="source-link" href="${escape(manage)}" target="_blank" rel="noopener">${t('Preferences & unsubscribe', 'Preferencias y baja')}</a>`);
  }
  $('#booking-form button[type=submit]').before(`<button type="button" class="text-link" id="keep-stay">${t('Keep these dates in my notebook', 'Guardar estas fechas en mi cuaderno')}</button>`);
  $('#stay-notes').attr('maxlength', '2000');
  $('.footer-links').append(`<a href="/admin/">${t('Editorial studio', 'Estudio editorial')}</a>`);
  $('.journal-nav').after(`<p id="offline-notice" class="offline-note wrap" role="status" hidden>${t('Offline edition. Weather is unavailable and event details may have changed. Last editorial update:', 'Edición sin conexión. El clima no está disponible y los eventos pueden haber cambiado. Última actualización editorial:')} ${content.articles.map(a => a.updatedAt).sort().at(-1) || ''}</p>`);
  $('#newsletter-email').attr('aria-label', t('Email address', 'Correo electrónico'));
  $('.newsletter-interests legend').text(t('Your interests', 'Tus intereses'));
  $('button[data-close="notebook"]').attr('aria-label', t('Close notebook', 'Cerrar cuaderno'));
  $('button[data-close="booking"]').attr('aria-label', t('Close planning form', 'Cerrar planificación'));
  $('button[data-close="search-dialog"]').attr('aria-label', t('Close search', 'Cerrar búsqueda'));
  $('button[data-close="install-dialog"]').attr('aria-label', t('Close', 'Cerrar'));
  $('.filter-row').attr('aria-label',t('Filter stories','Filtrar historias'));
  if (lang === 'es') {
    const descriptions: Record<string,string> = { 'dish.jpg':'Un plato de la colección fotográfica de La Casa Que Canta', 'bay.jpg':'La terraza junto a la bahía de Zihuatanejo', 'ensueno.jpg':'Alberca privada y terraza de El Ensueño', 'murmullo.jpg':'La terraza de El Murmullo frente a la bahía' };
    $('img').each((_,el) => { const node = $(el), name = node.attr('src')?.split('/').at(-1) || ''; if (descriptions[name]) node.attr('alt',descriptions[name]); });
  }
  $('.event-disclaimer').text(t('Independent events, not organized by the hotel. Confirm dates and programmes with the organizers before booking travel.', 'Eventos independientes, no organizados por el hotel. Confirma fechas y programas con los organizadores antes de reservar tu viaje.'));
  $('dialog').each((_, el) => {
    const node = $(el), title = node.find('h2').first();
    if (title.length) { title.attr('id', `${node.attr('id')}-title`); node.attr('aria-labelledby', `${node.attr('id')}-title`); }
  });
  // One template owns the journal and shared dialogs; reading pages only need
  // its symbols, notebook, search, stay planner and mobile navigation.
  if (articleId) {
    const shared = $('.svg-library, dialog, #toast, .mobile-nav').map((_, el) => $.html(el)).get().join('');
    const fragment = load(shared, null, false);
    fragment('a[href^="#"]').each((_, el) => { const node = fragment(el); node.attr('href', `/${lang}/${node.attr('href')}`); });
    return fragment.html();
  }
  return $.html();
}
