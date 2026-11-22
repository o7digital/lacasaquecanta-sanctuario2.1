# El Sanctuario V2 · La Casa Que Canta

Revue EN/ES et espace client dans le dépôt existant : Astro, React, TypeScript, PostgreSQL et Better Auth. Branche de livraison : `codex/el-sanctuario-v2`.

- Preview : https://el-sanctuario-21.vercel.app/en/ — [Español](https://el-sanctuario-21.vercel.app/es/).
- Compte et démonstration : `/en/login/` ; espace personnel : `/en/account/`.
- Studio de la maison : `/admin/`.
- [Cahier des charges V2](docs/El_Sanctuario_V2_Instructions_Codex.md), qui remplace le périmètre précédent.
- [Installation et administration](DEVELOPMENT.md).
- [État factuel de réception](PHASE1_DELIVERY.md).

La revue est publique, sans compte ChatGPT. Les données privées nécessitent un compte El Sanctuario vérifié. Si la base ou le service d’e-mail manque, les fonctions correspondantes restent explicitement en attente d’activation. Aucun stockage temporaire ne remplace une synchronisation réelle.

## Démarrer

Node.js 24 LTS, npm et PostgreSQL 17 ou ultérieur. Avec Docker Desktop :

```sh
npm ci
npm run setup:local
npm run db:local
npm run db:migrate
npm run dev
```

Ouvrir `http://127.0.0.1:4321/en/` dans Firefox. Une base PostgreSQL existante peut remplacer Docker via `DATABASE_URL` dans `.env.local`.

```sh
npm run check
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Les tests d’intégration refusent les bases distantes. Les parcours navigateur utilisent Firefox. La lecture hors connexion se vérifie sur une compilation :

```sh
TEST_BASE_URL=https://el-sanctuario-21.vercel.app npm run test:e2e
```

`dist/` et `El_Sanctuario.html` restent les références du prototype initial. Les sources actives sont `src/` et `public/`, la sortie compilée `build/` et `.vercel/output/`. Le site hôtelier existant appartient à un autre projet Vercel.
