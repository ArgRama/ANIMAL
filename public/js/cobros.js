/* =========================================================================
   ANIMAL — Ventanas de cobro (las usan la caja, la ficha y "Atender")
   Cobros.nuevo({ animal, concepto, alGuardar }) · Cobros.pagar(c) · Cobros.anular(c)
   ========================================================================= */

const Cobros = (() => {
  const { icon, esc, $, $$, api, avatar, modal, close, onSubmit, opciones, toast, pesos, MEDIOS } = HV;

  const CONCEPTOS = ["Consulta", "Vacuna", "Desparasitación", "Control", "Cirugía", "Estudio", "Medicamentos", "Baño / estética", "Visita a domicilio"];

  function nuevo({ animal = null, concepto = "", alGuardar = () => {} } = {}) {
    let elegido = animal;
    const m = modal({
      title: "Registrar cobro",
      body: `<form class="form-grid" novalidate>
        <div class="field span-all" style="position:relative"><span>Paciente *</span>
          <div data-elegido></div>
          <input data-buscar placeholder="Buscar por animal, tutor o DNI…" autocomplete="off" />
          <div class="dropdown hidden" data-sug style="left:0;right:0;top:100%;max-height:240px;overflow:auto"></div>
        </div>
        <div class="field span-all"><span>Concepto *</span>
          <input name="concepto" required value="${esc(concepto)}" placeholder="Ej.: Consulta + vacuna antirrábica" />
          <div class="chips">${CONCEPTOS.map((c) => `<button type="button" class="chip" data-concepto="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        </div>
        <label class="field"><span>Monto *</span><input name="monto" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="$" /></label>
        <div class="field"><span>¿Cómo paga?</span>
          <div class="seg" data-seg-estado>
            <button type="button" data-v="pagado" class="is-on">Paga ahora</button>
            <button type="button" data-v="pendiente">A cuenta</button>
          </div></div>
        <div class="field span-all" data-medios><span>Medio de pago *</span>
          <div class="chips">${Object.entries(MEDIOS).map(([v, t], i) => `<button type="button" class="chip ${i === 0 ? "is-on" : ""}" data-medio="${v}">${t}</button>`).join("")}</div>
        </div>
        <label class="field span-all"><span>Notas</span><input name="notas" placeholder="Opcional: n.º de comprobante, detalle…" /></label>
        <div class="span-all form-error" role="alert"></div>
        <div class="span-all form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button>
          <button class="btn btn--green">${icon("check")}Registrar</button></div>
      </form>`,
    });

    let estado = "pagado", medio = "efectivo";
    $$("[data-concepto]", m).forEach((b) => b.addEventListener("click", () => {
      const inp = $("[name=concepto]", m);
      inp.value = inp.value.trim() ? `${inp.value.trim()} + ${b.dataset.concepto.toLowerCase()}` : b.dataset.concepto;
      $("[name=monto]", m).focus();
    }));
    $$("[data-medio]", m).forEach((b) => b.addEventListener("click", () => {
      medio = b.dataset.medio;
      $$("[data-medio]", m).forEach((x) => x.classList.toggle("is-on", x === b));
    }));
    $("[data-seg-estado]", m).addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      estado = b.dataset.v;
      $$("[data-seg-estado] button", m).forEach((x) => x.classList.toggle("is-on", x === b));
      $("[data-medios]", m).classList.toggle("hidden", estado === "pendiente");
    });

    // Buscador de paciente (si no vino uno elegido).
    const box = $("[data-elegido]", m), inp = $("[data-buscar]", m), sug = $("[data-sug]", m);
    const pintar = () => {
      box.innerHTML = elegido ? `<div class="list__item" style="padding:6px 0">${avatar(elegido.especie, "ava--sm", elegido.foto)}
        <span class="list__main"><span class="list__title">${esc(elegido.nombre)}</span><span class="list__sub">${esc(elegido.tutor || "")}</span></span>
        ${animal ? "" : `<button type="button" class="btn btn--plain btn--sm" data-cambiar>Cambiar</button>`}</div>` : "";
      inp.classList.toggle("hidden", !!elegido);
      $("[data-cambiar]", m)?.addEventListener("click", () => { elegido = null; pintar(); inp.focus(); });
    };
    pintar();
    let timer;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = inp.value.trim();
        if (q.length < 2) { sug.classList.add("hidden"); return; }
        const rows = await api("GET", "/api/buscar?q=" + encodeURIComponent(q));
        sug.innerHTML = rows.length ? rows.slice(0, 10).map((a) => `<button type="button" data-a='${esc(JSON.stringify({ id: a.id, nombre: a.nombre, especie: a.especie, foto: a.foto, tutor: `${a.tutor_apellido}, ${a.tutor_nombre}` }))}'>
          ${avatar(a.especie, "ava--sm", a.foto)}<span><b>${esc(a.nombre)}</b> <span class="muted">· ${esc(a.tutor_apellido)}, ${esc(a.tutor_nombre)}</span></span></button>`).join("")
          : `<div class="empty" style="padding:12px">Sin resultados</div>`;
        sug.classList.remove("hidden");
      }, 200);
    });
    sug.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      elegido = JSON.parse(b.dataset.a);
      sug.classList.add("hidden");
      inp.value = "";
      pintar();
      $("[name=concepto]", m).focus();
    });
    if (elegido) setTimeout(() => $("[name=concepto]", m).focus(), 40);

    onSubmit($("form", m), async (d) => {
      if (!elegido) throw new Error("Elegí el paciente.");
      const r = await api("POST", "/api/cobros", {
        animal_id: elegido.id, concepto: d.concepto, monto: d.monto, notas: d.notas,
        estado, medio: estado === "pagado" ? medio : null,
      });
      close(m);
      toast(estado === "pagado" ? `Cobro registrado: ${pesos(d.monto)}` : `Cargado a la cuenta: ${pesos(d.monto)}`, "ok");
      alGuardar(r);
    });
  }

  function pagar(c, alGuardar = () => {}) {
    const m = modal({
      title: "Cobrar pendiente",
      body: `<p style="margin:0 0 12px"><b>${esc(c.concepto)}</b> · ${esc(c.animal || c.tutor)} · <b>${pesos(c.monto)}</b></p>
        <form novalidate><div class="field"><span>Medio de pago</span>
          <select name="medio">${opciones(Object.entries(MEDIOS), "efectivo")}</select></div>
          <div class="form-error" role="alert"></div>
          <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--green">${icon("check")}Marcar como pagado</button></div></form>`,
    });
    onSubmit($("form", m), async (d) => {
      const r = await api("POST", `/api/cobros/${c.id}/pagar`, d);
      close(m); toast("Pago registrado", "ok"); alGuardar(r);
    });
  }

  function anular(c, alGuardar = () => {}) {
    const m = modal({
      title: "Anular cobro",
      body: `<p style="margin:0 0 12px">${esc(c.concepto)} · <b>${pesos(c.monto)}</b>. El cobro no se borra: queda registrado como anulado.</p>
        <form novalidate><label class="field"><span>Motivo *</span><input name="motivo" required placeholder="Ej.: monto mal cargado" /></label>
          <div class="form-error" role="alert"></div>
          <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger">Anular</button></div></form>`,
    });
    onSubmit($("form", m), async (d) => {
      const r = await api("POST", `/api/cobros/${c.id}/anular`, d);
      close(m); toast("Cobro anulado"); alGuardar(r);
    });
  }

  const tagEstado = (c) => c.estado === "pagado"
    ? `<span class="tag tag--ok">${esc(MEDIOS[c.medio] || "Pagado")}</span>`
    : c.estado === "pendiente" ? `<span class="tag tag--warn">A cuenta</span>` : `<span class="tag">Anulado</span>`;

  return { nuevo, pagar, anular, tagEstado };
})();
