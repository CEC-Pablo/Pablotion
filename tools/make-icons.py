"""
Genera los iconos de Trazo a partir de los tokens de Nocturne.

La app no usa ni una sola imagen: todo lo visual se construye con color y
forma. El icono sigue el mismo criterio — es el destello del estado vacío de
Inicio, con el anillo que respira, dibujado con las mismas constantes.

Ejecutar:  python tools/make-icons.py
"""

import math
from PIL import Image, ImageDraw

BG = (22, 24, 38, 255)            # --color-bg      #161826
ACCENT = (145, 132, 217, 255)     # --color-accent  #9184d9
RING_OUTER = (41, 43, 49, 255)    # neutral-900     #292b31
RING_INNER = (63, 66, 77, 255)    # neutral-800     #3f424d

SIZE = 1024
SS = 4  # supermuestreo: se dibuja a 4x y se reduce, para bordes limpios


def sparkle_points(cx, cy, radius, sharpness=6.0, steps=720):
    """
    El `sparkle` de Phosphor: cuatro puntas con los lados cóncavos.

    En polares, r(t) = radius / (1 + sharpness * |sin(2t)|) da radio máximo en
    0°, 90°, 180° y 270°, y lo estrangula en las diagonales. Cuanto mayor
    `sharpness`, más afiladas las puntas.
    """
    points = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        r = radius / (1 + sharpness * abs(math.sin(2 * t)))
        points.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    return points


def draw_mark(draw, cx, cy, scale, accent=ACCENT, rings=True):
    """El destello más los dos anillos concéntricos."""
    if rings:
        outer_r = 300 * scale
        draw.ellipse(
            [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
            outline=RING_OUTER,
            width=int(10 * scale),
        )
        inner_r = 232 * scale
        draw.ellipse(
            [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
            outline=RING_INNER,
            width=int(8 * scale),
        )

    draw.polygon(sparkle_points(cx, cy, 168 * scale), fill=accent)


def render(size, *, background, scale, accent=ACCENT, rings=True):
    canvas = size * SS
    image = Image.new('RGBA', (canvas, canvas), background)
    draw = ImageDraw.Draw(image)
    draw_mark(draw, canvas / 2, canvas / 2, scale * SS * size / SIZE,
              accent=accent, rings=rings)
    return image.resize((size, size), Image.LANCZOS)


TRANSPARENT = (0, 0, 0, 0)
WHITE = (255, 255, 255, 255)

outputs = {
    # Icono principal: marca completa sobre el fondo de la app.
    'assets/icon.png': render(SIZE, background=BG, scale=1.0),

    # Adaptativo de Android: el sistema recorta hasta un 33 %, así que la
    # marca se encoge para caber en la zona segura del centro.
    'assets/android-icon-background.png': Image.new('RGBA', (SIZE, SIZE), BG),
    'assets/android-icon-foreground.png': render(
        SIZE, background=TRANSPARENT, scale=0.62
    ),
    # Monocromo (Material You): silueta plana, sin anillos.
    'assets/android-icon-monochrome.png': render(
        SIZE, background=TRANSPARENT, scale=0.62, accent=WHITE, rings=False
    ),

    'assets/splash-icon.png': render(SIZE, background=TRANSPARENT, scale=1.0),
    'assets/favicon.png': render(96, background=BG, scale=1.0),
}

for path, image in outputs.items():
    image.save(path)
    print(f'{path}  {image.size[0]}x{image.size[1]}')
