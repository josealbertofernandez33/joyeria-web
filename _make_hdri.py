"""
Genera un HDRI equirectangular sintético optimizado para joyería:
- Fondo gris oscuro (no negro puro: las piedras necesarian algo gris suave para
  reflejar y no ser totalmente negras en zonas sin highlight)
- Varias "softboxes" brillantes (rectángulos de luz suave)
- Puntos pequeños MUY brillantes (luces clave que crean los destellos del diamante)

Salida: studio_jewelry.hdr (Radiance RGBE).
"""
import numpy as np
import imageio.v2 as imageio


W, H = 2048, 1024  # equirectangular 2:1


def add_softbox(img, cx, cy, w, h, intensity=8.0, falloff=0.6):
    """Añade una softbox rectangular con bordes suaves."""
    yy, xx = np.mgrid[0:H, 0:W]
    dx = (xx - cx) / (w / 2)
    dy = (yy - cy) / (h / 2)
    d = np.sqrt(dx * dx + dy * dy)
    mask = np.clip(1.0 - d, 0, 1) ** falloff * intensity
    for c in range(3):
        img[:, :, c] += mask


def add_point(img, cx, cy, radius=8, intensity=50.0, color=(1.0, 1.0, 1.0)):
    """Punto brillante (luz clave - genera el sparkle)."""
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    mask = np.exp(-(d ** 2) / (2 * radius ** 2)) * intensity
    for c, col in enumerate(color):
        img[:, :, c] += mask * col


def main():
    # fondo gris muy oscuro pero NO negro (importante para Fresnel)
    img = np.full((H, W, 3), 0.08, dtype=np.float32)

    # 3 softboxes grandes alrededor del modelo (top, front, side)
    add_softbox(img, W * 0.50, H * 0.18, 700, 220, intensity=6.0)   # cenital
    add_softbox(img, W * 0.20, H * 0.45, 500, 320, intensity=4.0)   # izquierda
    add_softbox(img, W * 0.80, H * 0.45, 500, 320, intensity=4.0)   # derecha
    add_softbox(img, W * 0.50, H * 0.75, 800, 200, intensity=2.5)   # rebote inferior suave

    # 8 puntos brillantes distribuidos: los responsables de los destellos
    rng = np.random.default_rng(42)
    for i in range(8):
        cx = rng.integers(int(W * 0.15), int(W * 0.85))
        cy = rng.integers(int(H * 0.15), int(H * 0.55))
        r = rng.integers(4, 10)
        intensity = rng.uniform(40, 90)
        # ligero tinte cálido/frío para realismo
        if i % 2 == 0:
            color = (1.0, 0.98, 0.95)
        else:
            color = (0.95, 0.98, 1.0)
        add_point(img, cx, cy, radius=r, intensity=intensity, color=color)

    # 4 puntos extra concentrados muy brillantes para "fire"
    for i in range(4):
        cx = rng.integers(int(W * 0.25), int(W * 0.75))
        cy = rng.integers(int(H * 0.20), int(H * 0.50))
        add_point(img, cx, cy, radius=3, intensity=150.0)

    img = np.clip(img, 0, None)
    imageio.imwrite("studio_jewelry.hdr", img.astype(np.float32))
    print(f"HDR escrito: max={img.max():.2f} mean={img.mean():.3f}", flush=True)


if __name__ == "__main__":
    main()
