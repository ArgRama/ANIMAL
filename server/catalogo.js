/* =========================================================================
   ANIMAL — Catálogo de especies (Argentina)
   Todo lo que cambia según el animal vive acá: signos vitales normales,
   razas, plan de vacunación, estudios frecuentes y alertas de fármacos.
   Agregar una especie = agregar una entrada en ESPECIES.

   Plan de vacunas, por vacuna:
     inicio   edad mínima en días para la 1ª dosis
     dosis    cantidad de dosis de la primovacunación
     cada     días entre dosis de la primovacunación
     refuerzo días hasta el refuerzo (null = dosis única)
     sexo     'H' | 'M' si sólo corresponde a un sexo
   gestacion: días promedio (para la fecha probable de parto).
   Valores orientativos: el veterinario siempre puede ajustar la fecha.
   ========================================================================= */

const GRUPOS = [
  { codigo: "pequenos", nombre: "Pequeños animales" },
  { codigo: "exoticos", nombre: "Exóticos" },
  { codigo: "grandes", nombre: "Grandes animales" },
];

const RABIA = (extra = {}) => ({
  codigo: "rabia", nombre: "Antirrábica", previene: "Rabia",
  inicio: 90, dosis: 1, cada: 0, refuerzo: 365, obligatoria: true,
  nota: "Obligatoria desde los 3 meses, revacunación anual (Ley 22.953 y normas de cada jurisdicción).",
  ...extra,
});

const ESTUDIOS_BASE = [
  "Hemograma completo", "Bioquímica sanguínea", "Perfil renal", "Perfil hepático",
  "Análisis de orina", "Coproparasitológico", "Radiografía", "Ecografía abdominal",
  "Citología", "Biopsia / histopatología", "Cultivo y antibiograma",
];

const ALERTA_ROEDORES = [
  { patron: ["amoxicilina", "ampicilina", "penicilina", "clindamicina", "lincomicina", "eritromicina"],
    motivo: "Antibiótico que puede provocar disbiosis y enterotoxemia fatal en esta especie (especialmente por vía oral)." },
];

const RETIRO = {
  patron: ["*"],
  motivo: "Animal de producción: indicar y respetar el período de retiro en carne y leche.",
};

const ESPECIES = {
  /* ---------------- Pequeños animales ---------------- */
  perro: {
    nombre: "Perro", grupo: "pequenos", sigla: "Pe", gestacion: 63,
    signos: { temp: [37.5, 39.2], fc: [60, 140], fr: [10, 30] },
    cc: 9,
    razas: ["Mestizo", "Labrador Retriever", "Golden Retriever", "Caniche", "Bulldog Francés",
      "Bulldog Inglés", "Ovejero Alemán", "Border Collie", "Collie", "Pastor Australiano",
      "Pastor de Shetland", "Beagle", "Boxer", "Dogo Argentino", "Pitbull",
      "American Staffordshire", "Rottweiler", "Schnauzer", "Yorkshire Terrier", "Chihuahua",
      "Shih Tzu", "Maltés", "Cocker Spaniel", "Dachshund", "Pug", "Siberian Husky", "Galgo",
      "Doberman", "Fox Terrier", "Jack Russell Terrier", "Pomerania", "Gran Danés", "Shar Pei",
      "Bichón Frisé", "Weimaraner", "Whippet", "Cimarrón Uruguayo"],
    vacunas: [
      { codigo: "polivalente", nombre: "Polivalente (séxtuple / óctuple)", esencial: true,
        previene: "Moquillo, parvovirus, hepatitis, parainfluenza, leptospirosis, coronavirus",
        inicio: 42, dosis: 3, cada: 21, refuerzo: 365, obligatoria: false,
        nota: "Primovacunación desde los 45 días; refuerzo anual." },
      RABIA(),
      { codigo: "tos", nombre: "Tos de las perreras", previene: "Bordetella bronchiseptica",
        inicio: 56, dosis: 1, cada: 0, refuerzo: 365, obligatoria: false,
        nota: "Recomendada si convive con otros perros (guarderías, paseos, exposiciones)." },
      { codigo: "leish", nombre: "Leishmaniasis", previene: "Leishmania infantum",
        inicio: 180, dosis: 3, cada: 21, refuerzo: 365, obligatoria: false,
        nota: "Zonas endémicas (NEA). Requiere test negativo previo." },
    ],
    desparasitacion: "Interna: cada 15 días hasta los 3 meses, mensual hasta los 6 y luego cada 3 meses. Externa: según producto.",
    estudios: [...ESTUDIOS_BASE, "Test de Ehrlichia / Anaplasma", "Test de Leishmania",
      "Test de Dirofilaria", "Test de parvovirus", "Test de moquillo", "Electrocardiograma",
      "Ecocardiograma", "Raspaje cutáneo"],
    alertas: [
      { patron: ["paracetamol", "acetaminofen", "acetaminofén"], motivo: "Hepatotóxico y metahemoglobinemia en perros: evitar." },
      { patron: ["ibuprofeno", "naproxeno", "diclofenac"], motivo: "AINE humano con alto riesgo de úlcera y falla renal en perros." },
      { patron: ["xilitol"], motivo: "El xilitol provoca hipoglucemia y falla hepática en perros." },
      { patron: ["ivermectina", "loperamida", "emodepside"],
        razas: ["Collie", "Pastor Australiano", "Pastor de Shetland", "Border Collie", "Whippet"],
        motivo: "Raza con posible mutación MDR1: riesgo de neurotoxicidad. Considerar test o alternativa." },
    ],
  },
  gato: {
    nombre: "Gato", grupo: "pequenos", sigla: "Ga", gestacion: 65,
    signos: { temp: [38.1, 39.2], fc: [140, 220], fr: [20, 30] },
    cc: 9,
    razas: ["Mestizo", "Siamés", "Persa", "Maine Coon", "Ragdoll", "Bengalí",
      "Británico de pelo corto", "Sphynx", "Angora turco", "Azul ruso",
      "Exótico de pelo corto", "Scottish Fold", "Abisinio"],
    vacunas: [
      { codigo: "triple", nombre: "Triple felina", esencial: true, previene: "Panleucopenia, rinotraqueítis, calicivirus",
        inicio: 60, dosis: 2, cada: 21, refuerzo: 365, obligatoria: false,
        nota: "Desde los 2 meses; refuerzo anual." },
      RABIA(),
      { codigo: "felv", nombre: "Leucemia felina (FeLV)", previene: "Virus de la leucemia felina",
        inicio: 60, dosis: 2, cada: 21, refuerzo: 365, obligatoria: false,
        nota: "Con test FeLV negativo previo. Recomendada si tiene acceso al exterior." },
    ],
    desparasitacion: "Interna: cada 15 días hasta los 3 meses, luego cada 3 a 6 meses. Externa: usar productos aptos para gatos.",
    estudios: [...ESTUDIOS_BASE, "Test FIV / FeLV", "T4 total", "Toxoplasmosis",
      "Electrocardiograma", "Ecocardiograma", "Raspaje cutáneo"],
    alertas: [
      { patron: ["paracetamol", "acetaminofen", "acetaminofén"], motivo: "Tóxico y potencialmente fatal en gatos: NO usar." },
      { patron: ["permetrina"], motivo: "La permetrina es neurotóxica en gatos: NO usar." },
      { patron: ["ibuprofeno", "naproxeno", "diclofenac"], motivo: "AINE humano tóxico en gatos." },
      { patron: ["aspirina", "acido acetilsalicilico", "ácido acetilsalicílico"], motivo: "Metabolismo felino lento: solo dosis y frecuencia específicas para gatos." },
      { patron: ["enrofloxacina"], motivo: "Más de 5 mg/kg/día: riesgo de degeneración retiniana en gatos." },
      { patron: ["benzocaina", "benzocaína"], motivo: "Puede causar metahemoglobinemia en gatos." },
    ],
  },

  /* ---------------- Exóticos ---------------- */
  conejo: {
    nombre: "Conejo", grupo: "exoticos", sigla: "Co", gestacion: 31,
    signos: { temp: [38.5, 40.0], fc: [130, 325], fr: [30, 60] },
    cc: 5,
    razas: ["Mestizo", "Enano holandés", "Belier (Mini Lop)", "Cabeza de león", "Rex",
      "Angora", "Hotot", "Nueva Zelanda", "Californiano"],
    vacunas: [
      { codigo: "mixo", nombre: "Mixomatosis", previene: "Mixomatosis",
        inicio: 42, dosis: 1, cada: 0, refuerzo: 180, obligatoria: false,
        nota: "Disponibilidad limitada en Argentina: consultar." },
      { codigo: "vhd", nombre: "Enfermedad hemorrágica viral (VHD)", previene: "Calicivirus del conejo",
        inicio: 70, dosis: 1, cada: 0, refuerzo: 365, obligatoria: false,
        nota: "Disponibilidad limitada en Argentina: consultar." },
    ],
    desparasitacion: "Coproparasitológico cada 6 meses y tratar según resultado.",
    estudios: ["Hemograma completo", "Bioquímica sanguínea", "Coproparasitológico",
      "Radiografía dental", "Radiografía", "Ecografía abdominal", "Serología E. cuniculi"],
    alertas: [
      ...ALERTA_ROEDORES,
      { patron: ["fipronil"], motivo: "Fipronil contraindicado en conejos." },
    ],
  },
  huron: {
    nombre: "Hurón", grupo: "exoticos", sigla: "Hu", gestacion: 42,
    signos: { temp: [37.8, 40.0], fc: [200, 400], fr: [33, 36] },
    cc: 5,
    razas: ["Estándar", "Albino", "Angora"],
    vacunas: [
      { codigo: "moquillo", nombre: "Moquillo", esencial: true, previene: "Distemper canino",
        inicio: 56, dosis: 3, cada: 21, refuerzo: 365, obligatoria: false,
        nota: "Usar vacuna apta para hurones." },
      RABIA({ obligatoria: false, nota: "Recomendada, revacunación anual." }),
    ],
    desparasitacion: "Interna cada 3 a 6 meses; prevención de pulgas y dirofilaria según zona.",
    estudios: [...ESTUDIOS_BASE, "Glucemia (insulinoma)", "Perfil hormonal adrenal"],
    alertas: [
      { patron: ["paracetamol", "acetaminofen", "ibuprofeno"], motivo: "Analgésico humano tóxico en hurones." },
    ],
  },
  cobayo: {
    nombre: "Cobayo", grupo: "exoticos", sigla: "Cb", gestacion: 68,
    signos: { temp: [37.2, 39.5], fc: [230, 380], fr: [40, 100] },
    cc: 5,
    razas: ["Americano", "Abisinio", "Peruano", "Teddy", "Skinny"],
    vacunas: [],
    desparasitacion: "Coproparasitológico anual. Requiere aporte diario de vitamina C.",
    estudios: ["Hemograma completo", "Coproparasitológico", "Radiografía", "Radiografía dental", "Ecografía abdominal"],
    alertas: ALERTA_ROEDORES,
  },
  hamster: {
    nombre: "Hámster", grupo: "exoticos", sigla: "Hm", gestacion: 16,
    signos: { temp: [37.0, 38.0], fc: [250, 500], fr: [35, 135] },
    cc: 5,
    razas: ["Sirio (dorado)", "Ruso (Campbell)", "Roborovski", "Chino"],
    vacunas: [],
    desparasitacion: "Según coproparasitológico.",
    estudios: ["Coproparasitológico", "Radiografía", "Raspaje cutáneo"],
    alertas: ALERTA_ROEDORES,
  },
  chinchilla: {
    nombre: "Chinchilla", grupo: "exoticos", sigla: "Ch", gestacion: 111,
    signos: { temp: [37.0, 38.0], fc: [100, 150], fr: [40, 80] },
    cc: 5,
    razas: ["Estándar gris", "Beige", "Ébano", "Blanca"],
    vacunas: [],
    desparasitacion: "Coproparasitológico anual (Giardia).",
    estudios: ["Coproparasitológico", "Radiografía dental", "Radiografía", "Hemograma completo"],
    alertas: ALERTA_ROEDORES,
  },
  ave: {
    nombre: "Ave", grupo: "exoticos", sigla: "Av",
    signos: { temp: [40.0, 42.0], fc: [120, 600], fr: [15, 45] },
    cc: 5,
    razas: ["Canario", "Cotorra", "Loro hablador", "Cacatúa ninfa", "Periquito australiano",
      "Agapornis", "Guacamayo", "Gallina", "Paloma"],
    vacunas: [],
    desparasitacion: "Coproparasitológico cada 6 meses.",
    estudios: ["Sexado por ADN", "PCR Chlamydia psittaci (psitacosis)", "Coproparasitológico",
      "Hemograma completo", "Bioquímica sanguínea", "Radiografía"],
    alertas: [],
    nota: "Pesar en gramos. La FC varía mucho con el tamaño del ave.",
  },
  reptil: {
    nombre: "Reptil", grupo: "exoticos", sigla: "Re",
    signos: null,
    cc: 5,
    razas: ["Tortuga terrestre", "Tortuga acuática", "Iguana", "Serpiente", "Gecko leopardo", "Dragón barbudo"],
    vacunas: [],
    desparasitacion: "Coproparasitológico anual.",
    estudios: ["Coproparasitológico", "Radiografía", "Hemograma completo", "Bioquímica (calcio / fósforo)"],
    alertas: [],
    nota: "Ectotermo: registrar la temperatura del terrario en lugar de la corporal.",
  },

  /* ---------------- Grandes animales ---------------- */
  equino: {
    nombre: "Equino", grupo: "grandes", sigla: "Eq", gestacion: 340,
    signos: { temp: [37.5, 38.5], fc: [28, 44], fr: [8, 16] },
    cc: 9,
    razas: ["Criollo", "Cuarto de milla", "Sangre pura de carrera", "Árabe", "Polo argentino",
      "Silla argentino", "Petiso argentino", "Percherón", "Appaloosa", "Mestizo"],
    vacunas: [
      { codigo: "influenza", nombre: "Influenza equina", esencial: true, previene: "Influenza equina",
        inicio: 180, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false,
        nota: "Caballos de competencia: refuerzo cada 6 meses." },
      { codigo: "encefalo", nombre: "Encefalomielitis equina", esencial: true, previene: "Encefalomielitis del Este y del Oeste",
        inicio: 180, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false,
        nota: "Aplicar antes de la temporada de mosquitos." },
      { codigo: "tetanos", nombre: "Tétanos (toxoide)", esencial: true, previene: "Tétanos",
        inicio: 120, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false, nota: "" },
      { codigo: "rino", nombre: "Rinoneumonitis (EHV-1/4)", previene: "Herpesvirus equino",
        inicio: 120, dosis: 2, cada: 30, refuerzo: 180, obligatoria: false,
        nota: "Yeguas preñadas: meses 5, 7 y 9 de gestación." },
      RABIA({ inicio: 120, obligatoria: false, nota: "Zonas con rabia paresiante." }),
    ],
    desparasitacion: "Según HPG (huevos por gramo); habitualmente cada 3 a 4 meses.",
    estudios: ["Anemia infecciosa equina (test de Coggins)", "Arteritis viral equina",
      "Hemograma completo", "Bioquímica sanguínea", "HPG (huevos por gramo)",
      "Ecografía tendinosa", "Radiografía", "Endoscopía", "Ecografía reproductiva"],
    alertas: [
      { patron: ["monensina", "salinomicina", "lasalocid", "narasina"], motivo: "Ionóforo: altamente tóxico y fatal en equinos." },
      { patron: ["lincomicina", "clindamicina"], motivo: "Riesgo de colitis grave en equinos." },
      { patron: ["tilmicosina"], motivo: "Tilmicosina inyectable puede ser fatal en equinos." },
    ],
    nota: "El certificado negativo de Anemia Infecciosa Equina es requerido por SENASA para el tránsito.",
  },
  bovino: {
    nombre: "Bovino", grupo: "grandes", sigla: "Bo", gestacion: 283, rodeo: true,
    signos: { temp: [38.0, 39.5], fc: [48, 84], fr: [26, 50] },
    cc: 5,
    razas: ["Aberdeen Angus", "Hereford", "Braford", "Brangus", "Holando Argentino", "Jersey",
      "Shorthorn", "Limangus", "Cruza"],
    vacunas: [
      { codigo: "aftosa", nombre: "Fiebre aftosa", previene: "Fiebre aftosa",
        inicio: 90, dosis: 1, cada: 0, refuerzo: 180, obligatoria: true,
        nota: "Plan oficial SENASA: la aplica el ente sanitario local en campañas, según categoría y región." },
      { codigo: "brucelosis", nombre: "Brucelosis (Cepa 19)", previene: "Brucella abortus",
        inicio: 90, dosis: 1, cada: 0, refuerzo: null, obligatoria: true, sexo: "H",
        nota: "Obligatoria en terneras de 3 a 8 meses. Dosis única." },
      { codigo: "carbunclo", nombre: "Carbunclo bacteridiano", previene: "Bacillus anthracis",
        inicio: 180, dosis: 1, cada: 0, refuerzo: 365, obligatoria: false,
        nota: "Anual; obligatoria en algunas provincias." },
      { codigo: "clostridial", nombre: "Clostridiales", esencial: true, previene: "Mancha, gangrena gaseosa, enterotoxemia",
        inicio: 90, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false, nota: "" },
      { codigo: "reproductiva", nombre: "Reproductiva", previene: "IBR, DVB, leptospirosis, campylobacteriosis",
        inicio: 365, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false,
        nota: "Antes del servicio." },
    ],
    desparasitacion: "Según HPG y categoría; respetar períodos de retiro.",
    estudios: ["Brucelosis (BPA / Rosa de Bengala / FPA)", "Tuberculina", "Tricomoniasis (toros)",
      "Campylobacteriosis (toros)", "HPG (huevos por gramo)", "Tacto / ecografía reproductiva",
      "Leucosis bovina", "Serología IBR / DVB", "Hemograma completo"],
    alertas: [RETIRO],
  },
  ovino: {
    nombre: "Ovino", grupo: "grandes", sigla: "Ov", gestacion: 150, rodeo: true,
    signos: { temp: [38.5, 40.0], fc: [70, 90], fr: [16, 34] },
    cc: 5,
    razas: ["Merino", "Corriedale", "Texel", "Hampshire Down", "Pampinta", "Romney Marsh", "Cruza"],
    vacunas: [
      { codigo: "clostridial", nombre: "Clostridiales", esencial: true, previene: "Enterotoxemia, mancha, gangrena, tétanos",
        inicio: 60, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false, nota: "" },
      { codigo: "carbunclo", nombre: "Carbunclo bacteridiano", previene: "Bacillus anthracis",
        inicio: 180, dosis: 1, cada: 0, refuerzo: 365, obligatoria: false, nota: "" },
    ],
    desparasitacion: "Según HPG (control de resistencia antihelmíntica).",
    estudios: ["Brucella ovis (carneros)", "HPG (huevos por gramo)", "Revisión de carneros", "Hemograma completo"],
    alertas: [RETIRO, { patron: ["cobre"], motivo: "Los ovinos son muy sensibles a la intoxicación por cobre." }],
  },
  caprino: {
    nombre: "Caprino", grupo: "grandes", sigla: "Cp", gestacion: 150, rodeo: true,
    signos: { temp: [38.5, 40.5], fc: [70, 90], fr: [15, 30] },
    cc: 5,
    razas: ["Criolla", "Anglo Nubian", "Saanen", "Boer", "Alpina", "Cruza"],
    vacunas: [
      { codigo: "clostridial", nombre: "Clostridiales", esencial: true, previene: "Enterotoxemia, mancha, gangrena, tétanos",
        inicio: 60, dosis: 2, cada: 30, refuerzo: 365, obligatoria: false, nota: "" },
      { codigo: "carbunclo", nombre: "Carbunclo bacteridiano", previene: "Bacillus anthracis",
        inicio: 180, dosis: 1, cada: 0, refuerzo: 365, obligatoria: false, nota: "" },
    ],
    desparasitacion: "Según HPG.",
    estudios: ["Brucelosis", "HPG (huevos por gramo)", "Artritis encefalitis caprina (CAE)"],
    alertas: [RETIRO],
  },
  porcino: {
    nombre: "Porcino", grupo: "grandes", sigla: "Po", gestacion: 114, rodeo: true,
    signos: { temp: [38.7, 39.8], fc: [70, 120], fr: [15, 30] },
    cc: 5,
    razas: ["Large White", "Landrace", "Duroc", "Hampshire", "Pietrain", "Vietnamita", "Cruza"],
    vacunas: [
      { codigo: "erisipela", nombre: "Mal rojo (erisipela)", previene: "Erysipelothrix rhusiopathiae",
        inicio: 60, dosis: 2, cada: 21, refuerzo: 180, obligatoria: false, nota: "" },
      { codigo: "parvo", nombre: "Parvovirus porcino", previene: "Fallas reproductivas",
        inicio: 180, dosis: 2, cada: 21, refuerzo: 180, obligatoria: false, sexo: "H",
        nota: "Reproductoras, antes del servicio." },
      { codigo: "circo", nombre: "Circovirus (PCV2)", previene: "Circovirosis porcina",
        inicio: 21, dosis: 1, cada: 0, refuerzo: null, obligatoria: false, nota: "Lechones." },
      { codigo: "myco", nombre: "Mycoplasma hyopneumoniae", previene: "Neumonía enzoótica",
        inicio: 7, dosis: 1, cada: 0, refuerzo: null, obligatoria: false, nota: "Lechones." },
    ],
    desparasitacion: "Antes del servicio y del parto en reproductoras; lechones al destete.",
    estudios: ["Serología Aujeszky", "Brucelosis porcina", "Coproparasitológico", "Hemograma completo"],
    alertas: [RETIRO],
  },

  /* ---------------- Otro (texto libre) ---------------- */
  otro: {
    nombre: "Otra especie", grupo: "exoticos", sigla: "Ot",
    signos: null, cc: 5, razas: [], vacunas: [], desparasitacion: "", estudios: ESTUDIOS_BASE, alertas: [],
    nota: "Indicar la especie en el campo raza / tipo.",
  },
};

/* ---------- Utilidades de fechas (YYYY-MM-DD, hora local) ---------- */
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const sumarDias = (iso, dias) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const f = new Date(y, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
};
const diasEntre = (a, b) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000);

/* ---------- Estado del plan de vacunación de un animal ----------
   Para cada vacuna del plan de la especie devuelve:
   estado: 'al dia' | 'por vencer' | 'vencida' | 'pendiente' | 'proxima' (aún no tiene edad)
   'dosis única' aplicada -> 'completa'. Una vacuna que no es obligatoria ni
   esencial y nunca se aplicó queda 'opcional' (no genera recordatorios). */
function estadoVacunas(animal, aplicadas) {
  const esp = ESPECIES[animal.especie];
  if (!esp) return [];
  const hoy = hoyISO();
  const edad = animal.fecha_nac ? diasEntre(animal.fecha_nac, hoy) : null;

  return esp.vacunas
    .filter((v) => !v.sexo || !animal.sexo || animal.sexo === "ND" || v.sexo === animal.sexo)
    .map((v) => {
      const dadas = aplicadas
        .filter((a) => a.codigo === v.codigo)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      const base = { codigo: v.codigo, nombre: v.nombre, previene: v.previene, obligatoria: v.obligatoria, esencial: !!v.esencial, nota: v.nota, dosis_aplicadas: dadas.length };

      if (!dadas.length) {
        if (!v.obligatoria && !v.esencial) return { ...base, estado: "opcional", fecha: null };
        if (edad !== null && edad < v.inicio) {
          return { ...base, estado: "proxima", fecha: sumarDias(animal.fecha_nac, v.inicio) };
        }
        return { ...base, estado: "pendiente", fecha: null };
      }
      const ultima = dadas[0];
      const prox = ultima.proxima || proximaSugerida(v, ultima.fecha, dadas.length);
      if (!prox) return { ...base, estado: "completa", fecha: null, ultima: ultima.fecha };
      const faltan = diasEntre(hoy, prox);
      const estado = faltan < 0 ? "vencida" : faltan <= 30 ? "por vencer" : "al dia";
      return { ...base, estado, fecha: prox, ultima: ultima.fecha };
    });
}

// Fecha sugerida para la próxima dosis, sabiendo cuántas lleva (incluida la de `fecha`).
function proximaSugerida(v, fecha, dosisAplicadas) {
  if (dosisAplicadas < v.dosis && v.cada) return sumarDias(fecha, v.cada);
  if (v.refuerzo) return sumarDias(fecha, v.refuerzo);
  return null;
}

/* ---------- Alertas de un fármaco para un animal ---------- */
function alertasFarmaco(animal, producto) {
  const esp = ESPECIES[animal.especie];
  if (!esp || !producto) return [];
  const p = norm(producto);
  return esp.alertas
    .filter((a) => !a.razas || (animal.raza && a.razas.some((r) => norm(r) === norm(animal.raza))))
    .filter((a) => a.patron.includes("*") || a.patron.some((x) => p.includes(norm(x))))
    .map((a) => a.motivo);
}

function norm(s) {
  return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

module.exports = { GRUPOS, ESPECIES, estadoVacunas, proximaSugerida, alertasFarmaco, hoyISO, sumarDias, diasEntre, norm };
