# ANIMAL

Historia clínica veterinaria de consultorio para cualquier especie (pequeños animales, exóticos y grandes animales/producción), con la identidad visual de HUMAN. Pensada para Argentina.

## Cómo iniciarla

Requiere Node.js 22.13 o superior (usa el SQLite integrado de Node, sin instalar base de datos).

```bash
npm install
npm start
```

Abrir http://localhost:3210. La primera vez se cargan datos de demostración.

- `npm run reset` borra todo y vuelve a cargar los datos demo.
- La base es un único archivo: `data/humanvet.db` (hacer copia de seguridad de ese archivo).
- Para usarla desde otras PCs de la red: `HOST=0.0.0.0 npm start` (en producción, detrás de HTTPS y con `NODE_ENV=production`).

## Usuarios demo

Todos con clave `humanvet1` (definidos en `server/seed.js`):

| Email | Rol |
|---|---|
| director@humanvet.test | Director |
| vet@humanvet.test / vet2@humanvet.test | Veterinario/a |
| recepcion@humanvet.test | Recepción |
| tutor@humanvet.test | Tutor (portal de la libreta) |

## Roles

| Rol | Puede |
|---|---|
| Director | Todo, más usuarios del equipo, datos de la clínica y reportes. Puede editar cualquier registro. |
| Veterinario/a | Historia clínica (consultas, vacunas, desparasitaciones, estudios, cirugías, recetas) y turnos. Edita sólo sus propios registros. |
| Recepción | Tutores, animales, turnos, libreta sanitaria. No ve consultas, estudios ni recetas. |
| Tutor | Ve la historia clínica completa y la libreta de sus animales (sólo lectura). Edita sus datos de contacto y los datos básicos y la foto de sus mascotas. El acceso se genera desde la ficha del animal. |

## Qué incluye

- **Registro** tutor → animal en 3 pasos. Rodeo/lote para bovinos, ovinos, caprinos y porcinos. Microchip validado (ISO 11784/11785, 15 dígitos).
- **Catálogo por especie** (`server/catalogo.js`): signos vitales normales, razas, plan de vacunación (dosis, intervalos, refuerzos, obligatorias), estudios frecuentes y alertas de fármacos por especie/raza.
- **Historia clínica**: línea de tiempo y pestañas; signos vitales coloreados si salen del rango normal de la especie; evolución del peso.
- **Plan sanitario automático**: estado de cada vacuna (al día, por vencer, vencida, pendiente, opcional) y próxima dosis sugerida.
- **Recetas** imprimibles con matrícula, alertas de toxicidad por especie (p. ej. paracetamol o permetrina en gatos, MDR1 en collies, ionóforos en equinos), cruce con las alergias registradas y aviso de período de retiro en animales de producción.
- **Agenda** semanal por profesional, control de superposición, estados del turno y recordatorio por WhatsApp.
- **Inicio** con turnos del día, vacunas a recordar y controles próximos.
- **Libreta sanitaria** imprimible y **portal del tutor**.
- **Reportes** para el director.
- **Foto del animal** (desde la cámara del celular o un archivo; se recorta y comprime en el navegador). Las fotos se guardan en `data/fotos/` y sólo las ve el equipo o el tutor del animal.
- **Calculadora de dosis** en la receta (mg/kg × peso → mg y comprimidos/ml) y **Repetir receta**.
- **Certificado de vacunación antirrábica** imprimible, desde la vacuna o la libreta.
- **Buscador rápido** en el encabezado (tecla `/`).
- **Atender desde la agenda**: abre la consulta con el motivo del turno y, al guardarla, marca el turno como atendido.
- **Copia de seguridad** descargable (director → Equipo y clínica). Incluye la base; fotos, adjuntos y documentos del equipo están en `data/fotos/`, `data/adjuntos/` y `data/documentos/`.
- **Adjuntos en estudios**: PDF o imágenes de hasta 8 MB (laboratorio, radiografías, ecografías). Sólo los ve el equipo clínico.
- **Consentimiento informado** imprimible para cada cirugía o práctica, con firma del tutor y del profesional.
- **Recordatorios**: vacunas, desparasitaciones y controles vencidos o próximos (7 a 90 días), con aviso por WhatsApp y marca de "avisado".
- **Reproducción**: celo, servicio, gestación, parto y aborto; fecha probable de parto según la gestación de cada especie y alerta en la ficha.
- **Auditoría** de la historia clínica (pestaña visible para el director): quién dio de alta, modificó o borró cada registro, con el antes y el después.
- **Registros monetarios** (Caja y cobros): cobros por paciente con medio de pago (efectivo, transferencia, débito, crédito, Mercado Pago), cargos "a cuenta" que quedan como deuda del tutor, caja del día / semana / mes, cuentas pendientes y anulación con motivo (nada se borra). El tutor ve su saldo en el portal.
- **Pedidos de turno desde el portal**: el tutor pide día, franja y motivo; recepción lo ve en la Agenda y lo agenda o rechaza con una respuesta.
- **Mi usuario** (perfil del profesional, desde el menú o tocando la foto del encabezado): datos personales (DNI, nacimiento, CUIT, teléfono, email), datos profesionales (matrícula nacional o provincial y colegio), especialidad, ubicación, foto, y documentos: DNI frente y dorso, título, matrícula y **firma** (se sube o se dibuja en pantalla). La firma se imprime en recetas, certificados y consentimientos. DNI, título y matrícula sólo los ven el dueño y el director; el director edita cualquier perfil desde Equipo y clínica.
- **App instalable** (manifest + íconos ANIMAL): "Agregar a pantalla de inicio" en el celular. El modo app completo y la caché sin conexión requieren HTTPS (o localhost).
- **Reporte en Excel** (.xlsx con diseño) desde Reportes: hoja Resumen con indicadores, ingresos por mes y por medio de pago, deuda total y tablas del período, hoja Pacientes (con filtros) y hoja Vacunas a aplicar.
- **Portal del tutor con historia clínica**: el tutor ve toda la historia de sus mascotas (sólo lectura, sin las notas internas del equipo) y puede editar sus datos de contacto y el nombre, raza, color, señas y foto de sus mascotas.

## Estructura

```
server/   index.js (Express) · db.js (esquema SQLite) · auth.js (sesiones, scrypt) · catalogo.js · seed.js · routes/
public/   páginas HTML + css/app.css + js/ (core.js compartido, una página = un script)
data/     humanvet.db (no se versiona)
```

## Pendiente / próximos pasos

- Integración con la **Receta Veterinaria Electrónica (RVE) de SENASA**: hoy la receta se imprime y se avisa que los productos alcanzados deben cargarse también en la plataforma oficial.
- Verificar con la normativa provincial/municipal los esquemas obligatorios (antirrábica, campañas de aftosa, brucelosis) y ajustar `catalogo.js` si hace falta.
- Adjuntar archivos a estudios (imágenes, PDF) y fotos del animal.
