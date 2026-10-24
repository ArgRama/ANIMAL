/* =========================================================================
   ANIMAL — Base de datos (SQLite nativo de Node, sin dependencias)
   Un único archivo: data/humanvet.db. El esquema se crea al iniciar.
   ========================================================================= */

const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.HV_DB || path.join(DATA_DIR, "humanvet.db");

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA foreign_keys = ON;");

// norm(x): minúsculas y sin acentos, para búsquedas tolerantes ("gomez" encuentra "Gómez").
db.function("norm", { deterministic: true }, (s) =>
  s == null ? null : String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clinica (
  id        INTEGER PRIMARY KEY CHECK (id = 1),
  nombre    TEXT NOT NULL,
  direccion TEXT, ciudad TEXT, provincia TEXT, telefono TEXT, email TEXT, cuit TEXT
);

CREATE TABLE IF NOT EXISTS tutores (
  id        INTEGER PRIMARY KEY,
  apellido  TEXT NOT NULL,
  nombre    TEXT NOT NULL,
  dni       TEXT NOT NULL UNIQUE,
  telefono  TEXT, email TEXT, direccion TEXT, ciudad TEXT, provincia TEXT, notas TEXT,
  creado    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY,
  nombre        TEXT NOT NULL,
  apellido      TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('director','veterinario','recepcion','tutor')),
  matricula     TEXT,
  tutor_id      INTEGER REFERENCES tutores(id) ON DELETE CASCADE,
  activo        INTEGER NOT NULL DEFAULT 1,
  creado        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS animales (
  id            INTEGER PRIMARY KEY,
  tutor_id      INTEGER NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  especie       TEXT NOT NULL,
  raza          TEXT,
  sexo          TEXT CHECK (sexo IN ('M','H','ND')),
  fecha_nac     TEXT,
  color         TEXT,
  senas         TEXT,
  microchip     TEXT,
  identificacion TEXT,
  castrado      INTEGER NOT NULL DEFAULT 0,
  peso          REAL,
  unidad        TEXT NOT NULL DEFAULT 'individual' CHECK (unidad IN ('individual','rodeo')),
  cantidad      INTEGER,
  alergias      TEXT,
  cronicas      TEXT,
  notas         TEXT,
  fallecido     INTEGER NOT NULL DEFAULT 0,
  creado        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS ix_animales_tutor ON animales(tutor_id);

CREATE TABLE IF NOT EXISTS consultas (
  id            INTEGER PRIMARY KEY,
  animal_id     INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id    INTEGER REFERENCES usuarios(id),
  fecha         TEXT NOT NULL,
  motivo        TEXT NOT NULL,
  anamnesis     TEXT, examen TEXT,
  temperatura   REAL, fc INTEGER, fr INTEGER, peso REAL,
  condicion_corporal INTEGER,
  mucosas       TEXT, tllc TEXT, hidratacion TEXT,
  diagnostico   TEXT, tratamiento TEXT,
  proximo_control TEXT
);
CREATE INDEX IF NOT EXISTS ix_consultas_animal ON consultas(animal_id);

CREATE TABLE IF NOT EXISTS vacunas (
  id          INTEGER PRIMARY KEY,
  animal_id   INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id  INTEGER REFERENCES usuarios(id),
  codigo      TEXT,
  nombre      TEXT NOT NULL,
  laboratorio TEXT, lote TEXT,
  fecha       TEXT NOT NULL,
  proxima     TEXT,
  notas       TEXT
);
CREATE INDEX IF NOT EXISTS ix_vacunas_animal ON vacunas(animal_id);

CREATE TABLE IF NOT EXISTS desparasitaciones (
  id         INTEGER PRIMARY KEY,
  animal_id  INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  tipo       TEXT NOT NULL CHECK (tipo IN ('interna','externa','ambas')),
  producto   TEXT NOT NULL,
  dosis      TEXT,
  fecha      TEXT NOT NULL,
  proxima    TEXT,
  notas      TEXT
);

CREATE TABLE IF NOT EXISTS estudios (
  id         INTEGER PRIMARY KEY,
  animal_id  INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  tipo       TEXT NOT NULL CHECK (tipo IN ('laboratorio','imagen','otro')),
  nombre     TEXT NOT NULL,
  fecha      TEXT NOT NULL,
  estado     TEXT NOT NULL DEFAULT 'solicitado' CHECK (estado IN ('solicitado','con resultado')),
  resultado  TEXT,
  notas      TEXT
);

CREATE TABLE IF NOT EXISTS practicas (
  id          INTEGER PRIMARY KEY,
  animal_id   INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id  INTEGER REFERENCES usuarios(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('cirugia','practica')),
  nombre      TEXT NOT NULL,
  fecha       TEXT NOT NULL,
  anestesia   TEXT,
  descripcion TEXT,
  notas       TEXT
);

CREATE TABLE IF NOT EXISTS recetas (
  id           INTEGER PRIMARY KEY,
  animal_id    INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id   INTEGER REFERENCES usuarios(id),
  fecha        TEXT NOT NULL,
  diagnostico  TEXT,
  indicaciones TEXT,
  items        TEXT NOT NULL,
  controlada   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS turnos (
  id         INTEGER PRIMARY KEY,
  animal_id  INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  vet_id     INTEGER REFERENCES usuarios(id),
  fecha      TEXT NOT NULL,
  hora       TEXT NOT NULL,
  duracion   INTEGER NOT NULL DEFAULT 30,
  tipo       TEXT NOT NULL DEFAULT 'consulta',
  estado     TEXT NOT NULL DEFAULT 'pendiente'
             CHECK (estado IN ('pendiente','confirmado','en sala','atendido','ausente','cancelado')),
  notas      TEXT,
  creado_por INTEGER REFERENCES usuarios(id)
);
CREATE INDEX IF NOT EXISTS ix_turnos_fecha ON turnos(fecha);

CREATE TABLE IF NOT EXISTS reproduccion (
  id         INTEGER PRIMARY KEY,
  animal_id  INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  tipo       TEXT NOT NULL CHECK (tipo IN ('celo','servicio','gestacion','parto','aborto')),
  fecha      TEXT NOT NULL,
  fpp        TEXT,
  crias      INTEGER,
  notas      TEXT
);

CREATE TABLE IF NOT EXISTS adjuntos (
  id         INTEGER PRIMARY KEY,
  estudio_id INTEGER NOT NULL REFERENCES estudios(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  nombre     TEXT NOT NULL,
  mime       TEXT NOT NULL,
  archivo    TEXT NOT NULL,
  tamano     INTEGER NOT NULL,
  creado     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Quién creó, modificó o borró cada registro de la historia clínica.
CREATE TABLE IF NOT EXISTS auditoria (
  id         INTEGER PRIMARY KEY,
  fecha      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  usuario_id INTEGER REFERENCES usuarios(id),
  accion     TEXT NOT NULL CHECK (accion IN ('alta','modificacion','baja')),
  tabla      TEXT NOT NULL,
  registro_id INTEGER,
  animal_id  INTEGER,
  antes      TEXT,
  despues    TEXT
);
CREATE INDEX IF NOT EXISTS ix_auditoria_animal ON auditoria(animal_id);

-- Registros monetarios: cobros a tutores. 'pendiente' = queda en la cuenta del tutor.
CREATE TABLE IF NOT EXISTS cobros (
  id         INTEGER PRIMARY KEY,
  tutor_id   INTEGER NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
  animal_id  INTEGER REFERENCES animales(id) ON DELETE SET NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha      TEXT NOT NULL,
  concepto   TEXT NOT NULL,
  monto      REAL NOT NULL CHECK (monto > 0),
  medio      TEXT CHECK (medio IN ('efectivo','transferencia','debito','credito','mercadopago','otro')),
  estado     TEXT NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado','pendiente','anulado')),
  pagado_en  TEXT,
  notas      TEXT
);
CREATE INDEX IF NOT EXISTS ix_cobros_tutor ON cobros(tutor_id);
CREATE INDEX IF NOT EXISTS ix_cobros_pagado ON cobros(pagado_en);

-- Turnos que pide el tutor desde el portal; recepción los agenda o rechaza.
CREATE TABLE IF NOT EXISTS solicitudes (
  id         INTEGER PRIMARY KEY,
  animal_id  INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha      TEXT NOT NULL,
  franja     TEXT NOT NULL CHECK (franja IN ('mañana','tarde','cualquiera')),
  motivo     TEXT NOT NULL,
  estado     TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','agendada','rechazada','cancelada')),
  respuesta  TEXT,
  turno_id   INTEGER REFERENCES turnos(id) ON DELETE SET NULL,
  creado     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Recordatorios ya avisados al tutor (clave = tipo:animal:referencia:fecha).
CREATE TABLE IF NOT EXISTS avisos (
  clave      TEXT PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`;
db.exec(SCHEMA);

/* ---------- Migraciones (columnas agregadas después de la v0.1) ---------- */
const columnas = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
if (!columnas("animales").includes("foto")) db.exec("ALTER TABLE animales ADD COLUMN foto TEXT");

// Perfil del profesional ("Mi usuario").
const colUsuarios = columnas("usuarios");
for (const [col, tipo] of [
  ["dni", "TEXT"], ["fecha_nac", "TEXT"], ["cuit", "TEXT"], ["telefono", "TEXT"],
  ["tipo_matricula", "TEXT"], ["ente_matricula", "TEXT"], ["especialidad", "TEXT"],
  ["pais", "TEXT"], ["provincia", "TEXT"], ["ciudad", "TEXT"], ["foto", "TEXT"],
]) {
  if (!colUsuarios.includes(col)) db.exec(`ALTER TABLE usuarios ADD COLUMN ${col} ${tipo}`);
}
db.exec(`CREATE TABLE IF NOT EXISTS usuario_documentos (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('dni_frente','dni_dorso','titulo','matricula','firma')),
  archivo     TEXT NOT NULL,
  mime        TEXT NOT NULL,
  actualizado TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (usuario_id, tipo)
)`);

const FOTOS_DIR = path.join(DATA_DIR, "fotos");
fs.mkdirSync(FOTOS_DIR, { recursive: true });
const ADJUNTOS_DIR = path.join(DATA_DIR, "adjuntos");
fs.mkdirSync(ADJUNTOS_DIR, { recursive: true });
const DOCUMENTOS_DIR = path.join(DATA_DIR, "documentos");   // DNI, título, matrícula, firma y foto de usuarios
fs.mkdirSync(DOCUMENTOS_DIR, { recursive: true });

// Registro de auditoría. `antes` / `despues` son las filas completas.
function auditar(usuarioId, accion, tabla, registroId, animalId, antes = null, despues = null) {
  db.prepare(
    `INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, animal_id, antes, despues) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(usuarioId ?? null, accion, tabla, registroId ?? null, animalId ?? null,
    antes ? JSON.stringify(antes) : null, despues ? JSON.stringify(despues) : null);
}

/* ---------- Helpers ---------- */
// node:sqlite no acepta undefined: se normaliza a null.
const clean = (params) => {
  if (Array.isArray(params)) return params.map((v) => (v === undefined ? null : v));
  return params;
};

const one = (sql, ...params) => db.prepare(sql).get(...clean(params));
const all = (sql, ...params) => db.prepare(sql).all(...clean(params));
const run = (sql, ...params) => db.prepare(sql).run(...clean(params));

// INSERT con exactamente las claves recibidas. Devuelve el id nuevo.
function insert(table, data) {
  const keys = Object.keys(data);
  const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  return Number(run(sql, ...keys.map((k) => data[k])).lastInsertRowid);
}

function update(table, id, data) {
  const keys = Object.keys(data);
  if (!keys.length) return 0;
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`;
  return Number(run(sql, ...keys.map((k) => data[k]), id).changes);
}

function tx(fn) {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

module.exports = { db, one, all, run, insert, update, tx, auditar, DB_FILE, DATA_DIR, FOTOS_DIR, ADJUNTOS_DIR, DOCUMENTOS_DIR };
