# Guía de pruebas de Trazo

Todos los comandos se ejecutan desde la carpeta `trazo/`, en PowerShell.
Usa `npx.cmd` y no `npx`: PowerShell bloquea el shim `.ps1`.

## 1. Compilar el APK

```
npx.cmd eas-cli build --profile preview --platform android
```

Perfil `preview`, no `development`. La diferencia importa: `preview` lleva el
JavaScript dentro y funciona como una app normal. `development` es un caparazón
que necesita tu PC encendida y en la misma Wi-Fi, y por eso no sirve para dejar
el teléfono varios días esperando una notificación.

Tarda entre 10 y 20 minutos. Al acabar da un QR y una URL de descarga.

## 2. Instalar en el teléfono

Escanea el QR o abre la URL desde el móvil. Android pedirá permiso para instalar
desde el navegador; acéptalo. Si Play Protect avisa de que la app es
desconocida, elige "Instalar de todas formas": es normal en un APK que no viene
de la tienda.

## 3. Primera apertura

Pasa los tres pasos de bienvenida. Cuando pida permiso de notificaciones,
**acéptalo** — sin eso no se puede probar nada.

En Android 12 o superior, comprueba además las alarmas exactas:
Ajustes del sistema → Aplicaciones → Trazo → Alarmas y recordatorios → permitir.
Sin ese permiso el sistema puede retrasar los avisos.

## 4. Prueba rápida (5 minutos)

1. Escribe `comprar café` y envía. Debe detectarse como **Tarea**.
2. Escribe `reunión mañana` y envía. Debe detectarse como **Recordatorio**.
3. Escribe `idea para la rifa` y envía. Debe quedar como **Nota**.
4. Toca una fila para abrir el editor y entra en "Recordatorio".
5. Elige una hora dentro de 2 o 3 minutos, frecuencia "Una sola vez", y pulsa
   "Listo". La tarjeta de abajo debe mostrar la fecha exacta.
6. **Cierra la app del todo** (deslízala fuera de recientes) y espera.

Si la notificación llega con la app cerrada, lo esencial funciona.

## 5. La prueba larga (4 días)

Es el criterio de terminado más difícil y no hay forma de acelerarlo.

1. Crea un recordatorio con frecuencia **Diaria** a una hora que te venga bien.
2. Marca también "Antes del vencimiento" con "1 hora antes".
3. Cierra la app y **no la abras en cuatro días**.

Debe llegarte cada día el aviso previo y, una hora después, el principal. El
cuarto día es el que importa: prueba que la app programó la serie completa por
adelantado y no solo el primer disparo.

## 6. Qué anotar si algo falla

- Si el fallo es al compilar: la URL del build en
  https://expo.dev/accounts/pablouu/projects/trazo/builds guarda el log completo.
- Si el fallo es con la app ya instalada: el texto de la pantalla de error.
- Si es una notificación que no llega: qué día era, a qué hora debía sonar, y si
  habías abierto la app entremedias.

Ese último dato es el que más ayuda: si la app se abrió, la ventana se repuso, y
entonces la prueba de los cuatro días no cuenta.
