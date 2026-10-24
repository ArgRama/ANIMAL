/* ANIMAL — Agenda: semana, día, estados del turno y alta rápida */

(async () => {
  const { icon, esc, $, $$, api, avatar, fecha, fechaLarga, DIAS, MESES, modal, close, confirmar, toast,
    onSubmit, opciones, ESTADO_TURNO, TIPO_TURNO, whatsapp } = HV;
  const me = await HV.init({ roles: ["director", "veterinario", "recepcion"] });

  $("#back").innerHTML = `${icon("back")}Inicio`;
  $("#nuevo").innerHTML = `${icon("plus")}Nuevo turno`;
  $("#prev").innerHTML = icon("left");
  $("#next").innerHTML = icon("right");

  const vets = await api("GET", "/api/veterinarios");
  $("#vet").insertAdjacentHTML("beforeend", vets.map((v) => `<option value="${v.id}">Dr/a. ${esc(v.apellido)} ${esc(v.nombre)}</option>`).join(""));
  if (me.rol === "veterinario") $("#vet").value = String(me.id);

  let dia = HV.qs("fecha") || HV.hoy();
  let semana = [];
  let turnos = [];

  const lunes = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return HV.sumarDias(iso, dow === 0 ? -6 : 1 - dow);
  };

  async function cargar() {
    const ini = lunes(dia);
    semana = Array.from({ length: 7 }, (_, i) => HV.sumarDias(ini, i));
    const params = new URLSearchParams({ desde: semana[0], hasta: semana[6] });
    if ($("#vet").value) params.set("vet", $("#vet").value);
    turnos = await api("GET", "/api/turnos?" + params);
    render();
  }

  function render() {
    const [y, m] = dia.split("-").map(Number);
    $("#mes").textContent = `${MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)} ${y}`;
    $("#sub").textContent = `${turnos.filter((t) => t.estado !== "cancelado").length} turnos en la semana`;
    const hoy = HV.hoy();
    $("#week").innerHTML = semana.map((d) => {
      const n = turnos.filter((t) => t.fecha === d && t.estado !== "cancelado").length;
      const [yy, mm, dd] = d.split("-").map(Number);
      return `<button class="day ${d === dia ? "is-on" : ""} ${d === hoy ? "is-today" : ""}" data-d="${d}" type="button">
        <div class="day__dow">${DIAS[new Date(yy, mm - 1, dd).getDay()]}</div><div class="day__n">${dd}</div>
        <div class="day__count">${n ? n + " turno" + (n > 1 ? "s" : "") : ""}</div></button>`;
    }).join("");
    $$("#week [data-d]").forEach((b) => b.addEventListener("click", () => { dia = b.dataset.d; render(); }));

    const delDia = turnos.filter((t) => t.fecha === dia);
    $("#tDia").innerHTML = `${icon("calendar")}${fechaLarga(dia)[0].toUpperCase() + fechaLarga(dia).slice(1)}`;
    $("#nDia").textContent = delDia.filter((t) => t.estado !== "cancelado").length;
    $("#dia").innerHTML = delDia.length ? delDia.map(slot).join("")
      : `<div class="empty">${icon("calendar")}No hay turnos este día.<br /><br /><button class="btn btn--sm btn--green" data-nuevo-dia>${icon("plus")}Agendar</button></div>`;

    $("[data-nuevo-dia]")?.addEventListener("click", () => nuevo());
    $$("#dia .estado-sel").forEach((sel) => sel.addEventListener("change", async () => {
      try { await api("PUT", `/api/turnos/${sel.dataset.id}`, { estado: sel.value }); toast(`Turno: ${sel.value}`, "ok"); cargar(); }
      catch (e) { toast(e.message, "error"); cargar(); }
    }));
    // Atender: pasa el turno a "en sala" y abre la consulta en la ficha.
    $$("#dia [data-atender]").forEach((b) => b.addEventListener("click", async () => {
      const t = turnos.find((x) => x.id === Number(b.dataset.atender));
      if (t.estado !== "en sala") await api("PUT", `/api/turnos/${t.id}`, { estado: "en sala" }).catch(() => {});
      location.href = `animal.html?id=${t.animal_id}&turno=${t.id}&nueva=consulta`;
    }));
    $$("#dia [data-edit]").forEach((b) => b.addEventListener("click", () => nuevo(turnos.find((t) => t.id === Number(b.dataset.edit)))));
    $$("#dia [data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmar("¿Eliminar el turno? Si el tutor avisó que no viene, mejor marcalo como cancelado.", { ok: "Eliminar", peligro: true }))) return;
      await api("DELETE", `/api/turnos/${b.dataset.del}`); toast("Turno eliminado"); cargar();
    }));
  }

  function slot(t) {
    const wa = whatsapp(t.tutor_telefono,
      `Hola ${t.tutor_nombre}, le recordamos el turno de ${t.animal} el ${fechaLarga(t.fecha)} a las ${t.hora} hs en la veterinaria.`);
    const fin = (() => { const [h, m] = t.hora.split(":").map(Number); const x = h * 60 + m + t.duracion; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; })();
    return `<div class="slot slot--${t.estado.replace(" ", "-")}">
      <div class="slot__hour">${esc(t.hora)}<small>a ${fin}</small></div>
      ${avatar(t.especie, "ava--sm", t.foto)}
      <div class="slot__main">
        <div class="list__title"><a href="animal.html?id=${t.animal_id}">${esc(t.animal)}</a>
          <span class="muted" style="font-weight:400">· ${esc(t.tutor_apellido)}, ${esc(t.tutor_nombre)}</span></div>
        <div class="list__sub">${esc(TIPO_TURNO[t.tipo] || t.tipo)}${t.vet ? " · Dr/a. " + esc(t.vet) : " · Sin asignar"}${t.notas ? " · " + esc(t.notas) : ""}</div>
        ${t.alergias ? `<div class="list__sub" style="color:var(--red-600)">${icon("alert", "ico")} Alergias: ${esc(t.alergias)}</div>` : ""}
      </div>
      <div class="slot__tools">
        ${me.rol !== "recepcion" && !["atendido", "cancelado", "ausente"].includes(t.estado)
          ? `<button class="btn btn--sm" type="button" data-atender="${t.id}">${icon("play")}Atender</button>` : ""}
        <select class="estado-sel" data-id="${t.id}" aria-label="Estado del turno">
          ${opciones(["pendiente", "confirmado", "en sala", "atendido", "ausente", "cancelado"], t.estado)}</select>
        ${wa ? `<a class="icon-btn" href="${wa}" target="_blank" rel="noopener" title="Recordatorio por WhatsApp" aria-label="Recordatorio por WhatsApp">${icon("msg")}</a>` : ""}
        <button class="icon-btn" data-edit="${t.id}" title="Editar" aria-label="Editar">${icon("edit")}</button>
        <button class="icon-btn icon-btn--danger" data-del="${t.id}" title="Eliminar" aria-label="Eliminar">${icon("trash")}</button>
      </div>
    </div>`;
  }

  /* ---------- Alta / edición ---------- */
  const HORAS = [];
  for (let h = 7; h <= 21; h++) for (const m of ["00", "15", "30", "45"]) HORAS.push(`${String(h).padStart(2, "0")}:${m}`);

  // `pre`: valores iniciales (fecha, notas) y `alGuardar(idTurno)` al crear.
  async function nuevo(t = null, animalPre = null, pre = {}) {
    let animal = t ? { id: t.animal_id, nombre: t.animal, especie: t.especie, tutor: `${t.tutor_apellido}, ${t.tutor_nombre}` } : animalPre;
    const m = modal({
      title: t ? "Editar turno" : "Nuevo turno",
      body: `<form class="form-grid" novalidate>
        <div class="field span-all" style="position:relative"><span>Paciente *</span>
          <div data-elegido></div>
          <input data-buscar placeholder="Buscar por animal, tutor o DNI…" autocomplete="off" />
          <div class="dropdown hidden" data-sug style="left:0;right:0;top:100%;max-height:260px;overflow:auto"></div>
        </div>
        <label class="field"><span>Fecha *</span><input name="fecha" type="date" required value="${esc(t?.fecha || pre.fecha || dia)}" /></label>
        <label class="field"><span>Hora *</span><select name="hora">${opciones(HORAS.includes(t?.hora) || !t ? HORAS : [t.hora, ...HORAS], t?.hora || "09:00")}</select></label>
        <label class="field"><span>Duración</span><select name="duracion">${opciones([[15, "15 min"], [30, "30 min"], [45, "45 min"], [60, "1 hora"], [90, "1 h 30"], [120, "2 horas"]], t?.duracion || 30)}</select></label>
        <label class="field"><span>Tipo</span><select name="tipo">${opciones(Object.entries(TIPO_TURNO), t?.tipo || "consulta")}</select></label>
        <label class="field span-all"><span>Profesional</span><select name="vet_id"><option value="">Sin asignar</option>${vets.map((v) => `<option value="${v.id}" ${String(v.id) === String(t?.vet_id ?? (me.rol === "veterinario" ? me.id : "")) ? "selected" : ""}>Dr/a. ${esc(v.apellido)} ${esc(v.nombre)}</option>`).join("")}</select></label>
        <label class="field span-all"><span>Notas</span><input name="notas" value="${esc(t?.notas ?? pre.notas)}" placeholder="Motivo, indicaciones (ayuno, traer estudios…)" /></label>
        <div class="span-all form-error" role="alert"></div>
        <div class="span-all form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--green">${icon("check")}${t ? "Guardar" : "Agendar"}</button></div>
      </form>`,
    });

    const elegido = $("[data-elegido]", m), inp = $("[data-buscar]", m), sug = $("[data-sug]", m);
    const pintar = () => {
      elegido.innerHTML = animal ? `<div class="list__item" style="padding:6px 0">${avatar(animal.especie, "ava--sm")}
        <span class="list__main"><span class="list__title">${esc(animal.nombre)}</span><span class="list__sub">${esc(animal.tutor || "")}</span></span>
        ${t ? "" : `<button type="button" class="btn btn--plain btn--sm" data-cambiar>Cambiar</button>`}</div>` : "";
      inp.classList.toggle("hidden", !!animal);
      $("[data-cambiar]", m)?.addEventListener("click", () => { animal = null; pintar(); inp.focus(); });
    };
    pintar();

    let timer;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = inp.value.trim();
        if (q.length < 2) { sug.classList.add("hidden"); return; }
        const rows = await api("GET", "/api/buscar?q=" + encodeURIComponent(q));
        sug.innerHTML = rows.length ? rows.slice(0, 12).map((a) => `<button type="button" data-a='${esc(JSON.stringify({ id: a.id, nombre: a.nombre, especie: a.especie, tutor: `${a.tutor_apellido}, ${a.tutor_nombre}` }))}'>
            ${avatar(a.especie, "ava--sm")}<span><b>${esc(a.nombre)}</b> <span class="muted">· ${esc(a.tutor_apellido)}, ${esc(a.tutor_nombre)}</span></span></button>`).join("")
          : `<div class="empty" style="padding:12px">Sin resultados · <a href="registro.html" style="color:var(--blue-600)">registrar</a></div>`;
        sug.classList.remove("hidden");
      }, 200);
    });
    sug.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      animal = JSON.parse(b.dataset.a);
      sug.classList.add("hidden");
      inp.value = "";
      pintar();
    });

    onSubmit($("form", m), async (d) => {
      if (!animal) throw new Error("Elegí el paciente.");
      const body = { ...d, animal_id: animal.id, vet_id: d.vet_id || null, duracion: Number(d.duracion) };
      if (t) await api("PUT", `/api/turnos/${t.id}`, body);
      else {
        const { id } = await api("POST", "/api/turnos", body);
        if (pre.alGuardar) await pre.alGuardar(id);
      }
      close(m);
      toast(t ? "Turno actualizado" : "Turno agendado", "ok");
      dia = d.fecha;
      cargar();
    });
  }

  /* ---------- Pedidos de turno del portal ---------- */
  async function cargarSolicitudes() {
    const S = await api("GET", "/api/solicitudes");
    $("#pSolicitudes").classList.toggle("hidden", !S.length);
    $("#tSolicitudes").innerHTML = `${icon("bell")}Pedidos de turno de tutores <span class="panel__count">${S.length}</span>`;
    $("#solicitudes").innerHTML = S.map((s) => {
      const wa = whatsapp(s.tutor_telefono, `Hola ${s.tutor_nombre}, le escribimos de la veterinaria por el turno que pidió para ${s.animal}.`);
      return `<div class="list__item">${avatar(s.especie, "ava--sm", s.foto)}
        <span class="list__main"><span class="list__title">${esc(s.animal)} <span class="muted" style="font-weight:400">· ${esc(s.tutor)}</span></span>
          <span class="list__sub">Prefiere <b>${fechaLarga(s.fecha)}</b> (${esc(s.franja)}) · ${esc(s.motivo)}</span></span>
        ${wa ? `<a class="icon-btn" href="${wa}" target="_blank" rel="noopener" title="Escribir por WhatsApp" aria-label="Escribir por WhatsApp">${icon("msg")}</a>` : ""}
        <button class="btn btn--sm btn--green" type="button" data-agendar="${s.id}">Agendar</button>
        <button class="btn btn--sm btn--plain" type="button" data-rechazar="${s.id}">Rechazar</button></div>`;
    }).join("");
    $$("[data-agendar]").forEach((b) => b.addEventListener("click", () => {
      const s = S.find((x) => x.id === Number(b.dataset.agendar));
      nuevo(null, { id: s.animal_id, nombre: s.animal, especie: s.especie, tutor: s.tutor }, {
        fecha: s.fecha, notas: s.motivo,
        alGuardar: async (turnoId) => { await api("POST", `/api/solicitudes/${s.id}/agendar`, { turno_id: turnoId }); cargarSolicitudes(); },
      });
    }));
    $$("[data-rechazar]").forEach((b) => b.addEventListener("click", () => {
      const s = S.find((x) => x.id === Number(b.dataset.rechazar));
      const m = modal({
        title: "Rechazar pedido",
        body: `<p style="margin:0 0 12px">${esc(s.animal)} · ${fecha(s.fecha)} (${esc(s.franja)})</p>
          <form novalidate><label class="field"><span>Respuesta para el tutor *</span>
            <input name="respuesta" required value="No tenemos disponibilidad ese día. Por favor, pedí otra fecha o llamanos." /></label>
            <div class="form-error" role="alert"></div>
            <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger">Rechazar</button></div></form>`,
      });
      onSubmit($("form", m), async (d) => {
        await api("POST", `/api/solicitudes/${s.id}/rechazar`, d);
        close(m); toast("Pedido rechazado"); cargarSolicitudes();
      });
    }));
  }
  cargarSolicitudes();

  $("#nuevo").addEventListener("click", () => nuevo());
  $("#prev").addEventListener("click", () => { dia = HV.sumarDias(dia, -7); cargar(); });
  $("#next").addEventListener("click", () => { dia = HV.sumarDias(dia, 7); cargar(); });
  $("#hoy").addEventListener("click", () => { dia = HV.hoy(); cargar(); });
  $("#vet").addEventListener("change", cargar);

  await cargar();

  // Viene desde la ficha o el buscador: abrir el alta con el paciente elegido.
  const aid = HV.qs("animal");
  if (aid) {
    history.replaceState(null, "", "turnos.html");
    const h = await api("GET", `/api/animales/${encodeURIComponent(aid)}/hc`).catch(() => null);
    if (h) nuevo(null, { id: h.animal.id, nombre: h.animal.nombre, especie: h.animal.especie, tutor: `${h.tutor.apellido}, ${h.tutor.nombre}` });
  }
})();
