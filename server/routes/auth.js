/* ANIMAL — Login, sesión y cambio de contraseña */

const express = require("express");
const { one, run } = require("../db");
const A = require("../auth");
const { HttpError } = require("../util");

const r = express.Router();

r.post("/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) throw new HttpError(400, "Ingresá tu email y contraseña.");
  if (A.bloqueado(email)) throw new HttpError(429, "Demasiados intentos. Esperá 10 minutos.");

  const u = one("SELECT id, password_hash, activo FROM usuarios WHERE email = ?", email);
  if (!u || !u.activo || !A.verifyPassword(password, u.password_hash)) {
    A.registrarFallo(email);
    throw new HttpError(401, "Email o contraseña incorrectos.");
  }
  A.limpiarFallos(email);
  A.crearSesion(res, u.id, req.body?.recordar === true);
  const me = one("SELECT id, nombre, apellido, email, rol, matricula, tutor_id FROM usuarios WHERE id = ?", u.id);
  res.json(me);
});

r.post("/logout", (req, res) => {
  A.cerrarSesion(req, res);
  res.json({ ok: true });
});

r.get("/me", A.requiere(), (req, res) => {
  const { expira, ...me } = req.user;
  res.json(me);
});

r.post("/me/password", A.requiere(), (req, res) => {
  const actual = String(req.body?.actual || "");
  const nueva = String(req.body?.nueva || "");
  if (nueva.length < 8) throw new HttpError(400, "La nueva contraseña debe tener al menos 8 caracteres.");
  const u = one("SELECT password_hash FROM usuarios WHERE id = ?", req.user.id);
  if (!A.verifyPassword(actual, u.password_hash)) throw new HttpError(400, "La contraseña actual no es correcta.");
  run("UPDATE usuarios SET password_hash = ? WHERE id = ?", A.hashPassword(nueva), req.user.id);
  res.json({ ok: true });
});

module.exports = r;
