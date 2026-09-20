import json
import time
from datetime import date
from pathlib import Path

import sinac

COD_COMUNIDAD = "12"   # Galicia
COD_PROVINCIA = "32"   # Ourense
CUANTOS = 3            # de momento, solo los 3 primeros municipios
VOLVER_A_LA_RED = True # ¿volver a la red antes de cada boletín?

sesion = sinac.nueva_sesion()
municipios = sinac.listar_municipios(sesion, COD_PROVINCIA)
time.sleep(sinac.PAUSA)

carpeta = Path("data/municipios")
carpeta.mkdir(parents=True, exist_ok=True)

for m in municipios[:CUANTOS]:
    cod, nombre = m["codigo"], m["nombre"]
    print(f"\n=== {cod} {nombre} ===")
    archivo = carpeta / f"{cod}.json"

    # Boletines que ya leímos otra vez: no los pedimos de nuevo
    ya_leidos = {}
    if archivo.exists():
        antiguo = json.loads(archivo.read_text(encoding="utf-8"))
        for red in antiguo.get("redes", []):
            for b in red.get("boletines_detallados", []):
                ya_leidos[b["id_boletin"]] = b

    redes_salida = []
    for red in sinac.listar_redes(sesion, COD_COMUNIDAD, COD_PROVINCIA, cod):
        time.sleep(sinac.PAUSA)
        id_red, nom_red = red["id_red"], red["nombre"]
        try:
            html = sinac.abrir_red(sesion, COD_PROVINCIA, cod, nombre, id_red)
            info = sinac.leer_red(html)
        except Exception as error:
            print(f"  {nom_red}: ERROR {error}")
            continue

        detallados = []
        nuevos = 0
        for b in sinac.elegir_boletines(info["boletines"]):
            id_b = b["id_boletin"]
            if id_b in ya_leidos:
                detallados.append(ya_leidos[id_b])
                continue
            time.sleep(sinac.PAUSA)
            if VOLVER_A_LA_RED:
                sinac.abrir_red(sesion, COD_PROVINCIA, cod, nombre, id_red)
                time.sleep(sinac.PAUSA)
            html_b = sinac.abrir_boletin(
                sesion, COD_PROVINCIA, cod, nombre, id_red, nom_red, id_b
            )
            if html_b is None:
                print(f"  boletín {id_b}: no se pudo abrir")
                continue
            detalle = sinac.leer_boletin(html_b)
            detalle["id_boletin"] = id_b
            detallados.append(detalle)
            nuevos += 1

        no_aptos = sum(1 for b in info["boletines"]
                       if b["calificacion"] == "no_apta")
        print(f"  {nom_red}: {len(info['boletines'])} boletines, "
              f"{no_aptos} no aptos, {nuevos} boletines nuevos leídos")

        redes_salida.append({
            "id_red": id_red,
            "nombre": nom_red,
            "localidades": info["localidades"],
            "boletines": info["boletines"],
            "boletines_detallados": detallados,
            "ultimos_valores": info["ultimos_valores"],
        })

    salida = {
        "codigo": cod,
        "nombre": nombre,
        "actualizado": date.today().isoformat(),
        "redes": redes_salida,
    }
    archivo.write_text(
        json.dumps(salida, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"  Guardado en {archivo}")