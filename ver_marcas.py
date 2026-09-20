"""Lista cada valor marcado por el SINAC, ordenado por parametro y valor.

Sirve para ver si hay un umbral entre colorNoConformidad y colorNoApta.
"""
import json
import sys
from pathlib import Path

carpeta = Path(sys.argv[1] if len(sys.argv) > 1 else "data/municipios")

filas = []
for archivo in sorted(carpeta.glob("*.json")):
    datos = json.loads(archivo.read_text(encoding="utf-8"))
    for red in datos["redes"]:
        for b in red["boletines_detallados"]:
            for p in b["parametros"]:
                if not p["marca_sinac"]:
                    continue
                valor = p["valor"]
                filas.append({
                    "parametro": p["parametro"],
                    "marca": p["marca_sinac"],
                    "boletin": b["calificacion"],
                    "valor": valor,
                    "unidad": p["unidad"],
                    "fecha": b.get("fecha_toma"),
                    "punto": b.get("punto_muestreo"),
                    "municipio": datos["nombre"],
                })


def orden(fila):
    valor = fila["valor"] if fila["valor"] is not None else -1
    return (fila["parametro"], valor)


filas.sort(key=orden)

parametro_actual = None
for f in filas:
    if f["parametro"] != parametro_actual:
        parametro_actual = f["parametro"]
        print(f"\n== {parametro_actual} ==")
    marca = f["marca"].replace("color", "")
    print(
        f"  {f['valor']} {f['unidad']} | {marca} | "
        f"boletin {f['boletin']} | {f['fecha']} | "
        f"{f['punto']} | {f['municipio']}"
    )