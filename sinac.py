"""Funciones para hablar con el SINAC. Las usan todos los scripts."""
import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/"
ENTRADA = BASE + "informacionAbastecimientoActionEntrada.do"
PAUSA = 2  # segundos de espera entre peticiones
AGENTE = "WaterCheck/0.1 (proyecto educativo de Xoel)"

# Plaguicidas individuales: los omitimos en "ultimos valores"
PREFIJOS_INDIVIDUALES = ("PLA:", "MET:", "ISO:")


# ---------- Utilidades ----------

def a_texto(respuesta):
    """Convierte la respuesta en texto, probando los dos formatos."""
    try:
        return respuesta.content.decode("utf-8")
    except UnicodeDecodeError:
        return respuesta.content.decode("iso-8859-1")


def limpiar(texto):
    """Quita espacios y saltos de linea sobrantes."""
    return " ".join(texto.split())


def a_numero(texto):
    """Convierte '0,5' o '0.5' en numero; si no se puede, None."""
    try:
        return float(texto.replace(",", "."))
    except ValueError:
        return None


def clasificar(texto):
    """Traduce la calificacion del SINAC a una etiqueta simple."""
    t = texto.upper()
    if "NO APTA" in t:
        return "no_apta"
    if "APTA" in t:
        return "apta"
    if "GESTIONADA" in t:
        return "gestionada_por_consejeria"
    return "desconocida"


def lista_de(soup, etiqueta):
    """Busca la celda con ese texto y devuelve los textos de la de al lado."""
    celda = soup.find("td", string=lambda t: t and t.strip() == etiqueta)
    if celda is None:
        return []
    vecina = celda.find_next_sibling("td")
    if vecina is None:
        return []
    return [limpiar(t) for t in vecina.stripped_strings]


def dato(soup, etiqueta):
    """Como lista_de, pero devuelve un solo texto (o None)."""
    valores = lista_de(soup, etiqueta)
    if not valores:
        return None
    return " ".join(valores)


def buscar_legend(soup, inicio):
    """Busca el titulo (legend) que empieza por ese texto en minusculas."""
    for legend in soup.find_all("legend"):
        texto = limpiar(legend.get_text()).lower()
        if texto.startswith(inicio):
            return legend
    return None


# ---------- Navegacion ----------

def nueva_sesion():
    """Abre una sesion con el SINAC (entra por la pagina inicial)."""
    sesion = requests.Session()
    sesion.headers.update({"User-Agent": AGENTE})
    sesion.get(ENTRADA, timeout=30)
    time.sleep(PAUSA)
    return sesion


def listar_municipios(sesion, cod_provincia):
    """Municipios de una provincia: codigo y nombre."""
    r = sesion.post(
        BASE + "cargarComboMunicipiosAction.do",
        data={"id": cod_provincia},
        headers={
            "X-Requested-With": "XMLHttpRequest",
            "Referer": ENTRADA,
        },
        timeout=30,
    )
    soup = BeautifulSoup(a_texto(r), "html.parser")
    municipios = []
    for opcion in soup.find_all("option"):
        codigo = opcion.get("value", "").strip()
        if codigo:
            municipios.append({
                "codigo": codigo,
                "nombre": limpiar(opcion.get_text()),
            })
    return municipios


def listar_redes(sesion, cod_comunidad, cod_provincia, cod_municipio):
    """Redes de distribucion de un municipio."""
    datos = {
        "provinciaMapa": "",
        "codComunidad": cod_comunidad,
        "codProvincia": cod_provincia,
        "codMunicipio": cod_municipio,
        "method": "Buscar",
    }
    r = sesion.post(BASE + "informacionRedes.do", timeout=30, data=datos)
    soup = BeautifulSoup(a_texto(r), "html.parser")
    redes = []
    for enlace in soup.select("table#red a"):
        href = enlace.get("href", "")
        m = re.search(r"eleccionRedDistribucion\((\d+)\)", href)
        if m:
            redes.append({
                "id_red": m.group(1),
                "nombre": limpiar(enlace.get_text()),
            })
    return redes


def abrir_red(sesion, cod_provincia, cod_municipio, nom_municipio, id_red):
    """Entra en una red y devuelve su HTML."""
    datos = {
        "codMunicipio": cod_municipio,
        "codProvincia": cod_provincia,
        "denProvincia": "",
        "denComunidad": "",
        "denMunicipio": nom_municipio,
        "idRed": id_red,
        "provinciaMapa": "",
    }
    url = BASE + "informacionAbastecimientoActionDetalleRed.do"
    r = sesion.post(url, timeout=30, data=datos)
    return a_texto(r)


def abrir_boletin(sesion, cod_provincia, cod_municipio, nom_municipio,
                  id_red, nom_red, id_boletin):
    """Abre un boletin y devuelve su HTML (o None si falla)."""
    datos = {
        "codMunicipio": cod_municipio,
        "codProvincia": cod_provincia,
        "idBoletin": id_boletin,
        "idRed": id_red,
        "denProvincia": "",
        "denComunidad": "",
        "denMunicipio": nom_municipio,
        "denRed": nom_red,
        "provinciaMapa": "",
    }
    r = sesion.post(BASE + "detalleBoletin.do", timeout=30, data=datos)
    if r.status_code != 200:
        return None
    return a_texto(r)


# ---------- Lectura de la pagina de una red ----------

def leer_boletines(soup):
    """Listas de boletines (control, completo, radiactividad)."""
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
            m = re.search(r"verDetalle\((\d+)\)", enlace["href"])
            boletines.append({
                "tipo": tipo,
                "fecha": limpiar(celdas[0].get_text()),
                "calificacion": clasificar(celdas[1].get_text()),
                "id_boletin": m.group(1),
            })
    return boletines


def leer_ultimos_valores(soup):
    """Tabla 'Ultimos valor notificado de los parametros'."""
    valores = []
    for tabla in soup.find_all("table", class_="tablaCss"):
        cabeceras = [limpiar(th.get_text()) for th in tabla.find_all("th")]
        if len(cabeceras) != 6:
            continue
        for fila in tabla.select("tbody tr"):
            celdas = [limpiar(td.get_text()) for td in fila.find_all("td")]
            if len(celdas) != 6:
                continue
            codigo, parametro, valor, unidad, fecha, lab = celdas
            if valor.startswith("Sin datos"):
                continue
            if parametro.startswith(PREFIJOS_INDIVIDUALES):
                continue
            valores.append({
                "codigo": codigo,
                "parametro": parametro,
                "valor": a_numero(valor),
                "unidad": unidad,
                "fecha": fecha,
                "laboratorio": lab,
            })
    return valores


def leer_red(html):
    """Todo lo que nos interesa de la pagina de una red."""
    soup = BeautifulSoup(html, "html.parser")
    return {
        "localidades": lista_de(soup, "Localidades abastecidas"),
        "boletines": leer_boletines(soup),
        "ultimos_valores": leer_ultimos_valores(soup),
    }


def elegir_boletines(boletines):
    """Cuales abrir: los NO APTOS y el ultimo completo APTO."""
    elegidos = []
    for b in boletines:
        if b["calificacion"] == "no_apta":
            elegidos.append(b)
    for b in boletines:
        es_completo = b["tipo"] == "completo"
        es_apto = b["calificacion"] == "apta"
        if es_completo and es_apto:
            elegidos.append(b)
            break
    return elegidos


# ---------- Lectura de un boletin ----------

def leer_parametros(soup, titulo, grupo):
    """Tabla de parametros (obligatorios u opcionales)."""
    legend = buscar_legend(soup, titulo)
    if legend is None:
        return []
    tabla = legend.find_next("table")
    celdas = tabla.find_all("td")
    # Las filas vienen mal cerradas: leemos celdas de 3 en 3
    trios = zip(celdas[0::3], celdas[1::3], celdas[2::3])
    resultado = []
    for nombre, valor, unidad in trios:
        clases = valor.get("class") or []
        marcas = [c for c in clases if c != "negrita"]
        resultado.append({
            "grupo": grupo,
            "parametro": limpiar(nombre.get_text()),
            "valor": a_numero(limpiar(valor.get_text())),
            "unidad": limpiar(unidad.get_text()),
            "marca_sinac": marcas[0] if marcas else None,
        })
    return resultado


def leer_boletin(html):
    """Todo lo que nos interesa de un boletin."""
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
        tabla = legend.find_next("table")
        recomendacion = limpiar(tabla.get_text())

    obligatorios = leer_parametros(
        soup, "parametros obligatorios", "obligatorio"
    )
    opcionales = leer_parametros(
        soup, "parametros opcionales", "opcional"
    )
    return {
        "punto_muestreo": dato(soup, "Punto de muestreo"),
        "zona_abastecimiento": dato(soup, "Zona abastecimiento"),
        "fecha_toma": dato(soup, "Fecha de toma"),
        "tipo_boletin": dato(soup, "Tipo de Boletin"),
        "tipo_analisis": dato(soup, "Tipo de analisis"),
        "laboratorios": lista_de(soup, "Laboratorio/s"),
        "calificacion": calificacion,
        "recomendacion": recomendacion,
        "parametros": obligatorios + opcionales,
    }