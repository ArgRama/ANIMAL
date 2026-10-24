/* =========================================================================
   ANIMAL — "Mi usuario": perfil del profesional, foto y documentos
   · Cada usuario del equipo edita su propio perfil; el director, el de todos.
   · DNI, título y matrícula: los ven sólo el dueño y el director.
   · La firma la puede ver cualquier usuario con sesión (va impresa en
     recetas, certificados y consentimientos que también ve el tutor).
   ========================================================================= */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");
const { one, all, run, update, auditar, DOCUMENTOS_DIR } = require("../db");
const { requiere } = require("../auth");
const { HttpError, datos, idParam } = require("../util");

const r = express.Router();
const STAFF = requiere("director", "veterinario", "recepcion");
const TIPOS_DOC = ["dni_frente", "dni_dorso", "titulo", "matricula", "firma"];
const MIMES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX = 4 * 1024 * 1024;

const PERFIL = {
  nombre: "texto", apellido: "texto", dni: "texto", fecha_nac: "fecha", cuit: "texto", telefono: "texto", email: "texto",
  tipo_matricula: "enum:nacional|provincial", matricula: "texto", ente_matricula: "texto", especialidad: "texto",
  pais: "texto", provincia: "texto", ciudad: "texto",
};

// Usuario a editar: el propio, o cualquiera del equipo si es director.
function objetivo(req) {
  const id = req.query.id ? idParam(req.query.id) : req.user.id;
  if (id !== req.user.id && req.user.rol !== "director") throw new HttpError(403, "Sólo el director puede editar a otros usuarios.");
  const u = one("SELECT * FROM usuarios WHERE id = ? AND rol <> 'tutor'", id);
  if (!u) throw new HttpError(404, "Usuario no encontrado.");
  return u;
}

const borrar = (archivo) => archivo && fs.rm(path.join(DOCUMENTOS_DIR, path.basename(archivo)), { force: true }, () => {});

function leerArchivo(body, { soloImagen = false } = {}) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(body?.data || ""));
  if (!m || !MIMES[m[1]] || (soloImagen && m[1] === "application/pdf")) {
    throw new HttpError(400, soloImagen ? "Formato no válido: usá JPG, PNG o WEBP." : "Formato no válido: usá una imagen (JPG, PNG, WEBP) o PDF.");
  }
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX) throw new HttpError(413, "El archivo supera los 4 MB.");
  return { mime: m[1], ext: MIMES[m[1]], buf };
}

/* ---------- Perfil ---------- */
r.get("/perfil", STAFF, (req, res) => {
  const { password_hash, tutor_id, ...u } = objetivo(req);
  u.documentos = all("SELECT tipo, mime, actualizado FROM usuario_documentos WHERE usuario_id = ?", u.id);
  u.clinica = one("SELECT nombre FROM clinica WHERE id = 1")?.nombre || "";
  u.editable_dni = !u.dni || req.user.rol === "director";
  res.json(u);
});

r.put("/perfil", STAFF, (req, res) => {
  const u = objetivo(req);
  const d = datos(req.body, PERFIL, { parcial: true });
  if ("nombre" in d && !d.nombre) throw new HttpError(400, "El nombre es obligatorio.");
  if ("apellido" in d && !d.apellido) throw new HttpError(400, "El apellido es obligatorio.");
  // El DNI, una vez cargado, sólo lo corrige el director.
  if ("dni" in d && u.dni && d.dni !== u.dni && req.user.rol !== "director") delete d.dni;
  if ("dni" in d && d.dni && !/^\d{6,9}$/.test(d.dni.replace(/\./g, ""))) throw new HttpError(400, "El DNI debe tener entre 6 y 9 números.");
  if (d.dni) d.dni = d.dni.replace(/\./g, "");
  if (d.cuit && !/^\d{11}$/.test(d.cuit.replace(/[-\s]/g, ""))) throw new HttpError(400, "El CUIT debe tener 11 números.");
  if (d.cuit) d.cuit = d.cuit.replace(/[-\s]/g, "");
  if ("email" in d) {
    d.email = (d.email || "").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new HttpError(400, "Ingresá un email válido.");
    if (one("SELECT id FROM usuarios WHERE email = ? AND id <> ?", d.email, u.id)) throw new HttpError(409, "Ese email ya lo usa otro usuario.");
  }
  if (u.rol === "veterinario" && "matricula" in d && !d.matricula) throw new HttpError(400, "La matrícula es obligatoria para veterinarios (figura en las recetas).");
  update("usuarios", u.id, d);
  auditar(req.user.id, "modificacion", "usuarios", u.id, null, { ...u, password_hash: undefined }, { ...u, ...d, password_hash: undefined });
  res.json({ ok: true });
});

/* ---------- Foto de perfil ---------- */
r.post("/perfil/foto", STAFF, (req, res) => {
  const u = objetivo(req);
  const { ext, buf } = leerArchivo(req.body, { soloImagen: true });
  const archivo = `u${u.id}-foto-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(DOCUMENTOS_DIR, archivo), buf);
  update("usuarios", u.id, { foto: archivo });
  borrar(u.foto);
  res.json({ ok: true });
});

r.delete("/perfil/foto", STAFF, (req, res) => {
  const u = objetivo(req);
  update("usuarios", u.id, { foto: null });
  borrar(u.foto);
  res.json({ ok: true });
});

r.get("/usuarios/:id/foto", requiere(), (req, res) => {
  const u = one("SELECT foto FROM usuarios WHERE id = ? AND rol <> 'tutor'", idParam(req.params.id));
  if (!u?.foto) throw new HttpError(404, "Sin foto.");
  res.set("Cache-Control", "private, max-age=3600");
  res.sendFile(path.join(DOCUMENTOS_DIR, u.foto));
});

/* ---------- Documentos (DNI, título, matrícula, firma) ---------- */
const tipoDoc = (t) => {
  if (!TIPOS_DOC.includes(t)) throw new HttpError(400, "Tipo de documento inválido.");
  return t;
};

r.post("/perfil/documentos/:tipo", STAFF, (req, res) => {
  const u = objetivo(req);
  const tipo = tipoDoc(req.params.tipo);
  const { mime, ext, buf } = leerArchivo(req.body, { soloImagen: tipo === "firma" });
  const archivo = `u${u.id}-${tipo}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(DOCUMENTOS_DIR, archivo), buf);
  const previo = one("SELECT archivo FROM usuario_documentos WHERE usuario_id = ? AND tipo = ?", u.id, tipo);
  run(`INSERT INTO usuario_documentos (usuario_id, tipo, archivo, mime) VALUES (?, ?, ?, ?)
       ON CONFLICT (usuario_id, tipo) DO UPDATE SET archivo = excluded.archivo, mime = excluded.mime,
         actualizado = datetime('now','localtime')`, u.id, tipo, archivo, mime);
  borrar(previo?.archivo);
  auditar(req.user.id, "alta", "usuario_documentos", u.id, null, null, { tipo });
  res.json({ ok: true });
});

r.delete("/perfil/documentos/:tipo", STAFF, (req, res) => {
  const u = objetivo(req);
  const tipo = tipoDoc(req.params.tipo);
  const previo = one("SELECT archivo FROM usuario_documentos WHERE usuario_id = ? AND tipo = ?", u.id, tipo);
  run("DELETE FROM usuario_documentos WHERE usuario_id = ? AND tipo = ?", u.id, tipo);
  borrar(previo?.archivo);
  auditar(req.user.id, "baja", "usuario_documentos", u.id, null, { tipo }, null);
  res.json({ ok: true });
});

r.get("/usuarios/:id/documentos/:tipo", requiere(), (req, res) => {
  const id = idParam(req.params.id);
  const tipo = tipoDoc(req.params.tipo);
  // Documentos personales: sólo el dueño o el director. La firma es visible para imprimir documentos.
  if (tipo !== "firma" && req.user.id !== id && req.user.rol !== "director") throw new HttpError(404, "Documento no encontrado.");
  const doc = one("SELECT archivo, mime FROM usuario_documentos WHERE usuario_id = ? AND tipo = ?", id, tipo);
  if (!doc) throw new HttpError(404, "Documento no encontrado.");
  // DNI, título y matrícula: nunca en caché (en una PC compartida el próximo usuario no debe verlos).
  res.set({ "Content-Type": doc.mime, "Cache-Control": tipo === "firma" ? "private, max-age=600" : "no-store" });
  res.sendFile(path.join(DOCUMENTOS_DIR, doc.archivo));
});

module.exports = r;
