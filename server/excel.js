/* =========================================================================
   ANIMAL — Reporte en Excel (.xlsx) con la identidad visual de la app
   Hojas: Resumen (indicadores + tablas) · Pacientes · Vacunas a aplicar
   ========================================================================= */

const ExcelJS = require("exceljs");
const { all } = require("./db");
const { ESPECIES, estadoVacunas, hoyISO } = require("./catalogo");
const { datosReporte } = require("./reportes");

/* ---------- Paleta (la misma del login y la app) ---------- */
const C = {
  azul: "FF1638B8", azulOscuro: "FF0F2A93", azulClaro: "FFE8EEFC", azulMedio: "FF5B7BE0",
  verde: "FF16A34A", rojo: "FFDC2626", rojoClaro: "FFFDECEA",
  tinta: "FF111827", gris: "FF6B7280", grisClaro: "FFF5F7FB", linea: "FFDFE4EC", blanco: "FFFFFFFF",
};
const FUENTE = "Calibri";
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const borde = (argb = C.linea) => ({ style: "thin", color: { argb } });
const bordes = { top: borde(), left: borde(), bottom: borde(), right: borde() };

const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
const SEXO = { M: "Macho", H: "Hembra", ND: "Sin determinar" };
const MEDIO = { efectivo: "Efectivo", transferencia: "Transferencia", debito: "Débito", credito: "Crédito", mercadopago: "Mercado Pago", otro: "Otro" };
const PESOS = '"$" #,##0.00';
const ESTADO = { pendiente: "Pendiente", confirmado: "Confirmado", "en sala": "En sala", atendido: "Atendido", ausente: "Ausente", cancelado: "Cancelado" };

// Fecha ISO -> Date en UTC (Excel no corre el día por la zona horaria).
const fechaExcel = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fechaTexto = (iso) => iso.slice(0, 10).split("-").reverse().join("/");

/* ---------- Piezas de diseño ---------- */

// Banda azul con título y subtítulo, a lo ancho de `hastaCol`.
function encabezado(ws, titulo, subtitulo, hastaCol) {
  ws.getRow(1).height = 8;
  ws.mergeCells(2, 1, 2, hastaCol);
  ws.mergeCells(3, 1, 3, hastaCol);
  const t = ws.getCell(2, 1), s = ws.getCell(3, 1);
  t.value = titulo;
  t.font = { name: FUENTE, size: 18, bold: true, color: { argb: C.blanco } };
  s.value = subtitulo;
  s.font = { name: FUENTE, size: 11, color: { argb: "FFD6DEFA" } };
  for (const c of [t, s]) { c.alignment = { vertical: "middle", indent: 1 }; }
  for (let col = 1; col <= hastaCol; col++) {
    ws.getCell(2, col).fill = fill(C.azul);
    ws.getCell(3, col).fill = fill(C.azul);
    ws.getCell(4, col).fill = fill(C.azulOscuro);
  }
  ws.getRow(2).height = 34;
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 4;
}

// Fila de títulos de columna.
function cabeceraTabla(ws, fila, col, titulos) {
  titulos.forEach((txt, i) => {
    const c = ws.getCell(fila, col + i);
    c.value = txt;
    c.font = { name: FUENTE, bold: true, color: { argb: C.blanco }, size: 11 };
    c.fill = fill(C.azul);
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", indent: i === 0 ? 1 : 0, wrapText: true };
    c.border = { ...bordes, top: borde(C.azul), bottom: borde(C.azul) };
  });
  ws.getRow(fila).height = 24;
}

// Fila de datos con renglones alternados.
function filaDatos(ws, fila, col, valores, par, formatos = []) {
  valores.forEach((v, i) => {
    const c = ws.getCell(fila, col + i);
    c.value = v ?? "";
    c.font = { name: FUENTE, size: 11, color: { argb: C.tinta } };
    c.fill = fill(par ? C.grisClaro : C.blanco);
    c.border = bordes;
    c.alignment = { vertical: "middle", horizontal: typeof v === "number" || v instanceof Date ? "center" : "left", indent: typeof v === "string" ? 1 : 0, wrapText: true };
    if (formatos[i]) c.numFmt = formatos[i];
  });
  ws.getRow(fila).height = 20;
}

/* Tabla del resumen: título de sección, cabecera, filas, total opcional y
   barra de datos en la columna numérica principal. Devuelve la última fila. */
function tablaResumen(ws, fila, col, { titulo, columnas, filas, total = true, vacio = "Sin datos en el período.", barra = 1, formatos = [] }) {
  ws.mergeCells(fila, col, fila, col + columnas.length - 1);
  const t = ws.getCell(fila, col);
  t.value = titulo;
  t.font = { name: FUENTE, size: 13, bold: true, color: { argb: C.azul } };
  t.alignment = { vertical: "bottom" };
  ws.getRow(fila).height = 26;
  cabeceraTabla(ws, fila + 1, col, columnas);
  let f = fila + 2;
  if (!filas.length) {
    ws.mergeCells(f, col, f, col + columnas.length - 1);
    const c = ws.getCell(f, col);
    c.value = vacio;
    c.font = { name: FUENTE, italic: true, color: { argb: C.gris } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = bordes;
    return f;
  }
  filas.forEach((v, i) => filaDatos(ws, f + i, col, v, i % 2 === 1, formatos));
  const ultima = f + filas.length - 1;
  // Barra de datos en la columna de la cantidad principal.
  const letra = ws.getColumn(col + barra).letter;
  ws.addConditionalFormatting({
    ref: `${letra}${f}:${letra}${ultima}`,
    rules: [{ type: "dataBar", minLength: 0, maxLength: 100, gradient: false, cfvo: [{ type: "num", value: 0 }, { type: "max" }], color: { argb: "FF9DB3F2" } }],
  });
  if (!total) return ultima;
  const ft = ultima + 1;
  const sumas = columnas.map((_, i) => (i === 0 ? "Total" : { formula: `SUM(${ws.getColumn(col + i).letter}${f}:${ws.getColumn(col + i).letter}${ultima})` }));
  sumas.forEach((v, i) => {
    const c = ws.getCell(ft, col + i);
    c.value = v;
    c.font = { name: FUENTE, bold: true, color: { argb: C.azulOscuro } };
    c.fill = fill(C.azulClaro);
    c.border = { ...bordes, top: borde(C.azul) };
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", indent: i === 0 ? 1 : 0 };
    if (formatos[i]) c.numFmt = formatos[i];
  });
  ws.getRow(ft).height = 22;
  return ft;
}

// Tarjeta de indicador (etiqueta arriba, número grande abajo).
function tarjeta(ws, fila, colIni, colFin, etiqueta, valor, color = C.azul) {
  ws.mergeCells(fila, colIni, fila, colFin);
  ws.mergeCells(fila + 1, colIni, fila + 1, colFin);
  const e = ws.getCell(fila, colIni), v = ws.getCell(fila + 1, colIni);
  e.value = etiqueta.toUpperCase();
  e.font = { name: FUENTE, size: 9, bold: true, color: { argb: C.gris } };
  v.value = valor;
  v.font = { name: FUENTE, size: 24, bold: true, color: { argb: color } };
  for (const [c, al] of [[e, "bottom"], [v, "top"]]) c.alignment = { horizontal: "left", vertical: al, indent: 1 };
  for (let col = colIni; col <= colFin; col++) {
    for (const f of [fila, fila + 1]) {
      const c = ws.getCell(f, col);
      c.fill = fill(C.azulClaro);
      c.border = {
        top: f === fila ? borde(C.azulMedio) : undefined, bottom: f === fila + 1 ? borde(C.azulMedio) : undefined,
        left: col === colIni ? { style: "medium", color: { argb: color } } : undefined, right: col === colFin ? borde(C.azulMedio) : undefined,
      };
    }
  }
}

// paperSize: 9 = A4, 8 = A3 (para hojas con muchas columnas).
function configurarImpresion(ws, filaTitulos, paperSize = 9) {
  ws.pageSetup = {
    paperSize, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    ...(filaTitulos ? { printTitlesRow: `${filaTitulos}:${filaTitulos}` } : {}),
  };
  ws.headerFooter.oddFooter = "&L&8ANIMAL · Historia clínica veterinaria&R&8Página &P de &N";
}

/* ---------- Hojas ---------- */

function hojaResumen(wb, R, subtitulo) {
  const ws = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }], properties: { tabColor: { argb: C.azul } } });
  ws.columns = [{ width: 2 }, { width: 30 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 3 }, { width: 32 }, { width: 19 }, { width: 2 }];
  encabezado(ws, "Reporte de actividad", subtitulo, 9);

  const total = (k) => R.por_profesional.reduce((s, p) => s + p[k], 0);
  ws.getRow(5).height = 10;
  tarjeta(ws, 6, 2, 2, "Pacientes activos", R.por_especie.reduce((s, x) => s + x.n, 0));
  tarjeta(ws, 6, 3, 5, "Consultas", total("consultas"));
  tarjeta(ws, 6, 7, 7, "Ingresos del período", R.ingresos_por_mes.reduce((s, m) => s + m.total, 0), C.verde);
  ws.getCell(7, 7).numFmt = PESOS;
  tarjeta(ws, 6, 8, 8, "Vacunas aplicadas", total("vacunas"));
  ws.getRow(6).height = 20;
  ws.getRow(7).height = 36;
  ws.mergeCells(8, 2, 8, 8);
  const aviso = ws.getCell(8, 2);
  aviso.value = R.vencidas.length
    ? `⚠  ${R.vencidas.length} paciente${R.vencidas.length > 1 ? "s" : ""} con vacunas vencidas o pendientes (ver hoja "Vacunas a aplicar").`
    : "✓  Todos los planes de vacunación están al día.";
  aviso.font = { name: FUENTE, size: 11, bold: true, color: { argb: R.vencidas.length ? C.rojo : C.verde } };
  aviso.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(8).height = 28;

  const mes = (m) => { const [y, mm] = m.split("-").map(Number); return `${MESES[mm - 1]} ${y}`; };
  let f = 10;
  const izq1 = tablaResumen(ws, f, 2, { titulo: "Consultas por mes", columnas: ["Mes", "Consultas"], filas: R.consultas_por_mes.map((x) => [mes(x.mes), x.n]) });
  const der1 = tablaResumen(ws, f, 7, { titulo: "Pacientes por especie", columnas: ["Especie", "Pacientes"], filas: R.por_especie.map((x) => [x.nombre, x.n]) });
  f = Math.max(izq1, der1) + 2;
  // Registros monetarios (lo cobrado, por fecha de pago).
  const izqI = tablaResumen(ws, f, 2, {
    titulo: "Ingresos por mes", columnas: ["Mes", "Cobros", "Total"], barra: 2, formatos: [null, null, PESOS],
    filas: R.ingresos_por_mes.map((x) => [mes(x.mes), x.n, x.total]), vacio: "Sin cobros en el período.",
  });
  const derI = tablaResumen(ws, f, 7, {
    titulo: "Ingresos por medio de pago", columnas: ["Medio", "Total"], formatos: [null, PESOS],
    filas: R.ingresos_por_medio.map((x) => [MEDIO[x.medio] || x.medio, x.total]), vacio: "Sin cobros en el período.",
  });
  f = Math.max(izqI, derI) + 1;
  ws.mergeCells(f, 2, f, 8);
  const deuda = ws.getCell(f, 2);
  deuda.value = `Deuda total de tutores (cobros a cuenta sin pagar): ${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(R.deuda_total)}`;
  deuda.font = { name: FUENTE, size: 11, bold: true, color: { argb: R.deuda_total ? "FFB26A00" : C.verde } };
  deuda.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(f).height = 24;
  f += 2;
  const izq2 = tablaResumen(ws, f, 2, {
    titulo: "Actividad por profesional", columnas: ["Profesional", "Consultas", "Vacunas", "Recetas"],
    filas: R.por_profesional.map((p) => [p.profesional, p.consultas, p.vacunas, p.recetas]),
  });
  const der2 = tablaResumen(ws, f, 7, { titulo: "Vacunas aplicadas", columnas: ["Vacuna", "Dosis"], filas: R.vacunas_aplicadas.map((x) => [x.nombre, x.n]) });
  f = Math.max(izq2, der2) + 2;
  tablaResumen(ws, f, 2, { titulo: "Diagnósticos más frecuentes", columnas: ["Diagnóstico", "Casos"], filas: R.diagnosticos.map((x) => [x.diagnostico, x.n]), total: false });
  tablaResumen(ws, f, 7, { titulo: "Turnos por estado", columnas: ["Estado", "Turnos"], filas: R.turnos_por_estado.map((x) => [ESTADO[x.estado] || x.estado, x.n]) });
  configurarImpresion(ws);
}

function hojaPacientes(wb, subtitulo) {
  const ws = wb.addWorksheet("Pacientes", { views: [{ state: "frozen", ySplit: 5, xSplit: 2, showGridLines: false }], properties: { tabColor: { argb: C.verde } } });
  const cols = [
    ["ID", 7], ["Paciente", 20], ["Especie", 12], ["Raza / tipo", 20], ["Sexo", 13], ["Nacimiento", 13], ["Peso (kg)", 10],
    ["Microchip", 19], ["Identificación", 20], ["Castrado", 10], ["Estado", 11], ["Alergias", 24],
    ["Tutor", 26], ["DNI / CUIT", 14], ["Teléfono", 15], ["Email", 26], ["Ciudad", 16], ["Vacunas a aplicar", 34], ["Última consulta", 15],
  ];
  ws.columns = cols.map(([, w]) => ({ width: w }));
  encabezado(ws, "Pacientes", subtitulo, cols.length);
  cabeceraTabla(ws, 5, 1, cols.map(([t]) => t));

  const filas = all(
    `SELECT a.*, t.apellido AS t_apellido, t.nombre AS t_nombre, t.dni, t.telefono, t.email, t.ciudad,
            (SELECT MAX(substr(fecha,1,10)) FROM consultas c WHERE c.animal_id = a.id) AS ultima
       FROM animales a JOIN tutores t ON t.id = a.tutor_id ORDER BY a.fallecido, t.apellido, a.nombre`);
  const vacunas = all("SELECT animal_id, codigo, fecha, proxima FROM vacunas");
  filas.forEach((a, i) => {
    const malas = a.fallecido ? "" : estadoVacunas(a, vacunas.filter((v) => v.animal_id === a.id))
      .filter((v) => v.estado === "vencida" || v.estado === "pendiente").map((v) => v.nombre).join(", ");
    const r = 6 + i;
    filaDatos(ws, r, 1, [
      a.id, a.nombre, ESPECIES[a.especie]?.nombre || a.especie, a.raza, a.unidad === "rodeo" ? `Rodeo (${a.cantidad})` : SEXO[a.sexo],
      fechaExcel(a.fecha_nac), a.peso, a.microchip, a.identificacion, a.castrado ? "Sí" : "No",
      a.fallecido ? "Fallecido" : "Activo", a.alergias, `${a.t_apellido}, ${a.t_nombre}`, a.dni, a.telefono, a.email, a.ciudad,
      malas || (a.fallecido ? "" : "Al día"), fechaExcel(a.ultima),
    ], i % 2 === 1, [null, null, null, null, null, "dd/mm/yyyy", "0.0#", "@", null, null, null, null, null, "@", "@", null, null, null, "dd/mm/yyyy"]);
    ws.getCell(r, 2).font = { name: FUENTE, bold: true, color: { argb: C.azul } };
    ws.getCell(r, 10).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(r, 11).alignment = { horizontal: "center", vertical: "middle" };
    const vac = ws.getCell(r, 18);
    if (malas) { vac.font = { name: FUENTE, bold: true, color: { argb: C.rojo } }; vac.fill = fill(C.rojoClaro); }
    else if (!a.fallecido) vac.font = { name: FUENTE, color: { argb: C.verde } };
    if (a.alergias) ws.getCell(r, 12).font = { name: FUENTE, color: { argb: C.rojo } };
    if (a.fallecido) {
      for (let c = 1; c <= cols.length; c++) ws.getCell(r, c).font = { name: FUENTE, italic: true, color: { argb: C.gris } };
    }
  });
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + filas.length, column: cols.length } };
  configurarImpresion(ws, 5, 8);
}

function hojaVacunas(wb, R, subtitulo) {
  const ws = wb.addWorksheet("Vacunas a aplicar", { views: [{ state: "frozen", ySplit: 5, showGridLines: false }], properties: { tabColor: { argb: C.rojo } } });
  const cols = [["Paciente", 22], ["Especie", 13], ["Tutor", 28], ["Teléfono", 16], ["Vacunas vencidas o pendientes", 46], ["Desde", 13]];
  ws.columns = cols.map(([, w]) => ({ width: w }));
  encabezado(ws, "Vacunas a aplicar", subtitulo, cols.length);
  cabeceraTabla(ws, 5, 1, cols.map(([t]) => t));
  if (!R.vencidas.length) {
    ws.mergeCells(6, 1, 6, cols.length);
    const c = ws.getCell(6, 1);
    c.value = "✓  Todos los planes de vacunación están al día.";
    c.font = { name: FUENTE, bold: true, color: { argb: C.verde } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(6).height = 26;
  }
  R.vencidas.forEach((v, i) => {
    const r = 6 + i;
    filaDatos(ws, r, 1, [v.animal, ESPECIES[v.especie]?.nombre || v.especie, `${v.tutor_apellido}, ${v.tutor_nombre}`,
      v.tutor_telefono, v.vacunas.join(", "), fechaExcel(v.desde) || "Sin aplicar"], i % 2 === 1, [null, null, null, "@", null, "dd/mm/yyyy"]);
    ws.getCell(r, 1).font = { name: FUENTE, bold: true, color: { argb: C.azul } };
    ws.getCell(r, 5).font = { name: FUENTE, bold: true, color: { argb: C.rojo } };
  });
  if (R.vencidas.length) ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + R.vencidas.length, column: cols.length } };
  configurarImpresion(ws, 5);
}

/* ---------- Libro completo ---------- */
async function reporteExcel(desde, hasta, clinica = "ANIMAL") {
  const R = datosReporte(desde, hasta);
  const wb = new ExcelJS.Workbook();
  wb.creator = "ANIMAL";
  wb.created = new Date();
  const subtitulo = `${clinica}  ·  Período ${fechaTexto(desde)} al ${fechaTexto(hasta)}  ·  Generado el ${fechaTexto(hoyISO())}`;
  hojaResumen(wb, R, subtitulo);
  hojaPacientes(wb, subtitulo);
  hojaVacunas(wb, R, subtitulo);
  return wb.xlsx.writeBuffer();
}

module.exports = { reporteExcel };
