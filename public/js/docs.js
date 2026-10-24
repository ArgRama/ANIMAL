/* ANIMAL — Piezas compartidas de documentos (receta, libreta sanitaria) */

const Docs = (() => {
  const { esc, fecha, edad, especie, SEXO, tagVacuna } = HV;

  function cabecera(c, derecha = "") {
    return `<header class="doc__head">
      <div style="display:flex;gap:14px;align-items:center">
        <span class="logo-emblema doc__logo" role="img" aria-label="ANIMAL"></span>
        <div><div class="doc__clinic">${esc(c.nombre || "Veterinaria")}</div>
          <div class="doc__small">${esc([c.direccion, c.ciudad, c.provincia].filter(Boolean).join(", "))}<br />
          ${esc([c.telefono && "Tel. " + c.telefono, c.email, c.cuit && "CUIT " + c.cuit].filter(Boolean).join(" · "))}</div></div>
      </div>
      <div class="doc__small" style="text-align:right">${derecha}</div>
    </header>`;
  }

  // Libreta sanitaria: datos, plan, vacunas aplicadas, desparasitaciones.
  function libreta(L, { conTutor = true } = {}) {
    const a = L.animal, e = especie(a.especie), t = L.tutor;
    return `
      <div class="doc__grid">
        <div><b>Nombre:</b> ${esc(a.nombre)}${a.unidad === "rodeo" ? ` (rodeo, ${a.cantidad} cab.)` : ""}</div>
        <div><b>Especie / raza:</b> ${esc(e.nombre)}${a.raza ? " · " + esc(a.raza) : ""}</div>
        <div><b>Sexo:</b> ${esc(SEXO[a.sexo])}${a.castrado ? " · castrado/a" : ""}</div>
        <div><b>Nacimiento:</b> ${a.fecha_nac ? fecha(a.fecha_nac) + " (" + esc(edad(a.fecha_nac)) + ")" : "—"}</div>
        <div><b>Color / pelaje:</b> ${esc(a.color || "—")}</div>
        <div><b>Microchip:</b> ${esc(a.microchip || "—")}</div>
        ${a.identificacion ? `<div><b>Identificación:</b> ${esc(a.identificacion)}</div>` : ""}
        ${conTutor && t ? `<div><b>Tutor:</b> ${esc(t.apellido)}, ${esc(t.nombre)} · DNI ${esc(t.dni)}</div>` : ""}
      </div>

      ${L.plan_vacunas.length ? `<h2 class="doc__title">Plan de vacunación</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vacuna</th><th>Última dosis</th><th>Próxima</th><th>Estado</th></tr></thead><tbody>
        ${L.plan_vacunas.map((v) => `<tr><td><b>${esc(v.nombre)}</b>${v.obligatoria ? ' <span class="tag tag--info">Obligatoria</span>' : ""}<div class="muted" style="font-size:12px">${esc(v.previene || "")}</div></td>
          <td>${v.ultima ? fecha(v.ultima) : "—"}</td><td>${v.fecha ? fecha(v.fecha) : "—"}</td><td>${tagVacuna(v.estado)}</td></tr>`).join("")}
      </tbody></table></div>` : ""}

      <h2 class="doc__title">Vacunas aplicadas</h2>
      ${L.vacunas.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Vacuna</th><th>Laboratorio · lote</th><th>Próxima</th><th>Veterinario/a</th></tr></thead><tbody>
        ${L.vacunas.map((v) => `<tr><td class="nowrap">${fecha(v.fecha)}</td><td><b>${esc(v.nombre)}</b>${v.codigo === "rabia"
          ? ` <a class="no-print" href="certificado.html?id=${v.id}" style="color:var(--blue-600);font-size:12px;font-weight:600;white-space:nowrap">· Certificado</a>` : ""}</td>
          <td>${esc([v.laboratorio, v.lote && "Lote " + v.lote].filter(Boolean).join(" · ") || "—")}</td>
          <td class="nowrap">${v.proxima ? fecha(v.proxima) : "—"}</td><td>${esc(v.autor || "")}${v.autor_matricula ? `<div class="muted" style="font-size:12px">${esc(v.autor_matricula)}</div>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">Sin vacunas registradas.</p>`}

      <h2 class="doc__title">Desparasitaciones</h2>
      ${L.desparasitaciones.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Próxima</th></tr></thead><tbody>
        ${L.desparasitaciones.map((d) => `<tr><td class="nowrap">${fecha(d.fecha)}</td><td>${esc(d.tipo)}</td><td>${esc(d.producto)}</td><td>${esc(d.dosis || "—")}</td><td class="nowrap">${d.proxima ? fecha(d.proxima) : "—"}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">Sin desparasitaciones registradas.</p>`}`;
  }

  return { cabecera, libreta };
})();
