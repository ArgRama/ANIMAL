/* =========================================================================
   ANIMAL — Registros monetarios (cobros, cuenta del tutor y caja)
   · Un cobro "pagado" entra en la caja del día en que se pagó (pagado_en).
   · Un cobro "pendiente" queda como deuda en la cuenta del tutor.
   · Nada se borra: un cobro equivocado se anula (sólo el autor o el director).
   ========================================================================= */

const express = require("express");
const { one, all, insert, update, tx, auditar } = require("../db");
const { requiere } = require("../auth");
const { HttpError, datos, requeridos, idParam } = require("../util");
const { hoyISO } = require("../catalogo");

const r = express.Router();
const STAFF = requiere("director", "veterinario", "recepcion");
const MEDIOS = "efectivo|transferencia|debito|credito|mercadopago|otro";

const ahora = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${hoyISO()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const redondear = (n) => Math.round(n * 100) / 100;

const SELECT = `
  SELECT c.*, t.apellido || ', ' || t.nombre AS tutor, t.telefono AS tutor_telefono,
         a.nombre AS animal, a.especie, a.foto, u.apellido || ' ' || u.nombre AS autor
    FROM cobros c JOIN tutores t ON t.id = c.tutor_id
    LEFT JOIN animales a ON a.id = c.animal_id LEFT JOIN usuarios u ON u.id = c.usuario_id`;

function saldo(tutorId) {
  return redondear(one("SELECT COALESCE(SUM(monto), 0) AS s FROM cobros WHERE tutor_id = ? AND estado = 'pendiente'", tutorId).s);
}

/* ---------- Alta ---------- */
r.post("/cobros", STAFF, (req, res) => {
  const d = datos(req.body, {
    animal_id: "int", tutor_id: "int", concepto: "texto", monto: "num",
    medio: `enum:${MEDIOS}`, estado: "enum:pagado|pendiente", notas: "texto",
  });
  requeridos(d, ["concepto", "monto"], { concepto: "concepto", monto: "monto" });
  if (!(d.monto > 0)) throw new HttpError(400, "El monto debe ser mayor a cero.");
  d.monto = redondear(d.monto);
  if (d.animal_id) {
    const a = one("SELECT tutor_id FROM animales WHERE id = ?", d.animal_id);
    if (!a) throw new HttpError(400, "Paciente inexistente.");
    d.tutor_id = a.tutor_id;
  }
  if (!d.tutor_id || !one("SELECT id FROM tutores WHERE id = ?", d.tutor_id)) throw new HttpError(400, "Elegí el paciente o el tutor.");
  d.estado = d.estado || "pagado";
  if (d.estado === "pagado" && !d.medio) throw new HttpError(400, "Indicá el medio de pago.");
  if (d.estado === "pendiente") d.medio = null;
  const fecha = ahora();
  const id = tx(() => {
    const nuevo = insert("cobros", { ...d, fecha, pagado_en: d.estado === "pagado" ? fecha : null, usuario_id: req.user.id });
    auditar(req.user.id, "alta", "cobros", nuevo, d.animal_id, null, d);
    return nuevo;
  });
  res.status(201).json({ id, saldo: saldo(d.tutor_id) });
});

/* ---------- Pagar un pendiente / anular ---------- */
r.post("/cobros/:id/pagar", STAFF, (req, res) => {
  const c = one("SELECT * FROM cobros WHERE id = ?", idParam(req.params.id));
  if (!c) throw new HttpError(404, "Cobro no encontrado.");
  if (c.estado !== "pendiente") throw new HttpError(400, "Ese cobro no está pendiente.");
  const { medio } = datos(req.body, { medio: `enum:${MEDIOS}` });
  if (!medio) throw new HttpError(400, "Indicá el medio de pago.");
  tx(() => {
    update("cobros", c.id, { estado: "pagado", medio, pagado_en: ahora() });
    auditar(req.user.id, "modificacion", "cobros", c.id, c.animal_id, c, { ...c, estado: "pagado", medio });
  });
  res.json({ ok: true, saldo: saldo(c.tutor_id) });
});

r.post("/cobros/:id/anular", STAFF, (req, res) => {
  const c = one("SELECT * FROM cobros WHERE id = ?", idParam(req.params.id));
  if (!c) throw new HttpError(404, "Cobro no encontrado.");
  if (c.estado === "anulado") throw new HttpError(400, "El cobro ya estaba anulado.");
  if (req.user.rol !== "director" && c.usuario_id !== req.user.id) {
    throw new HttpError(403, "Sólo quien lo registró o el director pueden anularlo.");
  }
  const motivo = String(req.body?.motivo || "").trim();
  if (!motivo) throw new HttpError(400, "Indicá el motivo de la anulación.");
  tx(() => {
    const notas = [c.notas, `Anulado: ${motivo}`].filter(Boolean).join(" · ");
    update("cobros", c.id, { estado: "anulado", notas });
    auditar(req.user.id, "baja", "cobros", c.id, c.animal_id, c, { ...c, estado: "anulado", notas });
  });
  res.json({ ok: true, saldo: saldo(c.tutor_id) });
});

/* ---------- Cuenta del tutor ---------- */
r.get("/tutores/:id/cuenta", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  res.json({
    saldo: saldo(id),
    movimientos: all(`${SELECT} WHERE c.tutor_id = ? ORDER BY c.fecha DESC, c.id DESC LIMIT 50`, id),
  });
});

/* ---------- Caja: ingresos del período + cuentas pendientes ---------- */
r.get("/caja", STAFF, (req, res) => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const desde = re.test(req.query.desde || "") ? req.query.desde : hoyISO();
  const hasta = re.test(req.query.hasta || "") ? req.query.hasta : desde;
  const ingresos = all(
    `${SELECT} WHERE c.estado = 'pagado' AND substr(c.pagado_en,1,10) BETWEEN ? AND ? ORDER BY c.pagado_en DESC`, desde, hasta);
  const porMedio = {};
  for (const c of ingresos) porMedio[c.medio] = redondear((porMedio[c.medio] || 0) + c.monto);
  res.json({
    desde, hasta,
    ingresos,
    total: redondear(ingresos.reduce((s, c) => s + c.monto, 0)),
    por_medio: porMedio,
    cargos: all(`${SELECT} WHERE c.estado = 'pendiente' AND substr(c.fecha,1,10) BETWEEN ? AND ? ORDER BY c.fecha DESC`, desde, hasta),
    anulados: all(`${SELECT} WHERE c.estado = 'anulado' AND substr(c.fecha,1,10) BETWEEN ? AND ? ORDER BY c.fecha DESC`, desde, hasta),
    deudores: all(
      `SELECT t.id AS tutor_id, t.apellido || ', ' || t.nombre AS tutor, t.telefono, ROUND(SUM(c.monto), 2) AS saldo,
              COUNT(*) AS cantidad, MIN(substr(c.fecha,1,10)) AS desde
         FROM cobros c JOIN tutores t ON t.id = c.tutor_id
        WHERE c.estado = 'pendiente' GROUP BY t.id ORDER BY saldo DESC`),
  });
});

module.exports = { router: r, saldo };
