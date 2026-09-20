import time
from pathlib import Path

import requests

BASE = "https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/"
ENTRADA = BASE + "informacionAbastecimientoActionEntrada.do"


def a_texto(respuesta):
    try:
        return respuesta.content.decode("utf-8")
    except UnicodeDecodeError:
        return respuesta.content.decode("iso-8859-1")


sesion = requests.Session()
sesion.headers.update({
    "User-Agent": "WaterCheck/0.1 (proyecto educativo de Xoel)",
})

sesion.get(ENTRADA, timeout=30)
time.sleep(2)

r = sesion.post(
    BASE + "cargarComboMunicipiosAction.do",
    data={"id": "32"},
    headers={
        "X-Requested-With": "XMLHttpRequest",
        "Referer": ENTRADA,
    },
    timeout=30,
)
print("Estado:", r.status_code, "-", len(r.content), "bytes")

texto = a_texto(r)
Path("prueba").mkdir(exist_ok=True)
Path("prueba/municipios_32.txt").write_text(texto, encoding="utf-8")
print("Guardado en prueba/municipios_32.txt")
print("--- primeros 800 caracteres ---")
print(texto[:800])