"""Crea los archivos que la web lee al arrancar:

  data/indice.json    lista de concellos para el buscador
  data/no_aptas.json  redes cuyo ultimo analisis es NO APTO y es reciente
  data/ranking.json   concellos con mas analisis no aptos en el ultimo ano
  data/mapa_estado.json  estado de cada concello para colorear el mapa
  data/aguas_no_aptas.xml  RSS con las redes de data/no_aptas.json

Ejecutalo cada vez que cambien los datos (el Action semanal ya lo hace):

    python3 crear_indice.py
"""
import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from email.utils import format_datetime
from pathlib import Path

# Una red aparece en la lista de aguas no aptas si su analisis mas reciente
# fue NO APTO y tiene menos de estos dias.
DIAS_NO_APTA_ACTUAL = 30

# El ranking cuenta los analisis no aptos de estos ultimos dias.
DIAS_RANKING = 365
# Cuantas causas (parametros) se guardan por concello en el ranking.
CAUSAS_RANKING = 3

# Direccion publica de la web, para los enlaces del RSS. Escribela entre las
# comillas (por ejemplo "https://tuusuario.github.io/watercheck/").
# Si la dejas vacia, en GitHub Actions se calcula sola a partir del repositorio.
URL_WEB = "https://xlopvaz.github.io/watercheck/"

# Codigos de provincia (los del INE, que usa tambien el SINAC)
PROVINCIAS = {
    "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
    "05": "Ávila", "06": "Badajoz", "07": "Illes Balears",
    "08": "Barcelona", "09": "Burgos", "10": "Cáceres", "11": "Cádiz",
    "12": "Castellón", "13": "Ciudad Real", "14": "Córdoba",
    "15": "A Coruña", "16": "Cuenca", "17": "Girona", "18": "Granada",
    "19": "Guadalajara", "20": "Gipuzkoa", "21": "Huelva", "22": "Huesca",
    "23": "Jaén", "24": "León", "25": "Lleida", "26": "La Rioja",
    "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia",
    "31": "Navarra", "32": "Ourense", "33": "Asturias", "34": "Palencia",
    "35": "Las Palmas", "36": "Pontevedra", "37": "Salamanca",
    "38": "Santa Cruz de Tenerife", "39": "Cantabria", "40": "Segovia",
    "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel",
    "45": "Toledo", "46": "Valencia", "47": "Valladolid", "48": "Bizkaia",
    "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
}


def parsear_fecha(texto):
    """'15/07/2025 10:15' o '15/07/2025' -> date, o None si no se entiende."""
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", texto or "")
    if not m:
        return None
    try:
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None


def ultimo_analisis(red):
    """El analisis mas reciente de la red que tenga calificacion apta o no apta.

    Si dos analisis caen el mismo dia, gana el no apto (es lo prudente).
    Devuelve (fecha, boletin) o None.
    """
    candidatos = []
    for b in red.get("boletines", []):
        if b.get("calificacion") not in ("apta", "no_apta"):
            continue
        f = parsear_fecha(b.get("fecha"))
        if f is None:
            continue
        candidatos.append((f, b.get("calificacion") == "no_apta", b))
    if not candidatos:
        return None
    f, _, boletin = max(candidatos, key=lambda c: (c[0], c[1]))
    return f, boletin


def redes_no_aptas(datos, hoy):
    """Redes de un concello cuyo ultimo analisis es no apto y es reciente."""
    resultado = []
    for red in datos.get("redes", []):
        ultimo = ultimo_analisis(red)
        if ultimo is None:
            continue
        fecha, boletin = ultimo
        if boletin["calificacion"] != "no_apta":
            continue
        if (hoy - fecha).days > DIAS_NO_APTA_ACTUAL:
            continue

        # Detalle (punto de muestreo y causas), si lo tenemos
        detalle = next(
            (d for d in red.get("boletines_detallados", [])
             if str(d.get("id_boletin")) == str(boletin.get("id_boletin"))),
            None,
        )
        causas = []
        punto = None
        if detalle:
            punto = detalle.get("punto_muestreo")
            for p in detalle.get("parametros", []):
                if p.get("marca_sinac") == "colorNoApta":
                    causas.append({
                        "parametro": p["parametro"],
                        "valor": p.get("valor"),
                        "unidad": p.get("unidad", ""),
                    })

        codigo = datos["codigo"]
        resultado.append({
            "codigo": codigo,
            "concello": datos["nombre"],
            "provincia": PROVINCIAS.get(codigo[:2], ""),
            "id_red": red.get("id_red"),
            "red": red.get("nombre"),
            "fecha": fecha.isoformat(),
            "tipo": boletin.get("tipo"),
            "punto": punto,
            "causas": causas,
        })
    return resultado


def resumen_ranking(datos, hoy):
    """Analisis no aptos del ultimo ano en un concello, o None si no tiene redes.

    Cuenta cada boletin una sola vez aunque aparezca en varias redes.
    """
    redes = datos.get("redes", [])
    if not redes:
        return None
    vistos = set()
    redes_afectadas = 0
    causas = {}
    for red in redes:
        detalles = {
            str(d.get("id_boletin")): d for d in red.get("boletines_detallados", [])
        }
        afectada = False
        for b in red.get("boletines", []):
            if b.get("calificacion") != "no_apta":
                continue
            fecha = parsear_fecha(b.get("fecha"))
            if fecha is None or (hoy - fecha).days > DIAS_RANKING:
                continue
            afectada = True
            id_b = str(b.get("id_boletin"))
            if id_b in vistos:
                continue
            vistos.add(id_b)
            for p in (detalles.get(id_b) or {}).get("parametros", []):
                if p.get("marca_sinac") == "colorNoApta":
                    causas[p["parametro"]] = causas.get(p["parametro"], 0) + 1
        if afectada:
            redes_afectadas += 1
    principales = sorted(causas.items(), key=lambda c: (-c[1], c[0]))
    codigo = datos["codigo"]
    return {
        "codigo": codigo,
        "concello": datos["nombre"],
        "provincia": PROVINCIAS.get(codigo[:2], ""),
        "no_aptas": len(vistos),
        "redes_afectadas": redes_afectadas,
        "redes_total": len(redes),
        "causas": [[nombre, n] for nombre, n in principales[:CAUSAS_RANKING]],
    }


def direccion_web():
    """Direccion publica de la web, o "" si no se sabe."""
    if URL_WEB:
        return URL_WEB.rstrip("/") + "/"
    repositorio = os.environ.get("GITHUB_REPOSITORY", "")  # "usuario/watercheck"
    if "/" in repositorio:
        usuario, nombre = repositorio.split("/", 1)
        return f"https://{usuario.lower()}.github.io/{nombre}/"
    return ""


MINUSCULAS = {"de", "del", "la", "las", "los", "el", "y", "e", "en", "da", "do", "das", "dos"}
SIGLAS = {"ZA", "RD", "EDAR", "ETAP", "ETA", "PM", "CEIP", "IES"}


def bonito(texto):
    """'CASTRELO DE MIÑO' -> 'Castrelo de Miño' (la misma regla que usa la web)."""
    def palabra(m):
        p = m.group(0)
        if p.upper() in SIGLAS or re.fullmatch(r"(?=[IVX])X{0,3}(IX|IV|V?I{0,3})", p.upper()):
            return p.upper()
        if m.start() > 0 and p.lower() in MINUSCULAS:
            return p.lower()
        return p[:1].upper() + p[1:].lower()
    return re.sub(r"\w+", palabra, texto or "")


def nombre_limpio(parametro):
    """'Cloroformo CAS 67-66-3' -> 'Cloroformo'; 'PLA: NA_Ometoato_1113-02-6' -> 'Ometoato'."""
    m = re.match(r"^(PLA|MET|ISO):\s*(?:(?:A|NA)_)?(.+?)_\d[\d-]*", parametro)
    if m:
        return m.group(2).strip()
    sin_cas = re.sub(r"\s*CAS:?\s*[\d-]+\s*$", "", parametro).strip()
    return re.sub(r"^Suma \d+\s+", "", sin_cas)  # "Suma 4 Trihalometanos (THM)" -> "Trihalometanos (THM)"


def crear_rss(redes, web, hoy):
    """RSS 2.0 (en gallego) con las redes cuyo ultimo analisis es no apto."""
    ET.register_namespace("atom", "http://www.w3.org/2005/Atom")
    rss = ET.Element("rss", {"version": "2.0"})
    canal = ET.SubElement(rss, "channel")
    ET.SubElement(canal, "title").text = "WaterCheck: augas non aptas para o consumo"
    ET.SubElement(canal, "link").text = web
    ET.SubElement(canal, "description").text = (
        "Redes de distribución de auga de Galicia cuxa última análise publicada "
        f"no SINAC saíu non apta hai menos de {DIAS_NO_APTA_ACTUAL} días. "
        "Datos do SINAC (Ministerio de Sanidade). Non é un servizo oficial."
    )
    ET.SubElement(canal, "language").text = "gl"
    ET.SubElement(canal, "lastBuildDate").text = format_datetime(
        datetime(hoy.year, hoy.month, hoy.day, 6, 0, tzinfo=timezone.utc)
    )
    ET.SubElement(canal, "{http://www.w3.org/2005/Atom}link", {
        "href": web + "data/aguas_no_aptas.xml",
        "rel": "self", "type": "application/rss+xml",
    })

    for r in redes:
        fecha = date.fromisoformat(r["fecha"])
        causas = ", ".join(nombre_limpio(c["parametro"]) for c in r["causas"])
        concello = bonito(r["concello"])
        item = ET.SubElement(canal, "item")
        ET.SubElement(item, "title").text = (
            f"{concello} ({r['provincia']}): auga non apta"
            + (f" por {causas}" if causas else "")
        )
        ET.SubElement(item, "link").text = f"{web}?m={r['codigo']}"
        partes = [f"Rede: {bonito(r['red'])}.",
                  f"Análise do {fecha.strftime('%d/%m/%Y')}, cualificada como auga non apta."]
        if r.get("punto"):
            partes.append(f"Punto de mostraxe: {bonito(r['punto'])}.")
        if causas:
            partes.append(f"Causa: {causas}.")
        partes.append("Non sempre implica un risco inmediato; a autoridade sanitaria "
                      "valora cada caso. Pode estar xa corrixido: pregunta ao teu concello.")
        ET.SubElement(item, "description").text = " ".join(partes)
        ET.SubElement(item, "guid", {"isPermaLink": "false"}).text = (
            f"watercheck-{r['codigo']}-{r['id_red']}-{r['fecha']}"
        )
        ET.SubElement(item, "pubDate").text = format_datetime(
            datetime(fecha.year, fecha.month, fecha.day, 12, 0, tzinfo=timezone.utc)
        )

    ET.indent(rss)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(rss, encoding="unicode") + "\n"


def main():
    carpeta = Path("data/municipios")
    hoy = date.today()
    indice = []
    no_aptas = []
    ranking = []
    sin_incidencias = {}  # provincia -> concellos sin analisis no aptos
    mapa = {}  # codigo -> [estado, analisis no aptos en el ano, nombre, provincia]

    for archivo in sorted(carpeta.glob("*.json")):
        datos = json.loads(archivo.read_text(encoding="utf-8"))
        codigo = datos["codigo"]
        indice.append({
            "codigo": codigo,
            "nombre": datos["nombre"],
            "provincia": PROVINCIAS.get(codigo[:2], ""),
        })
        actuales = redes_no_aptas(datos, hoy)
        no_aptas.extend(actuales)
        fila = resumen_ranking(datos, hoy)
        if fila is None:
            estado_mapa = "sin_datos"   # el SINAC no publica redes
        elif actuales:
            estado_mapa = "actual"      # alguna red con el ultimo analisis no apto
        elif fila["no_aptas"]:
            estado_mapa = "ano"         # algun analisis no apto en el ultimo ano
        else:
            estado_mapa = "ok"
        mapa[codigo] = [estado_mapa, fila["no_aptas"] if fila else 0,
                        datos["nombre"], PROVINCIAS.get(codigo[:2], "")]
        if fila is not None:
            if fila["no_aptas"]:
                ranking.append(fila)
            else:
                prov = fila["provincia"]
                sin_incidencias[prov] = sin_incidencias.get(prov, 0) + 1

    # Las mas recientes primero; a igualdad de fecha, por concello
    no_aptas.sort(key=lambda r: (r["fecha"], ), reverse=True)

    def guardar(nombre, contenido):
        Path(nombre).write_text(
            json.dumps(contenido, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    guardar("data/indice.json", indice)
    guardar("data/no_aptas.json", {
        "generado": hoy.isoformat(),
        "dias": DIAS_NO_APTA_ACTUAL,
        "redes": no_aptas,
    })

    # Mas analisis no aptos primero; a igualdad, mayor porcentaje de redes
    ranking.sort(key=lambda r: (
        -r["no_aptas"], -r["redes_afectadas"] / r["redes_total"], r["concello"],
    ))
    guardar("data/ranking.json", {
        "generado": hoy.isoformat(),
        "dias": DIAS_RANKING,
        "sin_incidencias": sin_incidencias,
        "concellos": ranking,
    })

    guardar("data/mapa_estado.json", {
        "generado": hoy.isoformat(),
        "dias_actual": DIAS_NO_APTA_ACTUAL,
        "dias_ano": DIAS_RANKING,
        "concellos": mapa,
    })

    print(f"Indice creado con {len(indice)} municipios: data/indice.json")
    print(f"Redes con el ultimo analisis no apto (menos de "
          f"{DIAS_NO_APTA_ACTUAL} dias): {len(no_aptas)} -> data/no_aptas.json")
    for r in no_aptas[:10]:
        causas = ", ".join(c["parametro"] for c in r["causas"]) or "sin causa marcada"
        print(f"  {r['fecha']}  {r['concello']} / {r['red']}  ({causas})")
    if len(no_aptas) > 10:
        print(f"  ... y {len(no_aptas) - 10} mas")
    print(f"Ranking: {len(ranking)} concellos con analisis no aptos en "
          f"{DIAS_RANKING} dias, {sum(sin_incidencias.values())} sin ninguno "
          "-> data/ranking.json")
    cuenta = {}
    for estado_mapa, *_ in mapa.values():
        cuenta[estado_mapa] = cuenta.get(estado_mapa, 0) + 1
    print(f"Mapa: {cuenta} -> data/mapa_estado.json")

    web = direccion_web()
    if web:
        Path("data/aguas_no_aptas.xml").write_text(crear_rss(no_aptas, web, hoy), encoding="utf-8")
        print(f"RSS: {len(no_aptas)} redes -> data/aguas_no_aptas.xml (enlaces a {web})")
    else:
        print("RSS: no se ha creado porque falta la direccion de la web "
              "(escribela en URL_WEB, al principio de este archivo). "
              "En GitHub Actions se crea solo.")
    for r in ranking[:5]:
        print(f"  {r['no_aptas']:>3}  {r['concello']} "
              f"({r['redes_afectadas']} de {r['redes_total']} redes)")


if __name__ == "__main__":
    main()