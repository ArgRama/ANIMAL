/* =========================================================================
   ANIMAL — Pedidos de turno desde el portal del tutor
   El tutor pide día, franja y motivo; recepción lo agenda (crea el turno
   real en la agenda) o lo rechaza con una respuesta.
   ========================================================================= */

const express = require("express");
const { one, all, insert, update } = require("../db");
const { requiere } = require("../auth");
const { HttpError, datos, requeridos, idParam } = require("../util");
const { hoyISO } = require("../catalogo");

const r = express.Router();
const STAFF = requiere("director", "veterinario", "recepcion");
const TUTOR = requiere("tutor");
const MAX_PENDIENTES = 3;

/* ---------- Tutor ---------- */
r.post("/portal/solicitudes", TUTOR, (req, res) => {
  const d = datos(req.body, { animal_id: "int", fecha: "fecha", franja: "enum:mañana|tarde|cualquiera", motivo: "texto" });
  requeridos(d, ["animal_id", "fecha", "motivo"], { animal_id: "mascota", fecha: "día", motivo: "motivo" });
  const a = one("SELECT tutor_id, fallecido FROM animales WHERE id = ?", d.animal_id);
  if (!a || a.tutor_id !== req.user.tutor_id || a.fallecido) throw new HttpError(404, "Mascota no encontrada.");
  if (d.fecha < hoyISO()) throw new HttpError(400, "Elegí un día de hoy en adelante.");
  const n = one(
    `SELECT COUNT(*) AS n FROM solicitudes s JOIN animales an ON an.id = s.animal_id
      WHERE an.tutor_id = ? AND s.estado = 'pendiente'`, req.user.tutor_id).n;
  if (n >= MAX_PENDIENTES) throw new HttpError(400, `Ya tenés ${n} pedidos sin responder. Esperá la respuesta de la veterinaria.`);
  const id = insert("solicitudes", { ...d, franja: d.franja || "cualquiera", motivo: d.motivo.slice(0, 300), usuario_id: req.user.id });
  res.status(201).json({ id });
});

r.post("/portal/solicitudes/:id/cancelar", TUTOR, (req, res) => {
  const s = one(
    `SELECT s.*, a.tutor_id FROM solicitudes s JOIN animales a ON a.id = s.animal_id WHERE s.id = ?`, idParam(req.params.id));
  if (!s || s.tutor_id !== req.user.tutor_id) throw new HttpError(404, "Pedido no encontrado.");
  if (s.estado !== "pendiente") throw new HttpError(400, "Ese pedido ya fue respondido.");
  update("solicitudes", s.id, { estado: "cancelada" });
  res.json({ ok: true });
});

/* ---------- Equipo ---------- */
r.get("/solicitudes", STAFF, (_req, res) => {
  res.json(all(
    `SELECT s.*, a.nombre AS animal, a.especie, a.foto, t.apellido || ', ' || t.nombre AS tutor,
            t.nombre AS tutor_nombre, t.telefono AS tutor_telefono
       FROM solicitudes s JOIN animales a ON a.id = s.animal_id JOIN tutores t ON t.id = a.tutor_id
      WHERE s.estado = 'pendiente' ORDER BY s.fecha, s.id`));
});

r.post("/solicitudes/:id/agendar", STAFF, (req, res) => {
  const s = one("SELECT * FROM solicitudes WHERE id = ?", idParam(req.params.id));
  if (!s || s.estado !== "pendiente") throw new HttpError(404, "Pedido no encontrado o ya respondido.");
  const turno = one("SELECT id, animal_id FROM turnos WHERE id = ?", idParam(req.body?.turno_id));
  if (!turno || turno.animal_id !== s.animal_id) throw new HttpError(400, "El turno no corresponde a ese pedido.");
  update("solicitudes", s.id, { estado: "agendada", turno_id: turno.id });
  res.json({ ok: true });
});

r.post("/solicitudes/:id/rechazar", STAFF, (req, res) => {
  const s = one("SELECT * FROM solicitudes WHERE id = ?", idParam(req.params.id));
  if (!s || s.estado !== "pendiente") throw new HttpError(404, "Pedido no encontrado o ya respondido.");
  const respuesta = String(req.body?.respuesta || "").trim().slice(0, 300);
  if (!respuesta) throw new HttpError(400, "Escribí una respuesta para el tutor.");
  update("solicitudes", s.id, { estado: "rechazada", respuesta });
  res.json({ ok: true });
});

module.exports = r;
