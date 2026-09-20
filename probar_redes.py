import time
from pathlib import Path

import requests

BASE = "https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/"

sesion = requests.Session()
sesion.headers.update({
    "User-Agent": "WaterCheck/0.1 (proyecto educativo de Xoel)",
})

# 1. Entrar en la página inicial para que el SINAC nos dé una "sesión"
r0 = sesion.get(BASE + "informacionAbastecimientoActionEntrada.do", timeout=30)
print("Página inicial:", r0.status_code)

time.sleep(2)  # esperamos un poco, para no agobiar su servidor

# 2. Pedir la lista de redes de Castrelo de Miño
datos = {
    "provinciaMapa": "",
    "codComunidad": "12",
    "codProvincia": "32",
    "codMunicipio": "32022",
    "method": "Buscar",
}
r1 = sesion.post(BASE + "informacionRedes.do", data=datos, timeout=30)
print("Lista de redes:", r1.status_code, "-", len(r1.content), "bytes")

# 3. Guardar la página tal cual, para mirarla después
Path("prueba").mkdir(exist_ok=True)
Path("prueba/redes_castrelo.html").write_bytes(r1.content)
print("Guardado en prueba/redes_castrelo.html")