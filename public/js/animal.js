/* =========================================================================
   ANIMAL — Ficha del animal e historia clínica ambulatoria
   Línea de tiempo + pestañas por tipo de registro, plan sanitario según la
   especie, peso, turnos y datos del tutor.
   · Veterinario / director: ven y escriben toda la historia clínica.
   · Recepción: sólo lo sanitario (vacunas y desparasitaciones).
   · Tutor: ve toda la historia de sus animales (sólo lectura) y puede editar
     sus datos de contacto y los datos básicos y la foto de sus animales.
   ========================================================================= */

(async () => {
  const { icon, esc, $, $$, api, avatar, especie, edad, fecha, fechaHora, SEXO, modal, close, confirmar,
    toast, onSubmit, opciones, tagVacuna, ESTADO_TURNO, TIPO_TURNO, whatsapp } = HV;

  const me = await HV.init({ roles: ["director", "veterinario", "recepcion", "tutor"] });
  const ID = Number(HV.qs("id"));
  const esTutor = me.rol === "tutor";
  const clinico = me.rol !== "recepcion";                          // ve la parte clínica
  const escribe = me.rol === "director" || me.rol === "veterinario"; // carga registros clínicos
  let H = null;             // historia clínica cargada
  let E = null;             // especie del animal
  let tab = HV.qs("tab") || (clinico ? "historia" : "vacunas");

  $("#back").innerHTML = esTutor ? `${icon("back")}Mis mascotas` : `${icon("back")}Buscar paciente`;
  if (esTutor) $("#back").href = "portal.html";

  async function cargar() {
    try {
      H = await api("GET", `/api/animales/${ID}/hc`);
    } catch (e) {
      $("#patient").innerHTML = `<div class="empty" style="width:100%">${icon("alert")}${esc(e.message)}</div>`;
      return;
    }
    E = especie(H.animal.especie);
    document.title = `ANIMAL — ${H.animal.nombre}`;
    renderPaciente();
    renderAlertas();
    renderTabs();
    renderPlan();
    renderPeso();
    renderTurnos();
    renderDatos();
    renderCuenta();
  }

  /* Cuenta del tutor: saldo pendiente y últimos movimientos (sólo el equipo). */
  async function renderCuenta() {
    const box = $("#cuenta");
    if (esTutor) return;
    const cta = await api("GET", `/api/tutores/${H.tutor.id}/cuenta`).catch(() => null);
    if (!cta) return;
    box.classList.remove("hidden");
    const ult = cta.movimientos.filter((c) => c.estado !== "anulado").slice(0, 4);
    box.innerHTML = `
      <div class="panel__head"><h2 class="panel__title">${icon("cash")}Cuenta</h2>
        <span class="monto ${cta.saldo ? "monto--neg" : ""}">${cta.saldo ? "Debe " + HV.pesos(cta.saldo) : "Al día"}</span></div>
      ${ult.length ? `<div class="list">${ult.map((c) => `<div class="list__item" style="padding:8px 0">
          <span class="list__main"><span class="list__title" style="font-size:13.5px">${esc(c.concepto)}</span>
          <span class="list__sub">${fecha(c.fecha)}${c.animal && c.animal !== H.animal.nombre ? " · " + esc(c.animal) : ""}</span></span>
          ${Cobros.tagEstado(c)}<span class="monto" style="font-size:13.5px">${HV.pesos(c.monto)}</span>
          ${c.estado === "pendiente" ? `<button class="btn btn--sm btn--green" data-pagar-c="${c.id}">Cobrar</button>` : ""}</div>`).join("")}</div>`
        : `<div class="empty" style="padding:14px">${icon("cash")}Sin movimientos.</div>`}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn--green btn--sm" data-cobrar>${icon("plus")}Registrar cobro</button>
        <a class="btn btn--plain btn--sm" href="caja.html">Ver caja</a></div>`;
    $("[data-cobrar]", box).addEventListener("click", () => cobrar());
    $$("[data-pagar-c]", box).forEach((b) => b.addEventListener("click", () =>
      Cobros.pagar(cta.movimientos.find((c) => c.id === Number(b.dataset.pagarC)), renderCuenta)));
  }

  const cobrar = (concepto = "") => Cobros.nuevo({
    animal: { id: ID, nombre: H.animal.nombre, especie: H.animal.especie, foto: H.animal.foto, tutor: `${H.tutor.apellido}, ${H.tutor.nombre}` },
    concepto, alGuardar: renderCuenta,
  });

  /* =======================================================================
     Cabecera del paciente
     ======================================================================= */
  function renderPaciente() {
    const a = H.animal, t = H.tutor;
    const rodeo = a.unidad === "rodeo";
    const wa = esTutor ? null : whatsapp(t.telefono, `Hola ${t.nombre}, le escribimos de la veterinaria por ${a.nombre}.`);
    const acciones = escribe
      ? [["consultas", "round--blue", "stetho", "Nueva<br>consulta"], ["vacunas", "round--green", "syringe", "Vacunar"],
         ["recetas", "round--purple", "pill", "Recetar"], ["estudios", "round--lblue", "flask", "Estudio"],
         ["turno", "round--navy", "calendar", "Turno"]]
      : esTutor
        ? [["editar", "round--blue", "edit", "Editar<br>datos"], ["libreta", "round--green", "book", "Libreta"]]
        : [["turno", "round--navy", "calendar", "Turno"], ["libreta", "round--green", "book", "Libreta"]];

    $("#patient").innerHTML = `
      <button class="ava-edit" type="button" data-foto title="${a.foto ? "Cambiar foto" : "Agregar foto"}" aria-label="${a.foto ? "Cambiar foto" : "Agregar foto"}">
        ${avatar(a.especie, "ava--lg", a.foto)}<span class="ava-edit__cam">${icon("camera")}</span></button>
      <input type="file" accept="image/*" capture="environment" class="hidden" data-foto-input />`;
    $("#patient").insertAdjacentHTML("beforeend", `
      <div class="patient__main">
        <h1 class="patient__name">${esc(a.nombre)}</h1>
        <p class="patient__line"><b>${esc(E.nombre)}</b>${a.raza ? " · " + esc(a.raza) : ""} · ${rodeo ? `${a.cantidad} cabezas` : esc(SEXO[a.sexo])}${a.castrado ? " · castrado/a" : ""} · ${esc(edad(a.fecha_nac))}</p>
        <p class="patient__line">${[a.peso && `<b>Peso:</b> ${a.peso} kg`, a.microchip && `<b>Microchip:</b> ${esc(a.microchip)}`,
          a.identificacion && `<b>ID:</b> ${esc(a.identificacion)}`].filter(Boolean).join(" · ") || "&nbsp;"}</p>
        <p class="patient__line"><b>Tutor:</b> ${esc(t.apellido)}, ${esc(t.nombre)} · DNI ${esc(t.dni)}${t.telefono ? ` · ${esc(t.telefono)}` : ""}
          ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="tag tag--ok" style="margin-left:4px">${icon("msg")}WhatsApp</a>` : ""}</p>
        <div class="patient__tags">
          ${a.fallecido ? `<span class="tag">Fallecido</span>` : ""}
          ${rodeo ? `<span class="tag tag--ok">Rodeo / lote</span>` : ""}
          ${a.color ? `<span class="tag">${esc(a.color)}</span>` : ""}
        </div>
      </div>
      <div class="round-actions">
        ${acciones.map(([act, c, i, l]) => `<button class="round ${c}" type="button" data-act="${act}">${icon(i)}<span>${l}</span></button>`).join("")}
      </div>`);

    $("[data-foto]").addEventListener("click", () => {
      if (!a.foto) return $("[data-foto-input]").click();
      const m = modal({
        title: `Foto de ${a.nombre}`,
        body: `<img src="/api/fotos/${encodeURIComponent(a.foto)}" alt="" style="width:100%;max-height:360px;object-fit:contain;border-radius:14px;background:var(--line-2)" />
          <div class="form-actions"><button class="btn btn--danger" type="button" data-quitar>${icon("trash")}Quitar</button>
          <button class="btn" type="button" data-cambiar>${icon("camera")}Cambiar foto</button></div>`,
      });
      $("[data-cambiar]", m).addEventListener("click", () => { close(m); $("[data-foto-input]").click(); });
      $("[data-quitar]", m).addEventListener("click", async () => {
        await api("DELETE", `/api/animales/${ID}/foto`); close(m); toast("Foto eliminada"); cargar();
      });
    });
    $("[data-foto-input]").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await api("POST", `/api/animales/${ID}/foto`, { data: await comprimirFoto(file) });
        toast("Foto guardada", "ok");
        cargar();
      } catch (ex) { toast(ex.message, "error"); }
    });

    $$("#patient [data-act]").forEach((b) => b.addEventListener("click", () => {
      const act = b.dataset.act;
      if (act === "turno") location.href = `turnos.html?animal=${ID}`;
      else if (act === "libreta") location.href = `libreta.html?id=${ID}`;
      else if (act === "editar") editarAnimal();
      else abrirForm(act);
    }));
  }

  // Recorta al centro en cuadrado y comprime a JPEG de 480 px (≈ 40–80 KB).
  function comprimirFoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const lado = Math.min(img.width, img.height), T = Math.min(480, lado);
        const c = document.createElement("canvas");
        c.width = c.height = T;
        c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, T, T);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = URL.createObjectURL(file);
    });
  }

  function renderAlertas() {
    const a = H.animal;
    const malas = H.plan_vacunas.filter((v) => v.estado === "vencida" || v.estado === "pendiente");
    $("#alerts").innerHTML = [
      a.alergias ? `<div class="alert alert--danger">${icon("alert")}<span><b>Alergias:</b> ${esc(a.alergias)}</span></div>` : "",
      a.cronicas ? `<div class="alert alert--info">${icon("heart")}<span><b>Antecedentes:</b> ${esc(a.cronicas)}</span></div>` : "",
      malas.length ? `<div class="alert">${icon("syringe")}<span><b>Vacunas a aplicar:</b> ${malas.map((v) => esc(v.nombre)).join(", ")}</span></div>` : "",
      gestacionEnCurso(),
    ].join("");
  }

  // Último servicio / gestación con fecha probable de parto y sin parto ni aborto posterior.
  function gestacionEnCurso() {
    const ev = H.reproduccion || [];
    const ult = ev.find((x) => ["servicio", "gestacion"].includes(x.tipo) && x.fpp);
    if (!ult || ev.some((x) => ["parto", "aborto"].includes(x.tipo) && x.fecha >= ult.fecha)) return "";
    const faltan = HV.diasEntre(HV.hoy(), ult.fpp);
    if (faltan < -30) return "";
    const txt = faltan > 0 ? `faltan ${faltan} días` : faltan === 0 ? "es hoy" : `pasaron ${-faltan} días`;
    return `<div class="alert alert--info">${icon("heart")}<span><b>${ult.tipo === "gestacion" ? "Gestación confirmada" : "Servicio registrado"}:</b>
      fecha probable de parto ${fecha(ult.fpp)} (${txt}).</span></div>`;
  }

  /* ---------- Adjuntos de estudios ---------- */
  function adjuntar(estudioId) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/pdf,image/*";
    inp.multiple = true;
    inp.addEventListener("change", async () => {
      const archivos = [...inp.files];
      for (const f of archivos) {
        if (f.size > 8 * 1024 * 1024) { toast(`${f.name}: supera los 8 MB`, "error"); continue; }
        try {
          const data = await new Promise((ok, mal) => {
            const rd = new FileReader();
            rd.onload = () => ok(rd.result);
            rd.onerror = () => mal(new Error("No se pudo leer el archivo."));
            rd.readAsDataURL(f);
          });
          await api("POST", `/api/estudios/${estudioId}/adjuntos`, { nombre: f.name, data });
        } catch (e) { toast(`${f.name}: ${e.message}`, "error"); }
      }
      toast(archivos.length > 1 ? "Archivos adjuntados" : "Archivo adjuntado", "ok");
      cargar();
    });
    inp.click();
  }

  /* ---------- Auditoría (director) ---------- */
  const TABLA = { consultas: "Consulta", vacunas: "Vacuna", desparasitaciones: "Desparasitación", estudios: "Estudio",
    practicas: "Cirugía / práctica", recetas: "Receta", reproduccion: "Reproducción", adjuntos: "Adjunto", animales: "Datos del animal" };
  const IGNORAR = new Set(["id", "animal_id", "usuario_id", "tutor_id", "creado", "autor", "autor_matricula", "adjuntos", "_tipo"]);
  const resumen = (x) => x && (x.motivo || x.nombre || x.producto || x.diagnostico || x.tipo || "");
  const valor = (v) => (v === null || v === undefined || v === "" ? "—" : typeof v === "string" && v.startsWith("[{") ? "(medicamentos)" : String(v));

  async function renderAuditoria() {
    $("#tabBody").innerHTML = `<div class="empty">${icon("clock")}Cargando…</div>`;
    const rows = await api("GET", `/api/auditoria?animal=${ID}`);
    const TAG = { alta: ["ok", "Alta"], modificacion: ["warn", "Modificación"], baja: ["danger", "Baja"] };
    $("#tabBody").innerHTML = rows.length ? `<div class="list">${rows.map((a) => {
      let det = "";
      if (a.accion === "modificacion" && a.antes && a.despues) {
        const cambios = Object.keys(a.despues).filter((k) => !IGNORAR.has(k) && valor(a.antes[k]) !== valor(a.despues[k]));
        det = cambios.length
          ? cambios.map((k) => `<div><b>${esc(k.replace(/_/g, " "))}:</b> <s class="muted">${esc(valor(a.antes[k]))}</s> → ${esc(valor(a.despues[k]))}</div>`).join("")
          : "Sin cambios de contenido.";
      } else {
        det = esc(resumen(a.despues || a.antes));
      }
      const [c, t] = TAG[a.accion];
      return `<div class="list__item" style="align-items:flex-start">
        <span class="tag tag--${c}" style="min-width:104px;justify-content:center">${t}</span>
        <div class="list__main"><span class="list__title">${esc(TABLA[a.tabla] || a.tabla)}</span>
          <div class="list__sub" style="line-height:1.55">${det}</div></div>
        <div class="list__sub nowrap" style="text-align:right">${fechaHora(a.fecha)}<br />${esc(a.usuario || "—")}</div></div>`;
    }).join("")}</div>` : `<div class="empty">${icon("clock")}Todavía no hay cambios registrados para este paciente.</div>`;
  }

  /* =======================================================================
     Pestañas de la historia clínica
     ======================================================================= */
  // Reproducción sólo aparece en hembras (o sexo sin determinar) o si ya hay registros.
  function tabsDisponibles() {
    if (!clinico) return [["vacunas", "Vacunas"], ["desparasitaciones", "Desparasitación"]];
    const repro = H.reproduccion.length || (H.animal.sexo !== "M" && E.gestacion);
    return [["historia", "Historia"], ["consultas", "Consultas"], ["vacunas", "Vacunas"], ["desparasitaciones", "Desparasitación"],
      ["estudios", "Estudios"], ["practicas", "Cirugías y prácticas"], ["recetas", "Recetas"],
      ...(repro ? [["reproduccion", "Reproducción"]] : []),
      ...(me.rol === "director" ? [["auditoria", "Auditoría"]] : [])];
  }

  function renderTabs() {
    const TABS = tabsDisponibles();
    if (!TABS.some(([k]) => k === tab)) tab = TABS[0][0];
    $("#tabs").innerHTML = TABS.map(([k, t]) => {
      const n = k === "historia" ? "" : (H[k] || []).length;
      return `<button class="tab ${k === tab ? "is-on" : ""}" role="tab" aria-selected="${k === tab}" data-tab="${k}">${t}${n ? ` <span class="panel__count">${n}</span>` : ""}</button>`;
    }).join("");
    $$("#tabs [data-tab]").forEach((b) => b.addEventListener("click", () => {
      tab = b.dataset.tab;
      history.replaceState(null, "", `animal.html?id=${ID}&tab=${tab}`);
      renderTabs();
    }));
    renderTabBody();
  }

  const NUEVO = {
    consultas: "Nueva consulta", vacunas: "Registrar vacuna", desparasitaciones: "Registrar desparasitación",
    estudios: "Nuevo estudio", practicas: "Nueva cirugía / práctica", recetas: "Nueva receta",
    reproduccion: "Registrar evento reproductivo",
  };

  function renderTabBody() {
    if (tab === "auditoria") return renderAuditoria();
    let items;
    if (tab === "historia") {
      items = ["consultas", "vacunas", "desparasitaciones", "estudios", "practicas", "recetas", "reproduccion"]
        .flatMap((k) => (H[k] || []).map((r) => ({ ...r, _tipo: k })))
        .sort((x, y) => y.fecha.localeCompare(x.fecha) || y.id - x.id);
    } else {
      items = (H[tab] || []).map((r) => ({ ...r, _tipo: tab }));
    }
    const puedeCrear = escribe && tab !== "historia";
    $("#tabBody").innerHTML = `
      ${puedeCrear ? `<div style="display:flex;justify-content:flex-end;margin:-4px 0 14px"><button class="btn btn--sm" data-nuevo>${icon("plus")}${NUEVO[tab]}</button></div>` : ""}
      ${items.length ? `<div class="tl">${items.map(item).join("")}</div>`
        : `<div class="empty">${icon("file")}Todavía no hay registros${tab === "historia" ? " en la historia clínica" : ""}.</div>`}`;
    $("[data-nuevo]")?.addEventListener("click", () => abrirForm(tab));
    $$("#tabBody [data-edit]").forEach((b) => b.addEventListener("click", () => {
      const [t, id] = b.dataset.edit.split(":");
      abrirForm(t, H[t].find((r) => r.id === Number(id)));
    }));
    $$("#tabBody [data-adjuntar]").forEach((b) => b.addEventListener("click", () => adjuntar(Number(b.dataset.adjuntar))));
    $$("#tabBody [data-quitar-adj]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmar("¿Eliminar este archivo adjunto?", { ok: "Eliminar", peligro: true }))) return;
      try { await api("DELETE", `/api/adjuntos/${b.dataset.quitarAdj}`); toast("Archivo eliminado"); cargar(); } catch (e) { toast(e.message, "error"); }
    }));
    $$("#tabBody [data-repetir]").forEach((b) => b.addEventListener("click", () => {
      abrirForm("recetas", null, { copia: H.recetas.find((r) => r.id === Number(b.dataset.repetir)) });
    }));
    $$("#tabBody [data-del]").forEach((b) => b.addEventListener("click", async () => {
      const [t, id] = b.dataset.del.split(":");
      if (!(await confirmar("¿Eliminar este registro de la historia clínica? No se puede deshacer.", { ok: "Eliminar", peligro: true }))) return;
      try { await api("DELETE", `/api/${t}/${id}`); toast("Registro eliminado"); cargar(); } catch (e) { toast(e.message, "error"); }
    }));
  }

  const puedeEditar = (r) => escribe && (me.rol === "director" || r.usuario_id === me.id);

  // Valor de un signo vital vs. el rango normal de la especie.
  function vital(etq, v, unidad, rango) {
    if (v === null || v === undefined) return "";
    let cls = "";
    if (rango) cls = v < rango[0] ? "vital--low" : v > rango[1] ? "vital--high" : "";
    return `<span class="vital ${cls}">${etq} <b>${v}</b> ${unidad}</span>`;
  }

  function item(r) {
    const t = r._tipo;
    const tools = puedeEditar(r) ? `<span class="tl__tools no-print">
        <button class="icon-btn" data-edit="${t}:${r.id}" aria-label="Editar" title="Editar">${icon("edit")}</button>
        <button class="icon-btn icon-btn--danger" data-del="${t}:${r.id}" aria-label="Eliminar" title="Eliminar">${icon("trash")}</button></span>` : "";
    const autor = r.autor ? ` · ${esc(r.autor)}${r.autor_matricula ? " (" + esc(r.autor_matricula) + ")" : ""}` : "";
    let titulo = "", cuerpo = "";
    const s = E.signos;

    if (t === "consultas") {
      titulo = `${icon("stetho")} ${esc(r.motivo)}`;
      cuerpo = `
        <div class="vitals">
          ${vital("T°", r.temperatura, "°C", s?.temp)}${vital("FC", r.fc, "lpm", s?.fc)}${vital("FR", r.fr, "rpm", s?.fr)}
          ${r.peso ? `<span class="vital">Peso <b>${r.peso}</b> kg</span>` : ""}
          ${r.condicion_corporal ? `<span class="vital">CC <b>${r.condicion_corporal}/${E.cc}</b></span>` : ""}
          ${r.mucosas ? `<span class="vital">Mucosas <b>${esc(r.mucosas)}</b></span>` : ""}
          ${r.tllc ? `<span class="vital">TLLC <b>${esc(r.tllc)}</b></span>` : ""}
          ${r.hidratacion ? `<span class="vital">Hidratación <b>${esc(r.hidratacion)}</b></span>` : ""}
        </div>
        ${r.anamnesis ? `<p><b>Anamnesis:</b> ${esc(r.anamnesis)}</p>` : ""}
        ${r.examen ? `<p><b>Examen:</b> ${esc(r.examen)}</p>` : ""}
        ${r.diagnostico ? `<p><b>Diagnóstico:</b> ${esc(r.diagnostico)}</p>` : ""}
        ${r.tratamiento ? `<p><b>Tratamiento:</b> ${esc(r.tratamiento)}</p>` : ""}
        ${r.proximo_control ? `<p><b>Próximo control:</b> ${fecha(r.proximo_control)}</p>` : ""}`;
    } else if (t === "vacunas") {
      titulo = `${icon("syringe")} ${esc(r.nombre)}`;
      cuerpo = `<p>${[r.laboratorio && "Lab. " + esc(r.laboratorio), r.lote && "Lote " + esc(r.lote)].filter(Boolean).join(" · ")}</p>
        ${r.proxima ? `<p><b>Próxima dosis:</b> ${fecha(r.proxima)}</p>` : ""}${r.notas ? `<p>${esc(r.notas)}</p>` : ""}
        ${r.codigo === "rabia" ? `<p style="margin-top:6px"><a class="btn btn--plain btn--sm" href="certificado.html?id=${r.id}" target="_blank">${icon("award")}Certificado antirrábico</a></p>` : ""}`;
    } else if (t === "desparasitaciones") {
      titulo = `${icon("bug")} Desparasitación ${esc(r.tipo)} · ${esc(r.producto)}`;
      cuerpo = `${r.dosis ? `<p><b>Dosis:</b> ${esc(r.dosis)}</p>` : ""}${r.proxima ? `<p><b>Próxima:</b> ${fecha(r.proxima)}</p>` : ""}${r.notas ? `<p>${esc(r.notas)}</p>` : ""}`;
    } else if (t === "estudios") {
      titulo = `${icon("flask")} ${esc(r.nombre)} <span class="tag tag--${r.estado === "solicitado" ? "warn" : "ok"}">${esc(r.estado)}</span>`;
      const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
      cuerpo = `${r.resultado ? `<p><b>Resultado:</b> ${esc(r.resultado)}</p>` : ""}${r.notas ? `<p>${esc(r.notas)}</p>` : ""}
        <div class="adjuntos">
          ${r.adjuntos.map((j) => `<span class="adj">
            <a href="/api/adjuntos/${j.id}" target="_blank" rel="noopener">${icon(j.mime === "application/pdf" ? "file" : "camera")}${esc(j.nombre)} <small>${kb(j.tamano)}</small></a>
            ${escribe && (me.rol === "director" || j.usuario_id === me.id) ? `<button type="button" data-quitar-adj="${j.id}" aria-label="Quitar ${esc(j.nombre)}" title="Quitar">${icon("x")}</button>` : ""}</span>`).join("")}
          ${escribe ? `<button type="button" class="btn btn--plain btn--sm" data-adjuntar="${r.id}">${icon("plus")}Adjuntar PDF o imagen</button>` : ""}
        </div>`;
    } else if (t === "practicas") {
      titulo = `${icon("scissors")} ${esc(r.nombre)} <span class="tag">${r.tipo === "cirugia" ? "Cirugía" : "Práctica"}</span>`;
      cuerpo = `${r.anestesia ? `<p><b>Anestesia:</b> ${esc(r.anestesia)}</p>` : ""}${r.descripcion ? `<p>${esc(r.descripcion)}</p>` : ""}${r.notas ? `<p>${esc(r.notas)}</p>` : ""}
        <p style="margin-top:6px"><a class="btn btn--plain btn--sm" href="consentimiento.html?id=${r.id}" target="_blank">${icon("file")}Consentimiento informado</a></p>`;
    } else if (t === "reproduccion") {
      const EV = { celo: "Celo", servicio: "Servicio / monta", gestacion: "Gestación confirmada", parto: "Parto", aborto: "Aborto" };
      titulo = `${icon("heart")} ${EV[r.tipo]}`;
      cuerpo = `${r.fpp ? `<p><b>Fecha probable de parto:</b> ${fecha(r.fpp)}</p>` : ""}${r.crias != null ? `<p><b>Crías:</b> ${r.crias}</p>` : ""}${r.notas ? `<p>${esc(r.notas)}</p>` : ""}`;
    } else if (t === "recetas") {
      titulo = `${icon("pill")} Receta${r.diagnostico ? " · " + esc(r.diagnostico) : ""} ${r.controlada ? `<span class="tag tag--danger">Controlada</span>` : ""}`;
      cuerpo = `${r.items.map((i) => `<p>• <b>${esc(i.producto)}</b> ${esc([i.presentacion, i.dosis, i.via, i.frecuencia, i.duracion].filter(Boolean).join(" · "))}</p>`).join("")}
        <p style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap"><a class="btn btn--plain btn--sm" href="receta.html?id=${r.id}" target="_blank">${icon("print")}Ver / imprimir</a>
          ${escribe ? `<button type="button" class="btn btn--plain btn--sm" data-repetir="${r.id}">${icon("copy")}Repetir receta</button>` : ""}</p>`;
    }
    return `<div class="tl__item tl__item--${t}"><span class="tl__dot"></span>
      <div class="tl__head"><span class="tl__title">${titulo}</span>${tools}</div>
      <div class="tl__meta">${t === "consultas" ? fechaHora(r.fecha) : fecha(r.fecha)}${autor}</div>
      <div class="tl__body">${cuerpo}</div></div>`;
  }

  /* =======================================================================
     Columna lateral
     ======================================================================= */
  function renderPlan() {
    const plan = H.plan_vacunas;
    $("#plan").innerHTML = `
      <div class="panel__head"><h2 class="panel__title">${icon("syringe")}Plan sanitario</h2>
        <a class="btn btn--plain btn--sm" href="libreta.html?id=${ID}">${icon("book")}Libreta</a></div>
      ${plan.length ? plan.map((v) => `
        <div class="vac-row">
          <div class="vac-row__main">
            <div class="vac-row__name">${esc(v.nombre)} ${v.obligatoria ? `<span class="tag tag--info">Obligatoria</span>` : ""}</div>
            <div class="vac-row__sub">${v.ultima ? "Última " + fecha(v.ultima) : "Sin aplicar"}${v.fecha ? " · " + (v.estado === "vencida" ? "venció " : "próx. ") + fecha(v.fecha) : ""}</div>
          </div>
          ${tagVacuna(v.estado)}
          ${escribe ? `<button class="icon-btn" data-vac="${v.codigo}" title="Registrar ${esc(v.nombre)}" aria-label="Registrar ${esc(v.nombre)}">${icon("plus")}</button>` : ""}
        </div>`).join("")
        : `<div class="empty">${icon("info")}${esc(E.nombre)}: sin plan de vacunación estándar. Se pueden registrar vacunas igual.</div>`}
      ${E.desparasitacion ? `<p class="muted" style="font-size:12.5px;margin:12px 0 0;line-height:1.5"><b>Desparasitación:</b> ${esc(E.desparasitacion)}</p>` : ""}`;
    $$("#plan [data-vac]").forEach((b) => b.addEventListener("click", () => abrirForm("vacunas", null, { codigo: b.dataset.vac })));
  }

  function renderPeso() {
    const pts = (H.consultas || []).filter((c) => c.peso).map((c) => ({ f: c.fecha.slice(0, 10), p: c.peso })).reverse();
    const box = $("#peso");
    if (!clinico || pts.length < 2) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    const W = 300, Hh = 70, min = Math.min(...pts.map((x) => x.p)), max = Math.max(...pts.map((x) => x.p));
    const rng = max - min || 1;
    const xy = pts.map((x, i) => [(i / (pts.length - 1)) * (W - 12) + 6, Hh - 8 - ((x.p - min) / rng) * (Hh - 20)]);
    const ult = pts[pts.length - 1], ant = pts[pts.length - 2];
    const dif = +(ult.p - ant.p).toFixed(2);
    box.innerHTML = `
      <div class="panel__head"><h2 class="panel__title">${icon("scale")}Peso</h2>
        <span class="tag ${dif > 0 ? "tag--warn" : dif < 0 ? "tag--info" : ""}">${dif > 0 ? "+" : ""}${dif} kg</span></div>
      <svg class="spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Evolución del peso">
        <polyline fill="none" stroke="#1E5BD6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${xy.map((p) => p.join(",")).join(" ")}" />
        ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="#1E5BD6" stroke-width="2" />`).join("")}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span>${fecha(pts[0].f)} · ${pts[0].p} kg</span><span>${fecha(ult.f)} · <b style="color:var(--text)">${ult.p} kg</b></span></div>`;
  }

  function renderTurnos() {
    $("#turnos").innerHTML = `
      <div class="panel__head"><h2 class="panel__title">${icon("calendar")}Próximos turnos</h2>
        ${esTutor ? "" : `<a class="btn btn--plain btn--sm" href="turnos.html?animal=${ID}">${icon("plus")}Nuevo</a>`}</div>
      ${H.turnos.length ? `<div class="list">${H.turnos.map((t) => `
        <div class="list__item"><span class="list__main"><span class="list__title">${fecha(t.fecha)} · ${esc(t.hora)}</span>
          <span class="list__sub">${esc(TIPO_TURNO[t.tipo] || t.tipo)}${t.vet ? " · " + esc(t.vet) : ""}</span></span>
          <span class="tag tag--${ESTADO_TURNO[t.estado]}">${esc(t.estado)}</span></div>`).join("")}</div>`
        : `<div class="empty">${icon("calendar")}Sin turnos agendados.</div>`}`;
  }

  function renderDatos() {
    const t = H.tutor;
    $("#datos").innerHTML = `
      <div class="panel__head"><h2 class="panel__title">${icon("users")}Tutor</h2>
        <button class="btn btn--plain btn--sm" data-edit-tutor>${icon("edit")}Editar</button></div>
      <dl class="kv">
        <dt>Nombre</dt><dd>${esc(t.apellido)}, ${esc(t.nombre)}</dd>
        <dt>DNI / CUIT</dt><dd>${esc(t.dni)}</dd>
        <dt>Teléfono</dt><dd>${esc(t.telefono || "—")}</dd>
        <dt>Email</dt><dd>${esc(t.email || "—")}</dd>
        <dt>Domicilio</dt><dd>${esc([t.direccion, t.ciudad, t.provincia].filter((x) => x && x !== "—").join(", ") || "—")}</dd>
        ${esTutor ? "" : `<dt>Libreta online</dt><dd>${t.acceso?.activo ? `<span class="tag tag--ok">Activa</span>` : `<span class="tag">Sin acceso</span>`}</dd>`}
      </dl>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        ${esTutor ? "" : `<button class="btn btn--ghost btn--sm" data-acceso>${icon("key")}${t.acceso?.activo ? "Nueva clave" : "Dar acceso"}</button>`}
        <button class="btn btn--ghost btn--sm" data-edit-animal>${icon("paw")}${esTutor ? "Editar mascota" : "Editar animal"}</button>
        ${esTutor ? "" : `<a class="btn btn--plain btn--sm" href="registro.html?tutor=${t.id}">${icon("plus")}Otro animal</a>`}
      </div>`;
    if (esTutor) $("#datos .panel__title").innerHTML = `${icon("users")}Mis datos`;
    $("[data-edit-tutor]").addEventListener("click", editarTutor);
    $("[data-edit-animal]").addEventListener("click", editarAnimal);
    $("[data-acceso]")?.addEventListener("click", darAcceso);
  }

  /* =======================================================================
     Formularios de la historia clínica
     ======================================================================= */
  const MUCOSAS = ["", "Rosadas", "Pálidas", "Congestivas", "Ictéricas", "Cianóticas"];
  const TLLC = ["", "< 2 s", "2 s", "> 2 s"];
  const HIDRA = ["", "Normal", "Deshidratación leve (5%)", "Deshidratación moderada (8%)", "Deshidratación grave (>10%)"];
  const VIAS = ["", "Oral", "Subcutánea", "Intramuscular", "Endovenosa", "Tópica", "Ótica", "Oftálmica", "Inhalatoria", "Rectal", "Pour-on", "Intramamaria"];

  const rangoTxt = (r, u) => (r ? `Normal ${esc(E.nombre.toLowerCase())}: ${r[0]}–${r[1]} ${u}` : "");
  const quick = (campo, dias) => dias.map((d) => `<button type="button" class="btn btn--plain btn--sm" data-quick="${campo}:${d}">+${d < 30 ? d + " d" : d / 30 + " m"}</button>`).join("");

  const FORMS = {
    consultas: {
      titulo: "Consulta",
      wide: true,
      html: (r) => `
        <div class="form-grid form-grid--4">
          <label class="field span-2"><span>Fecha y hora *</span><input name="fecha" type="datetime-local" required value="${esc((r.fecha || HV.ahora()).replace(" ", "T"))}" /></label>
          <label class="field span-2"><span>Motivo de consulta *</span><input name="motivo" required value="${esc(r.motivo)}" placeholder="Ej.: control anual, vómitos, renguera" /></label>
          <label class="field span-all"><span>Anamnesis</span><textarea name="anamnesis" rows="2">${esc(r.anamnesis)}</textarea></label>

          <div class="section-label">Examen objetivo general${E.nota ? " · " + esc(E.nota) : ""}</div>
          <label class="field"><span>Temperatura (°C)</span><input name="temperatura" type="number" step="0.1" data-rango="temp" value="${esc(r.temperatura)}" /><small class="range-hint">${rangoTxt(E.signos?.temp, "°C")}</small></label>
          <label class="field"><span>Frec. cardíaca (lpm)</span><input name="fc" type="number" data-rango="fc" value="${esc(r.fc)}" /><small class="range-hint">${rangoTxt(E.signos?.fc, "lpm")}</small></label>
          <label class="field"><span>Frec. respiratoria (rpm)</span><input name="fr" type="number" data-rango="fr" value="${esc(r.fr)}" /><small class="range-hint">${rangoTxt(E.signos?.fr, "rpm")}</small></label>
          <label class="field"><span>Peso (kg)</span><input name="peso" type="number" step="0.01" value="${esc(r.peso ?? (r.id ? "" : H.animal.peso))}" /></label>
          <label class="field"><span>Condición corporal (1–${E.cc})</span><select name="condicion_corporal">${opciones(["", ...Array.from({ length: E.cc }, (_, i) => i + 1)], r.condicion_corporal)}</select></label>
          <label class="field"><span>Mucosas</span><select name="mucosas">${opciones(MUCOSAS, r.mucosas)}</select></label>
          <label class="field"><span>TLLC</span><select name="tllc">${opciones(TLLC, r.tllc)}</select></label>
          <label class="field"><span>Hidratación</span><select name="hidratacion">${opciones(HIDRA, r.hidratacion)}</select></label>
          <label class="field span-all"><span>Examen particular / hallazgos</span><textarea name="examen" rows="2">${esc(r.examen)}</textarea></label>

          <div class="section-label">Conclusión</div>
          <label class="field span-2"><span>Diagnóstico (presuntivo o definitivo)</span><input name="diagnostico" value="${esc(r.diagnostico)}" /></label>
          <label class="field span-2"><span>Próximo control</span><input name="proximo_control" type="date" value="${esc(r.proximo_control)}" />
            <span>${quick("proximo_control", [7, 15, 30])}</span></label>
          <label class="field span-all"><span>Tratamiento / indicaciones</span><textarea name="tratamiento" rows="3">${esc(r.tratamiento)}</textarea></label>
        </div>`,
      bind: (m) => {
        $$("[data-rango]", m).forEach((inp) => {
          const chk = () => {
            const r = E.signos?.[inp.dataset.rango], v = parseFloat(inp.value), hint = inp.nextElementSibling;
            inp.classList.remove("is-low", "is-high"); hint.classList.remove("is-low", "is-high");
            if (!r || Number.isNaN(v)) return;
            const c = v < r[0] ? "is-low" : v > r[1] ? "is-high" : "";
            if (c) { inp.classList.add(c); hint.classList.add(c); }
          };
          inp.addEventListener("input", chk); chk();
        });
      },
    },

    vacunas: {
      titulo: "Vacuna",
      html: (r, pre) => {
        const cod = r.codigo ?? pre.codigo ?? (E.vacunas[0]?.codigo || "otra");
        return `
        <div class="form-grid">
          <label class="field span-all"><span>Vacuna *</span>
            <select name="codigo">${opciones([...E.vacunas.map((v) => [v.codigo, v.nombre + (v.obligatoria ? " (obligatoria)" : "")]), ["otra", "Otra vacuna…"]], cod)}</select></label>
          <label class="field span-all ${cod === "otra" ? "" : "hidden"}" data-otra><span>Nombre de la vacuna *</span><input name="nombre" value="${esc(r.nombre)}" /></label>
          <div class="span-all muted" data-vnota style="font-size:12.5px;line-height:1.5"></div>
          <label class="field"><span>Laboratorio / marca</span><input name="laboratorio" value="${esc(r.laboratorio)}" /></label>
          <label class="field"><span>Lote / serie</span><input name="lote" value="${esc(r.lote)}" /></label>
          <label class="field"><span>Fecha de aplicación *</span><input name="fecha" type="date" required value="${esc(r.fecha || HV.hoy())}" /></label>
          <label class="field"><span>Próxima dosis</span><input name="proxima" type="date" value="${esc(r.proxima)}" /><small data-sug></small></label>
          <label class="field span-all"><span>Observaciones</span><input name="notas" value="${esc(r.notas)}" /></label>
        </div>`;
      },
      bind: (m, r) => {
        const sel = $("[name=codigo]", m), f = $("[name=fecha]", m), prox = $("[name=proxima]", m);
        const sugerir = (forzar) => {
          const v = E.vacunas.find((x) => x.codigo === sel.value);
          $("[data-otra]", m).classList.toggle("hidden", !!v);
          $("[data-vnota]", m).innerHTML = v ? `<b>Previene:</b> ${esc(v.previene)}${v.nota ? " · " + esc(v.nota) : ""}` : "";
          if (!v || !f.value) { $("[data-sug]", m).textContent = ""; return; }
          const previas = H.vacunas.filter((x) => x.codigo === v.codigo && x.id !== r.id && x.fecha <= f.value).length;
          let s = null;
          if (previas + 1 < v.dosis && v.cada) s = HV.sumarDias(f.value, v.cada);
          else if (v.refuerzo) s = HV.sumarDias(f.value, v.refuerzo);
          $("[data-sug]", m).textContent = s ? `Sugerida según plan: ${fecha(s)} (dosis ${Math.min(previas + 1, v.dosis)} de ${v.dosis}${previas + 1 >= v.dosis ? ", luego refuerzo" : ""})` : "Dosis única: no requiere refuerzo.";
          if (forzar || !prox.value) prox.value = s || "";
        };
        sel.addEventListener("change", () => sugerir(true));
        f.addEventListener("change", () => sugerir(true));
        sugerir(false);
      },
      fix: (d) => {
        const v = E.vacunas.find((x) => x.codigo === d.codigo);
        if (v) d.nombre = v.nombre; else d.codigo = null;
        if (!d.nombre) throw new Error("Indicá el nombre de la vacuna.");
        return d;
      },
    },

    desparasitaciones: {
      titulo: "Desparasitación",
      html: (r) => `
        <div class="form-grid">
          <label class="field"><span>Tipo *</span><select name="tipo">${opciones([["interna", "Interna"], ["externa", "Externa"], ["ambas", "Interna y externa"]], r.tipo)}</select></label>
          <label class="field"><span>Producto / principio activo *</span><input name="producto" required value="${esc(r.producto)}" /></label>
          <label class="field"><span>Dosis</span><input name="dosis" value="${esc(r.dosis)}" placeholder="Ej.: 1 comp. / 10 kg" /></label>
          <label class="field"><span>Fecha *</span><input name="fecha" type="date" required value="${esc(r.fecha || HV.hoy())}" /></label>
          <label class="field span-all"><span>Próxima</span><input name="proxima" type="date" value="${esc(r.proxima)}" />
            <span>${quick("proxima", [15, 30, 90, 180])}</span></label>
          ${E.desparasitacion ? `<div class="span-all muted" style="font-size:12.5px">${esc(E.desparasitacion)}</div>` : ""}
          <label class="field span-all"><span>Observaciones</span><input name="notas" value="${esc(r.notas)}" /></label>
        </div>`,
    },

    estudios: {
      titulo: "Estudio complementario", m: true,
      html: (r) => `
        <div class="form-grid">
          <label class="field"><span>Tipo *</span><select name="tipo">${opciones([["laboratorio", "Laboratorio"], ["imagen", "Imágenes"], ["otro", "Otro"]], r.tipo)}</select></label>
          <label class="field"><span>Estudio *</span><input name="nombre" list="dlEst" required value="${esc(r.nombre)}" />
            <datalist id="dlEst">${E.estudios.map((x) => `<option value="${esc(x)}"></option>`).join("")}</datalist></label>
          <label class="field"><span>Fecha *</span><input name="fecha" type="date" required value="${esc(r.fecha || HV.hoy())}" /></label>
          <label class="field"><span>Estado</span><select name="estado">${opciones([["solicitado", "Solicitado"], ["con resultado", "Con resultado"]], r.estado)}</select></label>
          <label class="field span-all"><span>Resultado / informe</span><textarea name="resultado" rows="4">${esc(r.resultado)}</textarea></label>
          <label class="field span-all"><span>Observaciones</span><input name="notas" value="${esc(r.notas)}" /></label>
        </div>`,
      bind: (m) => {
        const res = $("[name=resultado]", m), est = $("[name=estado]", m);
        res.addEventListener("input", () => { if (res.value.trim()) est.value = "con resultado"; });
      },
    },

    practicas: {
      titulo: "Cirugía / práctica",
      html: (r) => `
        <div class="form-grid">
          <label class="field"><span>Tipo *</span><select name="tipo">${opciones([["cirugia", "Cirugía"], ["practica", "Práctica / procedimiento"]], r.tipo)}</select></label>
          <label class="field"><span>Nombre *</span><input name="nombre" required value="${esc(r.nombre)}" placeholder="Ej.: castración, limpieza dental" /></label>
          <label class="field"><span>Fecha *</span><input name="fecha" type="date" required value="${esc(r.fecha || HV.hoy())}" /></label>
          <label class="field"><span>Anestesia / sedación</span><input name="anestesia" value="${esc(r.anestesia)}" /></label>
          <label class="field span-all"><span>Descripción / protocolo quirúrgico</span><textarea name="descripcion" rows="4">${esc(r.descripcion)}</textarea></label>
          <label class="field span-all"><span>Indicaciones postoperatorias / notas</span><input name="notas" value="${esc(r.notas)}" /></label>
        </div>`,
    },

    recetas: {
      titulo: "Receta",
      wide: true,
      html: (r) => {
        const ultDx = (H.consultas || [])[0]?.diagnostico || "";
        return `
        <div class="form-grid">
          <label class="field"><span>Fecha *</span><input name="fecha" type="date" required value="${esc(r.fecha || HV.hoy())}" /></label>
          <label class="field"><span>Diagnóstico</span><input name="diagnostico" value="${esc(r.diagnostico ?? ultDx)}" /></label>
          <div class="span-all">
            <span class="label">Medicamentos *</span>
            <div data-items style="display:flex;flex-direction:column;gap:10px;margin-top:8px"></div>
            <button type="button" class="btn btn--plain btn--sm" data-add style="margin-top:8px">${icon("plus")}Agregar medicamento</button>
          </div>
          <div class="span-all" data-alertas></div>
          <label class="field span-all"><span>Indicaciones al tutor</span><textarea name="indicaciones" rows="3">${esc(r.indicaciones)}</textarea></label>
          <label class="check span-all"><input type="checkbox" name="controlada" ${r.controlada ? "checked" : ""} />Contiene psicotrópicos o estupefacientes (receta archivada por duplicado)</label>
        </div>`;
      },
      bind: (m, r) => {
        const box = $("[data-items]", m);
        const fila = (i = {}) => {
          const div = document.createElement("div");
          div.className = "form-grid form-grid--4";
          div.style.cssText = "padding:12px;border:1px solid var(--line);border-radius:14px;gap:10px;position:relative";
          div.innerHTML = `
            <label class="field span-2"><span>Producto / principio activo</span><input data-k="producto" value="${esc(i.producto)}" /></label>
            <label class="field"><span>Presentación</span><input data-k="presentacion" value="${esc(i.presentacion)}" placeholder="Comp. 20 mg" /></label>
            <label class="field"><span>Cantidad</span><input data-k="cantidad" value="${esc(i.cantidad)}" placeholder="1 caja" /></label>
            <label class="field"><span>Dosis</span><input data-k="dosis" value="${esc(i.dosis)}" placeholder="${H.animal.peso ? "Peso " + H.animal.peso + " kg" : "mg/kg"}" /></label>
            <label class="field"><span>Vía</span><select data-k="via">${opciones(VIAS, i.via)}</select></label>
            <label class="field"><span>Frecuencia</span><input data-k="frecuencia" value="${esc(i.frecuencia)}" placeholder="Cada 12 h" /></label>
            <label class="field"><span>Duración</span><input data-k="duracion" value="${esc(i.duracion)}" placeholder="7 días" /></label>
            <div class="span-all"><button type="button" class="btn btn--plain btn--sm" data-calc-toggle>${icon("calc")}Calcular dosis por peso</button></div>
            <div class="span-all calc hidden" data-calc>
              <label>mg/kg <input type="number" step="any" min="0" data-c="mgkg" /></label>
              <span>×</span>
              <label>peso <input type="number" step="any" min="0" data-c="peso" value="${esc(H.animal.peso)}" /> kg</label>
              <span>=</span><b data-total>—</b>
              <span class="calc__sep"></span>
              <label>concentración <input type="number" step="any" min="0" data-c="conc" placeholder="mg" /></label>
              <select data-c="unidad" aria-label="Unidad"><option value="comp.">mg por comp.</option><option value="ml">mg por ml</option></select>
              <span>→</span><b data-unid>—</b>
              <button type="button" class="btn btn--sm" data-usar disabled>Usar</button>
            </div>
            <button type="button" class="icon-btn icon-btn--danger" data-quitar style="position:absolute;top:8px;right:8px" aria-label="Quitar">${icon("x")}</button>`;
          $("[data-quitar]", div).addEventListener("click", () => { if (box.children.length > 1) { div.remove(); revisar(); } });

          // Calculadora: mg/kg × peso = mg totales; con la concentración, cuántos comp. o ml.
          const calc = $("[data-calc]", div);
          const cv = (k) => parseFloat(($(`[data-c=${k}]`, calc).value || "").replace(",", "."));
          let texto = "";
          const calcular = () => {
            const mgkg = cv("mgkg"), peso = cv("peso"), conc = cv("conc"), unidad = $("[data-c=unidad]", calc).value;
            const total = mgkg > 0 && peso > 0 ? +(mgkg * peso).toFixed(2) : null;
            let cant = null;
            if (total && conc > 0) cant = unidad === "ml" ? +(total / conc).toFixed(2) : Math.round((total / conc) * 4) / 4;
            $("[data-total]", calc).textContent = total ? `${total} mg` : "—";
            $("[data-unid]", calc).textContent = cant ? `${cant} ${unidad}` : "—";
            texto = total ? `${total} mg${cant ? ` (${cant} ${unidad})` : ""} · ${mgkg} mg/kg` : "";
            $("[data-usar]", calc).disabled = !texto;
          };
          calc.addEventListener("input", calcular);
          $("[data-c=unidad]", calc).addEventListener("change", calcular);
          $("[data-calc-toggle]", div).addEventListener("click", () => { calc.classList.toggle("hidden"); $("[data-c=mgkg]", calc).focus(); });
          $("[data-usar]", calc).addEventListener("click", () => { $('[data-k="dosis"]', div).value = texto; calc.classList.add("hidden"); });
          $('[data-k="producto"]', div).addEventListener("change", revisar);
          box.appendChild(div);
        };
        (r.items?.length ? r.items : [{}]).forEach(fila);
        $("[data-add]", m).addEventListener("click", () => { fila(); $$('[data-k="producto"]', box).pop().focus(); });

        // Alertas por especie / raza / alergias registradas.
        async function revisar() {
          const productos = $$('[data-k="producto"]', box).map((x) => x.value.trim()).filter(Boolean);
          const out = [];
          if (productos.length) {
            const al = await api("POST", `/api/animales/${ID}/alertas`, { productos }).catch(() => []);
            al.forEach((a) => out.push(`<div class="alert alert--danger">${icon("alert")}<span>${a.motivo.includes("período de retiro") ? "" : `<b>${esc(a.producto)}:</b> `}${esc(a.motivo)}</span></div>`));
            const alergias = HV.especie && H.animal.alergias ? H.animal.alergias.toLowerCase() : "";
            productos.forEach((p) => {
              const palabra = p.toLowerCase().split(/[\s,+/()-]+/).find((w) => w.length > 4 && alergias.includes(w));
              if (palabra) out.push(`<div class="alert alert--danger">${icon("alert")}<span><b>${esc(p)}:</b> el paciente tiene registrada alergia a “${esc(H.animal.alergias)}”.</span></div>`);
            });
          }
          $("[data-alertas]", m).innerHTML = out.join("");
        }
        m._items = () => $$("[data-items] > div", m).map((d) => Object.fromEntries($$("[data-k]", d).map((x) => [x.dataset.k, x.value.trim()])))
          .filter((i) => i.producto);
        revisar();
      },
      fix: (d, m) => {
        d.items = m._items();
        if (!d.items.length) throw new Error("Agregá al menos un medicamento.");
        return d;
      },
    },
    reproduccion: {
      titulo: "Evento reproductivo", m: true,
      html: (r) => `
        <div class="form-grid">
          <label class="field"><span>Evento *</span><select name="tipo">${opciones([["celo", "Celo"], ["servicio", "Servicio / monta / inseminación"],
            ["gestacion", "Gestación confirmada"], ["parto", "Parto"], ["aborto", "Aborto"]], r.tipo || "servicio")}</select></label>
          <label class="field"><span>Fecha *</span><input name="fecha" type="date" required value="${esc(r.fecha || HV.hoy())}" /></label>
          <label class="field" data-fpp><span>Fecha probable de parto</span><input name="fpp" type="date" value="${esc(r.fpp)}" />
            <small>${E.gestacion ? `Gestación promedio ${esc(E.nombre.toLowerCase())}: ${E.gestacion} días.` : "Sin dato de gestación para esta especie."}</small></label>
          <label class="field" data-crias><span>Cantidad de crías</span><input name="crias" type="number" min="0" value="${esc(r.crias)}" /></label>
          <label class="field span-all"><span>Observaciones</span><textarea name="notas" rows="2" placeholder="Reproductor, método, ecografía, vivos / muertos…">${esc(r.notas)}</textarea></label>
        </div>`,
      bind: (m) => {
        const tipo = $("[name=tipo]", m), f = $("[name=fecha]", m), fpp = $("[name=fpp]", m);
        const sync = (recalcular) => {
          const conFpp = ["servicio", "gestacion"].includes(tipo.value);
          $("[data-fpp]", m).classList.toggle("hidden", !conFpp);
          $("[data-crias]", m).classList.toggle("hidden", tipo.value !== "parto");
          if (!conFpp) { fpp.value = ""; return; }
          // En "gestación confirmada" se calcula desde el último servicio, si existe.
          const servicio = (H.reproduccion || []).find((x) => x.tipo === "servicio" && x.fecha <= f.value);
          const base = tipo.value === "gestacion" && servicio ? servicio.fecha : f.value;
          if (E.gestacion && base && (recalcular || !fpp.value)) fpp.value = HV.sumarDias(base, E.gestacion);
        };
        tipo.addEventListener("change", () => sync(true));
        f.addEventListener("change", () => sync(true));
        sync(false);
      },
    },
  };

  function abrirForm(tipo, registro = null, pre = {}) {
    const F = FORMS[tipo];
    // "Repetir": se copian los datos de un registro previo, con la fecha de hoy.
    const r = registro || (pre.copia ? { ...pre.copia, id: undefined, fecha: undefined, usuario_id: undefined } : {});
    const m = modal({
      title: `${registro ? "Editar" : F.m ? "Nuevo" : "Nueva"} ${F.titulo.toLowerCase()} · ${H.animal.nombre}`,
      wide: F.wide,
      body: `<form novalidate>${F.html(r, pre)}
        <div class="form-error" role="alert"></div>
        <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button>
          <button class="btn ${tipo === "vacunas" ? "btn--green" : ""}">${icon("check")}Guardar</button></div></form>`,
    });
    // Botones +7d / +1m que completan una fecha a partir de hoy.
    $$("[data-quick]", m).forEach((b) => b.addEventListener("click", () => {
      const [campo, dias] = b.dataset.quick.split(":");
      const base = $("[name=fecha]", m)?.value?.slice(0, 10) || HV.hoy();
      $(`[name=${campo}]`, m).value = HV.sumarDias(base, Number(dias));
    }));
    F.bind?.(m, r);
    onSubmit($("form", m), async (d) => {
      if (F.fix) d = F.fix(d, m);
      const res = registro
        ? await api("PUT", `/api/${tipo}/${registro.id}`, d)
        : await api("POST", `/api/animales/${ID}/${tipo}`, d);
      // Consulta abierta desde la agenda: el turno queda atendido.
      if (pre.turno) await api("PUT", `/api/turnos/${pre.turno}`, { estado: "atendido" }).catch(() => {});
      close(m);
      toast(pre.turno ? "Consulta guardada · turno atendido" : "Guardado en la historia clínica", "ok");
      // Al terminar una consulta desde la agenda, ofrecer el cobro.
      if (pre.turno && tipo === "consultas") {
        if (await confirmar("Consulta guardada. ¿Registrás el cobro ahora?", { ok: "Registrar cobro" })) cobrar("Consulta");
      }
      if (tipo === "recetas" && !registro && res.id) {
        if (await confirmar("Receta guardada. ¿Querés abrirla para imprimir?", { ok: "Abrir receta" })) window.open(`receta.html?id=${res.id}`, "_blank");
      }
      tab = tab === "historia" ? "historia" : tipo;
      cargar();
    });
  }

  /* =======================================================================
     Edición de animal / tutor y acceso a la libreta
     ======================================================================= */
  function editarAnimal() {
    if (esTutor) return editarMascotaTutor();
    const m = modal({
      title: `Editar ${H.animal.nombre}`,
      wide: true,
      body: `<form novalidate>${AnimalForm.html(H.animal.especie, H.animal)}
        <div class="form-error" role="alert"></div>
        <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn">${icon("check")}Guardar</button></div></form>`,
    });
    AnimalForm.bind(m);
    onSubmit($("form", m), async (_d, form) => {
      await api("PUT", `/api/animales/${ID}`, AnimalForm.leer(form, H.animal.especie));
      close(m); toast("Datos actualizados", "ok"); cargar();
    });
  }

  /* El tutor edita sólo los datos no clínicos de su mascota (y la foto, desde el avatar). */
  function editarMascotaTutor() {
    const a = H.animal;
    const m = modal({
      title: `Editar ${a.nombre}`,
      body: `<form class="form-grid" novalidate>
        <div class="span-all" style="display:flex;align-items:center;gap:14px">
          ${avatar(a.especie, "", a.foto)}
          <button type="button" class="btn btn--ghost btn--sm" data-foto-modal>${icon("camera")}${a.foto ? "Cambiar foto" : "Agregar foto"}</button>
        </div>
        <label class="field"><span>Nombre *</span><input name="nombre" required maxlength="80" value="${esc(a.nombre)}" /></label>
        <label class="field"><span>${a.especie === "reptil" || a.especie === "ave" ? "Tipo" : "Raza"}</span>
          <input name="raza" list="dlRazasT" value="${esc(a.raza)}" />
          <datalist id="dlRazasT">${E.razas.map((r) => `<option value="${esc(r)}"></option>`).join("")}</datalist></label>
        <label class="field"><span>Color / pelaje</span><input name="color" value="${esc(a.color)}" /></label>
        <label class="field"><span>Señas particulares</span><input name="senas" value="${esc(a.senas)}" /></label>
        <p class="span-all muted" style="margin:0;font-size:12.5px;line-height:1.5">Los datos clínicos (peso, alergias, vacunas, castración, microchip) los actualiza la veterinaria.</p>
        <div class="span-all form-error" role="alert"></div>
        <div class="span-all form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn">${icon("check")}Guardar</button></div></form>`,
    });
    $("[data-foto-modal]", m).addEventListener("click", () => { close(m); $("[data-foto]").click(); });
    onSubmit($("form", m), async (d) => {
      if (!d.nombre.trim()) throw new Error("Ingresá el nombre.");
      await api("PUT", `/api/portal/animales/${ID}`, d);
      close(m); toast("Datos actualizados", "ok"); cargar();
    });
  }

  function editarTutor() {
    const t = H.tutor;
    if (esTutor) {
      const m = modal({
        title: "Mis datos de contacto",
        body: `<form class="form-grid" novalidate>
          <label class="field"><span>Teléfono (WhatsApp)</span><input name="telefono" type="tel" value="${esc(t.telefono)}" /></label>
          <label class="field"><span>Dirección</span><input name="direccion" value="${esc(t.direccion === "—" ? "" : t.direccion)}" /></label>
          <label class="field"><span>Ciudad</span><input name="ciudad" value="${esc(t.ciudad)}" /></label>
          <label class="field"><span>Provincia</span><input name="provincia" value="${esc(t.provincia)}" /></label>
          <p class="span-all muted" style="margin:0;font-size:12.5px;line-height:1.5">Para cambiar nombre, DNI o el email con el que ingresás, pedíselo a la veterinaria.</p>
          <div class="span-all form-error" role="alert"></div>
          <div class="span-all form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn">${icon("check")}Guardar</button></div></form>`,
      });
      onSubmit($("form", m), async (d) => {
        await api("PUT", "/api/portal/datos", d);
        close(m); toast("Tus datos se actualizaron", "ok"); cargar();
      });
      return;
    }
    const m = modal({
      title: "Editar tutor",
      body: `<form class="form-grid" novalidate>
        <label class="field"><span>Apellido *</span><input name="apellido" required value="${esc(t.apellido)}" /></label>
        <label class="field"><span>Nombre *</span><input name="nombre" required value="${esc(t.nombre)}" /></label>
        <label class="field"><span>DNI / CUIT *</span><input name="dni" required value="${esc(t.dni)}" /></label>
        <label class="field"><span>Teléfono</span><input name="telefono" value="${esc(t.telefono)}" /></label>
        <label class="field"><span>Email</span><input name="email" type="email" value="${esc(t.email)}" /></label>
        <label class="field"><span>Dirección</span><input name="direccion" value="${esc(t.direccion)}" /></label>
        <label class="field"><span>Ciudad</span><input name="ciudad" value="${esc(t.ciudad)}" /></label>
        <label class="field"><span>Provincia</span><input name="provincia" value="${esc(t.provincia)}" /></label>
        <label class="field span-all"><span>Notas</span><input name="notas" value="${esc(t.notas)}" /></label>
        <div class="span-all form-error" role="alert"></div>
        <div class="span-all form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn">${icon("check")}Guardar</button></div></form>`,
    });
    onSubmit($("form", m), async (d) => {
      await api("PUT", `/api/tutores/${t.id}`, d);
      close(m); toast("Tutor actualizado", "ok"); cargar();
    });
  }

  function darAcceso() {
    const t = H.tutor;
    const m = modal({
      title: "Acceso del tutor a la libreta",
      body: `<p class="muted" style="margin:0 0 14px;line-height:1.5">El tutor podrá ver, con su email y una clave, la libreta sanitaria, recetas y turnos de todos sus animales. No ve notas clínicas internas.</p>
        <form class="form-grid" style="grid-template-columns:1fr" novalidate>
          <label class="field"><span>Email del tutor *</span><input name="email" type="email" required value="${esc(t.acceso?.email || t.email)}" /></label>
          <div class="form-error" role="alert"></div>
          <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn">${icon("key")}Generar clave</button></div>
        </form>`,
    });
    onSubmit($("form", m), async (d) => {
      const r = await api("POST", `/api/tutores/${t.id}/acceso`, d);
      const texto = `Hola ${t.nombre}, ya podés ver la libreta sanitaria online de tus animales en ${location.origin}/login.html — Usuario: ${r.email} · Clave temporal: ${r.clave}`;
      const wa = whatsapp(t.telefono, texto);
      $(".modal__body", m).innerHTML = `
        <p style="margin:0 0 10px">Clave temporal para <b>${esc(r.email)}</b>. Se muestra una sola vez:</p>
        <div class="secret"><span>${esc(r.clave)}</span><button class="btn btn--sm btn--ghost" type="button" data-copy>Copiar</button></div>
        <p class="muted" style="font-size:12.5px">El tutor puede cambiarla desde el menú al ingresar.</p>
        <div class="form-actions">${wa ? `<a class="btn btn--green" href="${wa}" target="_blank" rel="noopener">${icon("msg")}Enviar por WhatsApp</a>` : ""}<button class="btn" type="button" data-close>Listo</button></div>`;
      $("[data-copy]", m).addEventListener("click", () => navigator.clipboard?.writeText(r.clave).then(() => toast("Clave copiada", "ok")));
      cargar();
    });
  }

  await cargar();

  // Viene de "Atender" en la agenda: abre la consulta con el motivo del turno.
  if (HV.qs("nueva") === "consulta" && escribe && H) {
    const turnoId = Number(HV.qs("turno")) || null;
    const t = H.turnos.find((x) => x.id === turnoId);
    history.replaceState(null, "", `animal.html?id=${ID}`);
    abrirForm("consultas", null, { turno: turnoId, copia: { motivo: t ? t.notas || TIPO_TURNO[t.tipo] : "" } });
  }
})();
