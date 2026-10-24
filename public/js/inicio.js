/* ANIMAL — Inicio: accesos por rol + resumen del día */

(async () => {
  const { icon, esc, $, api, avatar, fecha, fechaLarga, whatsapp, ESTADO_TURNO, TIPO_TURNO, pesos } = HV;
  const me = await HV.init({ roles: ["director", "veterinario", "recepcion"] });
  const r = await api("GET", "/api/inicio");
  const sol = r.totales.solicitudes;

  /* ---------- Accesos (se muestran según el rol) ---------- */
  const MENU = [
    { t: "Buscar paciente", s: "Tutor, animal, DNI o microchip", i: "search", href: "buscar.html" },
    { t: "Nuevo paciente", s: "Registrar tutor y animal", i: "userPlus", href: "registro.html", tipo: "green" },
    { t: "Agenda de turnos", s: sol ? `${sol} pedido${sol > 1 ? "s" : ""} de turno sin responder` : "Día y semana", i: "calendar", href: "turnos.html", badge: sol },
    { t: "Recordatorios", s: "Vacunas y controles a avisar", i: "msg", href: "recordatorios.html", tipo: "purple" },
    { t: "Caja y cobros", s: `Hoy: ${pesos(r.totales.caja_hoy)}`, i: "cash", href: "caja.html", tipo: "green" },
    { t: "Reportes", s: "Actividad de la clínica", i: "chart", href: "reportes.html", roles: ["director"] },
    { t: "Equipo y clínica", s: "Usuarios y datos de la veterinaria", i: "users", href: "usuarios.html", roles: ["director"], tipo: "white" },
  ];
  $("#menu").innerHTML = MENU
    .filter((m) => !m.roles || m.roles.includes(me.rol))
    .map((m) => `<a class="card ${m.tipo ? "card--" + m.tipo : ""}" href="${m.href}">${icon(m.i)}
        <span class="card__title">${m.t}<span class="card__sub">${esc(m.s)}</span></span>
        ${m.badge ? `<span class="card__badge">${m.badge}</span>` : ""}</a>`)
    .join("");

  /* ---------- Resumen del día ---------- */
  $("#tTurnos").innerHTML = `${icon("clock")}Turnos de hoy <span class="panel__count">${r.turnos.length}</span>`;
  $("#tVencidas").innerHTML = `${icon("syringe")}Vacunas a recordar <span class="panel__count">${r.vencidas.length}</span>`;
  $("#tControles").innerHTML = `${icon("stetho")}Controles próximos`;

  const vacio = (txt, ic) => `<div class="empty">${icon(ic)}${txt}</div>`;

  $("#turnosHoy").innerHTML = r.turnos.length
    ? r.turnos.map((t) => `
      <a class="list__item list__item--link" href="animal.html?id=${t.animal_id}">
        <span class="list__time">${esc(t.hora)}</span>${avatar(t.especie, "ava--sm", t.foto)}
        <span class="list__main"><span class="list__title">${esc(t.animal)} <span class="muted" style="font-weight:400">· ${esc(t.tutor_apellido)}</span></span>
          <span class="list__sub">${esc(TIPO_TURNO[t.tipo] || t.tipo)}${t.vet ? " · Dr/a. " + esc(t.vet) : ""}</span></span>
        <span class="tag tag--${ESTADO_TURNO[t.estado]}">${esc(t.estado)}</span>
      </a>`).join("")
    : vacio(`Sin turnos para ${fechaLarga(r.hoy)}.`, "calendar");

  $("#vencidas").innerHTML = r.vencidas.length
    ? r.vencidas.map((v) => {
        const wa = whatsapp(v.tutor_telefono, `Hola, le escribimos de la veterinaria: ${v.animal} tiene pendiente ${v.vacunas.join(", ")}. ¿Le reservamos un turno?`);
        return `<div class="list__item">
          ${avatar(v.especie, "ava--sm", v.foto)}
          <a class="list__main" href="animal.html?id=${v.animal_id}"><span class="list__title">${esc(v.animal)} <span class="muted" style="font-weight:400">· ${esc(v.tutor_apellido)}</span></span>
            <span class="list__sub">${esc(v.vacunas.join(", "))}${v.desde ? " · desde " + fecha(v.desde) : ""}</span></a>
          ${wa ? `<a class="icon-btn" href="${wa}" target="_blank" rel="noopener" title="Recordar por WhatsApp" aria-label="Recordar por WhatsApp">${icon("msg")}</a>` : ""}
        </div>`;
      }).join("")
    : vacio("Todos los planes de vacunación al día.", "check");

  $("#controles").innerHTML = r.controles.length
    ? r.controles.map((c) => `
      <a class="list__item list__item--link" href="animal.html?id=${c.animal_id}">
        ${avatar(c.especie, "ava--sm", c.foto)}
        <span class="list__main"><span class="list__title">${esc(c.animal)}</span><span class="list__sub">${esc(c.tutor_apellido)} · ${fecha(c.fecha)}</span></span>
      </a>`).join("")
    : vacio("Sin controles en los próximos 7 días.", "stetho");

  $("#totales").innerHTML = [
    [r.totales.animales, "Pacientes"], [r.totales.tutores, "Tutores"], [r.totales.consultas_mes, "Consultas del mes"],
  ].map(([n, l]) => `<div class="stat"><span class="stat__n">${n}</span><span class="stat__l">${l}</span></div>`).join("");
})();
