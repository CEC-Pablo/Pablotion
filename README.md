# Pablotion

App móvil de captura rápida: anotar una idea, una tarea o un recordatorio en menos de
tres segundos, sin carpetas ni pasos de configuración. Interfaz en español, tema oscuro.

> *"Menos pasos, no menos personalidad."*

Está hecha para el centro de estudiantes de una universidad: gente que anota entre clase
y clase, con el teléfono en una mano, y que no va a organizar nada después. Por eso no
hay carpetas, no hay botón «Guardar» en ninguna pantalla, y escribir «entregar el
formulario mañana» crea un recordatorio sin que haya que decírselo.

## Qué hace

- **Captura en un gesto.** Escribes y envías. Mientras escribes, la app deduce si es una
  nota, una tarea o un recordatorio, y muestra los tres tipos por si se equivoca.
- **Recordatorios que avisan de verdad.** Fecha, hora y frecuencia en una sola pantalla,
  con la próxima notificación a la vista antes de confirmar. Notificaciones locales: sin
  servidor, sin cuenta, sin conexión.
- **Insistencia con freno.** Un recordatorio puede repetirse cada N horas hasta que lo
  marques como hecho, con un botón «Hecho» en la propia notificación.
- **Prioridad y orden.** Lo urgente sube; dentro de cada grupo puedes arrastrar a mano.
- **Etiquetas plegables.** Lo etiquetado se recoge para que entrar a la app no abrume.
- **Calendario** con el mes de un vistazo, integrado con el calendario del teléfono.

## Cómo está hecho

| Capa | Elección |
| --- | --- |
| Runtime | Expo SDK 57 (RN 0.86, React 19.2) — development build, **no** Expo Go |
| Navegación | `expo-router` |
| Estado | `zustand` |
| Animación | `react-native-reanimated` |
| Gestos | `react-native-gesture-handler` |
| Persistencia | `expo-sqlite` — fuente de verdad, sin backend |
| Notificaciones | `expo-notifications`, **locales**, sin FCM ni APNs |
| Calendario | `expo-calendar` |
| Fechas | `date-fns` con locale `es`, siempre en hora local del dispositivo |

**Sin cuenta y sin servidor.** Los datos viven en el teléfono. Es una decisión, no una
carencia: pedir credenciales antes de la primera nota es exactamente la fricción que el
producto ataca.

El sistema visual (color, tipografía, espaciado, radios, animaciones) viene de un paquete
de diseño llamado Nocturne, portado íntegro a `src/theme/tokens.ts`. Ese archivo es la
única fuente de esos valores; no hay colores sueltos por el código. Las referencias `§N`
que aparecen en los comentarios apuntan a las secciones del documento de handoff con el
que se construyó, que no forma parte de este repositorio.

## Puesta en marcha

```bash
npm install
```

Comprobaciones que corren sin dispositivo:

```bash
npm test
```

```bash
npm run typecheck
```

## Compilar para el teléfono

Expo Go no sirve: `expo-notifications` necesita un build nativo. El APK se compila en la
nube con EAS.

```bash
npx eas-cli login
```

```bash
npx eas-cli build --profile preview --platform android
```

EAS devuelve un QR y una URL de descarga. El perfil `development` existe para trabajar
contra el servidor de Metro; `preview` genera un APK autónomo, que es el que hace falta
para probar notificaciones con la app cerrada durante días.

## Arquitectura

```
app/                       rutas de expo-router
  (tabs)/
    index.tsx              Inicio — captura rápida y lista
    tasks.tsx              Tareas con subtareas
    calendar.tsx           Calendario mensual
    search.tsx             Búsqueda instantánea
    tags.tsx               Gestión de etiquetas
  note/[id].tsx            Editor de nota
  reminder/[id].tsx        Creador de recordatorio
  onboarding.tsx           Tres pasos de bienvenida
  settings.tsx             Ajustes
src/
  components/              primitivas del sistema (Checkbox, Toast, FadingRule…)
  features/
    capture/               captura, detección de tipo, orden y agrupación
    reminders/             calendario, frecuencia, motor de recurrencia, vista previa
    calendar/              rejilla mensual, selector de mes/año, alta en un día
  lib/
    db/                    esquema, migraciones y queries de SQLite
    notifications/         programación, cancelación y reposición de la ventana
    calendar/              integración con el calendario del teléfono
    dates.ts               formato y aritmética, todo en hora local
  store/                   zustand
  theme/tokens.ts          la única fuente de color, tamaño, radio y sombra
  types/                   modelo canónico
tools/make-icons.py        genera los iconos desde los mismos tokens
```

### El motor de recurrencia

Es la pieza que más fácilmente produce una app que *parece* funcionar en desarrollo y
falla en producción, así que conviene entenderla antes de tocarla.

Recalcular la siguiente notificación después de cada disparo **no funciona** con
notificaciones locales: cuando la notificación diaria salta con la app terminada no hay
código nuestro corriendo, así que la segunda no llegaría nunca.

En su lugar se programa una **ventana deslizante**: la serie de las próximas ocurrencias,
con un tope global de 56 (iOS solo admite 64 solicitudes pendientes por app). Cuántas
toca a cada regla lo decide `slotsForRule` a partir del intervalo, apuntando a cubrir
unas 72 horas por delante — ocho huecos son ocho días a frecuencia diaria, pero solo 24
horas a tres horas, y ahí es donde más falta hace el margen.

Al volver a primer plano se reconcilia todo: se cancela lo pendiente y se reprograma la
ventana entera. Es un recálculo completo y no un ajuste incremental, a propósito. Cuesta
poco, es idempotente, y hace que reponer tras un cambio de zona horaria o de horario de
verano no necesite código aparte.

`next_trigger_at` en la base es la primera ocurrencia pendiente. Sirve para pintar la UI
y para reponer, **nunca** como mecanismo de disparo.

Las reglas viven en su propia tabla, no embebidas en el ítem. Eso es lo que permite que
un ítem tenga a la vez una regla principal y un aviso previo, y que «diaria + 1 hora
antes» avise antes de *cada* disparo.

### Migraciones

Estrictamente secuenciales y además idempotentes: `CREATE ... IF NOT EXISTS`,
`INSERT OR IGNORE`, los `ALTER` guardados por `PRAGMA table_info`, y cada rama confirma
su `user_version` al terminar. Si una migración falla a medias, el siguiente arranque la
reintenta desde donde estaba en vez de dejar la base en un estado del que solo se sale
desinstalando.

Hay tests que ejecutan el SQL real del archivo contra el SQLite que trae Node, incluida
la instalación limpia y el reintento.

## Qué está verificado y qué no

`npm test` cubre 63 casos de lógica pura, sin dispositivo:

- Las cuatro reglas de detección de tipo, en orden, incluida la precedencia entre ellas.
- La serie de ocurrencias de las cuatro frecuencias, con fechas de vencimiento pasadas.
- Que una regla diaria tiene programado el **cuarto día** sin abrir la app.
- Que una regla cada 3 horas sigue cubierta al tercer día.
- Que 10 recordatorios diarios con aviso previo no superan el límite de iOS.
- Que la hora local se conserva al cruzar un cambio de horario de verano.
- El texto de la vista previa para cada frecuencia y con aviso previo combinado.
- El orden por prioridad, la agrupación por etiqueta y el cálculo del arrastre.
- La cadena de migraciones sobre SQLite real, en limpio y reintentada.
- El parseo de la hora manual («9», «09:05», «21.30») y sus casos inválidos.

También se verifica sin dispositivo que `tsc --noEmit` está limpio, que `expo-doctor`
pasa sus 21 comprobaciones y que `expo export --platform android` empaqueta el bundle.

**Comprobado en dispositivo físico (Android):**

- Las notificaciones llegan con la aplicación **cerrada** y en segundo plano, que era el
  criterio de terminado más duro del proyecto y la razón de todo el diseño del motor de
  recurrencia.
- La integración con el calendario del teléfono: los recordatorios marcados se guardan
  como eventos y los eventos existentes se leen en la pestaña Calendario.

**Lo que sigue sin comprobar de forma sistemática:**

- El comportamiento del pull-to-refresh, del arrastre y de las animaciones bajo uso real.
- La fidelidad de píxel contra el prototipo de diseño.
- El permiso de alarmas exactas en Android 12+ en fabricantes que matan procesos en
  segundo plano de forma agresiva.

## Decisiones que se apartan del diseño original

- **El aviso previo es un checkbox independiente**, no una opción más del grupo de
  frecuencias. En el prototipo eran excluyentes, lo que hacía imposible «diaria + 1 hora
  antes» — que es la combinación más útil de la pantalla.
- **Una etiqueta por ítem**, ocho etiquetas disponibles en total.
- **Inglés en el modelo y la base de datos**, español solo en la capa de presentación.
- **0 = lunes** en `weekly_day`, como el diseño. `Date.getDay()` usa 0 = domingo; la
  conversión ocurre en un único sitio, `src/lib/dates.ts`.
- **Un recordatorio con fecha se completa** como una tarea, y su notificación lleva un
  botón «Hecho». Sin eso, «cada 3 horas» no pararía nunca.
- **La hora tiene entrada manual** además de los cinco atajos del diseño. Los atajos
  siguen siendo el camino rápido; ser el único camino era demasiado limitado.
- La detección de tipo **tolera la falta de acentos**. El diseño ya listaba «avisame»
  junto a «avísame»; normalizar extiende esa cortesía al resto de la lista, y es el mismo
  criterio que ya usaba la búsqueda.
