"""Resume las marcas del SINAC en todos los concellos descargados.

Uso (dentro de la carpeta del proyecto, con el entorno activado):

    python3 resumen_marcas.py

Enseña el resumen en pantalla y lo guarda tambien en marcas_galicia.txt.
Marca con [SIN EXPLICACION] los parametros que app.js todavia no explica.
"""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

CARPETA = Path("data/municipios")
SALIDA = Path("marcas_galicia.txt")
APP = Path("app.js")

archivos = sorted(CARPETA.glob("*.json"))
if not archivos:
    print(f"No hay archivos en {CARPETA}.")
    print("Comprueba que estas en la carpeta del proyecto (watercheck).")
    sys.exit(1)

texto_app = APP.read_text(encoding="utf-8") if APP.exists() else ""

por_calificacion = Counter()
veces = Counter()            # (marca, parametro) -> numero de apariciones
concellos = defaultdict(set)  # (marca, parametro) -> concellos donde sale
clases = Counter()
sin_causa = []
n_concellos = n_redes = n_boletines = 0

for archivo in archivos:
    datos = json.loads(archivo.read_text(encoding="utf-8"))
    n_concellos += 1
    for red in datos.get("redes", []):
        n_redes += 1
        for b in red.get("boletines_detallados", []):
            n_boletines += 1
            calif = b.get("calificacion", "?")
            por_calificacion[calif] += 1
            hay_causa = False
            for p in b.get("parametros", []):
                marca = p.get("marca_sinac")
                if not marca:
                    continue
                clave = (marca, p["parametro"])
                veces[clave] += 1
                concellos[clave].add(datos["nombre"])
                clases[marca] += 1
                if marca == "colorNoApta":
                    hay_causa = True
            if calif == "no_apta" and not hay_causa:
                sin_causa.append((
                    datos["nombre"], red["nombre"],
                    b.get("id_boletin"), b.get("fecha_toma"),
                ))

lineas = []
lineas.append(f"Concellos leidos: {n_concellos} | redes: {n_redes} | "
              f"boletines detallados: {n_boletines}")
lineas.append("")
lineas.append("Boletines por calificacion:")
for calif, n in por_calificacion.most_common():
    lineas.append(f"  {calif}: {n}")
lineas.append("")
lineas.append("Tipos de marca del SINAC:")
for marca, n in clases.most_common():
    lineas.append(f"  {marca}: {n}")
lineas.append("")
lineas.append("Parametros marcados (marca | parametro | veces | concellos):")
for (marca, parametro), n in sorted(
    veces.items(), key=lambda kv: (kv[0][0], -kv[1], kv[0][1])
):
    n_conc = len(concellos[(marca, parametro)])
    falta = "" if f'"{parametro}": {{' in texto_app else "  [SIN EXPLICACION]"
    lineas.append(f"  {marca} | {parametro} | {n} | {n_conc}{falta}")
lineas.append("")
lineas.append(f"Boletines NO APTOS sin ningun valor colorNoApta: {len(sin_causa)}")
for nombre, red, id_b, fecha in sin_causa[:25]:
    lineas.append(f"  {nombre} / {red} / boletin {id_b} / {fecha}")
if len(sin_causa) > 25:
    lineas.append(f"  ... y {len(sin_causa) - 25} mas")

texto = "\n".join(lineas)
SALIDA.write_text(texto + "\n", encoding="utf-8")
print(texto)
print(f"\nGuardado tambien en {SALIDA}")