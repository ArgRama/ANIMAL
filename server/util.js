/* =========================================================================
   ANIMAL — Validación de datos de entrada
   ========================================================================= */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_FECHAHORA = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;
const RE_HORA = /^\d{2}:\d{2}$/;

/* Toma del body sólo los campos declarados y los convierte al tipo indicado.
   Tipos: texto · num · int · bool · fecha · fechahora · hora · json · enum:[a|b]
   Con parcial=true (PUT) sólo incluye los campos presentes en el body. */
function datos(body, spec, { parcial = false } = {}) {
  const out = {};
  for (const [campo, tipo] of Object.entries(spec)) {
    if (!(campo in (body || {}))) {
      if (!parcial) out[campo] = tipo === "bool" ? 0 : null;
      continue;
    }
    out[campo] = convertir(campo, body[campo], tipo);
  }
  return out;
}

function convertir(campo, v, tipo) {
  if (tipo === "bool") return v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  if (tipo === "json") return JSON.stringify(v);
  const s = typeof v === "string" ? v.trim() : v;
  switch (tipo) {
    case "texto":
      return String(s).slice(0, 5000);
    case "num": {
      const n = Number(String(s).replace(",", "."));
      if (!Number.isFinite(n)) throw new HttpError(400, `"${campo}" debe ser un número.`);
      return n;
    }
    case "int": {
      const n = Number(s);
      if (!Number.isInteger(n)) throw new HttpError(400, `"${campo}" debe ser un número entero.`);
      return n;
    }
    case "fecha":
      if (!RE_FECHA.test(s)) throw new HttpError(400, `"${campo}" debe ser una fecha válida.`);
      return s;
    case "fechahora":
      if (!RE_FECHAHORA.test(s)) throw new HttpError(400, `"${campo}" debe ser una fecha válida.`);
      return s.replace("T", " ").slice(0, 16);
    case "hora":
      if (!RE_HORA.test(s)) throw new HttpError(400, `"${campo}" debe ser una hora (HH:MM).`);
      return s;
    default:
      if (tipo.startsWith("enum:")) {
        const ok = tipo.slice(5).split("|");
        if (!ok.includes(s)) throw new HttpError(400, `"${campo}" tiene un valor no permitido.`);
        return s;
      }
      return s;
  }
}

function requeridos(obj, campos, etiquetas = {}) {
  const faltan = campos.filter((c) => obj[c] === null || obj[c] === undefined || obj[c] === "");
  if (faltan.length) {
    throw new HttpError(400, `Completá: ${faltan.map((c) => etiquetas[c] || c).join(", ")}.`);
  }
}

const idParam = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identificador inválido.");
  return n;
};

module.exports = { HttpError, datos, requeridos, idParam };
