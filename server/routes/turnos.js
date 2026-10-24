/* ANIMAL — Agenda de turnos (recepción, veterinarios y director) */

const express = require("express");
const { one, all, insert, update, run } = require("../db");
const { requiere } = require("../auth");
const { HttpError, datos, requeridos, idParam } = require("../util");

const r = express.Router();
const STAFF = requiere("director", "veterinario", "recepcion");

const TURNO = {
  animal_id: "int", vet_id: "int", fecha: "fecha", hora: "hora", duracion: "int",
  tipo: "enum:consulta|vacunacion|control|cirugia|estetica|domicilio",
  estado: "enum:pendiente|confirmado|en sala|atendido|ausente|cancelado",
  notas: "texto",
};

const minutos = (h) => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};

// Evita superponer dos turnos activos del mismo veterinario.
function chequearSuperposicion(t, excluirId = 0) {
  if (!t.vet_id) return;
  const otros = all(
    `SELECT id, hora, duracion FROM turnos
      WHERE fecha = ? AND vet_id = ? AND id <> ? AND estado NOT IN ('cancelado','ausente')`,
    t.fecha, t.vet_id, excluirId);
  const ini = minutos(t.hora), fin = ini + (t.duracion || 30);
  const choca = otros.find((o) => {
    const oi = minutos(o.hora), of = oi + o.duracion;
    return ini < of && oi < fin;
  });
  if (choca) throw new HttpError(409, `El veterinario ya tiene un turno a las ${choca.hora}.`);
}

r.get("/veterinarios", requiere(), (_req, res) => {
  res.json(all(
    `SELECT id, apellido, nombre, matricula, rol FROM usuarios
      WHERE rol IN ('veterinario','director') AND activo = 1 ORDER BY apellido`));
});

r.get("/turnos", STAFF, (req, res) => {
  const desde = String(req.query.desde || "");
  const hasta = String(req.query.hasta || desde);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    throw new HttpError(400, "Indicá el rango de fechas.");
  }
  const params = [desde, hasta];
  let extra = "";
  if (req.query.vet) { extra = " AND t.vet_id = ?"; params.push(idParam(req.query.vet)); }
  res.json(all(
    `SELECT t.*, a.nombre AS animal, a.especie, a.raza, a.alergias, a.foto,
            tu.apellido AS tutor_apellido, tu.nombre AS tutor_nombre, tu.telefono AS tutor_telefono,
            u.apellido || ' ' || u.nombre AS vet
       FROM turnos t
       JOIN animales a ON a.id = t.animal_id
       JOIN tutores tu ON tu.id = a.tutor_id
       LEFT JOIN usuarios u ON u.id = t.vet_id
      WHERE t.fecha BETWEEN ? AND ?${extra}
      ORDER BY t.fecha, t.hora`, ...params));
});

r.post("/turnos", STAFF, (req, res) => {
  const t = datos(req.body, TURNO);
  requeridos(t, ["animal_id", "fecha", "hora"], { animal_id: "paciente", fecha: "fecha", hora: "hora" });
  if (!one("SELECT id FROM animales WHERE id = ?", t.animal_id)) throw new HttpError(400, "Paciente inexistente.");
  t.duracion = t.duracion || 30;
  t.tipo = t.tipo || "consulta";
  t.estado = t.estado || "pendiente";
  chequearSuperposicion(t);
  res.status(201).json({ id: insert("turnos", { ...t, creado_por: req.user.id }) });
});

r.put("/turnos/:id", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  const actual = one("SELECT * FROM turnos WHERE id = ?", id);
  if (!actual) throw new HttpError(404, "Turno no encontrado.");
  const cambios = datos(req.body, TURNO, { parcial: true });
  const final = { ...actual, ...cambios };
  if ("fecha" in cambios || "hora" in cambios || "vet_id" in cambios || "duracion" in cambios) {
    if (!["cancelado", "ausente"].includes(final.estado)) chequearSuperposicion(final, id);
  }
  update("turnos", id, cambios);
  res.json({ ok: true });
});

r.delete("/turnos/:id", STAFF, (req, res) => {
  run("DELETE FROM turnos WHERE id = ?", idParam(req.params.id));
  res.json({ ok: true });
});

module.exports = r;
