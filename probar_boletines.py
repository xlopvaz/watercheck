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
ID_BOLETIN_PRUEBA = "16597639"  # el NO APTO del 15/07/2025


def a_texto(respuesta):
    """Convierte la respuesta en texto, probando los dos formatos posibles."""
    try:
        return respuesta.content.decode("utf-8")
    except UnicodeDecodeError:
        return respuesta.content.decode("iso-8859-1")


def limpiar(texto):
    """Quita espacios y saltos de línea sobrantes."""
    return " ".join(texto.split())


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


def leer_ultimos_valores(soup):
    """Saca la tabla 'Últimos valor notificado de los parámetros'."""
    valores = []
    for tabla in soup.find_all("table", class_="tablaCss"):
        cabeceras = [limpiar(th.get_text()) for th in tabla.find_all("th")]
        if len(cabeceras) != 6:  # la tabla que buscamos tiene 6 columnas
            continue
        for fila in tabla.select("tbody tr"):
            celdas = [limpiar(td.get_text()) for td in fila.find_all("td")]
            if len(celdas) != 6:
                continue
            codigo, parametro, valor, unidad, fecha, laboratorio = celdas
            if valor.startswith("Sin datos"):
                continue  # nadie lo ha medido: lo descartamos
            try:
                numero = float(valor.replace(",", "."))
            except ValueError:
                numero = None  # p. ej. color, olor y sabor vienen vacíos
            valores.append({
                "codigo": codigo,
                "parametro": parametro,
                "valor": numero,
                "unidad": unidad,
                "fecha": fecha,
                "laboratorio": laboratorio,
            })
    return valores


sesion = requests.Session()
sesion.headers.update({
    "User-Agent": "WaterCheck/0.1 (proyecto educativo de Xoel)",
})

# 1. Página inicial, lista de redes y detalle de la red
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

r_red = sesion.post(BASE + "informacionAbastecimientoActionDetalleRed.do", timeout=30, data={
    "codMunicipio": COD_MUNICIPIO,
    "codProvincia": COD_PROVINCIA,
    "denProvincia": "",
    "denComunidad": "",
    "denMunicipio": DEN_MUNICIPIO,
    "idRed": ID_RED,
    "provinciaMapa": "",
})
print("Detalle de la red:", r_red.status_code)

# 2. Leer boletines y valores de esa página
soup = BeautifulSoup(a_texto(r_red), "html.parser")
boletines = leer_boletines(soup)
valores = leer_ultimos_valores(soup)

print(f"\nBoletines encontrados: {len(boletines)}")
for b in boletines:
    print(f"  {b['tipo']:<14} {b['fecha']:<17} {b['calificacion']:<26} {b['id_boletin']}")

print(f"\nParámetros con valor: {len(valores)}")
for v in valores[:6]:
    print(f"  {v['parametro']}: {v['valor']} {v['unidad']} ({v['fecha']})")

# 3. Guardar lo extraído como JSON
Path("prueba").mkdir(exist_ok=True)
resultado = {
    "id_red": ID_RED,
    "red": DEN_RED,
    "municipio": DEN_MUNICIPIO,
    "boletines": boletines,
    "ultimos_valores": valores,
}
Path(f"prueba/red_{ID_RED}.json").write_text(
    json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"\nGuardado en prueba/red_{ID_RED}.json")

# 4. Abrir un boletín (el NO APTO del 15/07/2025)
time.sleep(PAUSA)
r_bol = sesion.post(BASE + "detalleBoletin.do", timeout=30, data={
    "codMunicipio": COD_MUNICIPIO,
    "codProvincia": COD_PROVINCIA,
    "idBoletin": ID_BOLETIN_PRUEBA,
    "idRed": ID_RED,
    "denProvincia": "",
    "denComunidad": "",
    "denMunicipio": DEN_MUNICIPIO,
    "denRed": DEN_RED,
    "provinciaMapa": "",
})
print("Detalle del boletín:", r_bol.status_code, "-", len(r_bol.content), "bytes")
Path(f"prueba/boletin_{ID_BOLETIN_PRUEBA}.html").write_text(a_texto(r_bol), encoding="utf-8")
print(f"Guardado en prueba/boletin_{ID_BOLETIN_PRUEBA}.html")