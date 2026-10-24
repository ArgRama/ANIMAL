/* =========================================================================
   ANIMAL — Datos de los reportes (los usan la pantalla y el Excel)
   ========================================================================= */

const { all } = require("./db");
const { ESPECIES, estadoVacunas, hoyISO, sumarDias } = require("./catalogo");

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Rango del reporte: por defecto los últimos 6 meses.
function rango(q = {}) {
  const hasta = RE_FECHA.test(q.hasta || "") ? q.hasta : hoyISO();
  const desde = RE_FECHA.test(q.desde || "") ? q.desde : sumarDias(hasta, -180);
  return { desde, hasta };
}

// Animales vivos con alguna vacuna vencida o pendiente (obligatoria o esencial).
function vacunasVencidas() {
  const animales = all(
    `SELECT a.*, tu.apellido AS tutor_apellido, tu.nombre AS tutor_nombre, tu.telefono AS tutor_telefono
       FROM animales a JOIN tutores tu ON tu.id = a.tutor_id WHERE a.fallecido = 0`);
  const vac = all("SELECT animal_id, codigo, fecha, proxima FROM vacunas");
  const porAnimal = new Map();
  for (const v of vac) {
    if (!porAnimal.has(v.animal_id)) porAnimal.set(v.animal_id, []);
    porAnimal.get(v.animal_id).push(v);
  }
  const out = [];
  for (const a of animales) {
    const plan = estadoVacunas(a, porAnimal.get(a.id) || []);
    const malas = plan.filter((p) => p.estado === "vencida" || p.estado === "pendiente");
    if (malas.length) {
      out.push({
        animal_id: a.id, animal: a.nombre, especie: a.especie, foto: a.foto, tutor_apellido: a.tutor_apellido,
        tutor_nombre: a.tutor_nombre, tutor_telefono: a.tutor_telefono, vacunas: malas.map((m) => m.nombre),
        desde: malas.map((m) => m.fecha).filter(Boolean).sort()[0] || null,
      });
    }
  }
  return out.sort((x, y) => (x.desde || "").localeCompare(y.desde || ""));
}

function datosReporte(desde, hasta) {
  return {
    desde, hasta,
    por_especie: all("SELECT especie, COUNT(*) AS n FROM animales WHERE fallecido = 0 GROUP BY especie ORDER BY n DESC")
      .map((x) => ({ ...x, nombre: ESPECIES[x.especie]?.nombre || x.especie })),
    consultas_por_mes: all(
      `SELECT substr(fecha,1,7) AS mes, COUNT(*) AS n FROM consultas
        WHERE substr(fecha,1,10) BETWEEN ? AND ? GROUP BY mes ORDER BY mes`, desde, hasta),
    por_profesional: all(
      `SELECT u.apellido || ' ' || u.nombre AS profesional,
              (SELECT COUNT(*) FROM consultas c WHERE c.usuario_id = u.id AND substr(c.fecha,1,10) BETWEEN ? AND ?) AS consultas,
              (SELECT COUNT(*) FROM vacunas v WHERE v.usuario_id = u.id AND v.fecha BETWEEN ? AND ?) AS vacunas,
              (SELECT COUNT(*) FROM recetas x WHERE x.usuario_id = u.id AND x.fecha BETWEEN ? AND ?) AS recetas
         FROM usuarios u WHERE u.rol IN ('veterinario','director') ORDER BY consultas DESC`,
      desde, hasta, desde, hasta, desde, hasta),
    vacunas_aplicadas: all(
      `SELECT nombre, COUNT(*) AS n FROM vacunas WHERE fecha BETWEEN ? AND ? GROUP BY nombre ORDER BY n DESC LIMIT 10`, desde, hasta),
    turnos_por_estado: all(
      `SELECT estado, COUNT(*) AS n FROM turnos WHERE fecha BETWEEN ? AND ? GROUP BY estado ORDER BY n DESC`, desde, hasta),
    diagnosticos: all(
      `SELECT diagnostico, COUNT(*) AS n FROM consultas
        WHERE diagnostico IS NOT NULL AND substr(fecha,1,10) BETWEEN ? AND ?
        GROUP BY lower(diagnostico) ORDER BY n DESC LIMIT 10`, desde, hasta),
    vencidas: vacunasVencidas(),
    // Registros monetarios: lo cobrado entra por la fecha de pago.
    ingresos_por_mes: all(
      `SELECT substr(pagado_en,1,7) AS mes, ROUND(SUM(monto), 2) AS total, COUNT(*) AS n FROM cobros
        WHERE estado = 'pagado' AND substr(pagado_en,1,10) BETWEEN ? AND ? GROUP BY mes ORDER BY mes`, desde, hasta),
    ingresos_por_medio: all(
      `SELECT medio, ROUND(SUM(monto), 2) AS total, COUNT(*) AS n FROM cobros
        WHERE estado = 'pagado' AND substr(pagado_en,1,10) BETWEEN ? AND ? GROUP BY medio ORDER BY total DESC`, desde, hasta),
    ingresos_por_concepto: all(
      `SELECT concepto, ROUND(SUM(monto), 2) AS total, COUNT(*) AS n FROM cobros
        WHERE estado = 'pagado' AND substr(pagado_en,1,10) BETWEEN ? AND ? GROUP BY lower(concepto) ORDER BY total DESC LIMIT 10`, desde, hasta),
    deuda_total: all("SELECT ROUND(COALESCE(SUM(monto), 0), 2) AS s FROM cobros WHERE estado = 'pendiente'")[0].s,
  };
}

module.exports = { rango, vacunasVencidas, datosReporte };
