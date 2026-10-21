import { spawn } from "node:child_process";
if(process.argv.includes("--smtp"))process.env.TEST_SMTP="true";
const children = [];
const start = (args, env = {}) => {
  const p = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(p);
  return p;
};
try {
  start(["tests/db-server.mjs"]);
  if(process.env.TEST_SMTP==="true")start(["tests/smtp-server.mjs"]);
  start(
    ["dist/server.js"],
    {
      HOSTNAME:"127.0.0.1",
      DATABASE_URL: "postgresql://postgres@127.0.0.1:55432/postgres",
      APP_URL: "http://localhost:3000",
      MAIL_MODE: process.env.TEST_SMTP==="true"?"smtp":"log",
      SMTP_HOST:"127.0.0.1",SMTP_PORT:"2526",SMTP_USER:"test",SMTP_PASSWORD:"test",SMTP_REQUIRE_TLS:"false",MAIL_FROM:"contact@sali-digicom.com",
      POPCARD_ORDERS_ENABLED: "true",
      POPCARD_BANK_HOLDER: "Test",
      POPCARD_BANK_RIB: "123",
    },
  );
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch("http://localhost:3000/api/config");
      if (r.ok) {
        const net = await import("node:net");
        await new Promise((resolve, reject) => {
          const s = net.connect(55432, "127.0.0.1");
          s.on("connect", () => {
            s.end();
            resolve(null);
          });
          s.on("error", reject);
        });
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!ready) throw Error("Serveurs de test indisponibles.");
  for (const file of ["tests/integration.mjs", "tests/security.mjs"]) {
    const child = start([file]);
    const code = await new Promise((resolve) => child.on("exit", resolve));
    if (code !== 0) throw Error("Échec du test : " + file);
  }
} finally {
  for (const p of children) p.kill("SIGTERM");
}
