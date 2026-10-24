/* ANIMAL — Buscar paciente (búsqueda en vivo) */

(async () => {
  const { icon, esc, $, api, avatar, especie, edad, fecha, SEXO } = HV;
  const me = await HV.init({ roles: ["director", "veterinario", "recepcion"] });
  const cat = await HV.catalogo();

  $("#back").innerHTML = `${icon("back")}Inicio`;
  $("#nuevo").innerHTML = `${icon("plus")}Nuevo paciente`;
  $("#qWrap").insertAdjacentHTML("afterbegin", icon("search"));

  // Select de especies agrupado.
  $("#especie").insertAdjacentHTML("beforeend", cat.grupos.map((g) =>
    `<optgroup label="${esc(g.nombre)}">${Object.entries(cat.especies)
      .filter(([, e]) => e.grupo === g.codigo)
      .map(([c, e]) => `<option value="${c}">${esc(e.nombre)}</option>`).join("")}</optgroup>`).join(""));

  const q = $("#q");
  q.value = HV.qs("q") || "";
  let timer = null, ultima = 0;

  async function buscar() {
    const n = ++ultima;
    const params = new URLSearchParams({ q: q.value.trim(), especie: $("#especie").value });
    const rows = await api("GET", "/api/buscar?" + params);
    if (n !== ultima) return; // llegó una búsqueda más nueva
    history.replaceState(null, "", "buscar.html" + (q.value.trim() ? "?q=" + encodeURIComponent(q.value.trim()) : ""));
    $("#info").textContent = q.value.trim() || $("#especie").value
      ? `${rows.length} resultado${rows.length === 1 ? "" : "s"}${rows.length === 60 ? " (se muestran los primeros 60)" : ""}`
      : "Pacientes registrados recientemente";
    $("#results").innerHTML = rows.length ? rows.map(card).join("")
      : `<div class="panel empty" style="grid-column:1/-1">${icon("search")}No encontramos pacientes con esa búsqueda.<br /><br />
          <a class="btn btn--green btn--sm" href="registro.html">${icon("plus")}Registrar nuevo paciente</a></div>`;
  }

  function card(a) {
    const e = especie(a.especie);
    const rodeo = a.unidad === "rodeo";
    const tags = [
      `<span class="tag tag--info">${esc(e.nombre)}</span>`,
      rodeo ? `<span class="tag tag--ok">Rodeo · ${a.cantidad} cab.</span>` : "",
      a.fallecido ? `<span class="tag">Fallecido</span>` : "",
      a.alergias ? `<span class="tag tag--danger">${icon("alert", "ico")}Alergias</span>` : "",
    ].join("");
    const clinico = me.rol !== "recepcion";
    return `<article class="pcard">
      ${avatar(a.especie, "", a.foto)}
      <div class="pcard__main">
        <div class="pcard__name">${esc(a.nombre)}</div>
        <div class="pcard__line">${esc(a.raza || e.nombre)} · ${esc(SEXO[a.sexo] || "")}${a.castrado ? " castrado/a" : ""} · ${esc(edad(a.fecha_nac))}</div>
        <div class="pcard__line"><b>Tutor:</b> ${esc(a.tutor_apellido)}, ${esc(a.tutor_nombre)} · DNI ${esc(a.tutor_dni)}</div>
        ${a.microchip ? `<div class="pcard__line muted">Microchip ${esc(a.microchip)}</div>` : ""}
        ${clinico && a.ultima_consulta ? `<div class="pcard__line muted">Última consulta: ${fecha(a.ultima_consulta)}</div>` : ""}
        <div class="pcard__tags">${tags}</div>
        <div class="pcard__actions">
          <a class="btn btn--sm" href="animal.html?id=${a.id}">${icon(clinico ? "file" : "book")}${clinico ? "Historia clínica" : "Ficha"}</a>
          <a class="btn btn--ghost btn--sm" href="turnos.html?animal=${a.id}">${icon("calendar")}Turno</a>
          <a class="btn btn--plain btn--sm" href="libreta.html?id=${a.id}">${icon("book")}Libreta</a>
        </div>
      </div>
    </article>`;
  }

  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(buscar, 220); });
  $("#especie").addEventListener("change", buscar);
  q.focus();
  buscar();
})();
