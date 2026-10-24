/* =========================================================================
   ANIMAL — Formulario de datos del animal (registro y edición)
   Los campos se adaptan a la especie: identificación (microchip, caravana,
   anillo), unidad de peso, rodeo/lote para producción.
   ========================================================================= */

const AnimalForm = (() => {
  const { esc, opciones, especie } = HV;

  const etiquetaId = (e) =>
    e.grupo === "grandes" ? "Caravana / marca / señal" : e.sigla === "Av" ? "Anillo" : "Otra identificación (tatuaje, collar)";

  function html(codigo, a = {}) {
    const e = especie(codigo);
    const rodeo = a.unidad === "rodeo";
    const aprox = !a.fecha_nac && a.id; // en edición, sin fecha
    return `
      <div class="form-grid">
        ${e.rodeo ? `<div class="span-all">
          <span class="label">¿Qué vas a registrar?</span>
          <div class="seg" style="margin-top:6px" data-seg="unidad">
            <button type="button" data-v="individual" class="${rodeo ? "" : "is-on"}">Un animal</button>
            <button type="button" data-v="rodeo" class="${rodeo ? "is-on" : ""}">Rodeo / lote</button>
          </div>
          <input type="hidden" name="unidad" value="${rodeo ? "rodeo" : "individual"}" />
        </div>` : `<input type="hidden" name="unidad" value="individual" />`}

        <label class="field"><span data-l-nombre>${rodeo ? "Nombre del rodeo / lote" : "Nombre"} *</span>
          <input name="nombre" required value="${esc(a.nombre)}" maxlength="80" /></label>
        <label class="field ${rodeo ? "" : "hidden"}" data-solo-rodeo><span>Cantidad de cabezas *</span>
          <input name="cantidad" type="number" min="1" value="${esc(a.cantidad)}" /></label>

        <label class="field"><span>${codigo === "otro" ? "Especie / tipo" : codigo === "reptil" || codigo === "ave" ? "Tipo" : "Raza"}</span>
          <input name="raza" list="dlRazas" value="${esc(a.raza)}" placeholder="${e.razas[0] ? "Ej.: " + esc(e.razas[0]) : ""}" />
          <datalist id="dlRazas">${e.razas.map((r) => `<option value="${esc(r)}"></option>`).join("")}</datalist></label>

        <div class="field"><span>Sexo</span>
          <div class="seg" data-seg="sexo" style="align-self:flex-start">
            ${[["M", "Macho"], ["H", "Hembra"], ["ND", "Sin determinar"]].map(([v, t]) =>
              `<button type="button" data-v="${v}" class="${(a.sexo || "ND") === v ? "is-on" : ""}">${rodeo ? { M: "Machos", H: "Hembras", ND: "Mixto" }[v] : t}</button>`).join("")}
          </div>
          <input type="hidden" name="sexo" value="${esc(a.sexo || "ND")}" /></div>

        <div class="field">
          <span>Nacimiento</span>
          <div class="seg" data-seg="modoEdad" style="align-self:flex-start">
            <button type="button" data-v="fecha" class="${aprox ? "" : "is-on"}">Fecha</button>
            <button type="button" data-v="aprox" class="${aprox ? "is-on" : ""}">Edad aproximada</button>
          </div>
          <input name="fecha_nac" type="date" max="${HV.hoy()}" value="${esc(a.fecha_nac)}" class="${aprox ? "hidden" : ""}" aria-label="Fecha de nacimiento" />
          <div class="form-grid ${aprox ? "" : "hidden"}" data-aprox style="gap:8px">
            <input name="_anios" type="number" min="0" max="60" placeholder="Años" aria-label="Años" />
            <input name="_meses" type="number" min="0" max="11" placeholder="Meses" aria-label="Meses" />
          </div>
        </div>

        <label class="field"><span>Color / pelaje</span><input name="color" value="${esc(a.color)}" /></label>
        <label class="field"><span>Peso (kg)${e.sigla === "Av" ? " — usar decimales, ej. 0.42" : ""}</span>
          <input name="peso" type="number" step="0.01" min="0" value="${esc(a.peso)}" /></label>

        <div class="section-label">Identificación</div>
        <label class="field"><span>Microchip</span>
          <input name="microchip" inputmode="numeric" maxlength="15" pattern="\\d{15}" value="${esc(a.microchip)}" placeholder="15 dígitos" />
          <small>Norma ISO 11784/11785.</small></label>
        <label class="field"><span>${etiquetaId(e)}</span><input name="identificacion" value="${esc(a.identificacion)}" /></label>
        <label class="field span-all"><span>Señas particulares</span><input name="senas" value="${esc(a.senas)}" /></label>

        <div class="section-label">Salud</div>
        <label class="field span-all"><span>Alergias o reacciones adversas</span>
          <input name="alergias" value="${esc(a.alergias)}" placeholder="Fármacos, vacunas, alimentos…" /></label>
        <label class="field span-all"><span>Enfermedades crónicas / antecedentes</span>
          <input name="cronicas" value="${esc(a.cronicas)}" /></label>
        <label class="field span-all"><span>Notas</span><textarea name="notas" rows="2">${esc(a.notas)}</textarea></label>
        <div class="span-all" style="display:flex;gap:22px;flex-wrap:wrap">
          <label class="check"><input type="checkbox" name="castrado" ${a.castrado ? "checked" : ""} />Castrado / esterilizado</label>
          ${a.id ? `<label class="check"><input type="checkbox" name="fallecido" ${a.fallecido ? "checked" : ""} />Fallecido</label>` : ""}
        </div>
      </div>`;
  }

  // Conecta los controles segmentados y la edad aproximada.
  function bind(root) {
    root.querySelectorAll("[data-seg]").forEach((seg) => {
      seg.addEventListener("click", (ev) => {
        const b = ev.target.closest("button[data-v]");
        if (!b) return;
        seg.querySelectorAll("button").forEach((x) => x.classList.toggle("is-on", x === b));
        const nombre = seg.dataset.seg;
        if (nombre === "modoEdad") {
          root.querySelector("[name=fecha_nac]").classList.toggle("hidden", b.dataset.v !== "fecha");
          root.querySelector("[data-aprox]").classList.toggle("hidden", b.dataset.v !== "aprox");
          return;
        }
        root.querySelector(`[name=${nombre}]`).value = b.dataset.v;
        if (nombre === "unidad") {
          const rodeo = b.dataset.v === "rodeo";
          root.querySelector("[data-solo-rodeo]").classList.toggle("hidden", !rodeo);
          root.querySelector("[data-l-nombre]").textContent = rodeo ? "Nombre del rodeo / lote *" : "Nombre *";
          const etq = rodeo ? { M: "Machos", H: "Hembras", ND: "Mixto" } : { M: "Macho", H: "Hembra", ND: "Sin determinar" };
          root.querySelectorAll('[data-seg="sexo"] button').forEach((x) => (x.textContent = etq[x.dataset.v]));
        }
      });
    });
  }

  // Lee el formulario y lo deja listo para la API.
  function leer(form, especieCodigo) {
    const d = HV.formData(form);
    const modoAprox = form.querySelector('[data-seg="modoEdad"] .is-on')?.dataset.v === "aprox";
    if (modoAprox) {
      const anios = Number(d._anios || 0), meses = Number(d._meses || 0);
      d.fecha_nac = anios || meses ? HV.sumarDias(HV.hoy(), -Math.round(anios * 365.25 + meses * 30.44)) : "";
    }
    delete d._anios; delete d._meses;
    if (d.unidad !== "rodeo") d.cantidad = "";
    d.especie = especieCodigo;
    return d;
  }

  return { html, bind, leer };
})();
