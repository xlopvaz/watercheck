"""Crea los archivos que la web lee al arrancar:

  data/indice.json    lista de concellos para el buscador
  data/no_aptas.json  redes cuyo ultimo analisis es NO APTO y es reciente

Ejecutalo cada vez que cambien los datos (el Action semanal ya lo hace):

    python3 crear_indice.py
"""
import json
import re
from datetime import date
from pathlib import Path

# Una red aparece en la lista de aguas no aptas si su analisis mas reciente
# fue NO APTO y tiene menos de estos dias.
DIAS_NO_APTA_ACTUAL = 30

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


def main():
    carpeta = Path("data/municipios")
    hoy = date.today()
    indice = []
    no_aptas = []

    for archivo in sorted(carpeta.glob("*.json")):
        datos = json.loads(archivo.read_text(encoding="utf-8"))
        codigo = datos["codigo"]
        indice.append({
            "codigo": codigo,
            "nombre": datos["nombre"],
            "provincia": PROVINCIAS.get(codigo[:2], ""),
        })
        no_aptas.extend(redes_no_aptas(datos, hoy))

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

    print(f"Indice creado con {len(indice)} municipios: data/indice.json")
    print(f"Redes con el ultimo analisis no apto (menos de "
          f"{DIAS_NO_APTA_ACTUAL} dias): {len(no_aptas)} -> data/no_aptas.json")
    for r in no_aptas[:10]:
        causas = ", ".join(c["parametro"] for c in r["causas"]) or "sin causa marcada"
        print(f"  {r['fecha']}  {r['concello']} / {r['red']}  ({causas})")
    if len(no_aptas) > 10:
        print(f"  ... y {len(no_aptas) - 10} mas")


if __name__ == "__main__":
    main()