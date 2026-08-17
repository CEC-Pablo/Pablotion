# Guía rápida: probar Trazo en tu Android

## 1. Compilar el APK

Desde la carpeta `trazo/`, en PowerShell:

```
npx.cmd eas-cli build --profile preview --platform android
```

Usa `npx.cmd`, no `npx`: PowerShell bloquea el shim `.ps1`.

Usa el perfil `preview`, no `development`: preview lleva el JavaScript
dentro y funciona sin el PC. El de development necesita Metro corriendo
y la misma Wi-Fi, y no sirve para dejar el teléfono días esperando.

Tarda entre 10 y 20 minutos. Puedes cerrar la terminal: el build sigue
en la nube.

## 2. Instalar

Al terminar salen un QR y una URL.

1. Escanea el QR con el teléfono (o abre la URL en el navegador del móvil).
2. Descarga el `.apk`.
3. Ábrelo. Android pedirá permiso para instalar de origen desconocido:
   acéptalo.
4. Si Play Protect avisa, elige "Instalar de todas formas". Es normal en
   apps que no vienen de la tienda.

## 3. Primera vez

1. Abre Trazo. Pasa los tres pasos de bienvenida.
2. **Acepta el permiso de notificaciones** cuando lo pida. Sin eso no
   llega nada.
3. En Ajustes de Android, busca Trazo y permite "Alarmas y recordatorios"
   si aparece la opción (Android 12+ la exige para avisos puntuales).

## 4. La prueba corta (5 minutos)

1. Escribe algo en Inicio y envíalo.
2. Toca la fila para abrir la nota.
3. Toca "Recordatorio".
4. Elige hoy, y en Frecuencia deja "Una sola vez".
5. Pulsa "Listo".

Comprueba que la tarjeta "Próxima notificación" mostraba la fecha
correcta antes de confirmar.

## 5. La prueba que importa (4 días)

1. Crea un recordatorio con frecuencia **Diaria**.
2. Marca también "Antes del vencimiento" y elige "1 hora antes".
3. Pulsa "Listo".
4. **Cierra la app del todo** y no la abras.

Debes recibir dos avisos cada día: el previo y el principal. Lo que se
está probando es que el cuarto día siga llegando sin haber abierto la
app nunca. Es el criterio de terminado más duro del proyecto.

## Si algo falla

Necesito el texto del error, no una descripción.

- Si falla el build: los logs quedan guardados en
  https://expo.dev/accounts/pablouu/projects/trazo/builds
- Si falla la app ya instalada: haz captura de la pantalla del error.
- Si no llegan las notificaciones: dime qué versión de Android tienes y
  si el teléfono es Xiaomi, Samsung, Huawei u Oppo — esas marcas matan
  procesos en segundo plano de forma agresiva y hay que darle a Trazo
  permiso de inicio automático.
