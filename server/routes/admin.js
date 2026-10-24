/* =========================================================================
   ANIMAL — Clínica, usuarios, inicio y reportes
   Usuarios y reportes: sólo director.
   ========================================================================= */

const express = require("express");
const { one, all, insert, update, run } = require("../db");
const { requiere, hashPassword, passwordTemporal } = require("../auth");
const { HttpError, datos, requeridos, idParam } = require("../util");
const { GRUPOS, ESPECIES, hoyISO, sumarDias } = require("../catalogo");
const { rango, vacunasVencidas, datosReporte } = require("../reportes");

const r = express.Router();
const DIRECTOR = requiere("director");
const STAFF = requiere("director", "veterinario", "recepcion");

/* ---------- Catálogo de especies (para formularios) ---------- */
r.get("/catalogo", requiere(), (_req, res) => {
  res.json({ grupos: GRUPOS, especies: ESPECIES });
});

/* ---------- Datos de la clínica ---------- */
const CLINICA = { nombre: "texto", direccion: "texto", ciudad: "texto", provincia: "texto", telefono: "texto", email: "texto", cuit: "texto" };

// Público (pantalla de login): sólo nombre y teléfono, para el botón de ayuda.
r.get("/contacto", (_req, res) => {
  const c = one("SELECT nombre, telefono FROM clinica WHERE id = 1");
  res.json({ nombre: c?.nombre || "ANIMAL", telefono: c?.telefono || null });
});

r.get("/clinica", requiere(),(_req, res) => res.json(one("SELECT * FROM clinica WHERE id = 1") || {}));

r.put("/clinica", DIRECTOR, (req, res) => {
  const c = datos(req.body, CLINICA);
  requeridos(c, ["nombre"]);
  if (one("SELECT id FROM clinica WHERE id = 1")) update("clinica", 1, c);
  else insert("clinica", { id: 1, ...c });
  res.json({ ok: true });
});

/* ---------- Usuarios del equipo ---------- */
const USUARIO = { nombre: "texto", apellido: "texto", email: "texto", rol: "enum:director|veterinario|recepcion", matricula: "texto", activo: "bool" };

r.get("/usuarios", DIRECTOR, (_req, res) => {
  res.json(all(
    `SELECT id, nombre, apellido, email, rol, matricula, activo, creado FROM usuarios
      WHERE rol <> 'tutor' ORDER BY activo DESC, rol, apellido`));
});

r.post("/usuarios", DIRECTOR, (req, res) => {
  const u = datos(req.body, USUARIO);
  requeridos(u, ["nombre", "apellido", "email", "rol"]);
  u.email = u.email.toLowerCase();
  if (u.rol === "veterinario" && !u.matricula) throw new HttpError(400, "El veterinario necesita número de matrícula (figura en las recetas).");
  if (one("SELECT id FROM usuarios WHERE email = ?", u.email)) throw new HttpError(409, "Ya existe un usuario con ese email.");
  const clave = passwordTemporal();
  const id = insert("usuarios", { ...u, activo: 1, password_hash: hashPassword(clave) });
  res.status(201).json({ id, clave });
});

r.put("/usuarios/:id", DIRECTOR, (req, res) => {
  const id = idParam(req.params.id);
  const actual = one("SELECT * FROM usuarios WHERE id = ? AND rol <> 'tutor'", id);
  if (!actual) throw new HttpError(404, "Usuario no encontrado.");
  const c = datos(req.body, USUARIO, { parcial: true });
  if (c.email) c.email = c.email.toLowerCase();
  if (id === req.user.id && (c.activo === 0 || (c.rol && c.rol !== "director"))) {
    throw new HttpError(400, "No podés quitarte el rol de director ni desactivarte a vos mismo.");
  }
  if (c.email && one("SELECT id FROM usuarios WHERE email = ? AND id <> ?", c.email, id)) {
    throw new HttpError(409, "Ya existe un usuario con ese email.");
  }
  update("usuarios", id, c);
  if (c.activo === 0) run("DELETE FROM sesiones WHERE usuario_id = ?", id);
  res.json({ ok: true });
});

r.post("/usuarios/:id/clave", DIRECTOR, (req, res) => {
  const id = idParam(req.params.id);
  if (!one("SELECT id FROM usuarios WHERE id = ? AND rol <> 'tutor'", id)) throw new HttpError(404, "Usuario no encontrado.");
  const clave = passwordTemporal();
  run("UPDATE usuarios SET password_hash = ? WHERE id = ?", hashPassword(clave), id);
  run("DELETE FROM sesiones WHERE usuario_id = ?", id);
  res.json({ clave });
});

/* ---------- Inicio: resumen del día para el equipo ---------- */
r.get("/inicio", STAFF, (req, res) => {
  const hoy = hoyISO();
  const turnos = all(
    `SELECT t.id, t.hora, t.estado, t.tipo, a.id AS animal_id, a.nombre AS animal, a.especie, a.foto,
            tu.apellido AS tutor_apellido, u.apellido AS vet
       FROM turnos t JOIN animales a ON a.id = t.animal_id JOIN tutores tu ON tu.id = a.tutor_id
       LEFT JOIN usuarios u ON u.id = t.vet_id
      WHERE t.fecha = ? AND t.estado <> 'cancelado'
      ${req.user.rol === "veterinario" ? "AND (t.vet_id = ? OR t.vet_id IS NULL)" : ""}
      ORDER BY t.hora`, ...(req.user.rol === "veterinario" ? [hoy, req.user.id] : [hoy]));

  res.json({
    hoy,
    turnos,
    vencidas: vacunasVencidas().slice(0, 8),
    controles: all(
      `SELECT c.proximo_control AS fecha, a.id AS animal_id, a.nombre AS animal, a.especie, a.foto, tu.apellido AS tutor_apellido
         FROM consultas c JOIN animales a ON a.id = c.animal_id JOIN tutores tu ON tu.id = a.tutor_id
        WHERE c.proximo_control BETWEEN ? AND ? AND a.fallecido = 0
        ORDER BY c.proximo_control LIMIT 8`, hoy, sumarDias(hoy, 7)),
    totales: one(
      `SELECT (SELECT COUNT(*) FROM animales WHERE fallecido = 0) AS animales,
              (SELECT COUNT(*) FROM tutores) AS tutores,
              (SELECT COUNT(*) FROM consultas WHERE substr(fecha,1,7) = substr(?,1,7)) AS consultas_mes,
              (SELECT COUNT(*) FROM solicitudes WHERE estado = 'pendiente') AS solicitudes,
              (SELECT COALESCE(SUM(monto), 0) FROM cobros WHERE estado = 'pagado' AND substr(pagado_en,1,10) = ?) AS caja_hoy`, hoy, hoy),
  });
});

/* ---------- Reportes (director) ---------- */
r.get("/reportes", DIRECTOR, (req, res) => {
  const { desde, hasta } = rango(req.query);
  res.json(datosReporte(desde, hasta));
});

module.exports = r;
