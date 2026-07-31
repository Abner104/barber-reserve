// Config de PM2 para el servidor de email. Los secretos NO pasan por acá ni por
// variables de entorno de PM2 — email-server.cjs los lee directo de
// vps/secrets.local.cjs.
//
// Arranca vía start-email.sh (bash), no directo el .cjs con interpreter node:
// PM2 7.x tiene un auto-loader de env interno que interfiere con process.env
// cuando el script arranca directo con Node — pasar por un wrapper de shell
// lo evita.
module.exports = {
  apps: [
    {
      name: "clippr-email",
      script: "./start-email.sh",
      cwd: __dirname,
      interpreter: "bash",
    },
  ],
};
