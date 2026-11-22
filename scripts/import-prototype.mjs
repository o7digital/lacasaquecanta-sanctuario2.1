// One-time, reproducible import. The supplied dist/ stays an untouched reference.
import fs from 'node:fs';
import vm from 'node:vm';
import Turndown from 'turndown';
const code = fs.readFileSync('dist/app.js', 'utf8');
const stories = JSON.parse(vm.runInNewContext(code.slice(code.indexOf('const stories ='), code.indexOf('saved = saved.filter')) + ';JSON.stringify(stories)'));
const markdown = new Turndown({ headingStyle: 'atx' });
const articles = stories.map((s, i) => ({
  id: s.id, category: s.id === 'chef' ? 'chef' : s.id === 'house' ? 'hotel' : s.category,
  status: 'sample', featured: i === 0,
  author: { en: 'El Sanctuario · editorial sample', es: 'El Sanctuario · muestra editorial' },
  date: '2026-11-20', updatedAt: '2026-11-22',
  image: { src: '/assets/' + s.image, alt: { en: s.title[0], es: s.title[1] }, credit: 'La Casa Que Canta', source: s.source },
  source: s.source,
  locales: Object.fromEntries(['en', 'es'].map((l, index) => [l, { title: s.title[index], intro: s.description[index], body: markdown.turndown(s.body[l]) }])),
}));
const chef = articles[0];
const recipe = { ...structuredClone(chef), id: 'avocado-lime', category: 'recipe', featured: false, image: { ...chef.image, src: '/assets/ingredients.jpg' } };
recipe.locales.en = { title: 'A little taste of the coast.', intro: 'Avocado, lime and herbs: an editorial recipe to keep for a quiet lunch.', body: '**Editorial recipe for review. This is not an official hotel recipe.**\n\n' + chef.locales.en.body.split('### For your table: avocado, lime & herbs')[1].split('### And when you come back')[0] };
recipe.locales.es = { title: 'Un pequeño sabor de la costa.', intro: 'Aguacate, limón y hierbas: una receta editorial para guardar y disfrutar sin prisa.', body: '**Receta editorial para revisión. No es una receta oficial del hotel.**\n\n' + chef.locales.es.body.split('### Para tu mesa: aguacate, limón y hierbas')[1].split('### Y cuando regreses')[0] };
articles.push(recipe);
const events = [
  { id: 'guitar', title: { en: 'Zihuatanejo International Guitar Festival', es: 'Festival Internacional de Guitarra de Zihuatanejo' }, description: { en: 'A week of guitar music around the bay. Check the final programme with the organizer before arranging travel.', es: 'Una semana de música de guitarra junto a la bahía. Confirma el programa final con el organizador antes de viajar.' }, location: { en: 'Zihuatanejo, Guerrero, Mexico', es: 'Zihuatanejo, Guerrero, México' }, start: '2027-03-06', end: '2027-03-14', status: 'scheduled', source: 'https://www.zihuafest.com/', verifiedAt: '2026-11-22', category: 'music' },
  { id: 'sail', title: { en: 'Por Los Niños Sailfest', es: 'Por Los Niños Sailfest' }, description: { en: 'Sailing, music and community events supporting children’s education. Organized by Por Los Niños; confirm individual activities with the organizer.', es: 'Vela, música y encuentros comunitarios en apoyo a la educación. Organiza Por Los Niños; confirma cada actividad con el organizador.' }, location: { en: 'Zihuatanejo, Guerrero, Mexico', es: 'Zihuatanejo, Guerrero, México' }, start: '2027-02-14', end: '2027-02-28', status: 'scheduled', source: 'https://www.zihuatanejo-sailfest.com/copy-of-home-1', verifiedAt: '2026-11-22', category: 'community' },
];
fs.writeFileSync('src/data/journal.json', JSON.stringify({ version: 1, articles, events }, null, 2) + '\n');
const inspiration = vm.runInNewContext(code.slice(code.indexOf('const moods ='), code.indexOf('if(!plans[savedPlan])')) + ';JSON.stringify({moods,plans})');
fs.writeFileSync('src/data/inspiration.json', inspiration + '\n');
fs.mkdirSync('src/templates', { recursive: true });
fs.writeFileSync('src/templates/journal.html', fs.readFileSync('dist/index.html', 'utf8').split('<body>')[1].split('</body>')[0]);
console.log(`Imported ${articles.length} editorial samples, original cover moods, itineraries and two events.`);
