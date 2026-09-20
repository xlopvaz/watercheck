"""Resume que marcas pone el SINAC en los boletines ya descargados.

Sirve para comprobar la hipotesis:
  colorNoApta        -> el valor que causa el NO APTA
  colorNoConformidad -> indicador fuera de rango, sin declarar no apta
"""
import json
import sys
from collections import Counter
from pathlib import Path

carpeta = Path(sys.argv[1] if len(sys.argv) > 1 else "data/municipios")

por_calificacion = Counter()
marcas = Counter()
sin_explicar = []

for archivo in sorted(carpeta.glob("*.json")):
    datos = json.loads(archivo.read_text(encoding="utf-8"))
    for red in datos["redes"]:
        for b in red["boletines_detallados"]:
            calif = b["calificacion"]
            por_calificacion[calif] += 1
            tiene_no_apta = False
            for p in b["parametros"]:
                marca = p["marca_sinac"]
                if not marca:
                    continue
                marcas[(calif, marca, p["parametro"])] += 1
                if marca == "colorNoApta":
                    tiene_no_apta = True
            if calif == "no_apta" and not tiene_no_apta:
                sin_explicar.append(
                    (datos["nombre"], red["nombre"], b["id_boletin"],
                     b["fecha_toma"])
                )

print("Boletines leidos por calificacion:")
for calif, n in por_calificacion.most_common():
    print(f"  {calif}: {n}")

print("\nMarcas del SINAC (calificacion | marca | parametro | veces):")
for (calif, marca, param), n in sorted(marcas.items()):
    print(f"  {calif} | {marca} | {param} | {n}")

print(f"\nBoletines NO APTOS sin ningun valor colorNoApta: "
      f"{len(sin_explicar)}")
for municipio, red, id_b, fecha in sin_explicar:
    print(f"  {municipio} / {red} / boletin {id_b} / {fecha}")