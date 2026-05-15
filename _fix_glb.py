"""
Repara los GLB del prototipo para que las piedras se rendericen como diamantes reales.

Añade materiales PBR con KHR_materials_transmission, KHR_materials_ior y
KHR_materials_volume a los meshes correspondientes y asigna metal al resto.

Backup ya hecho en _backup_glb/.
"""
from pygltflib import GLTF2, Material, PbrMetallicRoughness


def make_diamond():
    m = Material(
        name="Diamond",
        alphaMode="OPAQUE",
        doubleSided=True,
        pbrMetallicRoughness=PbrMetallicRoughness(
            baseColorFactor=[1.0, 1.0, 1.0, 1.0],
            metallicFactor=0.0,
            roughnessFactor=0.0,
        ),
        extensions={
            "KHR_materials_transmission": {"transmissionFactor": 1.0},
            "KHR_materials_ior": {"ior": 2.417},
            "KHR_materials_volume": {
                "thicknessFactor": 0.6,
                "attenuationDistance": 2.0,
                "attenuationColor": [1.0, 1.0, 1.0],
            },
            "KHR_materials_specular": {"specularFactor": 1.0},
        },
    )
    return m


def make_ruby():
    m = Material(
        name="Ruby",
        alphaMode="OPAQUE",
        doubleSided=True,
        pbrMetallicRoughness=PbrMetallicRoughness(
            baseColorFactor=[0.85, 0.05, 0.1, 1.0],
            metallicFactor=0.0,
            roughnessFactor=0.02,
        ),
        extensions={
            "KHR_materials_transmission": {"transmissionFactor": 0.85},
            "KHR_materials_ior": {"ior": 1.77},
            "KHR_materials_volume": {
                "thicknessFactor": 0.5,
                "attenuationDistance": 0.5,
                "attenuationColor": [0.9, 0.1, 0.1],
            },
        },
    )
    return m


def make_metal():
    # Oro blanco 18k rodiado, acabado espejo (alta joyería).
    # F0 alto y rugosidad mínima para un cromado real.
    # specularFactor + specularColor refuerzan el highlight por encima del PBR base.
    m = Material(
        name="Metal",
        alphaMode="OPAQUE",
        pbrMetallicRoughness=PbrMetallicRoughness(
            # Rodio puro tira ligerísimamente al azul-frío; valor casi 1 = máximo
            # reflejo posible en metal PBR.
            baseColorFactor=[0.985, 0.985, 0.995, 1.0],
            metallicFactor=1.0,
            roughnessFactor=0.025,
        ),
        extensions={
            "KHR_materials_specular": {
                "specularFactor": 1.0,
                "specularColorFactor": [1.0, 1.0, 1.0],
            },
        },
    )
    return m


def classify(name: str) -> str:
    if not name:
        return "metal"
    n = name.lower()
    if "rubi" in n or "ruby" in n:
        return "ruby"
    if "piedra" in n or "diam" in n or "gem" in n or "stone" in n:
        return "diamond"
    return "metal"


REQ_EXTS = [
    "KHR_materials_transmission",
    "KHR_materials_ior",
    "KHR_materials_volume",
    "KHR_materials_specular",
]


def fix_glb(path: str):
    print(f"--- {path} ---")
    g = GLTF2().load(path)

    # Estrategia: descartar materiales existentes y crear 3 nuevos limpios,
    # luego asignar a cada primitive por nombre de su mesh.
    diamond_idx = 0
    ruby_idx = 1
    metal_idx = 2
    g.materials = [make_diamond(), make_ruby(), make_metal()]

    # Asegurar extensionsUsed
    used = set(g.extensionsUsed or [])
    for e in REQ_EXTS:
        used.add(e)
    g.extensionsUsed = sorted(used)

    # Recorrer meshes y reasignar material por primitive según nombre del mesh
    for mesh in g.meshes or []:
        kind = classify(mesh.name or "")
        target = {"diamond": diamond_idx, "ruby": ruby_idx, "metal": metal_idx}[kind]
        for prim in mesh.primitives:
            prim.material = target
        print(f"  mesh '{mesh.name}' -> {kind}")

    out = path
    g.save(out)
    print(f"  guardado: {out}")


if __name__ == "__main__":
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    for f in ["anillo1.glb", "anillo2.glb", "anillo3.glb", "anillo4.glb"]:
        fix_glb(os.path.join(base, f))
