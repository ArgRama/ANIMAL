/* =========================================================================
   ANIMAL — Fotos de animales, certificado antirrábico y copia de seguridad
   ========================================================================= */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");
const { db, one, all, run, insert, update, auditar, DATA_DIR, FOTOS_DIR, ADJUNTOS_DIR } = require("../db");
const { requiere } = require("../auth");
const { HttpError, idParam } = require("../util");
const { estadoVacunas, hoyISO, sumarDias } = require("../catalogo");
const { rango } = require("../reportes");
const { reporteExcel } = require("../excel");

const r = express.Router();
const STAFF = requiere("director", "veterinario", "recepcion");
const CLINICO = requiere("director", "veterinario");
const STAFF_O_TUTOR = requiere("director", "veterinario", "recepcion", "tutor");

// El tutor sólo puede ver o modificar lo de sus propios animales.
function delTutor(req, tutorId, msg = "Animal no encontrado.") {
  if (req.user.rol === "tutor" && tutorId !== req.user.tutor_id) throw new HttpError(404, msg);
}

const borrarFoto = (archivo) => {
  if (archivo) fs.rm(path.join(FOTOS_DIR, path.basename(archivo)), { force: true }, () => {});
};

/* ---------- Foto del animal ----------
   El navegador ya la recorta y comprime (JPEG ~480 px); acá sólo se valida. */
r.post("/animales/:id/foto", STAFF_O_TUTOR, (req, res) => {
  const id = idParam(req.params.id);
  const animal = one("SELECT id, foto, tutor_id FROM animales WHERE id = ?", id);
  if (!animal) throw new HttpError(404, "Animal no encontrado.");
  delTutor(req, animal.tutor_id);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ""));
  if (!m) throw new HttpError(400, "Formato de imagen no válido (JPG, PNG o WEBP).");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 1.5 * 1024 * 1024) throw new HttpError(413, "La foto es demasiado grande (máx. 1,5 MB).");

  const archivo = `a${id}-${crypto.randomBytes(6).toString("hex")}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
  fs.writeFileSync(path.join(FOTOS_DIR, archivo), buf);
  update("animales", id, { foto: archivo });
  borrarFoto(animal.foto);
  res.json({ foto: archivo });
});

r.delete("/animales/:id/foto", STAFF_O_TUTOR, (req, res) => {
  const id = idParam(req.params.id);
  const animal = one("SELECT foto, tutor_id FROM animales WHERE id = ?", id);
  if (!animal) throw new HttpError(404, "Animal no encontrado.");
  delTutor(req, animal.tutor_id);
  update("animales", id, { foto: null });
  borrarFoto(animal.foto);
  res.json({ ok: true });
});

// Las fotos no son públicas: sólo el equipo o el tutor del animal.
r.get("/fotos/:archivo", requiere(), (req, res) => {
  const archivo = path.basename(req.params.archivo);
  const animal = one("SELECT tutor_id FROM animales WHERE foto = ?", archivo);
  if (!animal || (req.user.rol === "tutor" && animal.tutor_id !== req.user.tutor_id)) {
    throw new HttpError(404, "Foto no encontrada.");
  }
  res.set("Cache-Control", "private, max-age=86400");
  res.sendFile(path.join(FOTOS_DIR, archivo));
});

/* ---------- Certificado de vacunación antirrábica ---------- */
r.get("/vacunas/:id/certificado", requiere(), (req, res) => {
  const v = one(
    `SELECT v.*, u.apellido || ' ' || u.nombre AS autor, u.matricula AS autor_matricula, u.ente_matricula AS autor_ente
       FROM vacunas v LEFT JOIN usuarios u ON u.id = v.usuario_id WHERE v.id = ?`, idParam(req.params.id));
  if (!v) throw new HttpError(404, "Vacuna no encontrada.");
  const animal = one("SELECT * FROM animales WHERE id = ?", v.animal_id);
  if (req.user.rol === "tutor" && animal.tutor_id !== req.user.tutor_id) throw new HttpError(404, "Vacuna no encontrada.");
  const tutor = one("SELECT apellido, nombre, dni, telefono, direccion, ciudad, provincia FROM tutores WHERE id = ?", animal.tutor_id);
  res.json({ vacuna: v, animal, tutor });
});

/* ---------- Adjuntos de estudios (PDF o imágenes) ---------- */
const MIMES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_ADJUNTO = 8 * 1024 * 1024;

r.post("/estudios/:id/adjuntos", CLINICO, (req, res) => {
  const estudio = one("SELECT id, animal_id FROM estudios WHERE id = ?", idParam(req.params.id));
  if (!estudio) throw new HttpError(404, "Estudio no encontrado.");
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ""));
  if (!m || !MIMES[m[1]]) throw new HttpError(400, "Sólo se pueden adjuntar PDF o imágenes (JPG, PNG, WEBP).");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_ADJUNTO) throw new HttpError(413, "El archivo supera los 8 MB.");
  const nombre = path.basename(String(req.body?.nombre || `adjunto.${MIMES[m[1]]}`)).slice(0, 120);
  const archivo = `e${estudio.id}-${crypto.randomBytes(8).toString("hex")}.${MIMES[m[1]]}`;
  fs.writeFileSync(path.join(ADJUNTOS_DIR, archivo), buf);
  const id = insert("adjuntos", { estudio_id: estudio.id, usuario_id: req.user.id, nombre, mime: m[1], archivo, tamano: buf.length });
  auditar(req.user.id, "alta", "adjuntos", id, estudio.animal_id, null, { estudio_id: estudio.id, nombre });
  res.status(201).json({ id });
});

r.get("/adjuntos/:id", requiere("director", "veterinario", "tutor"), (req, res) => {
  const a = one(
    `SELECT j.*, an.tutor_id FROM adjuntos j JOIN estudios e ON e.id = j.estudio_id
       JOIN animales an ON an.id = e.animal_id WHERE j.id = ?`, idParam(req.params.id));
  if (!a) throw new HttpError(404, "Archivo no encontrado.");
  delTutor(req, a.tutor_id, "Archivo no encontrado.");
  res.set({
    "Content-Type": a.mime,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.nombre)}`,
    "Cache-Control": "private, max-age=3600",
  });
  res.sendFile(path.join(ADJUNTOS_DIR, a.archivo));
});

r.delete("/adjuntos/:id", CLINICO, (req, res) => {
  const a = one(
    "SELECT j.*, e.animal_id FROM adjuntos j JOIN estudios e ON e.id = j.estudio_id WHERE j.id = ?", idParam(req.params.id));
  if (!a) throw new HttpError(404, "Archivo no encontrado.");
  if (req.user.rol !== "director" && a.usuario_id !== req.user.id) throw new HttpError(403, "Sólo quien lo subió o el director pueden borrarlo.");
  run("DELETE FROM adjuntos WHERE id = ?", a.id);
  auditar(req.user.id, "baja", "adjuntos", a.id, a.animal_id, { estudio_id: a.estudio_id, nombre: a.nombre }, null);
  fs.rm(path.join(ADJUNTOS_DIR, a.archivo), { force: true }, () => {});
  res.json({ ok: true });
});

/* ---------- Consentimiento informado de una cirugía / práctica ---------- */
r.get("/practicas/:id/documento", requiere("director", "veterinario", "tutor"), (req, res) => {
  const p = one(
    `SELECT p.*, u.apellido || ' ' || u.nombre AS autor, u.matricula AS autor_matricula, u.ente_matricula AS autor_ente
       FROM practicas p LEFT JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`, idParam(req.params.id));
  if (!p) throw new HttpError(404, "Práctica no encontrada.");
  const animal = one("SELECT * FROM animales WHERE id = ?", p.animal_id);
  delTutor(req, animal.tutor_id, "Práctica no encontrada.");
  const tutor = one("SELECT * FROM tutores WHERE id = ?", animal.tutor_id);
  res.json({ practica: p, animal, tutor });
});

/* ---------- Auditoría de la historia clínica (director) ---------- */
r.get("/auditoria", requiere("director"), (req, res) => {
  const animal = idParam(req.query.animal);
  res.json(all(
    `SELECT a.id, a.fecha, a.accion, a.tabla, a.registro_id, a.antes, a.despues,
            u.apellido || ' ' || u.nombre AS usuario, u.rol
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.animal_id = ? ORDER BY a.id DESC LIMIT 300`, animal)
    .map((x) => ({ ...x, antes: x.antes && JSON.parse(x.antes), despues: x.despues && JSON.parse(x.despues) })));
});

/* ---------- Recordatorios a tutores ----------
   Vacunas (según el plan de cada especie), desparasitaciones y controles
   que vencen en los próximos `dias` o ya vencieron (hasta 90 días atrás). */
r.get("/recordatorios", STAFF, (req, res) => {
  const dias = Math.min(Math.max(Number(req.query.dias) || 30, 1), 180);
  const hoy = hoyISO(), hasta = sumarDias(hoy, dias), desde = sumarDias(hoy, -90);
  const animales = all(
    `SELECT a.*, t.apellido AS tutor_apellido, t.nombre AS tutor_nombre, t.telefono AS tutor_telefono
       FROM animales a JOIN tutores t ON t.id = a.tutor_id WHERE a.fallecido = 0`);
  const porId = new Map(animales.map((a) => [a.id, a]));
  const avisados = new Map(all("SELECT clave, fecha FROM avisos").map((x) => [x.clave, x.fecha]));
  const vacunas = all("SELECT animal_id, codigo, fecha, proxima FROM vacunas");
  const items = [];
  const push = (tipo, a, ref, fecha, detalle) => {
    const clave = `${tipo}:${a.id}:${ref}:${fecha || "pend"}`;
    items.push({
      clave, tipo, fecha, detalle, vencido: !fecha || fecha < hoy, avisado: avisados.get(clave) || null,
      animal_id: a.id, animal: a.nombre, especie: a.especie, foto: a.foto,
      tutor: `${a.tutor_apellido}, ${a.tutor_nombre}`, tutor_nombre: a.tutor_nombre, telefono: a.tutor_telefono,
    });
  };

  for (const a of animales) {
    const plan = estadoVacunas(a, vacunas.filter((v) => v.animal_id === a.id));
    for (const v of plan) {
      if (v.estado === "pendiente") push("vacuna", a, v.codigo, null, `${v.nombre} (sin aplicar)`);
      else if (["vencida", "por vencer", "al dia"].includes(v.estado) && v.fecha && v.fecha >= desde && v.fecha <= hasta) {
        push("vacuna", a, v.codigo, v.fecha, v.nombre);
      }
    }
  }
  // Última desparasitación de cada animal y tipo, si su próxima cae en la ventana.
  for (const d of all(
    `SELECT d.* FROM desparasitaciones d
      WHERE d.proxima BETWEEN ? AND ?
        AND NOT EXISTS (SELECT 1 FROM desparasitaciones x WHERE x.animal_id = d.animal_id
                        AND (x.tipo = d.tipo OR x.tipo = 'ambas') AND x.fecha > d.fecha)`, desde, hasta)) {
    const a = porId.get(d.animal_id);
    if (a) push("desparasitacion", a, d.id, d.proxima, `Desparasitación ${d.tipo} (${d.producto})`);
  }
  // Controles pedidos en una consulta que todavía no se hicieron.
  for (const c of all(
    `SELECT c.* FROM consultas c
      WHERE c.proximo_control BETWEEN ? AND ?
        AND NOT EXISTS (SELECT 1 FROM consultas x WHERE x.animal_id = c.animal_id AND x.fecha > c.fecha)`, desde, hasta)) {
    const a = porId.get(c.animal_id);
    if (a) push("control", a, c.id, c.proximo_control, `Control: ${c.diagnostico || c.motivo}`);
  }
  items.sort((x, y) => (x.fecha || "").localeCompare(y.fecha || ""));
  res.json({ hoy, hasta, items });
});

r.post("/avisos", STAFF, (req, res) => {
  const clave = String(req.body?.clave || "");
  if (!/^(vacuna|desparasitacion|control):\d+:[\w-]+:[\w-]+$/.test(clave)) throw new HttpError(400, "Recordatorio inválido.");
  if (req.body.avisado) run("INSERT OR REPLACE INTO avisos (clave, usuario_id) VALUES (?, ?)", clave, req.user.id);
  else run("DELETE FROM avisos WHERE clave = ?", clave);
  res.json({ ok: true });
});

/* ---------- Reporte en Excel (.xlsx con diseño) ---------- */
r.get("/export/reporte.xlsx", requiere("director"), async (req, res, next) => {
  try {
    const { desde, hasta } = rango(req.query);
    const clinica = one("SELECT nombre FROM clinica WHERE id = 1")?.nombre || "ANIMAL";
    const buf = await reporteExcel(desde, hasta, clinica);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-animal-${desde}-al-${hasta}.xlsx"`,
    });
    res.send(Buffer.from(buf));
  } catch (e) { next(e); }
});

/* ---------- Copia de seguridad (director) ----------
   Copia consistente de la base con VACUUM INTO, aun con la app en uso. */
r.get("/backup", requiere("director"), (req, res) => {
  const tmp = path.join(DATA_DIR, `backup-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  res.download(tmp, `animal-${hoyISO()}.db`, () => fs.rm(tmp, { force: true }, () => {}));
});

module.exports = r;
