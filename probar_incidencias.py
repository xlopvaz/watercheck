import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/"
PAUSA = 2  # segundos de espera entre peticiones

# Datos de prueba: Castrelo de Miño, red Coto de Novelle
COD_COMUNIDAD = "12"
COD_PROVINCIA = "32"
COD_MUNICIPIO = "32022"
DEN_MUNICIPIO = "CASTRELO DE MIÑO"
ID_RED = "3392"
DEN_RED = "CASTRELO DE MIÑO - COTO DE NOVELLE RED"


def a_texto(respuesta):
    """Convierte la respuesta en texto, probando los dos formatos posibles."""
    try:
        return respuesta.content.decode("utf-8")
    except UnicodeDecodeError:
        return respuesta.content.decode("iso-8859-1")


def limpiar(texto):
    """Quita espacios y saltos de línea sobrantes."""
    return " ".join(texto.split())


def a_numero(texto):
    """Convierte '0,5' o '0.5' en número; si no se puede, devuelve None."""
    try:
        return float(texto.replace(",", "."))
    except ValueError:
        return None


def clasificar(texto):
    """Traduce la calificación del SINAC a una etiqueta simple."""
    t = texto.upper()
    if "NO APTA" in t:
        return "no_apta"
    if "APTA" in t:
        return "apta"
    if "GESTIONADA" in t:
        return "gestionada_por_consejeria"
    return "desconocida"


def leer_boletines(soup):
    """Saca las listas de boletines (control, completo, radiactividad)."""
    tipos = {
        "Análisis de control": "control",
        "Análisis de completo": "completo",
        "Análisis de radiactividad": "radiactividad",
    }
    boletines = []
    for legend in soup.find_all("legend"):
        titulo = limpiar(legend.get_text())
        tipo = None
        for inicio, nombre in tipos.items():
            if titulo.startswith(inicio):
                tipo = nombre
        if tipo is None:
            continue
        tabla = legend.find_next("table")
        for fila in tabla.select("tbody tr"):
            celdas = fila.find_all("td")
            enlace = fila.find("a", href=re.compile(r"verDetalle"))
            if len(celdas) < 2 or enlace is None:
                continue
            id_boletin = re.search(r"verDetalle\((\d+)\)", enlace["href"]).group(1)
            boletines.append({
                "tipo": tipo,
                "fecha": limpiar(celdas[0].get_text()),
                "calificacion": clasificar(celdas[1].get_text()),
                "id_boletin": id_boletin,
            })
    return boletines


# ---------- Lectura del detalle de un boletín ----------

def buscar_legend(soup, inicio):
    """Busca el título (legend) que empieza por ese texto (en minúsculas)."""
    for legend in soup.find_all("legend"):
        if limpiar(legend.get_text()).lower().startswith(inicio):
            return legend
    return None


def dato(soup, etiqueta):
    """Busca una celda con ese texto y devuelve el contenido de la de al lado."""
    celda = soup.find("td", string=lambda t: t and t.strip() == etiqueta)
    if celda is None:
        return None
    vecina = celda.find_next_sibling("td")
    return limpiar(vecina.get_text()) if vecina is not None else None


def leer_parametros(soup, titulo, grupo):
    """Lee una tabla de parámetros (obligatorios u opcionales)."""
    legend = buscar_legend(soup, titulo)
    if legend is None:
        return []
    tabla = legend.find_next("table")
    celdas = tabla.find_all("td")
    resultado = []
    # Las filas vienen mal cerradas, así que leemos las celdas de 3 en 3:
    # nombre, valor, unidad
    for nombre, valor, unidad in zip(celdas[0::3], celdas[1::3], celdas[2::3]):
        # Si el SINAC marca el valor (rojo, etc.), lo hace con una clase
        marcas = [c for c in (valor.get("class") or []) if c != "negrita"]
        resultado.append({
            "grupo": grupo,
            "parametro": limpiar(nombre.get_text()),
            "valor": a_numero(limpiar(valor.get_text())),
            "unidad": limpiar(unidad.get_text()),
            "marca_sinac": marcas[0] if marcas else None,
        })
    return resultado


def leer_boletin(html):
    soup = BeautifulSoup(html, "html.parser")

    calificacion = "desconocida"
    legend = buscar_legend(soup, "calificaci")
    if legend is not None:
        etiqueta = legend.find_next("label")
        if etiqueta is not None:
            calificacion = clasificar(etiqueta.get_text())

    recomendacion = ""
    legend = buscar_legend(soup, "recomendaci")
    if legend is not None:
        recomendacion = limpiar(legend.find_next("table").get_text())

    parametros = (
        leer_parametros(soup, "parametros obligatorios", "obligatorio")
        + leer_parametros(soup, "parametros opcionales", "opcional")
    )

    return {
        "punto_muestreo": dato(soup, "Punto de muestreo"),
        "zona_abastecimiento": dato(soup, "Zona abastecimiento"),
        "fecha_toma": dato(soup, "Fecha de toma"),
        "tipo_boletin": dato(soup, "Tipo de Boletin"),
        "tipo_analisis": dato(soup, "Tipo de analisis"),
        "laboratorio": dato(soup, "Laboratorio/s"),
        "calificacion": calificacion,
        "recomendacion": recomendacion,
        "parametros": parametros,
    }


# ---------- Programa principal ----------

sesion = requests.Session()
sesion.headers.update({
    "User-Agent": "WaterCheck/0.1 (proyecto educativo de Xoel)",
})


def abrir_red():
    """Entra en la red, como hace el navegador (también al pulsar 'Volver')."""
    return sesion.post(BASE + "informacionAbastecimientoActionDetalleRed.do", timeout=30, data={
        "codMunicipio": COD_MUNICIPIO,
        "codProvincia": COD_PROVINCIA,
        "denProvincia": "",
        "denComunidad": "",
        "denMunicipio": DEN_MUNICIPIO,
        "idRed": ID_RED,
        "provinciaMapa": "",
    })


# 1. Camino hasta la red
sesion.get(BASE + "informacionAbastecimientoActionEntrada.do", timeout=30)
time.sleep(PAUSA)
sesion.post(BASE + "informacionRedes.do", timeout=30, data={
    "provinciaMapa": "",
    "codComunidad": COD_COMUNIDAD,
    "codProvincia": COD_PROVINCIA,
    "codMunicipio": COD_MUNICIPIO,
    "method": "Buscar",
})
time.sleep(PAUSA)
r_red = abrir_red()
boletines = leer_boletines(BeautifulSoup(a_texto(r_red), "html.parser"))
print("Boletines en la lista:", len(boletines))

# 2. Elegir qué boletines abrir: todos los NO APTOS + el último completo APTO
a_abrir = [b for b in boletines if b["calificacion"] == "no_apta"]
ultimo_apto = next(
    (b for b in boletines if b["tipo"] == "completo" and b["calificacion"] == "apta"),
    None,
)
if ultimo_apto is not None:
    a_abrir.append(ultimo_apto)
print("Boletines a abrir:", len(a_abrir), "(tarda unos 20 segundos)\n")

# 3. Abrir cada uno y leerlo
detallados = []
for b in a_abrir:
    time.sleep(PAUSA)
    abrir_red()  # volvemos a la red antes de cada boletín
    time.sleep(PAUSA)
    r = sesion.post(BASE + "detalleBoletin.do", timeout=30, data={
        "codMunicipio": COD_MUNICIPIO,
        "codProvincia": COD_PROVINCIA,
        "idBoletin": b["id_boletin"],
        "idRed": ID_RED,
        "denProvincia": "",
        "denComunidad": "",
        "denMunicipio": DEN_MUNICIPIO,
        "denRed": DEN_RED,
        "provinciaMapa": "",
    })
    if r.status_code != 200:
        print(f"Boletín {b['id_boletin']}: error {r.status_code}, lo salto")
        continue

    detalle = leer_boletin(a_texto(r))
    detalle["id_boletin"] = b["id_boletin"]
    detallados.append(detalle)

    obligatorios = sum(1 for p in detalle["parametros"] if p["grupo"] == "obligatorio")
    opcionales = sum(1 for p in detalle["parametros"] if p["grupo"] == "opcional")
    print(f"Boletín {b['id_boletin']} | {detalle['fecha_toma']} | {detalle['calificacion']}")
    print(f"  Punto de muestreo: {detalle['punto_muestreo']} | Laboratorio: {detalle['laboratorio']}")
    print(f"  Parámetros leídos: {obligatorios} obligatorios + {opcionales} opcionales")
    print(f"  Recomendación: {detalle['recomendacion'] or '(vacía)'}")
    marcados = [p for p in detalle["parametros"] if p["marca_sinac"]]
    print("  Valores marcados por el SINAC:")
    for p in marcados:
        print(f"    - {p['parametro']}: {p['valor']} {p['unidad']}  [{p['marca_sinac']}]")