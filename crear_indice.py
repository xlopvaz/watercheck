"""Crea data/indice.json a partir de los archivos de data/municipios.

El buscador de la web lee este indice para saber que municipios existen.
Ejecutalo cada vez que anadas municipios nuevos:

    python3 crear_indice.py
"""
import json
from pathlib import Path

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

carpeta = Path("data/municipios")
indice = []
for archivo in sorted(carpeta.glob("*.json")):
    datos = json.loads(archivo.read_text(encoding="utf-8"))
    codigo = datos["codigo"]
    indice.append({
        "codigo": codigo,
        "nombre": datos["nombre"],
        "provincia": PROVINCIAS.get(codigo[:2], ""),
    })

salida = Path("data/indice.json")
salida.write_text(
    json.dumps(indice, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8",
)
print(f"Indice creado con {len(indice)} municipios: {salida}")