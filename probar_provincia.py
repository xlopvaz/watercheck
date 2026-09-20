import time

import sinac

COD_COMUNIDAD = "12"  # Galicia
COD_PROVINCIA = "32"  # Ourense
CUANTOS = 3  # de momento solo probamos con 3 municipios

sesion = sinac.nueva_sesion()

municipios = sinac.listar_municipios(sesion, COD_PROVINCIA)
print(f"Municipios en la provincia: {len(municipios)}")
time.sleep(sinac.PAUSA)

total_redes = 0
for m in municipios[:CUANTOS]:
    redes = sinac.listar_redes(
        sesion, COD_COMUNIDAD, COD_PROVINCIA, m["codigo"]
    )
    total_redes += len(redes)
    print(f"{m['codigo']} {m['nombre']}: {len(redes)} redes")
    for red in redes:
        print(f"    {red['id_red']}  {red['nombre']}")
    time.sleep(sinac.PAUSA)

print(f"\nTotal: {total_redes} redes en {CUANTOS} municipios")