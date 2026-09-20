"use strict";

/* ==========================================================
   WaterCheck: lógica de la web
   Lee los archivos de la carpeta data/ y pinta los resultados.
   ========================================================== */

/* ---------- Ajustes (puedes cambiarlos) ---------- */
const MESES_RECIENTES = 24;  // ventana para hablar de "incidencia reciente"
const RUTA_DATOS = "data/";  // carpeta con indice.json y municipios/
const MAX_SUGERENCIAS = 8;   // cuántas sugerencias enseña el buscador

/* ---------- Explicación de los parámetros en lenguaje sencillo ----------
   La clave es el nombre exacto que usa el SINAC.
   PENDIENTE: comprobar todos los límites en el texto del BOE
   (RD 3/2023). Arsénico y trihalometanos van de memoria. */
const PARAMETROS = {
  "Arsénico": {
    quees: "Elemento que aparece de forma natural en algunas rocas y puede pasar al agua subterránea.",
    limite: "Límite legal: 10 µg/L.",
  },
  "Suma 4 Trihalometanos (THM)": {
    nombre: "Trihalometanos (THM)",
    quees: "Subproductos que se forman cuando el cloro que desinfecta el agua reacciona con materia orgánica.",
    limite: "Límite legal: 100 µg/L.",
  },
  "Suma 5 AHAs": {
    nombre: "Ácidos haloacéticos (AHAs)",
    quees: "Otro grupo de subproductos de la desinfección con cloro, parecido a los trihalometanos.",
    limite: "Límite legal: 60 µg/L, exigible desde enero de 2025.",
  },
  "Turbidez": {
    quees: "Mide lo turbia que está el agua por las partículas que lleva en suspensión.",
    limite: "Valor de referencia: 4 UNF. El agua se considera no apta a partir de 6 UNF en la red de distribución (2 UNF a la salida de la planta).",
  },
  "Hierro": {
    quees: "Metal que puede venir del terreno o de las tuberías. En exceso puede dar color y turbidez al agua.",
    limite: "Valor de referencia: 200 µg/L. El agua se considera no apta a partir de 600 µg/L.",
  },
  "Indice de Langelier": {
    nombre: "Índice de Langelier",
    quees: "Indica si el agua tiende a corroer las tuberías (valores negativos) o a formar incrustaciones (valores positivos).",
    limite: "Valor de referencia: entre −0,5 y +0,5.",
  },
  "PH": {
    nombre: "pH",
    quees: "Mide la acidez del agua.",
    limite: "Valor de referencia: entre 6,5 y 9,5. El agua se considera no apta por debajo de 4,5 o por encima de 10.",
  },
  "Recuento de colonias a 22ºC": {
    nombre: "Recuento de colonias a 22 ºC",
    quees: "Recuento general de bacterias que crecen a 22 ºC. Sirve para comprobar que el tratamiento y la red funcionan bien.",
    limite: "Valor de referencia: 100 UFC/ml. El agua se considera no apta a partir de 1.000 UFC/ml.",
  },
};

const TIPOS = {
  control: "Análisis de control",
  completo: "Análisis completo",
  radiactividad: "Análisis de radiactividad",
};

const CALIFICACIONES = {
  apta: "agua apta",
  no_apta: "agua no apta",
  gestionada_por_consejeria: "calificación gestionada por la Consejería",
  desconocida: "sin calificación",
};

/* ---------- Herramientas pequeñas ---------- */
const $ = (selector, raiz = document) => raiz.querySelector(selector);

/* Crea un elemento HTML.
   crear("p", { class: "aviso", text: "Hola" }, hijo1, hijo2)
   Escribe siempre el texto con textContent, así nunca se cuela HTML ajeno. */
function crear(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === "class") el.className = valor;
    else if (clave === "text") el.textContent = valor;
    else if (clave.startsWith("on")) el.addEventListener(clave.slice(2), valor);
    else el.setAttribute(clave, valor === true ? "" : valor);
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo);
  }
  return el;
}

/* Quita acentos y signos para comparar textos al buscar. */
function plano(texto) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* El SINAC escribe los nombres en MAYÚSCULAS. Esto los pasa a "Título". */
const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "da", "do", "das", "dos"]);
const SIGLAS = new Set(["ZA", "RD", "EDAR", "ETAP", "ETA", "PM", "CEIP", "IES"]);
const ROMANO = /^(?=[IVX])X{0,3}(IX|IV|V?I{0,3})$/;

function bonito(texto) {
  if (!texto) return "";
  return texto
    .toLocaleLowerCase("es")
    .replace(/[\p{L}\p{N}]+/gu, (palabra, posicion) => {
      const mayus = palabra.toLocaleUpperCase("es");
      if (SIGLAS.has(mayus) || ROMANO.test(mayus)) return mayus;
      if (posicion > 0 && MINUSCULAS.has(palabra)) return palabra;
      return mayus.charAt(0) + palabra.slice(1);
    });
}

/* Fechas: el SINAC las da como "15/07/2025" o "15/07/2025 10:15". */
function parseFecha(texto) {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(texto || "");
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function fechaLarga(fecha) {
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function fechaCorta(fecha) {
  return fecha.toLocaleDateString("es-ES");
}

function hace(meses) {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - meses);
  return fecha;
}

function ventanaTexto() {
  if (MESES_RECIENTES % 12 === 0) {
    const anios = MESES_RECIENTES / 12;
    return anios === 1 ? "1 año" : `${anios} años`;
  }
  return `${MESES_RECIENTES} meses`;
}

function numero(valor) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("es-ES", { maximumFractionDigits: 6 });
}

/* ---------- Análisis de los datos de una red ---------- */
function analizarRed(red) {
  const limite = hace(MESES_RECIENTES);

  const detalles = new Map();
  for (const d of red.boletines_detallados || []) {
    detalles.set(String(d.id_boletin), d);
  }

  const lista = [];
  for (const b of red.boletines || []) {
    const fecha = parseFecha(b.fecha);
    if (!fecha) continue;
    lista.push({ ...b, fecha_date: fecha, detalle: detalles.get(String(b.id_boletin)) || null });
  }
  lista.sort((a, b) => b.fecha_date - a.fecha_date);

  const noAptos = lista.filter((b) => b.calificacion === "no_apta");
  return {
    lista,
    ultimo: lista[0] || null,
    recientes: noAptos.filter((b) => b.fecha_date >= limite),
    antiguos: noAptos.filter((b) => b.fecha_date < limite),
    ultimoAptoCompleto:
      lista.find((b) => b.tipo === "completo" && b.calificacion === "apta" && b.detalle) || null,
  };
}

/* ---------- Piezas de la pantalla ---------- */
function chip(p, clase) {
  const info = PARAMETROS[p.parametro] || {};
  const nombre = info.nombre || p.parametro;
  const prefijo = clase === "no-apta" ? "Causa de agua no apta: " : "Aviso: ";
  return crear(
    "span",
    { class: `chip chip--${clase}` },
    crear("span", { class: "sr", text: prefijo }),
    `${nombre} ${numero(p.valor)} ${p.unidad || ""}`.trim()
  );
}

function pintarParametro(p, clase) {
  const info = PARAMETROS[p.parametro] || {};
  const nombre = info.nombre || p.parametro;
  const valor = `${numero(p.valor)} ${p.unidad || ""}`.trim();
  return crear(
    "div",
    { class: `causa causa--${clase}` },
    crear("strong", { text: `${nombre}: ${valor}` }),
    info.quees ? crear("span", { text: info.quees }) : null,
    info.limite ? crear("span", { class: "limite", text: info.limite }) : null
  );
}

function pintarMeta(b, d) {
  const filas = [
    ["Punto de muestreo", bonito(d.punto_muestreo)],
    ["Zona de abastecimiento", bonito(d.zona_abastecimiento)],
    ["Fecha de toma", b.fecha],
    ["Tipo", [d.tipo_analisis, d.tipo_boletin].filter(Boolean).join(", ")],
    ["Laboratorio", (d.laboratorios || []).join(", ")],
  ].filter(([, valor]) => valor);

  return crear(
    "dl",
    { class: "meta" },
    filas.map(([clave, valor]) => [crear("dt", { text: clave }), crear("dd", { text: valor })])
  );
}

function pesoMarca(p) {
  if (p.marca_sinac === "colorNoApta") return 2;
  return p.marca_sinac ? 1 : 0;
}

function pintarTabla(parametros) {
  const ordenados = [...parametros].sort((a, b) => pesoMarca(b) - pesoMarca(a));
  const filas = ordenados.map((p) => {
    const noApta = p.marca_sinac === "colorNoApta";
    const marcado = Boolean(p.marca_sinac);
    return crear(
      "tr",
      { class: noApta ? "fila--no-apta" : marcado ? "fila--aviso" : null },
      crear("th", { scope: "row", text: (PARAMETROS[p.parametro] || {}).nombre || p.parametro }),
      crear("td", { class: "num", text: numero(p.valor) }),
      crear("td", { text: p.unidad || "" }),
      crear("td", { text: noApta ? "Causa de agua no apta" : marcado ? "Aviso" : "" })
    );
  });

  return crear(
    "div",
    { class: "tabla-scroll" },
    crear(
      "table",
      { class: "tabla" },
      crear(
        "thead",
        {},
        crear(
          "tr",
          {},
          crear("th", { scope: "col", text: "Parámetro" }),
          crear("th", { scope: "col", class: "num", text: "Valor" }),
          crear("th", { scope: "col", text: "Unidad" }),
          crear("th", { scope: "col", text: "Estado" })
        )
      ),
      crear("tbody", {}, filas)
    )
  );
}

function pintarAnalisis(b) {
  const d = b.detalle;
  const noApta = b.calificacion === "no_apta";
  const params = d ? d.parametros : [];
  const causas = params.filter((p) => p.marca_sinac === "colorNoApta");
  const avisos = params.filter((p) => p.marca_sinac && p.marca_sinac !== "colorNoApta");

  const desconocidas = avisos.filter((p) => p.marca_sinac !== "colorNoConformidad");
  if (desconocidas.length) {
    console.warn("Marcas del SINAC que no conocemos:", desconocidas.map((p) => `${p.parametro} [${p.marca_sinac}]`));
  }

  /* Resumen visible siempre */
  const resumen = crear(
    "summary",
    {},
    crear(
      "div",
      { class: "linea" },
      crear("span", {
        class: `etiqueta etiqueta--${noApta ? "no-apta" : "apta"}`,
        text: noApta ? "Agua no apta" : "Agua apta",
      }),
      crear("span", { class: "fecha", text: fechaLarga(b.fecha_date) }),
      crear("span", { class: "tipo", text: TIPOS[b.tipo] || b.tipo })
    ),
    d && d.punto_muestreo
      ? crear("div", { class: "donde", text: `Punto de muestreo: ${bonito(d.punto_muestreo)}` })
      : null,
    causas.length || avisos.length
      ? crear("div", { class: "chips" }, causas.map((p) => chip(p, "no-apta")), avisos.map((p) => chip(p, "aviso")))
      : null
  );

  /* Contenido que aparece al abrir */
  const cuerpo = crear("div", { class: "analisis-cuerpo" });

  if (!d) {
    cuerpo.append(
      crear("p", { text: "No hemos podido leer el detalle de este análisis. Puedes consultarlo directamente en el SINAC." })
    );
  } else {
    if (noApta && causas.length) {
      cuerpo.append(crear("p", { text: "El SINAC califica este análisis como agua no apta para el consumo porque estos valores quedaron fuera de lo permitido:" }));
      causas.forEach((p) => cuerpo.append(pintarParametro(p, "no-apta")));
    } else if (noApta) {
      cuerpo.append(crear("p", { text: "El SINAC califica este análisis como agua no apta, pero no señala qué valor lo causó. Puedes revisar todos los parámetros más abajo." }));
    }

    if (avisos.length) {
      cuerpo.append(
        crear("p", {
          text: noApta
            ? "Además, estos valores quedaron fuera del valor de referencia. Por sí solos no hacen que el agua deje de ser apta:"
            : "El agua salió apta. Aun así, estos valores quedaron fuera del valor de referencia, algo que no hace que el agua deje de ser apta:",
        })
      );
      avisos.forEach((p) => cuerpo.append(pintarParametro(p, "aviso")));
    }

    if (!noApta && !avisos.length) {
      cuerpo.append(crear("p", { text: "Ningún valor de este análisis quedó marcado como fuera de lo permitido." }));
    }

    if (noApta) {
      cuerpo.append(crear("p", { text: "Un análisis no apto no siempre significa que el agua fuera peligrosa: la autoridad sanitaria valora cada caso y da las recomendaciones que correspondan." }));
    }

    if (d.recomendacion) {
      cuerpo.append(crear("p", { text: `Recomendación sanitaria: ${d.recomendacion}` }));
    }

    cuerpo.append(pintarMeta(b, d));

    if (params.length) {
      const todos = crear(
        "details",
        { class: "todos" },
        crear("summary", { text: `Ver los ${params.length} parámetros medidos` })
      );
      // La tabla se dibuja solo cuando la persona abre el desplegable
      todos.addEventListener("toggle", () => {
        if (todos.open && !todos.dataset.listo) {
          todos.dataset.listo = "1";
          todos.append(
            crear("p", { class: "nota-ceros", text: "Un 0 puede significar que la cantidad estaba por debajo de lo que el laboratorio puede detectar." }),
            pintarTabla(params)
          );
        }
      });
      cuerpo.append(todos);
    }
  }

  return crear("details", { class: `analisis analisis--${noApta ? "no-apta" : "apta"}` }, resumen, cuerpo);
}

function pintarLista(analisis) {
  return crear(
    "ul",
    { class: "lista-analisis" },
    analisis.map((b) => crear("li", {}, pintarAnalisis(b)))
  );
}

/* La tira de tubos de ensayo: un tubo por análisis, de más antiguo a más reciente */
function pintarTira(lista) {
  const orden = [...lista].sort((a, b) => a.fecha_date - b.fecha_date);
  const noAptos = orden.filter((b) => b.calificacion === "no_apta").length;
  const aptos = orden.filter((b) => b.calificacion === "apta").length;

  const tubos = orden.map((b, i) => {
    const clase = b.calificacion === "no_apta" ? "no-apta" : b.calificacion === "apta" ? "apta" : "sin";
    const descripcion = `${fechaCorta(b.fecha_date)}: ${(TIPOS[b.tipo] || b.tipo).toLowerCase()}, ${CALIFICACIONES[b.calificacion] || ""}`;
    return crear(
      "li",
      {
        class: `vial vial--${clase}${b.tipo === "completo" ? " vial--completo" : ""}`,
        style: `--i:${i}`,
        title: descripcion,
      },
      crear("span", { class: "sr", text: descripcion })
    );
  });

  const leyenda = crear(
    "ul",
    { class: "leyenda" },
    crear("li", {}, crear("span", { class: "vial vial--mini vial--apta", "aria-hidden": "true" }), "Agua apta"),
    crear("li", {}, crear("span", { class: "vial vial--mini vial--no-apta", "aria-hidden": "true" }), "Agua no apta"),
    crear("li", {}, crear("span", { class: "vial vial--mini vial--sin", "aria-hidden": "true" }), "Radiactividad, sin calificar")
  );

  return crear(
    "div",
    {},
    crear("ul", { class: "tira", "aria-label": `Historial: ${orden.length} análisis, ${aptos} con agua apta y ${noAptos} con agua no apta` }, tubos),
    leyenda,
    crear("p", { class: "leyenda-nota", text: "Cada tubo es un análisis, del más antiguo al más reciente. Los tubos anchos son análisis completos." })
  );
}

function pintarRed(red) {
  const a = analizarRed(red);

  let clase = "sin-datos";
  let titular = "Sin análisis publicados";
  let detalle = "";

  if (a.ultimo) {
    detalle = `Último análisis: ${fechaLarga(a.ultimo.fecha_date)}.`;
    if (a.recientes.length) {
      clase = "incidencia";
      const n = a.recientes.length;
      titular = `${n} análisis con agua no apta en los últimos ${ventanaTexto()}`;
    } else {
      clase = "ok";
      titular = `Sin análisis con agua no apta en los últimos ${ventanaTexto()}`;
    }
  }

  const localidades = (red.localidades || []).map(bonito);

  const seccion = crear(
    "section",
    { class: `red red--${clase}` },
    crear("h3", { text: bonito(red.nombre) }),
    crear("p", { class: `estado estado--${clase}`, text: titular }),
    detalle ? crear("p", { class: "estado-detalle", text: detalle }) : null,
    localidades.length
      ? crear("p", { class: "localidades" }, crear("strong", { text: "Abastece a: " }), localidades.join(", "))
      : null,
    a.lista.length ? pintarTira(a.lista) : null
  );

  if (a.recientes.length) {
    seccion.append(crear("h4", { class: "subtitulo", text: `Agua no apta en los últimos ${ventanaTexto()}` }), pintarLista(a.recientes));
  }
  if (a.ultimoAptoCompleto) {
    seccion.append(crear("h4", { class: "subtitulo", text: "Último análisis completo con agua apta" }), pintarLista([a.ultimoAptoCompleto]));
  }
  if (a.antiguos.length) {
    seccion.append(
      crear(
        "details",
        { class: "antiguas" },
        crear("summary", { text: `Análisis anteriores con agua no apta (${a.antiguos.length})` }),
        pintarLista(a.antiguos)
      )
    );
  }
  return seccion;
}

/* ---------- Mensajes y resultado ---------- */
const zonaResultado = $("#resultado");

function mostrarMensaje(...contenido) {
  zonaResultado.replaceChildren(crear("div", { class: "mensaje" }, ...contenido));
}

function mostrarError(...contenido) {
  zonaResultado.replaceChildren(crear("div", { class: "mensaje mensaje--error", role: "alert" }, ...contenido));
}

function pintarMunicipio(datos) {
  const redes = datos.redes || [];
  const provincia = provinciaDe(datos.codigo);
  const actualizado = datos.actualizado ? new Date(`${datos.actualizado}T00:00:00`) : null;

  const partes = [];
  if (provincia) partes.push(`${provincia}.`);
  partes.push(redes.length === 1 ? "1 red de distribución." : `${redes.length} redes de distribución.`);
  if (actualizado) partes.push(`Datos actualizados el ${fechaLarga(actualizado)}.`);

  const titulo = crear("h2", { tabindex: "-1", text: bonito(datos.nombre) });
  const cabecera = crear(
    "header",
    { class: "municipio-cab" },
    titulo,
    crear("p", { text: partes.join(" ") }),
    redes.length > 1
      ? crear("p", { text: "Cada red abastece a unas localidades distintas. Busca la tuya para ver qué le corresponde." })
      : null
  );

  zonaResultado.replaceChildren(cabecera);

  if (redes.length === 0) {
    zonaResultado.append(crear("div", { class: "mensaje" }, "El SINAC no tiene redes de distribución publicadas para este municipio."));
  }
  redes.forEach((red) => zonaResultado.append(pintarRed(red)));

  titulo.focus();
}

/* ---------- Carga de datos ---------- */
let indice = [];

function provinciaDe(codigo) {
  const m = indice.find((x) => x.codigo === codigo);
  return m ? m.provincia : "";
}

async function cargarMunicipio(codigo, guardarEnUrl) {
  if (!/^\d{5}$/.test(codigo)) return;
  mostrarMensaje("Cargando datos…");
  try {
    const respuesta = await fetch(`${RUTA_DATOS}municipios/${codigo}.json`);
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const datos = await respuesta.json();
    pintarMunicipio(datos);
    if (guardarEnUrl) history.pushState({}, "", `?m=${codigo}`);
  } catch (error) {
    console.error(error);
    mostrarError("No hemos podido cargar los datos de este municipio. Recarga la página o inténtalo de nuevo más tarde.");
  }
}

/* ---------- Buscador con sugerencias ---------- */
const campo = $("#campo");
const listaSugerencias = $("#sugerencias");
const formulario = $("#formulario");

let sugerencias = [];
let activa = -1;

function buscar(texto) {
  const q = plano(texto);
  if (q.length < 2) return [];
  const empiezan = [];
  const contienen = [];
  for (const m of indice) {
    if (m.plano.startsWith(q)) empiezan.push(m);
    else if (m.plano.includes(q)) contienen.push(m);
  }
  return [...empiezan, ...contienen].slice(0, MAX_SUGERENCIAS);
}

function pintarSugerencias() {
  listaSugerencias.replaceChildren();
  sugerencias.forEach((m, i) => {
    listaSugerencias.append(
      crear(
        "li",
        {
          role: "option",
          id: `sug-${i}`,
          "aria-selected": String(i === activa),
          // mousedown (y no click) para que el campo no pierda el foco antes de elegir
          onmousedown: (evento) => {
            evento.preventDefault();
            elegir(m);
          },
        },
        crear("span", { text: m.bonito }),
        crear("span", { class: "sug-prov", text: m.provincia })
      )
    );
  });
  const abierta = sugerencias.length > 0;
  listaSugerencias.hidden = !abierta;
  campo.setAttribute("aria-expanded", String(abierta));
  if (activa >= 0) campo.setAttribute("aria-activedescendant", `sug-${activa}`);
  else campo.removeAttribute("aria-activedescendant");
}

function cerrarSugerencias() {
  sugerencias = [];
  activa = -1;
  pintarSugerencias();
}

function elegir(municipio) {
  campo.value = municipio.bonito;
  cerrarSugerencias();
  cargarMunicipio(municipio.codigo, true);
}

campo.addEventListener("input", () => {
  sugerencias = buscar(campo.value);
  activa = -1;
  pintarSugerencias();
});

campo.addEventListener("keydown", (evento) => {
  if (!sugerencias.length) return;
  if (evento.key === "ArrowDown") {
    evento.preventDefault();
    activa = (activa + 1) % sugerencias.length;
    pintarSugerencias();
  } else if (evento.key === "ArrowUp") {
    evento.preventDefault();
    activa = (activa - 1 + sugerencias.length) % sugerencias.length;
    pintarSugerencias();
  } else if (evento.key === "Escape") {
    cerrarSugerencias();
  }
});

campo.addEventListener("blur", cerrarSugerencias);

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const candidatos = sugerencias.length ? sugerencias : buscar(campo.value);
  const elegido = activa >= 0 ? candidatos[activa] : candidatos[0];
  if (elegido) {
    elegir(elegido);
  } else {
    mostrarMensaje("No encontramos ese municipio. Comprueba cómo está escrito. De momento WaterCheck solo tiene datos de algunas provincias.");
  }
});

/* ---------- Ejemplos clicables bajo el buscador ---------- */
function pintarEjemplos() {
  const zona = $("#ejemplos");
  const muestra = indice.slice(0, 3);
  if (!muestra.length) return;
  zona.replaceChildren("Prueba con ");
  muestra.forEach((m, i) => {
    zona.append(crear("button", { type: "button", onclick: () => elegir(m), text: m.bonito }));
    if (i < muestra.length - 2) zona.append(", ");
    else if (i === muestra.length - 2) zona.append(" o ");
  });
  zona.append(".");
}

/* ---------- Arranque ---------- */
function leerUrl() {
  const codigo = new URLSearchParams(location.search).get("m");
  if (codigo) cargarMunicipio(codigo, false);
  else zonaResultado.replaceChildren();
}

async function iniciar() {
  if (location.protocol === "file:") {
    mostrarError(
      "Esta página necesita un servidor para leer los datos. Abre el terminal en la carpeta del proyecto, escribe ",
      crear("code", { text: "python3 -m http.server 8000" }),
      " y visita ",
      crear("code", { text: "http://localhost:8000" }),
      "."
    );
    return;
  }

  try {
    const respuesta = await fetch(`${RUTA_DATOS}indice.json`);
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const bruto = await respuesta.json();
    indice = bruto.map((m) => ({ ...m, bonito: bonito(m.nombre), plano: plano(m.nombre) }));
  } catch (error) {
    console.error(error);
    mostrarError(
      "No hemos podido cargar la lista de municipios. Si estás probando en tu ordenador, ejecuta antes ",
      crear("code", { text: "python3 crear_indice.py" }),
      "."
    );
    return;
  }

  pintarEjemplos();
  leerUrl();
}

window.addEventListener("popstate", leerUrl);
iniciar();