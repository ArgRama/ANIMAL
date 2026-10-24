/* =========================================================================
   ANIMAL — Tutores, animales e historia clínica
   Permisos:
     · director / veterinario: todo
     · recepcion: tutores, animales, vacunas y desparasitaciones (sólo lectura
       de la parte sanitaria; no ve consultas, estudios, prácticas ni recetas)
   ========================================================================= */

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { one, all, insert, update, run, tx, auditar, ADJUNTOS_DIR } = require("../db");
const { requiere, hashPassword, passwordTemporal } = require("../auth");
const { HttpError, datos, requeridos, idParam } = require("../util");
const { ESPECIES, estadoVacunas, alertasFarmaco, hoyISO } = require("../catalogo");

const r = express.Router();
const STAFF = requiere("director", "veterinario", "recepcion");
const CLINICO = requiere("director", "veterinario");

/* ---------- Campos ---------- */
const TUTOR = {
  apellido: "texto", nombre: "texto", dni: "texto", telefono: "texto", email: "texto",
  direccion: "texto", ciudad: "texto", provincia: "texto", notas: "texto",
};
const ANIMAL = {
  nombre: "texto", especie: "texto", raza: "texto", sexo: "enum:M|H|ND", fecha_nac: "fecha",
  color: "texto", senas: "texto", microchip: "texto", identificacion: "texto",
  castrado: "bool", peso: "num", unidad: "enum:individual|rodeo", cantidad: "int",
  alergias: "texto", cronicas: "texto", notas: "texto", fallecido: "bool",
};

/* Registros de la historia clínica: mismo CRUD para todos. */
const REGISTROS = {
  consultas: {
    campos: {
      fecha: "fechahora", motivo: "texto", anamnesis: "texto", examen: "texto",
      temperatura: "num", fc: "int", fr: "int", peso: "num", condicion_corporal: "int",
      mucosas: "texto", tllc: "texto", hidratacion: "texto",
      diagnostico: "texto", tratamiento: "texto", proximo_control: "fecha",
    },
    req: ["fecha", "motivo"],
  },
  vacunas: {
    campos: { codigo: "texto", nombre: "texto", laboratorio: "texto", lote: "texto", fecha: "fecha", proxima: "fecha", notas: "texto" },
    req: ["nombre", "fecha"],
  },
  desparasitaciones: {
    campos: { tipo: "enum:interna|externa|ambas", producto: "texto", dosis: "texto", fecha: "fecha", proxima: "fecha", notas: "texto" },
    req: ["tipo", "producto", "fecha"],
  },
  estudios: {
    campos: { tipo: "enum:laboratorio|imagen|otro", nombre: "texto", fecha: "fecha", estado: "enum:solicitado|con resultado", resultado: "texto", notas: "texto" },
    req: ["tipo", "nombre", "fecha"],
  },
  practicas: {
    campos: { tipo: "enum:cirugia|practica", nombre: "texto", fecha: "fecha", anestesia: "texto", descripcion: "texto", notas: "texto" },
    req: ["tipo", "nombre", "fecha"],
  },
  recetas: {
    campos: { fecha: "fecha", diagnostico: "texto", indicaciones: "texto", items: "json", controlada: "bool" },
    req: ["fecha", "items"],
  },
  reproduccion: {
    campos: { tipo: "enum:celo|servicio|gestacion|parto|aborto", fecha: "fecha", fpp: "fecha", crias: "int", notas: "texto" },
    req: ["tipo", "fecha"],
  },
};

const getAnimal = (id) => {
  const a = one("SELECT * FROM animales WHERE id = ?", id);
  if (!a) throw new HttpError(404, "Animal no encontrado.");
  return a;
};

function validarAnimal(a) {
  requeridos(a, ["nombre", "especie"], { nombre: "nombre del animal", especie: "especie" });
  if (!ESPECIES[a.especie]) throw new HttpError(400, "Especie desconocida.");
  if (a.microchip && !/^\d{15}$/.test(a.microchip)) {
    throw new HttpError(400, "El microchip debe tener 15 dígitos (norma ISO 11784/11785).");
  }
  if (a.unidad === "rodeo" && !(a.cantidad > 0)) throw new HttpError(400, "Indicá la cantidad de animales del rodeo / lote.");
}

/* =========================================================================
   Búsqueda
   ========================================================================= */
r.get("/buscar", STAFF, (req, res) => {
  const q = String(req.query.q || "").trim();
  const especie = String(req.query.especie || "").trim();
  const params = [];
  let where = "1 = 1";
  if (q) {
    const like = `%${q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}%`;
    where += ` AND (norm(a.nombre) LIKE ? OR norm(t.apellido || ' ' || t.nombre) LIKE ?
               OR norm(t.nombre || ' ' || t.apellido) LIKE ? OR t.dni LIKE ? OR a.microchip LIKE ?
               OR norm(a.identificacion) LIKE ? OR t.telefono LIKE ? OR norm(a.raza) LIKE ?)`;
    params.push(like, like, like, like, like, like, like, like);
  }
  if (especie) { where += " AND a.especie = ?"; params.push(especie); }
  const rows = all(
    `SELECT a.id, a.nombre, a.especie, a.raza, a.sexo, a.fecha_nac, a.microchip, a.unidad, a.cantidad,
            a.castrado, a.fallecido, a.alergias, a.foto,
            t.id AS tutor_id, t.apellido AS tutor_apellido, t.nombre AS tutor_nombre, t.dni AS tutor_dni,
            t.telefono AS tutor_telefono,
            (SELECT MAX(fecha) FROM consultas c WHERE c.animal_id = a.id) AS ultima_consulta
       FROM animales a JOIN tutores t ON t.id = a.tutor_id
      WHERE ${where}
      ORDER BY ${q ? "a.nombre COLLATE NOCASE" : "a.id DESC"}
      LIMIT 60`,
    ...params
  );
  res.json(rows);
});

/* =========================================================================
   Tutores
   ========================================================================= */
r.get("/tutores", STAFF, (req, res) => {
  const dni = String(req.query.dni || "").trim();
  if (!dni) return res.json(null);
  res.json(one("SELECT * FROM tutores WHERE dni = ?", dni) || null);
});

r.get("/tutores/:id", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  const t = one("SELECT * FROM tutores WHERE id = ?", id);
  if (!t) throw new HttpError(404, "Tutor no encontrado.");
  t.animales = all("SELECT id, nombre, especie, raza, sexo, fecha_nac, fallecido FROM animales WHERE tutor_id = ? ORDER BY nombre", id);
  t.acceso = one("SELECT id, email, activo FROM usuarios WHERE tutor_id = ?", id) || null;
  res.json(t);
});

r.post("/tutores", STAFF, (req, res) => {
  const t = datos(req.body, TUTOR);
  requeridos(t, ["apellido", "nombre", "dni"], { dni: "DNI" });
  if (one("SELECT id FROM tutores WHERE dni = ?", t.dni)) throw new HttpError(409, "Ya existe un tutor con ese DNI.");
  res.status(201).json({ id: insert("tutores", t) });
});

r.put("/tutores/:id", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  const t = datos(req.body, TUTOR, { parcial: true });
  if (t.dni && one("SELECT id FROM tutores WHERE dni = ? AND id <> ?", t.dni, id)) {
    throw new HttpError(409, "Ya existe otro tutor con ese DNI.");
  }
  update("tutores", id, t);
  res.json({ ok: true });
});

// Crea (o reinicia) el acceso del tutor a la libreta. Devuelve la clave temporal UNA vez.
r.post("/tutores/:id/acceso", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  const t = one("SELECT * FROM tutores WHERE id = ?", id);
  if (!t) throw new HttpError(404, "Tutor no encontrado.");
  const email = String(req.body?.email || t.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Ingresá un email válido para el tutor.");

  const clave = passwordTemporal();
  const existente = one("SELECT id FROM usuarios WHERE tutor_id = ?", id);
  const otro = one("SELECT id FROM usuarios WHERE email = ? AND (tutor_id IS NULL OR tutor_id <> ?)", email, id);
  if (otro) throw new HttpError(409, "Ese email ya está en uso por otro usuario.");

  tx(() => {
    if (existente) {
      update("usuarios", existente.id, { email, password_hash: hashPassword(clave), activo: 1 });
      run("DELETE FROM sesiones WHERE usuario_id = ?", existente.id);
    } else {
      insert("usuarios", { nombre: t.nombre, apellido: t.apellido, email, password_hash: hashPassword(clave), rol: "tutor", tutor_id: id });
    }
    if (!t.email) update("tutores", id, { email });
  });
  res.json({ email, clave });
});

r.delete("/tutores/:id/acceso", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  run("UPDATE usuarios SET activo = 0 WHERE tutor_id = ?", id);
  run("DELETE FROM sesiones WHERE usuario_id IN (SELECT id FROM usuarios WHERE tutor_id = ?)", id);
  res.json({ ok: true });
});

/* =========================================================================
   Animales
   ========================================================================= */
r.post("/animales", STAFF, (req, res) => {
  const tutorId = idParam(req.body?.tutor_id);
  if (!one("SELECT id FROM tutores WHERE id = ?", tutorId)) throw new HttpError(400, "Tutor inexistente.");
  const a = datos(req.body, ANIMAL);
  if (!a.unidad) a.unidad = "individual";
  if (!a.sexo) a.sexo = "ND";
  validarAnimal(a);
  res.status(201).json({ id: insert("animales", { ...a, tutor_id: tutorId }) });
});

r.put("/animales/:id", STAFF, (req, res) => {
  const id = idParam(req.params.id);
  const actual = getAnimal(id);
  const cambios = datos(req.body, ANIMAL, { parcial: true });
  if ("tutor_id" in (req.body || {})) {
    const tutorId = idParam(req.body.tutor_id);
    if (!one("SELECT id FROM tutores WHERE id = ?", tutorId)) throw new HttpError(400, "Tutor inexistente.");
    cambios.tutor_id = tutorId;
  }
  validarAnimal({ ...actual, ...cambios });
  tx(() => {
    update("animales", id, cambios);
    auditar(req.user.id, "modificacion", "animales", id, id, actual, { ...actual, ...cambios });
  });
  res.json({ ok: true });
});

/* Historia clínica completa del animal (filtrada por rol).
   El tutor ve la de sus animales, sin las notas internas del equipo. */
r.get("/animales/:id/hc", requiere(), (req, res) => {
  const id = idParam(req.params.id);
  const animal = getAnimal(id);
  const esTutor = req.user.rol === "tutor";
  if (esTutor && animal.tutor_id !== req.user.tutor_id) throw new HttpError(404, "Animal no encontrado.");
  const tutor = one("SELECT * FROM tutores WHERE id = ?", animal.tutor_id);
  if (esTutor) { delete animal.notas; delete tutor.notas; }
  tutor.acceso = one("SELECT email, activo FROM usuarios WHERE tutor_id = ?", tutor.id) || null;
  const autor = (t) => all(
    `SELECT x.*, u.apellido || ' ' || u.nombre AS autor, u.matricula AS autor_matricula, u.ente_matricula AS autor_ente
       FROM ${t} x LEFT JOIN usuarios u ON u.id = x.usuario_id
      WHERE x.animal_id = ? ORDER BY x.fecha DESC, x.id DESC`, id);

  const vacunas = autor("vacunas");
  const out = {
    animal, tutor,
    vacunas,
    desparasitaciones: autor("desparasitaciones"),
    plan_vacunas: estadoVacunas(animal, vacunas),
    turnos: all(
      `SELECT t.*, u.apellido || ' ' || u.nombre AS vet FROM turnos t LEFT JOIN usuarios u ON u.id = t.vet_id
        WHERE t.animal_id = ? AND t.fecha >= ? AND t.estado NOT IN ('cancelado','atendido','ausente')
        ORDER BY t.fecha, t.hora`, id, hoyISO()),
  };
  if (req.user.rol !== "recepcion") {
    out.consultas = autor("consultas");
    const adj = all(
      `SELECT j.id, j.estudio_id, j.nombre, j.mime, j.tamano, j.usuario_id FROM adjuntos j
         JOIN estudios e ON e.id = j.estudio_id WHERE e.animal_id = ? ORDER BY j.id`, id);
    out.estudios = autor("estudios").map((e) => ({ ...e, adjuntos: adj.filter((j) => j.estudio_id === e.id) }));
    out.reproduccion = autor("reproduccion");
    out.practicas = autor("practicas");
    out.recetas = autor("recetas").map((x) => ({ ...x, items: JSON.parse(x.items) }));
  }
  res.json(out);
});

/* Alertas de fármacos para la especie / raza del animal. */
r.post("/animales/:id/alertas", CLINICO, (req, res) => {
  const animal = getAnimal(idParam(req.params.id));
  const productos = Array.isArray(req.body?.productos) ? req.body.productos : [];
  const alertas = [];
  for (const p of productos) {
    for (const motivo of alertasFarmaco(animal, p)) alertas.push({ producto: p, motivo });
  }
  // La alerta general (período de retiro) se informa una sola vez.
  const vistos = new Set();
  res.json(alertas.filter((a) => !vistos.has(a.motivo) && vistos.add(a.motivo)));
});

/* =========================================================================
   Registros de la HC (consultas, vacunas, ...): crear / editar / borrar
   ========================================================================= */
const puedeEditar = (user, fila) => user.rol === "director" || fila.usuario_id === user.id;

r.post("/animales/:id/:tipo", CLINICO, (req, res, next) => {
  const reg = REGISTROS[req.params.tipo];
  if (!reg) return next();
  const animalId = idParam(req.params.id);
  getAnimal(animalId);
  const d = datos(req.body, reg.campos);
  requeridos(d, reg.req);
  if (req.params.tipo === "recetas") validarItems(req.body.items);

  const nuevo = tx(() => {
    const id = insert(req.params.tipo, { ...d, animal_id: animalId, usuario_id: req.user.id });
    // El peso de la última consulta actualiza el peso del animal.
    if (req.params.tipo === "consultas" && d.peso) update("animales", animalId, { peso: d.peso });
    auditar(req.user.id, "alta", req.params.tipo, id, animalId, null, d);
    return id;
  });
  res.status(201).json({ id: nuevo });
});

r.put("/:tipo/:id", CLINICO, (req, res, next) => {
  const reg = REGISTROS[req.params.tipo];
  if (!reg) return next();
  const id = idParam(req.params.id);
  const fila = one(`SELECT * FROM ${req.params.tipo} WHERE id = ?`, id);
  if (!fila) throw new HttpError(404, "Registro no encontrado.");
  if (!puedeEditar(req.user, fila)) throw new HttpError(403, "Sólo el autor o el director pueden modificar este registro.");
  const d = datos(req.body, reg.campos, { parcial: true });
  requeridos({ ...fila, ...d }, reg.req);
  if (req.params.tipo === "recetas" && "items" in req.body) validarItems(req.body.items);
  tx(() => {
    update(req.params.tipo, id, d);
    auditar(req.user.id, "modificacion", req.params.tipo, id, fila.animal_id, fila, { ...fila, ...d });
  });
  res.json({ ok: true });
});

r.delete("/:tipo/:id", CLINICO, (req, res, next) => {
  const reg = REGISTROS[req.params.tipo];
  if (!reg) return next();
  const id = idParam(req.params.id);
  const fila = one(`SELECT * FROM ${req.params.tipo} WHERE id = ?`, id);
  if (!fila) throw new HttpError(404, "Registro no encontrado.");
  if (!puedeEditar(req.user, fila)) throw new HttpError(403, "Sólo el autor o el director pueden eliminar este registro.");
  // Los archivos adjuntos de un estudio se borran del disco junto con él.
  const archivos = req.params.tipo === "estudios" ? all("SELECT archivo FROM adjuntos WHERE estudio_id = ?", id) : [];
  tx(() => {
    run(`DELETE FROM ${req.params.tipo} WHERE id = ?`, id);
    auditar(req.user.id, "baja", req.params.tipo, id, fila.animal_id, fila, null);
  });
  for (const a of archivos) fs.rm(path.join(ADJUNTOS_DIR, a.archivo), { force: true }, () => {});
  res.json({ ok: true });
});

function validarItems(items) {
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, "La receta debe tener al menos un medicamento.");
  for (const it of items) {
    if (!it || !String(it.producto || "").trim()) throw new HttpError(400, "Cada medicamento debe tener nombre.");
  }
}

/* Receta individual (para imprimir). El tutor sólo ve las de sus animales. */
r.get("/recetas/:id", requiere(), (req, res) => {
  const id = idParam(req.params.id);
  const rec = one(
    `SELECT r.*, u.apellido || ' ' || u.nombre AS autor, u.matricula AS autor_matricula, u.ente_matricula AS autor_ente
       FROM recetas r LEFT JOIN usuarios u ON u.id = r.usuario_id WHERE r.id = ?`, id);
  if (!rec) throw new HttpError(404, "Receta no encontrada.");
  const animal = getAnimal(rec.animal_id);
  if (req.user.rol === "recepcion") throw new HttpError(403, "No tenés permiso para ver recetas.");
  if (req.user.rol === "tutor" && animal.tutor_id !== req.user.tutor_id) throw new HttpError(404, "Receta no encontrada.");
  rec.items = JSON.parse(rec.items);
  res.json({ receta: rec, animal, tutor: one("SELECT * FROM tutores WHERE id = ?", animal.tutor_id) });
});

module.exports = r;
