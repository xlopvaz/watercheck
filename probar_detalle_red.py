import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/"


def a_texto(respuesta):
    """Convierte la respuesta en texto, probando los dos formatos posibles."""
    try:
        return respuesta.content.decode("utf-8")
    except UnicodeDecodeError:
        return respuesta.content.decode("iso-8859-1")


sesion = requests.Session()
sesion.headers.update({
    "User-Agent": "WaterCheck/0.1 (proyecto educativo de Xoel)",
})

# 1. Página inicial (para que el SINAC nos dé la sesión)
sesion.get(BASE + "informacionAbastecimientoActionEntrada.do", timeout=30)
time.sleep(2)

# 2. Lista de redes de Castrelo de Miño
datos_redes = {
    "provinciaMapa": "",
    "codComunidad": "12",
    "codProvincia": "32",
    "codMunicipio": "32022",
    "method": "Buscar",
}
r1 = sesion.post(BASE + "informacionRedes.do", data=datos_redes, timeout=30)
soup = BeautifulSoup(a_texto(r1), "html.parser")

redes = []
for enlace in soup.select("table#red a"):
    coincidencia = re.search(r"eleccionRedDistribucion\((\d+)\)", enlace.get("href", ""))
    if coincidencia:
        redes.append((coincidencia.group(1), enlace.get_text(strip=True)))

print(f"Redes encontradas: {len(redes)}")
for id_red, nombre in redes:
    print(f"  {id_red}  {nombre}")

time.sleep(2)

# 3. Entrar en una red (Coto de Novelle, idRed 3392)
datos_detalle = {
    "codMunicipio": "32022",
    "codProvincia": "32",
    "denProvincia": "",
    "denComunidad": "",
    "denMunicipio": "CASTRELO DE MIÑO",
    "idRed": "3392",
    "provinciaMapa": "",
}
r2 = sesion.post(BASE + "informacionAbastecimientoActionDetalleRed.do",
                 data=datos_detalle, timeout=30)
print("Detalle de la red:", r2.status_code, "-", len(r2.content), "bytes")

Path("prueba").mkdir(exist_ok=True)
Path("prueba/red_coto_novelle.html").write_text(a_texto(r2), encoding="utf-8")
print("Guardado en prueba/red_coto_novelle.html")