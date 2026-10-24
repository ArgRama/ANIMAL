/* ANIMAL — Portal del tutor: libreta e historia clínica de sus animales.
   La parte clínica es de sólo lectura; el tutor puede editar sus datos de
   contacto y los datos básicos de sus animales (nombre, raza, color, señas, foto). */

const express = require("express");
const { one, all, update, tx, auditar } = require("../db");
const { requiere } = require("../auth");
const { HttpError, datos, requeridos, idParam } = require("../util");
const { estadoVacunas, hoyISO } = require("../catalogo");

const r = express.Router();
const STAFF_O_TUTOR = requiere("director", "veterinario", "recepcion", "tutor");
const TUTOR = requiere("tutor");

const MIS_DATOS = { telefono: "texto", direccion: "texto", ciudad: "texto", provincia: "texto" };
const MI_ANIMAL = { nombre: "texto", raza: "texto", color: "texto", senas: "texto" };

r.put("/portal/datos", TUTOR, (req, res) => {
  update("tutores", req.user.tutor_id, datos(req.body, MIS_DATOS, { parcial: true }));
  res.json({ ok: true });
});

r.put("/portal/animales/:id", TUTOR, (req, res) => {
  const id = idParam(req.params.id);
  const actual = one("SELECT * FROM animales WHERE id = ?", id);
  if (!actual || actual.tutor_id !== req.user.tutor_id) throw new HttpError(404, "Animal no encontrado.");
  const cambios = datos(req.body, MI_ANIMAL, { parcial: true });
  requeridos({ ...actual, ...cambios }, ["nombre"], { nombre: "nombre" });
  tx(() => {
    update("animales", id, cambios);
    auditar(req.user.id, "modificacion", "animales", id, id, actual, { ...actual, ...cambios });
  });
  res.json({ ok: true });
});

/* Libreta sanitaria de un animal. La usan el tutor (sólo sus animales)
   y el equipo (para imprimir). No incluye notas clínicas internas. */
function libreta(animal) {
  const vacunas = all(
    `SELECT v.id, v.fecha, v.nombre, v.codigo, v.laboratorio, v.lote, v.proxima,
            u.apellido || ' ' || u.nombre AS autor, u.matricula AS autor_matricula
       FROM vacunas v LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.animal_id = ? ORDER BY v.fecha DESC`, animal.id);
  return {
    animal,
    plan_vacunas: estadoVacunas(animal, vacunas),
    vacunas,
    desparasitaciones: all(
      "SELECT fecha, tipo, producto, dosis, proxima FROM desparasitaciones WHERE animal_id = ? ORDER BY fecha DESC", animal.id),
    pesos: all(
      "SELECT substr(fecha,1,10) AS fecha, peso FROM consultas WHERE animal_id = ? AND peso IS NOT NULL ORDER BY fecha", animal.id),
    recetas: all(
      `SELECT r.id, r.fecha, r.diagnostico, r.items, u.apellido || ' ' || u.nombre AS autor
         FROM recetas r LEFT JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.animal_id = ? ORDER BY r.fecha DESC LIMIT 10`, animal.id)
      .map((x) => ({ ...x, items: JSON.parse(x.items) })),
    turnos: all(
      `SELECT t.fecha, t.hora, t.tipo, t.estado, u.apellido || ' ' || u.nombre AS vet
         FROM turnos t LEFT JOIN usuarios u ON u.id = t.vet_id
        WHERE t.animal_id = ? AND t.fecha >= ? AND t.estado IN ('pendiente','confirmado')
        ORDER BY t.fecha, t.hora`, animal.id, hoyISO()),
  };
}

r.get("/portal", requiere("tutor"), (req, res) => {
  const tutor = one(
    "SELECT id, apellido, nombre, dni, telefono, email, direccion, ciudad, provincia FROM tutores WHERE id = ?", req.user.tutor_id);
  if (!tutor) throw new HttpError(404, "Tutor no encontrado.");
  // Las notas internas del equipo no se muestran al tutor.
  const animales = all("SELECT * FROM animales WHERE tutor_id = ? ORDER BY fallecido, nombre", tutor.id)
    .map(({ notas, ...a }) => a);
  const pendientes = all(
    `SELECT c.id, c.fecha, c.concepto, c.monto, a.nombre AS animal FROM cobros c
       LEFT JOIN animales a ON a.id = c.animal_id
      WHERE c.tutor_id = ? AND c.estado = 'pendiente' ORDER BY c.fecha`, tutor.id);
  const solicitudes = all(
    `SELECT s.id, s.animal_id, s.fecha, s.franja, s.motivo, s.estado, s.respuesta, a.nombre AS animal,
            t.fecha AS turno_fecha, t.hora AS turno_hora
       FROM solicitudes s JOIN animales a ON a.id = s.animal_id LEFT JOIN turnos t ON t.id = s.turno_id
      WHERE a.tutor_id = ? AND (s.estado = 'pendiente' OR s.creado >= datetime('now','localtime','-30 days'))
      ORDER BY s.id DESC`, tutor.id);
  res.json({
    tutor, animales: animales.map(libreta), solicitudes,
    cuenta: { saldo: Math.round(pendientes.reduce((s, c) => s + c.monto, 0) * 100) / 100, pendientes },
  });
});

r.get("/libreta/:id", STAFF_O_TUTOR, (req, res) => {
  const animal = one("SELECT * FROM animales WHERE id = ?", idParam(req.params.id));
  if (!animal || (req.user.rol === "tutor" && animal.tutor_id !== req.user.tutor_id)) {
    throw new HttpError(404, "Animal no encontrado.");
  }
  const tutor = one("SELECT apellido, nombre, dni, telefono, direccion, ciudad FROM tutores WHERE id = ?", animal.tutor_id);
  if (req.user.rol === "tutor") delete animal.notas;
  const out = libreta(animal);
  if (req.user.rol === "recepcion") delete out.recetas;
  res.json({ ...out, tutor });
});

module.exports = r;
