/* =========================================================================
   ANIMAL — Datos de demostración
   npm run seed           carga datos si la base está vacía
   npm run reset          borra todo y vuelve a cargar

   Usuarios demo (contraseña para todos: humanvet1)
     director@humanvet.test      Director
     vet@humanvet.test           Veterinario
     vet2@humanvet.test          Veterinaria
     recepcion@humanvet.test     Recepción
     tutor@humanvet.test         Tutor (ve la libreta de sus animales)
   ========================================================================= */

const { db, one, insert, tx } = require("./db");
const { hashPassword } = require("./auth");
const { ESPECIES, proximaSugerida, hoyISO, sumarDias } = require("./catalogo");

const CLAVE_DEMO = "humanvet1";

function seed() {
  const hoy = hoyISO();
  const d = (n) => sumarDias(hoy, n);
  const pw = hashPassword(CLAVE_DEMO);

  tx(() => {
    insert("clinica", {
      id: 1, nombre: "Veterinaria ANIMAL", direccion: "Av. Colón 1250", ciudad: "Córdoba",
      provincia: "Córdoba", telefono: "351 555-0101", email: "contacto@animal.test", cuit: "30-71234567-8",
    });

    const U = (nombre, apellido, email, rol, matricula = null, tutor_id = null) =>
      insert("usuarios", { nombre, apellido, email, rol, matricula, tutor_id, password_hash: pw });
    const dir = U("Jose", "Santos", "director@humanvet.test", "director", "MP 1842");
    const vet = U("Lucía", "Ferreyra", "vet@humanvet.test", "veterinario", "MP 3310");
    const vet2 = U("Martín", "Aguirre", "vet2@humanvet.test", "veterinario", "MP 2977");
    U("Carla", "Benítez", "recepcion@humanvet.test", "recepcion");

    const T = (apellido, nombre, dni, telefono, ciudad, email = null) =>
      insert("tutores", { apellido, nombre, dni, telefono, ciudad, provincia: "Córdoba", email, direccion: "—" });
    const t1 = T("Gómez", "María Laura", "28456789", "351 612-3344", "Córdoba", "tutor@humanvet.test");
    const t2 = T("Pérez", "Diego Martín", "33456012", "351 622-1100", "Villa Carlos Paz");
    const t3 = T("Rodríguez", "Ana", "30789456", "351 640-9988", "Córdoba");
    const t4 = T("Estancia La Esperanza", "S.A.", "30-70888111-2", "3571 44-2200", "Río Tercero");
    const t5 = T("López", "Martín", "27654321", "351 655-7788", "Córdoba");
    const t6 = T("Díaz", "Valentina", "44567890", "351 677-4455", "Alta Gracia");
    const t7 = T("Romero", "Carlos Alberto", "16890234", "351 688-1212", "Jesús María");

    U("María Laura", "Gómez", "tutor@humanvet.test", "tutor", null, t1);

    const A = (o) => insert("animales", { unidad: "individual", castrado: 0, fallecido: 0, ...o });
    const a = {
      toby: A({ tutor_id: t1, nombre: "Toby", especie: "perro", raza: "Labrador Retriever", sexo: "M", fecha_nac: d(-365 * 4 - 40), color: "Dorado", microchip: "032000012345678", castrado: 1, peso: 31.5, alergias: "Amoxicilina-clavulánico (urticaria)" }),
      mishi: A({ tutor_id: t1, nombre: "Mishi", especie: "gato", raza: "Siamés", sexo: "H", fecha_nac: d(-365 * 2 - 100), color: "Seal point", castrado: 1, peso: 3.9 }),
      luna: A({ tutor_id: t2, nombre: "Luna", especie: "perro", raza: "Border Collie", sexo: "H", fecha_nac: d(-75), color: "Blanco y negro", peso: 6.2 }),
      copo: A({ tutor_id: t3, nombre: "Copo", especie: "conejo", raza: "Belier (Mini Lop)", sexo: "M", fecha_nac: d(-365 - 20), color: "Blanco", peso: 1.8 }),
      paco: A({ tutor_id: t3, nombre: "Paco", especie: "ave", raza: "Loro hablador", sexo: "ND", fecha_nac: d(-365 * 12), color: "Verde", identificacion: "Anillo A-2231", peso: 0.42 }),
      rodeo: A({ tutor_id: t4, nombre: "Rodeo vaquillonas 2025", especie: "bovino", raza: "Aberdeen Angus", sexo: "H", fecha_nac: d(-210), unidad: "rodeo", cantidad: 120, identificacion: "Caravanas 1001–1120" }),
      tormenta: A({ tutor_id: t4, nombre: "Tormenta", especie: "equino", raza: "Criollo", sexo: "H", fecha_nac: d(-365 * 7), color: "Zaino", identificacion: "Marca EL", peso: 430 }),
      rocky: A({ tutor_id: t5, nombre: "Rocky", especie: "perro", raza: "Dogo Argentino", sexo: "M", fecha_nac: d(-365 * 6), color: "Blanco", peso: 44, cronicas: "Dermatitis atópica" }),
      manuela: A({ tutor_id: t6, nombre: "Manuela", especie: "reptil", raza: "Tortuga terrestre", sexo: "ND", fecha_nac: d(-365 * 15), peso: 1.2 }),
      chispa: A({ tutor_id: t6, nombre: "Chispa", especie: "huron", raza: "Estándar", sexo: "H", fecha_nac: d(-365 * 3), castrado: 1, peso: 0.9 }),
      pancho: A({ tutor_id: t7, nombre: "Pancho", especie: "porcino", raza: "Vietnamita", sexo: "M", fecha_nac: d(-365 * 3), castrado: 1, peso: 48 }),
      nala: A({ tutor_id: t7, nombre: "Nala", especie: "gato", raza: "Mestizo", sexo: "H", fecha_nac: d(-365 * 9), peso: 4.6, cronicas: "Enfermedad renal crónica (IRIS 2)" }),
    };

    /* Vacunas: se calcula la próxima con el plan de la especie. */
    const vac = (animal, especie, codigo, fecha, previas, quien, lote) => {
      const v = ESPECIES[especie].vacunas.find((x) => x.codigo === codigo);
      insert("vacunas", {
        animal_id: animal, usuario_id: quien, codigo, nombre: v.nombre, fecha,
        proxima: proximaSugerida(v, fecha, previas + 1), laboratorio: "Lab. demo", lote,
      });
    };
    vac(a.toby, "perro", "polivalente", d(-330), 6, vet, "PV-2291");
    vac(a.toby, "perro", "rabia", d(-400), 3, vet, "RB-1102");          // vencida
    vac(a.mishi, "gato", "triple", d(-120), 3, vet2, "TF-552");
    vac(a.mishi, "gato", "rabia", d(-120), 2, vet2, "RB-1180");
    vac(a.luna, "perro", "polivalente", d(-30), 0, vet, "PV-2410");       // 1ª dosis, la 2ª vencida
    vac(a.rodeo, "bovino", "aftosa", d(-150), 0, dir, "AF-77");
    vac(a.rodeo, "bovino", "brucelosis", d(-100), 0, dir, "C19-310");
    vac(a.rodeo, "bovino", "clostridial", d(-100), 0, dir, "CL-12");
    vac(a.tormenta, "equino", "influenza", d(-200), 4, vet2, "IE-88");
    vac(a.tormenta, "equino", "tetanos", d(-200), 4, vet2, "TT-41");
    vac(a.rocky, "perro", "polivalente", d(-200), 8, vet, "PV-2300");
    vac(a.rocky, "perro", "rabia", d(-200), 5, vet, "RB-1150");
    vac(a.chispa, "huron", "moquillo", d(-340), 4, vet2, "MQ-09");
    vac(a.nala, "gato", "triple", d(-380), 8, vet2, "TF-500");

    const desp = (animal, tipo, producto, fecha, proxima, quien, dosis) =>
      insert("desparasitaciones", { animal_id: animal, usuario_id: quien, tipo, producto, fecha, proxima, dosis });
    desp(a.toby, "interna", "Praziquantel + pirantel + febantel", d(-60), d(30), vet, "1 comp. / 10 kg");
    desp(a.toby, "externa", "Fluralaner", d(-50), d(40), vet, "1 comp. 20–40 kg");
    desp(a.luna, "interna", "Pirantel suspensión", d(-14), d(1), vet, "1 ml / kg");
    desp(a.rodeo, "interna", "Ivermectina 1%", d(-100), d(80), dir, "1 ml / 50 kg");

    const cons = (animal, quien, dias, o) => insert("consultas", { animal_id: animal, usuario_id: quien, fecha: `${d(dias)} 10:30`, ...o });
    cons(a.toby, vet, -330, { motivo: "Control anual y vacunación", temperatura: 38.6, fc: 92, fr: 20, peso: 30.8, condicion_corporal: 5, mucosas: "Rosadas", tllc: "< 2 s", hidratacion: "Normal", examen: "Sin hallazgos de relevancia.", diagnostico: "Paciente sano", tratamiento: "Se aplica polivalente." });
    cons(a.toby, vet, -20, { motivo: "Prurito y otitis", anamnesis: "Se rasca las orejas hace 1 semana.", temperatura: 39.0, fc: 100, fr: 24, peso: 31.5, condicion_corporal: 6, mucosas: "Rosadas", tllc: "< 2 s", hidratacion: "Normal", examen: "Otitis externa bilateral eritematoceruminosa.", diagnostico: "Otitis externa bilateral", tratamiento: "Limpieza ótica y gotas óticas 7 días.", proximo_control: d(2) });
    cons(a.nala, vet2, -45, { motivo: "Control renal", temperatura: 38.4, fc: 180, fr: 26, peso: 4.6, condicion_corporal: 4, mucosas: "Pálidas", tllc: "2 s", hidratacion: "Deshidratación leve (5%)", diagnostico: "Enfermedad renal crónica IRIS 2", tratamiento: "Dieta renal; control en 45 días.", proximo_control: d(0) });
    cons(a.copo, vet2, -10, { motivo: "Sobrecrecimiento dental", temperatura: 39.1, fc: 210, fr: 44, peso: 1.8, condicion_corporal: 3, examen: "Puntas en premolares inferiores.", diagnostico: "Maloclusión dental", tratamiento: "Limado bajo sedación." });
    cons(a.tormenta, vet2, -200, { motivo: "Revisación pre-temporada", temperatura: 37.9, fc: 36, fr: 12, peso: 430, condicion_corporal: 5, diagnostico: "Apto para actividad" });
    cons(a.rocky, vet, -5, { motivo: "Dermatitis", temperatura: 39.6, fc: 120, fr: 28, peso: 44, condicion_corporal: 6, examen: "Eritema en axilas e ingle.", diagnostico: "Dermatitis atópica — reagudización", tratamiento: "Oclacitinib 16 mg c/12 h por 14 días." });

    insert("reproduccion", { animal_id: a.tormenta, usuario_id: vet2, tipo: "servicio", fecha: d(-200), fpp: d(140), notas: "Monta natural (padrillo Criollo)." });
    insert("reproduccion", { animal_id: a.tormenta, usuario_id: vet2, tipo: "gestacion", fecha: d(-160), fpp: d(140), notas: "Confirmada por ecografía transrectal." });

    // Registros monetarios y un pedido de turno desde el portal.
    const cobro = (animal, tutor, quien, dias, hora, concepto, monto, medio, estado = "pagado") => {
      const f = `${d(dias)} ${hora}`;
      insert("cobros", { animal_id: animal, tutor_id: tutor, usuario_id: quien, fecha: f, concepto, monto, medio: estado === "pagado" ? medio : null, estado, pagado_en: estado === "pagado" ? f : null });
    };
    cobro(a.toby, t1, vet, -20, "10:45", "Consulta + gotas óticas", 28000, "mercadopago");
    cobro(a.nala, t7, vet2, -45, "11:10", "Consulta + perfil renal", 42000, "transferencia");
    cobro(a.copo, t3, vet2, -10, "12:00", "Limado dental con sedación", 35000, "efectivo");
    cobro(a.rocky, t5, vet, -5, "17:20", "Consulta dermatológica", 22000, "debito");
    cobro(a.tormenta, t4, vet2, -30, "09:00", "Visita a domicilio + test de Coggins", 60000, "transferencia");
    cobro(a.rodeo, t4, dir, -100, "08:30", "Vacunación de rodeo (120 cab.)", 180000, null, "pendiente");
    cobro(a.mishi, t1, vet2, -3, "18:30", "Control", 15000, null, "pendiente");
    insert("solicitudes", { animal_id: a.mishi, fecha: d(2), franja: "tarde", motivo: "Vacuna anual (triple felina)", usuario_id: null });

    insert("estudios", { animal_id: a.nala, usuario_id: vet2, tipo: "laboratorio", nombre: "Perfil renal", fecha: d(-45), estado: "con resultado", resultado: "Urea 82 mg/dl · Creatinina 2.3 mg/dl · SDMA 21 µg/dl" });
    insert("estudios", { animal_id: a.tormenta, usuario_id: vet2, tipo: "laboratorio", nombre: "Anemia infecciosa equina (test de Coggins)", fecha: d(-30), estado: "con resultado", resultado: "Negativo" });
    insert("estudios", { animal_id: a.toby, usuario_id: vet, tipo: "laboratorio", nombre: "Citología ótica", fecha: d(-20), estado: "solicitado" });
    insert("practicas", { animal_id: a.copo, usuario_id: vet2, tipo: "practica", nombre: "Limado dental", fecha: d(-10), anestesia: "Sedación (midazolam + butorfanol)", descripcion: "Limado de puntas en premolares inferiores." });
    insert("practicas", { animal_id: a.mishi, usuario_id: vet2, tipo: "cirugia", nombre: "Ovariohisterectomía", fecha: d(-500), anestesia: "General inhalatoria", descripcion: "Sin complicaciones." });

    insert("recetas", {
      animal_id: a.toby, usuario_id: vet, fecha: d(-20), diagnostico: "Otitis externa bilateral",
      indicaciones: "Limpiar el oído antes de cada aplicación. Volver a control en 15 días.",
      items: JSON.stringify([
        { producto: "Limpiador ótico", presentacion: "Frasco 120 ml", dosis: "Llenar el conducto", via: "Ótica", frecuencia: "Cada 48 h", duracion: "14 días", cantidad: "1" },
        { producto: "Gotas óticas (gentamicina + betametasona + clotrimazol)", presentacion: "Frasco 15 ml", dosis: "5 gotas", via: "Ótica", frecuencia: "Cada 12 h", duracion: "7 días", cantidad: "1" },
      ]),
      controlada: 0,
    });

    const tur = (animal, quien, dias, hora, tipo, estado = "pendiente", notas = null) =>
      insert("turnos", { animal_id: animal, vet_id: quien, fecha: d(dias), hora, duracion: 30, tipo, estado, notas, creado_por: dir });
    tur(a.nala, vet2, 0, "09:30", "control", "confirmado", "Control renal");
    tur(a.toby, vet, 0, "10:00", "vacunacion", "en sala", "Antirrábica vencida");
    tur(a.luna, vet, 0, "11:00", "vacunacion", "pendiente", "2ª dosis polivalente");
    tur(a.rocky, vet, 0, "16:30", "control", "pendiente");
    tur(a.chispa, vet2, 1, "10:30", "vacunacion");
    tur(a.tormenta, vet2, 3, "08:00", "domicilio", "confirmado", "Visita al campo");
    tur(a.mishi, vet2, 6, "18:00", "consulta");
  });
  console.log(`Datos de demostración cargados. Contraseña de los usuarios demo: ${CLAVE_DEMO}`);
}

module.exports = { seed };

if (require.main === module) {
  if (process.argv.includes("--reset")) {
    for (const t of ["solicitudes", "cobros", "avisos", "auditoria", "adjuntos", "reproduccion", "turnos", "recetas", "practicas", "estudios", "desparasitaciones", "vacunas", "consultas", "animales", "sesiones", "usuarios", "tutores", "clinica"]) {
      db.exec(`DELETE FROM ${t}`);
    }
  }
  if (one("SELECT id FROM usuarios LIMIT 1")) console.log("La base ya tiene datos. Usá npm run reset para reiniciarla.");
  else seed();
}
