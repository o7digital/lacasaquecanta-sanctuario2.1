# El Sanctuario V2 · La Casa Que Canta

Revue EN/ES et espace client dans le dépôt existant : Astro, React, TypeScript, PostgreSQL et Better Auth. Branche de livraison : `codex/el-sanctuario-v2`.

- Preview : https://el-sanctuario-21.vercel.app/en/ — [Español](https://el-sanctuario-21.vercel.app/es/).
- Compte et démonstration : `/en/login/` ; espace personnel : `/en/account/`.
- Studio de la maison : `/admin/`.
- Préparation du séjour : vols d’arrivée et de départ, demandes de taxi/transfert, et [Cena romántica en la playa](https://el-sanctuario-21.vercel.app/es/experiences/romantic-beach-dinner/).
- [Cahier des charges V2](docs/El_Sanctuario_V2_Instructions_Codex.md), qui remplace le périmètre précédent.
- [Installation et administration](DEVELOPMENT.md).
- [État factuel de réception](PHASE1_DELIVERY.md).

La revue est publique, sans compte ChatGPT. Les données privées nécessitent un compte El Sanctuario vérifié. **Neon est maintenant relié au projet Vercel**. La commande de livraison ci-dessous migre explicitement cette base avant la compilation. L’inscription et la récupération des comptes réels restent fermées tant qu’un expéditeur d’e-mail vérifié n’est pas configuré. La démonstration privée utilise la base migrée avec `DEMO_ENABLED=true` et le secret d’identité.

Les vols enregistrés sont les informations fournies par le voyageur ; ils ne réservent aucun billet. Les taxis et le dîner sont des demandes à suivre, confirmées uniquement par la maison. Modifier un vol ne modifie pas une demande de taxi déjà envoyée.

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

La migration distante se déclenche explicitement pendant le déploiement, avec les secrets déjà présents dans Vercel :

```sh
vercel deploy --prod --yes --scope olivier-steineur --project el-sanctuario-21 --build-env SC_MIGRATE_ON_BUILD=true
```

Le script npm `prebuild` appelle `scripts/migrate-on-deploy.mjs`. Sans ce flag, aucune migration n’est lancée par la compilation. Les identifiants de la base distante ne sont pas copiés dans les fichiers locaux.

`dist/` et `El_Sanctuario.html` restent les références du prototype initial. Les sources actives sont `src/` et `public/`, la sortie compilée `build/` et `.vercel/output/`. Le site hôtelier existant appartient à un autre projet Vercel.
