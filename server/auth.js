/* =========================================================================
   ANIMAL — Autenticación y permisos
   · Contraseñas con scrypt (crypto nativo).
   · Sesión en cookie httpOnly; en la base se guarda sólo el hash del token.
   · Roles: director · veterinario · recepcion · tutor
   ========================================================================= */

const crypto = require("node:crypto");
const { one, run } = require("./db");

const COOKIE = "hv_sesion";
const DURACION_HORAS = 12;
const DIAS_RECORDAR = 30;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(pw, stored) {
  const [alg, salt, hash] = (stored || "").split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const calc = crypto.scryptSync(pw, Buffer.from(salt, "hex"), 64);
  const want = Buffer.from(hash, "hex");
  return want.length === calc.length && crypto.timingSafeEqual(calc, want);
}

const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

// "Recordarme": la sesión dura 30 días y sobrevive al cerrar el navegador.
// Sin recordar: cookie de sesión (se borra al cerrar) y 12 h como máximo.
function crearSesion(res, usuarioId, recordar = false) {
  const token = crypto.randomBytes(32).toString("hex");
  const ms = (recordar ? DIAS_RECORDAR * 24 : DURACION_HORAS) * 3600 * 1000;
  const expira = new Date(Date.now() + ms).toISOString();
  run("INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES (?, ?, ?)", sha(token), usuarioId, expira);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(recordar ? { maxAge: ms } : {}),
  });
}

function cerrarSesion(req, res) {
  const token = leerCookie(req);
  if (token) run("DELETE FROM sesiones WHERE token_hash = ?", sha(token));
  res.clearCookie(COOKIE);
}

function leerCookie(req) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

// Middleware: adjunta req.user si hay una sesión válida.
function sesion(req, _res, next) {
  const token = leerCookie(req);
  if (token) {
    const u = one(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.matricula, u.tutor_id, u.foto IS NOT NULL AS tiene_foto, s.expira
         FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = ? AND u.activo = 1`,
      sha(token)
    );
    if (u && u.expira > new Date().toISOString()) req.user = u;
  }
  next();
}

// Middleware: exige sesión y (opcional) uno de los roles indicados.
function requiere(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Sesión expirada. Volvé a ingresar." });
    if (roles.length && !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tenés permiso para esta acción." });
    }
    next();
  };
}

/* ---------- Límite de intentos de login (en memoria) ---------- */
const intentos = new Map();
function bloqueado(clave) {
  const i = intentos.get(clave);
  return i && i.n >= 5 && Date.now() - i.t < 10 * 60 * 1000;
}
function registrarFallo(clave) {
  const i = intentos.get(clave) || { n: 0, t: Date.now() };
  if (Date.now() - i.t > 10 * 60 * 1000) { i.n = 0; i.t = Date.now(); }
  i.n += 1;
  intentos.set(clave, i);
}
const limpiarFallos = (clave) => intentos.delete(clave);

// Contraseña temporal legible (sin caracteres ambiguos).
function passwordTemporal() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(8), (b) => abc[b % abc.length]).join("");
}

// Limpieza periódica de sesiones vencidas.
setInterval(() => run("DELETE FROM sesiones WHERE expira < ?", new Date().toISOString()), 3600 * 1000).unref();

module.exports = {
  hashPassword, verifyPassword, crearSesion, cerrarSesion, sesion, requiere,
  bloqueado, registrarFallo, limpiarFallos, passwordTemporal,
};
