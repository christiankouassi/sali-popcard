import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp(".next/standalone", "dist", { recursive: true });
await cp("public", "dist/public", { recursive: true });
await cp(".next/static", "dist/.next/static", { recursive: true });
await mkdir("dist/scripts", { recursive: true });
for (const name of ["migrate.mjs", "admin.mjs", "schema.sql"])
  await cp("scripts/" + name, "dist/scripts/" + name);
await cp(".env.example", "dist/.env.example");
const pkg = JSON.parse(await readFile("dist/package.json", "utf8"));
pkg.scripts = {
  start: "node server.js",
  "db:migrate": "node scripts/migrate.mjs",
  admin: "node scripts/admin.mjs",
};
await writeFile("dist/package.json", JSON.stringify(pkg, null, 2) + "\n");
await writeFile(
  "dist/LISEZMOI.txt",
  `SALI DigiCom PopCard — build Next.js 2.3.0\n\nCe dossier contient le serveur Node.js compilé, ses dépendances et les fichiers frontend. Il ne contient pas de données clients ni de secrets.\n\nCible : hébergement Node.js sous Linux x64, Node.js 22 LTS ou 24. Ce build utilise le mode standalone documenté par Next.js : https://nextjs.org/docs/app/api-reference/config/next-config-js/output\n\n1. Conserver vos variables de production (DATABASE_URL, APP_URL, SMTP et réglages métier). Ne remplacez pas votre fichier .env.local existant. .env.example sert de référence.\n2. Créer/connecter PostgreSQL. Si les variables sont déjà dans l’environnement : node scripts/migrate.mjs. Avec .env.local : node --env-file=.env.local scripts/migrate.mjs.\n3. Démarrer : node server.js. Avec un fichier d’environnement local : node --env-file=.env.local server.js. PORT est configurable.\n4. APP_URL doit être l’URL HTTPS exacte. Configurer SMTP pour les envois réels.\n5. Promouvoir l’administrateur : node --env-file=.env.local scripts/admin.mjs votre-email@example.com (ou sans --env-file si les variables sont chargées par le serveur).\n\nCe n’est pas un site statique à déposer uniquement sur Apache/PHP. Cette mise à jour réutilise votre PostgreSQL et votre boîte email existants. Aucun secret ni donnée de production ne figure dans cette livraison.\n\nLe ZIP du projet source contient le code modifiable et les tests. Le rapport de recette figure dans le ZIP source.\n`,
);
console.log("Build Node.js prêt dans dist/.");

// Fail packaging if any generated manifest was truncated.
for (const relative of [
  "build-manifest.json",
  "required-server-files.json",
  "routes-manifest.json",
  "prerender-manifest.json",
  "server/pages-manifest.json",
  "server/app-paths-manifest.json",
]) {
  JSON.parse(await readFile("dist/.next/" + relative, "utf8"));
}
console.log("Manifestes du serveur compilé vérifiés.");
