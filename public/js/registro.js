/* ANIMAL — Registro de paciente: tutor (existente o nuevo) + animal */

(async () => {
  const { icon, esc, $, $$, api, avatar, onSubmit } = HV;
  await HV.init({ roles: ["director", "veterinario", "recepcion"] });
  const cat = await HV.catalogo();

  $("#back").innerHTML = `${icon("back")}Volver`;
  $("#tTutor").innerHTML = `${icon("users")}Tutor`;
  $("#tEspecie").innerHTML = `${icon("paw")}¿Qué animal es?`;
  $("#guardar").innerHTML = `${icon("check")}Registrar paciente`;

  let tutor = null;        // tutor existente elegido
  let tutorNuevo = null;   // datos de un tutor a crear
  let especieSel = null;

  const paso = (n) => [1, 2, 3].forEach((i) => {
    $("#st" + i).classList.toggle("is-on", i === n);
    $("#st" + i).classList.toggle("is-done", i < n);
  });

  /* ---------- Paso 1: tutor ---------- */
  function pantallaDni() {
    $("#tutorBody").innerHTML = `
      <form id="fDni" class="search-bar" novalidate>
        <label class="field" style="flex:1 1 260px"><span>DNI / CUIT del tutor</span>
          <input name="dni" required inputmode="numeric" autocomplete="off" placeholder="Sin puntos" /></label>
        <button class="btn" style="align-self:flex-end">${icon("search")}Continuar</button>
      </form>
      <div class="form-error" id="dniErr"></div>`;
    $("#fDni").addEventListener("submit", async (e) => {
      e.preventDefault();
      const dni = e.target.dni.value.replace(/[.\s]/g, "").trim();
      if (!dni) { $("#dniErr").textContent = "Ingresá el DNI."; return; }
      const t = await api("GET", "/api/tutores?dni=" + encodeURIComponent(dni));
      if (t) usarTutor(t); else formTutor(dni);
    });
  }

  function formTutor(dni) {
    $("#tutorBody").innerHTML = `
      <div class="alert alert--info" style="margin-bottom:16px">${icon("info")}No hay un tutor con DNI ${esc(dni)}. Completá sus datos.</div>
      <form id="fTutor" class="form-grid" novalidate>
        <label class="field"><span>Apellido / razón social *</span><input name="apellido" required /></label>
        <label class="field"><span>Nombre *</span><input name="nombre" required /></label>
        <label class="field"><span>DNI / CUIT *</span><input name="dni" required value="${esc(dni)}" /></label>
        <label class="field"><span>Teléfono (WhatsApp)</span><input name="telefono" type="tel" placeholder="351 555-1234" /></label>
        <label class="field"><span>Email</span><input name="email" type="email" /><small>Para darle acceso a la libreta.</small></label>
        <label class="field"><span>Dirección</span><input name="direccion" /></label>
        <label class="field"><span>Ciudad</span><input name="ciudad" /></label>
        <label class="field"><span>Provincia</span><input name="provincia" value="Córdoba" /></label>
        <div class="span-all form-error"></div>
        <div class="span-all form-actions" style="margin-top:0">
          <button type="button" class="btn btn--ghost" data-otro>Otro DNI</button>
          <button class="btn">Continuar ${icon("right")}</button>
        </div>
      </form>`;
    $("[data-otro]").addEventListener("click", pantallaDni);
    onSubmit($("#fTutor"), async (d) => {
      if (!d.apellido || !d.nombre || !d.dni) throw new Error("Completá apellido, nombre y DNI.");
      tutorNuevo = d;
      resumenTutor(`${d.apellido}, ${d.nombre}`, d.dni, "Nuevo tutor");
    });
  }

  function usarTutor(t) {
    tutor = t;
    resumenTutor(`${t.apellido}, ${t.nombre}`, t.dni, "Tutor registrado");
  }

  function resumenTutor(nombre, dni, etiqueta) {
    $("#tutorBody").innerHTML = `
      <div class="list__item" style="padding:4px 0">
        <span class="ava ava--sm">${esc(nombre[0] || "?")}</span>
        <span class="list__main"><span class="list__title">${esc(nombre)}</span><span class="list__sub">DNI ${esc(dni)}</span></span>
        <span class="tag tag--${tutor ? "info" : "ok"}">${etiqueta}</span>
        <button class="btn btn--plain btn--sm" type="button" data-cambiar>Cambiar</button>
      </div>`;
    $("[data-cambiar]").addEventListener("click", () => {
      tutor = tutorNuevo = null;
      $("#pAnimal").classList.add("hidden");
      paso(1);
      pantallaDni();
    });
    $("#pAnimal").classList.remove("hidden");
    paso(especieSel ? 3 : 2);
    $("#pAnimal").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Paso 2: especie ---------- */
  $("#species").innerHTML = cat.grupos.map((g) => `
    <div class="species__group">${esc(g.nombre)}</div>
    ${Object.entries(cat.especies).filter(([, e]) => e.grupo === g.codigo).map(([c, e]) =>
      `<button type="button" class="species__btn" data-esp="${c}">${avatar(c)}${esc(e.nombre)}</button>`).join("")}`).join("");

  $("#species").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-esp]");
    if (!b) return;
    especieSel = b.dataset.esp;
    $$(".species__btn").forEach((x) => x.classList.toggle("is-on", x === b));
    const e = cat.especies[especieSel];
    $("#animalFields").innerHTML =
      (e.nota ? `<div class="alert alert--info" style="margin-bottom:16px">${icon("info")}${esc(e.nota)}</div>` : "") +
      AnimalForm.html(especieSel);
    AnimalForm.bind($("#animalFields"));
    $("#fAnimal").classList.remove("hidden");
    paso(3);
    $("#fAnimal [name=nombre]").focus();
  });

  /* ---------- Paso 3: guardar ---------- */
  onSubmit($("#fAnimal"), async (_d, form) => {
    if (!tutor && !tutorNuevo) throw new Error("Primero indicá el tutor.");
    const a = AnimalForm.leer(form, especieSel);
    if (!a.nombre) throw new Error("Ingresá el nombre del animal.");
    if (!tutor) {
      const { id } = await api("POST", "/api/tutores", tutorNuevo);
      tutor = { id, ...tutorNuevo };
      tutorNuevo = null;
    }
    const { id } = await api("POST", "/api/animales", { ...a, tutor_id: tutor.id });
    HV.toast("Paciente registrado", "ok");
    location.href = `animal.html?id=${id}`;
  });

  // Agregar animal a un tutor ya conocido (desde la ficha).
  const tid = HV.qs("tutor");
  if (tid) {
    const t = await api("GET", "/api/tutores/" + encodeURIComponent(tid)).catch(() => null);
    if (t) usarTutor(t); else pantallaDni();
  } else {
    pantallaDni();
  }
})();
