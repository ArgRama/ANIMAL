/* =========================================================================
   ANIMAL — Núcleo del frontend (compartido por todas las pantallas)
   HV.api · HV.init (sesión + header) · HV.modal · HV.toast · formatos · íconos
   ========================================================================= */

// App instalable: el navegador sólo lo permite en HTTPS o localhost.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

const HV = (() => {
  /* ---------- Íconos (trazo, 24x24) ---------- */
  const P = {
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    syringe: '<path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"/>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    scale: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.93-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"/>',
    stetho: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 12 0v-4"/><circle cx="20" cy="10" r="2"/>',
    flask: '<path d="M10 2v7.31M14 9.3V2M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0M5.52 16h12.96"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
    bug: '<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
    msg: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8Z"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 7h7M9 11h5"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01M8 10h.01M12 10h.01M16 10h.01"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    play: '<path d="m6 3 14 9-14 9Z"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  };
  const icon = (n, cls = "ico") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

  /* ---------- Utilidades ---------- */
  const esc = (s) => (s ?? "").toString()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const qs = (k) => new URLSearchParams(location.search).get(k);

  const pad = (n) => String(n).padStart(2, "0");
  const isoDe = (f) => `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
  const hoy = () => isoDe(new Date());
  const ahora = () => { const f = new Date(); return `${hoy()}T${pad(f.getHours())}:${pad(f.getMinutes())}`; };
  const sumarDias = (iso, n) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return isoDe(new Date(y, m - 1, d + n)); };
  const diasEntre = (a, b) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000);
  const fecha = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
  const fechaHora = (iso) => (iso ? `${fecha(iso)} ${iso.slice(11, 16)}`.trim() : "—");
  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaLarga = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const f = new Date(y, m - 1, d);
    return `${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][f.getDay()]} ${d} de ${MESES[m - 1]}`;
  };

  function edad(fnac) {
    if (!fnac) return "Edad desconocida";
    const dias = diasEntre(fnac, hoy());
    if (dias < 0) return "—";
    if (dias < 60) return `${Math.max(dias, 0)} días`;
    const meses = Math.floor(dias / 30.44);
    if (meses < 24) return `${meses} meses`;
    const a = Math.floor(meses / 12), m = meses % 12;
    return m ? `${a} años y ${m} ${m === 1 ? "mes" : "meses"}` : `${a} años`;
  }

  // Montos en pesos argentinos: $ 12.345,50
  const fmtPesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const pesos = (n) => fmtPesos.format(Number(n) || 0);
  const MEDIOS = { efectivo: "Efectivo", transferencia: "Transferencia", debito: "Débito", credito: "Crédito", mercadopago: "Mercado Pago", otro: "Otro" };

  const ROLES = { director: "Director", veterinario: "Veterinario/a", recepcion: "Recepción", tutor: "Tutor" };
  const SEXO = { M: "Macho", H: "Hembra", ND: "Sin determinar" };

  /* ---------- API ---------- */
  async function api(method, url, body) {
    const opt = { method, headers: {}, credentials: "same-origin" };
    if (body !== undefined) {
      opt.headers["Content-Type"] = "application/json";
      opt.body = JSON.stringify(body);
    }
    const res = await fetch(url, opt);
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (res.status === 401 && !url.endsWith("/login")) {
      location.href = "login.html?vuelta=" + encodeURIComponent(location.pathname.slice(1) + location.search);
      throw new Error("Sesión expirada");
    }
    // Pantalla nueva + servidor viejo (no se reinició después de actualizar): avisar una vez.
    if (res.status === 404 && data?.error === "Ruta no encontrada." && !api._avisado) {
      api._avisado = true;
      setTimeout(() => toast("El servidor tiene una versión anterior de ANIMAL: reinicialo (Ctrl + C y npm.cmd start).", "error"), 0);
    }
    if (!res.ok) throw new Error(data?.error || "No se pudo completar la operación.");
    return data;
  }

  /* ---------- Catálogo de especies (cache) ---------- */
  let _cat = null;
  async function catalogo() {
    if (!_cat) _cat = await api("GET", "/api/catalogo");
    return _cat;
  }
  const especie = (codigo) => _cat?.especies[codigo] || { nombre: codigo, sigla: "?", grupo: "pequenos", vacunas: [], razas: [], estudios: [] };
  // Foto del animal si tiene; si no, la sigla de la especie con el color del grupo.
  const avatar = (codigo, extra = "", foto = null) => {
    const e = especie(codigo);
    if (foto) return `<img class="ava ava--foto ${extra}" src="/api/fotos/${encodeURIComponent(foto)}" alt="" title="${esc(e.nombre)}" loading="lazy" />`;
    return `<span class="ava ava--${e.grupo} ${extra}" title="${esc(e.nombre)}">${esc(e.sigla)}</span>`;
  };

  /* ---------- Sesión + header ---------- */
  let me = null;
  const HOME = { tutor: "portal.html" };

  async function init({ roles = null } = {}) {
    try {
      me = await api("GET", "/api/me");
    } catch {
      return new Promise(() => {}); // api() ya redirigió al login
    }
    if (roles && !roles.includes(me.rol)) {
      location.replace(HOME[me.rol] || "index.html");
      return new Promise(() => {});
    }
    renderHeader();
    await catalogo();
    return me;
  }

  function renderHeader() {
    const staff = me.rol !== "tutor";
    const links = staff
      ? [["index.html", "home", "Inicio"], ["buscar.html", "search", "Buscar paciente"], ["registro.html", "userPlus", "Nuevo paciente"], ["turnos.html", "calendar", "Agenda de turnos"], ["recordatorios.html", "msg", "Recordatorios"], ["caja.html", "cash", "Caja y cobros"]]
      : [["portal.html", "book", "Mi libreta"]];
    if (me.rol === "director") links.push(["reportes.html", "chart", "Reportes"], ["usuarios.html", "users", "Equipo y clínica"]);

    const header = document.createElement("header");
    header.className = "app-header";
    header.innerHTML = `
      <div class="app-header__inner">
        <a class="brand" href="${staff ? "index.html" : "portal.html"}">
          <img class="brand__emblema" src="assets/animal-emblema.webp" alt="" />
          <img class="brand__texto" src="assets/animal-texto.webp" alt="ANIMAL" />
        </a>
        ${staff && !location.pathname.endsWith("buscar.html") ? `
        <div class="qsearch" role="search">
          ${icon("search")}
          <input type="search" placeholder="Buscar paciente…" aria-label="Buscar paciente" autocomplete="off" />
          <kbd>/</kbd>
          <div class="dropdown qsearch__res hidden"></div>
        </div>` : ""}
        <div class="app-header__user">
          <span class="app-header__name">${esc(me.rol === "veterinario" || me.rol === "director" ? "Dr/a. " : "")}${esc(me.apellido)} ${esc(me.nombre)}
            <span class="app-header__role">${esc(ROLES[me.rol])}${me.matricula ? " · " + esc(me.matricula) : ""}</span></span>
          ${staff ? `<a class="app-header__avatar" href="perfil.html" title="Mi usuario" aria-label="Mi usuario">${me.tiene_foto
            ? `<img class="app-header__avatar" src="/api/usuarios/${me.id}/foto" alt="" style="border:0;width:100%;height:100%" />`
            : esc((me.nombre[0] || "") + (me.apellido[0] || ""))}</a>` : ""}
          <button class="app-header__menu" type="button" aria-label="Menú" aria-expanded="false"><span></span><span></span><span></span></button>
          <div class="dropdown hidden" role="menu">
            ${links.map(([h, i, t]) => `<a href="${h}" role="menuitem">${icon(i)}${t}</a>`).join("")}
            <hr />
            ${staff ? `<a href="perfil.html" role="menuitem">${icon("users")}Mi usuario</a>` : ""}
            <button type="button" data-act="clave" role="menuitem">${icon("key")}Cambiar contraseña</button>
            <button type="button" data-act="salir" role="menuitem">${icon("logout")}Cerrar sesión</button>
          </div>
        </div>
      </div>`;
    document.body.prepend(header);

    const btn = $(".app-header__menu", header);
    const dd = $('.dropdown[role="menu"]', header); // no confundir con los resultados del buscador
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dd.classList.toggle("hidden");
      btn.setAttribute("aria-expanded", String(!dd.classList.contains("hidden")));
    });
    document.addEventListener("click", () => dd.classList.add("hidden"));
    $('[data-act="salir"]', header).addEventListener("click", async () => {
      await api("POST", "/api/logout", {}).catch(() => {});
      location.href = "login.html";
    });
    $('[data-act="clave"]', header).addEventListener("click", cambiarClave);
    if ($(".qsearch", header)) busquedaRapida($(".qsearch", header));
  }

  /* Buscador del header: resultados al tipear, Enter abre el primero, "/" enfoca. */
  function busquedaRapida(box) {
    const inp = $("input", box), res = $(".qsearch__res", box);
    let timer = null, filas = [], n = 0;
    const cerrar = () => res.classList.add("hidden");
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      const q = inp.value.trim();
      if (q.length < 2) { cerrar(); return; }
      timer = setTimeout(async () => {
        const mio = ++n;
        filas = await api("GET", "/api/buscar?q=" + encodeURIComponent(q)).catch(() => []);
        if (mio !== n) return;
        res.innerHTML = filas.length
          ? filas.slice(0, 6).map((a) => `<a href="animal.html?id=${a.id}">${avatar(a.especie, "ava--sm", a.foto)}
              <span><b>${esc(a.nombre)}</b><span class="qsearch__sub">${esc(a.tutor_apellido)}, ${esc(a.tutor_nombre)} · ${esc(especie(a.especie).nombre)}</span></span></a>`).join("")
            + `<hr /><a href="buscar.html?q=${encodeURIComponent(q)}">${icon("search")}Ver todos los resultados (${filas.length})</a>`
          : `<div class="empty" style="padding:14px">Sin resultados · <a href="registro.html" style="color:var(--blue-600)">registrar paciente</a></div>`;
        res.classList.remove("hidden");
      }, 180);
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { inp.value = ""; cerrar(); inp.blur(); }
      if (e.key === "Enter") {
        e.preventDefault();
        location.href = filas.length === 1 ? `animal.html?id=${filas[0].id}` : `buscar.html?q=${encodeURIComponent(inp.value.trim())}`;
      }
    });
    inp.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", cerrar);
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable && !$(".modal-back")) {
        e.preventDefault();
        inp.focus();
      }
    });
  }

  function cambiarClave() {
    const m = modal({
      title: "Cambiar contraseña",
      body: `<form class="form-grid" style="grid-template-columns:1fr">
          <label class="field"><span>Contraseña actual</span><input name="actual" type="password" required autocomplete="current-password" /></label>
          <label class="field"><span>Nueva contraseña</span><input name="nueva" type="password" minlength="8" required autocomplete="new-password" /><small>Mínimo 8 caracteres.</small></label>
          <div class="form-error"></div>
          <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn">Guardar</button></div>
        </form>`,
    });
    onSubmit($("form", m), async (d) => {
      await api("POST", "/api/me/password", d);
      close(m);
      toast("Contraseña actualizada", "ok");
    });
  }

  /* ---------- Modal ---------- */
  function modal({ title, body, wide = false }) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal ${wide ? "modal--wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal__head"><h2 class="modal__title">${esc(title)}</h2>
          <button class="icon-btn" type="button" data-close aria-label="Cerrar">${icon("x")}</button></div>
        <div class="modal__body">${body}</div></div>`;
    back.addEventListener("mousedown", (e) => { if (e.target === back) close(back); });
    back.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(back); });
    const onKey = (e) => { if (e.key === "Escape") close(back); };
    document.addEventListener("keydown", onKey);
    back._off = () => document.removeEventListener("keydown", onKey);
    document.body.appendChild(back);
    document.body.style.overflow = "hidden";
    setTimeout(() => $("input:not([type=hidden]), select, textarea", back)?.focus(), 30);
    return back;
  }
  function close(back) {
    back._off?.();
    back.remove();
    if (!$(".modal-back")) document.body.style.overflow = "";
  }
  function confirmar(texto, { ok = "Confirmar", peligro = false } = {}) {
    return new Promise((resolve) => {
      const m = modal({
        title: "Confirmar",
        body: `<p style="margin:0 0 4px;line-height:1.5">${esc(texto)}</p>
          <div class="form-actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button>
          <button type="button" class="btn ${peligro ? "btn--danger" : ""}" data-ok>${esc(ok)}</button></div>`,
      });
      $("[data-ok]", m).addEventListener("click", () => { close(m); resolve(true); });
      m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) resolve(false); });
    });
  }

  /* ---------- Toast ---------- */
  function toast(msg, tipo = "") {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = `toast ${tipo ? "toast--" + tipo : ""}`;
    t.setAttribute("role", "status");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  /* ---------- Formularios ---------- */
  function formData(form) {
    const out = {};
    for (const el of form.elements) {
      if (!el.name || el.disabled) continue;
      if (el.type === "checkbox") out[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    }
    return out;
  }
  // Envía el formulario con manejo de errores y botón deshabilitado.
  function onSubmit(form, fn) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $(".form-error", form);
      const btns = $$("button:not([type=button])", form);
      if (err) err.textContent = "";
      btns.forEach((b) => (b.disabled = true));
      try {
        await fn(formData(form), form);
      } catch (ex) {
        if (err) err.textContent = ex.message; else toast(ex.message, "error");
      } finally {
        btns.forEach((b) => (b.disabled = false));
      }
    });
  }
  const opciones = (lista, sel) => lista.map((o) => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(sel ?? "") ? "selected" : ""}>${esc(t)}</option>`;
  }).join("");

  /* ---------- Estados ---------- */
  const ESTADO_VAC = {
    "al dia": ["ok", "Al día"], "por vencer": ["warn", "Por vencer"], vencida: ["danger", "Vencida"],
    pendiente: ["danger", "Pendiente"], proxima: ["info", "Próxima"], completa: ["ok", "Completa"], opcional: ["", "Opcional"],
  };
  const tagVacuna = (estado) => {
    const [c, t] = ESTADO_VAC[estado] || ["", estado];
    return `<span class="tag tag--${c}">${t}</span>`;
  };
  const ESTADO_TURNO = {
    pendiente: "", confirmado: "info", "en sala": "purple", atendido: "ok", ausente: "warn", cancelado: "danger",
  };
  const TIPO_TURNO = { consulta: "Consulta", vacunacion: "Vacunación", control: "Control", cirugia: "Cirugía", estetica: "Baño / estética", domicilio: "A domicilio" };

  // Link a WhatsApp con un mensaje (formato argentino: 549 + número sin 0 ni 15).
  function whatsapp(tel, texto) {
    let n = (tel || "").replace(/\D/g, "");
    if (!n) return null;
    if (n.startsWith("0")) n = n.slice(1);
    if (!n.startsWith("54")) n = "549" + n;
    return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
  }

  return {
    icon, esc, $, $$, qs, hoy, ahora, sumarDias, diasEntre, fecha, fechaHora, fechaLarga, DIAS, MESES, edad,
    ROLES, SEXO, pesos, MEDIOS, api, catalogo, especie, avatar, init, get me() { return me; },
    modal, close, confirmar, toast, formData, onSubmit, opciones, tagVacuna, ESTADO_TURNO, TIPO_TURNO, whatsapp,
  };
})();
