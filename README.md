# Pablotion

App móvil de captura rápida: anotar una idea, una tarea o un recordatorio en menos de
tres segundos, sin carpetas ni pasos de configuración. Interfaz en español, tema oscuro
únicamente.

> *"Menos pasos, no menos personalidad."*

> El proyecto nació como «Trazo» y así se sigue llamando el repositorio, el
> `slug` de EAS (`trazo`) y el identificador de paquete (`org.cec.trazo`).
> Cambiar cualquiera de esos rompería el enlace con el proyecto de EAS o
> convertiría la app en una instalación distinta. Lo que se ve en el teléfono
> es **Pablotion**.

Implementa el handoff unificado (`../handoff-trazo-unificado.md`) sobre el paquete de
diseño Nocturne (`../design_handoff_trazo/`). Las referencias a `§` en los comentarios
del código apuntan a las secciones de ese handoff.

## Stack

| Capa | Elección |
| --- | --- |
| Runtime | Expo SDK 57 (RN 0.86, React 19.2) — development build, **no** Expo Go |
| Navegación | `expo-router` |
| Estado | `zustand` |
| Animación | `react-native-reanimated` |
| Gestos | `react-native-gesture-handler` (pull-to-refresh con resistencia 0.45×) |
| Persistencia | `expo-sqlite` — fuente de verdad, sin backend |
| Notificaciones | `expo-notifications`, **locales**, sin FCM ni APNs |
| Fechas | `date-fns` con locale `es`, siempre en hora local del dispositivo |

La v1 va **sin cuenta**: los datos viven en el dispositivo. Supabase y la sincronización
son fase 2.

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

No se puede usar Expo Go: `expo-notifications` necesita un build nativo. El APK se
compila en la nube con EAS.

```bash
npx eas-cli login
```

```bash
npx eas-cli build --profile development --platform android
```

EAS devuelve una URL de descarga; se instala el APK en el teléfono y luego:

```bash
npx expo start --dev-client
```

Para repartir una versión sin herramientas de desarrollo, usar el perfil `preview`.

## Arquitectura

```
app/                     rutas de expo-router
  (tabs)/                Inicio · Tareas · Buscar · Etiquetas
  note/[id].tsx          NoteEditor
  reminder/[id].tsx      ReminderCreator
  onboarding.tsx         los tres pasos de bienvenida
  settings.tsx
src/
  components/            primitivas del sistema (Checkbox, Toast, FadingRule…)
  features/
    capture/             tarjeta de captura, detección de tipo, estado vacío
    reminders/           calendario, FrequencySelector, motor de recurrencia, preview
  lib/
    db/                  schema, migraciones y queries de SQLite
    notifications/       programación, cancelación y reposición de la ventana
    dates.ts             formato y aritmética, todo en hora local
  store/                 zustand
  theme/tokens.ts        Nocturne portado — única fuente de color, radio y sombra
  types/                 modelo canónico
```

### El motor de recurrencia

Es la pieza que más fácilmente produce una app que *parece* funcionar en desarrollo y
falla en producción, así que conviene entender la estrategia antes de tocarla.

Recalcular la siguiente notificación después de cada disparo **no funciona** con
notificaciones locales: cuando la notificación diaria salta con la app terminada no hay
código nuestro corriendo, así que la segunda no llegaría nunca.

En su lugar se programa una **ventana deslizante**: la serie de las próximas ocurrencias,
con un tope global de 56 (iOS solo admite 64 solicitudes pendientes por app). Cuántas
toca a cada regla lo decide `slotsForRule` a partir del intervalo, apuntando a cubrir
unas 72 horas por delante: ocho huecos son ocho días a frecuencia diaria, pero solo 24
horas a tres horas, y ahí es donde más falta hace el margen. Suelo de 8, techo de 24. Al
volver a primer plano se reconcilia todo — se cancela lo pendiente y se reprograma la
ventana entera. Es un recálculo completo y no un ajuste incremental: cuesta poco, es
idempotente, y hace que reponer tras un cambio de zona horaria o de horario de verano no
necesite código aparte.

`next_trigger_at` en la base es la primera ocurrencia pendiente. Sirve para pintar la UI
y para reponer, **nunca** como mecanismo de disparo.

Las reglas viven en su propia tabla, no embebidas en el ítem. Eso es lo que permite que
un ítem tenga a la vez una regla principal y un aviso previo, y que «diaria + 1 hora
antes» avise antes de *cada* disparo.

## Qué está verificado y qué no

Cubierto por `npm test` (50 casos, lógica pura):

- Las cuatro reglas de detección de tipo, en orden, incluida la precedencia entre ellas.
- La serie de ocurrencias de las cuatro frecuencias, con fechas de vencimiento pasadas.
- Que una regla diaria tiene programado el **cuarto día** sin abrir la app.
- Que 10 recordatorios diarios con aviso previo no superan el límite de iOS.
- Que la hora local se conserva al cruzar un cambio de horario de verano.
- El texto de la vista previa para cada frecuencia y con aviso previo combinado.
- Que una regla cada 3 horas sigue cubierta al tercer día sin abrir la app.
- Que la cadena de migraciones no rompe en una instalación limpia, ejecutando el SQL
  real contra el SQLite de Node, y que reintentarla es inofensiva.
- El parseo de la hora manual («9», «09:05», «21.30») y sus casos inválidos.

Verificado sin dispositivo: `tsc --noEmit` limpio y `expo export --platform android`
empaqueta el bundle completo.

**Sin verificar todavía — requiere un teléfono físico:**

- Que las notificaciones llegan con la app cerrada y en segundo plano.
- El comportamiento real del pull-to-refresh y de las seis animaciones.
- La fidelidad de píxel contra el prototipo.
- El permiso de alarmas exactas en Android 12+.

## Decisiones que se apartan del prototipo

- **El aviso previo es un checkbox independiente**, no la quinta opción de un radio group
  (§3.1). Sin esto, «diaria + 1 hora antes» sería imposible.
- **Una etiqueta por ítem**, seis etiquetas disponibles en total (§3.2).
- **Inglés en el modelo y la base**, español solo en la capa de presentación.
- **0 = lunes** en `weekly_day`, como el diseño. `Date.getDay()` usa 0 = domingo; la
  conversión ocurre en un único sitio, `src/lib/dates.ts`.
- **Un recordatorio con fecha se completa** como una tarea, y su notificación lleva un
  botón «Hecho». Es lo que detiene uno insistente; sin eso, «cada 3 horas» no pararía
  nunca.
- La detección de tipo **tolera la falta de acentos**. El diseño ya listaba «avisame»
  junto a «avísame»; normalizar extiende esa cortesía al resto de la lista, y es el mismo
  criterio que ya usaba la búsqueda.
