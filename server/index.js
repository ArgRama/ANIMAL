/* =========================================================================
   ANIMAL — Servidor
   npm start  ->  http://localhost:3210
   ========================================================================= */

const path = require("node:path");
const express = require("express");
const { one } = require("./db");
const { sesion } = require("./auth");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" })); // fotos y adjuntos (hasta 8 MB) viajan en base64

app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
  });
  next();
});

// Protección CSRF: toda escritura en la API debe venir como JSON (un formulario
// de otro sitio no puede enviar application/json sin pasar por CORS).
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method) && !req.is("application/json")) {
    return res.status(415).json({ error: "Se esperaba JSON." });
  }
  next();
});

app.use("/api", sesion);
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/admin"));
app.use("/api", require("./routes/turnos"));
app.use("/api", require("./routes/portal"));
app.use("/api", require("./routes/extras"));
app.use("/api", require("./routes/cobros").router);
app.use("/api", require("./routes/solicitudes"));
app.use("/api", require("./routes/perfil"));
app.use("/api", require("./routes/pacientes"));
app.use("/api", (_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

app.use(express.static(path.join(__dirname, "..", "public"), { extensions: ["html"] }));

// Errores: los HttpError llevan su status; el resto es 500.
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido." });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const msg = status >= 500
    ? (String(err.message).includes("UNIQUE") ? "Ya existe un registro con esos datos." : "Error interno del servidor.")
    : err.message;
  res.status(status).json({ error: msg });
});

// Primer arranque: si la base está vacía, carga los datos de demostración.
if (!one("SELECT id FROM usuarios LIMIT 1")) {
  console.log("Base vacía: cargando datos de demostración…");
  require("./seed").seed();
}

const PORT = Number(process.env.PORT) || 3210;
const HOST = process.env.HOST || "127.0.0.1";
app.listen(PORT, HOST, () => console.log(`ANIMAL listo en http://localhost:${PORT}`));
