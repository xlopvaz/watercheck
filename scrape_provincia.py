"""Descarga los datos de una provincia entera del SINAC.

Uso (con el entorno activado, dentro de la carpeta del proyecto):

  python3 scrape_provincia.py 32               Ourense entera
  python3 scrape_provincia.py 32 --max 3       solo 3 concellos (prueba)
  python3 scrape_provincia.py 32 --sin-volver  prueba: no vuelve a la red
                                               antes de abrir cada boletin
  python3 scrape_provincia.py 32 --refrescar   vuelve a pedir tambien los
                                               concellos ya descargados

Se puede parar con Ctrl + C y volver a lanzar: los concellos ya
descargados se saltan. Los fallos se apuntan en errores_scraper.log.
"""
import argparse
import json
import time
import traceback
from datetime import date, datetime
from pathlib import Path

import requests

import sinac

CARPETA = Path("data/municipios")
LOG = Path("errores_scraper.log")
FALLOS = Path("fallos")  # aqui se guardan las paginas que no sabemos leer
MAX_FALLOS_SEGUIDOS = 5  # si fallan tantos seguidos, paramos (SINAC caido)

# Comunidad autonoma (codigo del SINAC) de cada provincia (codigo INE).
# Solo la 32 (Ourense) esta comprobada; las demas, sin comprobar todavia.
COMUNIDAD_DE_PROVINCIA = {
    "04": "01", "11": "01", "14": "01", "18": "01",
    "21": "01", "23": "01", "29": "01", "41": "01",
    "22": "02", "44": "02", "50": "02",
    "33": "03", "07": "04", "35": "05", "38": "05", "39": "06",
    "05": "07", "09": "07", "24": "07", "34": "07", "37": "07",
    "40": "07", "42": "07", "47": "07", "49": "07",
    "02": "08", "13": "08", "16": "08", "19": "08", "45": "08",
    "08": "09", "17": "09", "25": "09", "43": "09",
    "03": "10", "12": "10", "46": "10",
    "06": "11", "10": "11",
    "15": "12", "27": "12", "32": "12", "36": "12",
    "28": "13", "30": "14", "31": "15",
    "01": "16", "20": "16", "48": "16",
    "26": "17", "51": "18", "52": "19",
}


def leer_argumentos(argv=None):
    p = argparse.ArgumentParser(description="Descarga una provincia del SINAC")
    p.add_argument("provincia", help="codigo de provincia, p. ej. 32")
    p.add_argument("--comunidad", help="codigo de comunidad (si no, se deduce)")
    p.add_argument("--max", type=int, default=0,
                   help="cuantos concellos pendientes descargar (0 = todos)")
    p.add_argument("--refrescar", action="store_true",
                   help="volver a pedir tambien los ya descargados")
    p.add_argument("--sin-volver", action="store_true",
                   help="no volver a la red antes de cada boletin")
    p.add_argument("--pausa", type=float, default=2.0,
                   help="segundos entre peticiones (por defecto 2)")
    return p.parse_args(argv)


def apuntar_error(codigo, nombre, error):
    linea = f"{datetime.now():%Y-%m-%d %H:%M:%S} {codigo} {nombre}: "
    linea += f"{error.__class__.__name__}: {error}\n"
    detalle = traceback.format_exc()
    if "NoneType: None" not in detalle:
        linea += detalle
    with LOG.open("a", encoding="utf-8") as f:
        f.write(linea)


def guardar_html(nombre, html):
    """Guarda una pagina problematica para poder mirarla despues."""
    FALLOS.mkdir(exist_ok=True)
    (FALLOS / nombre).write_text(html, encoding="utf-8")
    print(f"    (pagina guardada en {FALLOS}/{nombre})", flush=True)


def con_reintentos(funcion, *args, intentos=3):
    """Repite una peticion si falla la red (espera 5 s, luego 15 s)."""
    espera = 5
    for intento in range(1, intentos + 1):
        try:
            return funcion(*args)
        except requests.RequestException as error:
            if intento == intentos:
                raise
            nombre = error.__class__.__name__
            print(f"    fallo de red ({nombre}), reintento en {espera} s")
            time.sleep(espera)
            espera *= 3


def boletines_ya_leidos(archivo):
    """Boletines de una descarga anterior, para no pedirlos otra vez."""
    leidos = {}
    if not archivo.exists():
        return leidos
    antiguo = json.loads(archivo.read_text(encoding="utf-8"))
    for red in antiguo.get("redes", []):
        for b in red.get("boletines_detallados", []):
            leidos[b["id_boletin"]] = b
    return leidos


def descargar_municipio(sesion, cod_comunidad, cod_provincia, municipio,
                        ya_leidos, volver):
    """Descarga un concello. Si algo falla, lanza un error (y no guarda)."""
    cod, nombre = municipio["codigo"], municipio["nombre"]
    redes_salida = []
    nuevos = 0

    redes = con_reintentos(
        sinac.listar_redes, sesion, cod_comunidad, cod_provincia, cod
    )
    for red in redes:
        time.sleep(sinac.PAUSA)
        id_red, nom_red = red["id_red"], red["nombre"]
        html = con_reintentos(
            sinac.abrir_red, sesion, cod_provincia, cod, nombre, id_red
        )
        try:
            info = sinac.leer_red(html)
        except Exception:
            guardar_html(f"red_{id_red}.html", html)
            raise

        detallados = []
        for b in sinac.elegir_boletines(info["boletines"]):
            id_b = b["id_boletin"]
            if id_b in ya_leidos:
                detallados.append(ya_leidos[id_b])
                continue
            time.sleep(sinac.PAUSA)
            if volver:
                con_reintentos(
                    sinac.abrir_red, sesion, cod_provincia, cod, nombre, id_red
                )
                time.sleep(sinac.PAUSA)
            html_b = con_reintentos(
                sinac.abrir_boletin, sesion, cod_provincia, cod, nombre,
                id_red, nom_red, id_b,
            )
            if html_b is None:
                raise RuntimeError(f"no se pudo abrir el boletin {id_b}")
            try:
                detalle = sinac.leer_boletin(html_b)
            except Exception:
                guardar_html(f"boletin_{id_b}.html", html_b)
                raise
            vacio = not detalle["parametros"]
            if vacio or detalle["calificacion"] == "desconocida":
                guardar_html(f"boletin_{id_b}.html", html_b)
                raise RuntimeError(
                    f"el boletin {id_b} llego vacio o ilegible "
                    "(si usas --sin-volver, prueba sin esa opcion)"
                )
            detalle["id_boletin"] = id_b
            detallados.append(detalle)
            nuevos += 1

        redes_salida.append({
            "id_red": id_red,
            "nombre": nom_red,
            "localidades": info["localidades"],
            "boletines": info["boletines"],
            "boletines_detallados": detallados,
            "ultimos_valores": info["ultimos_valores"],
        })

    datos = {
        "codigo": cod,
        "nombre": nombre,
        "actualizado": date.today().isoformat(),
        "redes": redes_salida,
    }
    return datos, nuevos


def guardar(archivo, datos):
    """Guarda en un archivo temporal y lo renombra: nunca queda a medias."""
    temporal = archivo.with_suffix(".tmp")
    temporal.write_text(
        json.dumps(datos, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temporal.replace(archivo)


def formato_tiempo(segundos):
    minutos = int(segundos // 60)
    return f"{minutos // 60} h {minutos % 60:02d} min"


def main(argv=None):
    args = leer_argumentos(argv)
    prov = args.provincia.zfill(2)
    comunidad = args.comunidad or COMUNIDAD_DE_PROVINCIA.get(prov)
    if comunidad is None:
        print(f"No conozco la provincia {prov}. Usa --comunidad.")
        return
    sinac.PAUSA = args.pausa
    volver = not args.sin_volver

    CARPETA.mkdir(parents=True, exist_ok=True)
    if not volver:
        print("Modo --sin-volver: no se vuelve a la red antes de cada boletin.")
    print("Conectando con el SINAC (puede tardar unos segundos)...", flush=True)
    sesion = con_reintentos(sinac.nueva_sesion)
    municipios = con_reintentos(sinac.listar_municipios, sesion, prov)
    if not municipios:
        print(f"El SINAC no devolvio concellos para la provincia {prov}.")
        return

    pendientes = []
    for m in municipios:
        ya_esta = (CARPETA / f"{m['codigo']}.json").exists()
        if args.refrescar or not ya_esta:
            pendientes.append(m)
    saltados = len(municipios) - len(pendientes)
    if args.max:
        pendientes = pendientes[:args.max]

    total = len(pendientes)
    print(f"Provincia {prov}: {len(municipios)} concellos en el SINAC, "
          f"{total} por descargar (ya descargados: {saltados}).", flush=True)

    hechos, fallidos, seguidos = 0, [], 0
    tiempos = []
    inicio_total = time.monotonic()

    try:
        for i, m in enumerate(pendientes, 1):
            cod, nombre = m["codigo"], m["nombre"]
            archivo = CARPETA / f"{cod}.json"
            inicio = time.monotonic()
            print(f"[{i}/{total}] {cod} {nombre}: descargando...", flush=True)
            ya_leidos = boletines_ya_leidos(archivo)
            resultado = None

            for intento in (1, 2):
                try:
                    resultado = descargar_municipio(
                        sesion, args.comunidad or comunidad, prov, m,
                        ya_leidos, volver,
                    )
                    break
                except KeyboardInterrupt:
                    raise
                except Exception as error:
                    apuntar_error(cod, nombre, error)
                    print(f"  fallo en {nombre}: {error}", flush=True)
                    if not isinstance(error, requests.RequestException):
                        break  # no es la red: reintentar no arreglaria nada
                    if intento == 1:
                        print("  espero 30 s, abro sesion nueva y reintento",
                              flush=True)
                        time.sleep(30)
                        sesion = sinac.nueva_sesion()

            if resultado is None:
                fallidos.append(f"{cod} {nombre}")
                seguidos += 1
                print("    -> FALLO (apuntado en el registro)", flush=True)
                if seguidos >= MAX_FALLOS_SEGUIDOS:
                    print(f"\n{MAX_FALLOS_SEGUIDOS} fallos seguidos: paro por "
                          "si el SINAC esta caido. Vuelve a lanzarlo mas "
                          "tarde: seguira donde lo dejo.")
                    break
                continue

            datos, nuevos = resultado
            guardar(archivo, datos)
            seguidos = 0
            hechos += 1
            segundos = time.monotonic() - inicio
            tiempos.append(segundos)
            media = sum(tiempos) / len(tiempos)
            faltan = media * (total - i)
            n_redes = len(datos["redes"])
            print(f"    -> {n_redes} redes, {nuevos} boletines leidos, "
                  f"{segundos:.0f} s (quedan ~{formato_tiempo(faltan)})",
                  flush=True)
    except KeyboardInterrupt:
        print("\nParado con Ctrl + C. Lo hecho esta guardado; "
              "vuelve a lanzarlo para continuar.")

    print(f"\nTerminado en {formato_tiempo(time.monotonic() - inicio_total)}."
          f" Descargados: {hechos}. Fallidos: {len(fallidos)}.")
    for f in fallidos:
        print(f"  - {f}")
    if fallidos:
        print(f"Detalles en {LOG}. Vuelve a lanzar el mismo comando para "
              "reintentarlos.")
    if hechos:
        print("Ahora ejecuta:  python3 crear_indice.py")


if __name__ == "__main__":
    main()