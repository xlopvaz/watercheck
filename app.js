"use strict";

/* ==========================================================
   WaterCheck: lógica de la web
   Lee los archivos de la carpeta data/ y pinta los resultados.
   Idiomas: gallego (por defecto) y castellano.
   ========================================================== */

/* ---------- Ajustes (puedes cambiarlos) ---------- */
const MESES_RECIENTES = 24;  // ventana para hablar de "incidencia reciente"
const RUTA_DATOS = "data/";  // carpeta con indice.json y municipios/
const MAX_SUGERENCIAS = 8;   // cuántas sugerencias enseña el buscador
const IDIOMA_POR_DEFECTO = "gl";

/* ==========================================================
   TEXTOS: aquí está TODO lo que se lee en pantalla.
   Para corregir una traducción, busca la clave y cámbiala.
   {n}, {fecha}... son huecos que el programa rellena.
   ========================================================== */
const TEXTOS = {
  gl: {
    titulo: "WaterCheck: que hai na auga do teu concello",
    meta: "Consulta se a auga de consumo do teu concello tivo incidencias recentes, con datos do SINAC do Ministerio de Sanidade.",
    salto: "Ir aos resultados",
    idioma: "Idioma",
    h1: "Que hai na auga do teu concello?",
    intro: "Escribe o teu concello e contámosche, sen tecnicismos, se a súa auga de consumo tivo incidencias recentes. Os datos son do SINAC, o sistema de información do Ministerio de Sanidade, e actualízanse cada semana.",
    etiqueta: "O teu concello",
    placeholder: "Por exemplo, Allariz",
    boton: "Ver a miña auga",
    sugerencias: "Concellos suxeridos",
    "ejemplos.pre": "Proba con ",
    "ejemplos.o": " ou ",
    "ejemplos.fin": ".",

    "ayuda.aria": "Axuda",
    "ayuda.resumen": "Como ler estes datos",
    ayuda1t: "Auga apta e non apta.",
    ayuda1: "Cada análise que un laboratorio envía ao SINAC recibe unha cualificación. «Non apta» significa que algún valor quedou fóra do que permite o Real Decreto 3/2023. Non sempre implica un risco inmediato: a autoridade sanitaria valora cada caso e dá as recomendacións que correspondan.",
    ayuda2t: "Avisos.",
    ayuda2: "Algúns parámetros, como o ferro, o pH ou o índice de Langelier, son indicadores de calidade. Se superan o seu valor paramétrico (o límite que fixa a norma), a auga segue sendo apta, pero o operador debe corrixilo. Só deixa de ser apta cando chegan ao seu «valor de non aptitude». WaterCheck móstraos como avisos.",
    ayuda3t: "Que análises vemos.",
    ayuda3: "O SINAC publica as dez últimas análises de control, as dez últimas completas e as cinco últimas de radioactividade de cada rede. As máis antigas non aparecen.",
    ayuda4t: "Os ceros.",
    ayuda4: "Un 0 pode significar que a cantidade estaba por debaixo do que o laboratorio é quen de detectar, e non que haxa exactamente cero.",
    ayuda5t: "A túa rede.",
    ayuda5: "Un concello pode ter varias redes de distribución. Cada unha abastece a unhas localidades, así que fíxate na que inclúe a túa.",
    ayuda6t: "Actualización semanal.",
    ayuda6: "Unha vez por semana, un programa automático volve consultar o SINAC e actualiza os datos desta web. Baixo o nome de cada concello ves a data da última comprobación. Se un laboratorio tarda en notificar unha análise ao SINAC, tamén tardará en aparecer aquí.",
    pie1: "WaterCheck é un proxecto independente e non é un servizo oficial. Os datos proceden do ",
    pie2: " (Ministerio de Sanidade) e poden ter atraso ou erros. Para información oficial, consulta o SINAC ou pregunta ao teu concello.",

    "tipo.control": "Análise de control",
    "tipo.completo": "Análise completa",
    "tipo.radiactividad": "Análise de radioactividade",
    "calif.apta": "auga apta",
    "calif.no_apta": "auga non apta",
    "calif.gestionada_por_consejeria": "cualificación xestionada pola Consellería",
    "calif.desconocida": "sen cualificación",
    "etiqueta.apta": "Auga apta",
    "etiqueta.no_apta": "Auga non apta",
    "chip.causa": "Causa de auga non apta: ",
    "chip.aviso": "Aviso: ",

    "meta.punto": "Punto de mostraxe",
    "meta.zona": "Zona de abastecemento",
    "meta.fecha": "Data de toma",
    "meta.tipo": "Tipo",
    "meta.lab": "Laboratorio",
    "sin.detalle": "Non puidemos ler o detalle desta análise. Podes consultalo directamente no SINAC.",
    "causas.intro": "O SINAC cualifica esta análise como auga non apta para o consumo porque estes valores quedaron fóra do permitido:",
    "sin.causa": "O SINAC cualifica esta análise como auga non apta, pero non sinala que valor a causou. Podes revisar todos os parámetros máis abaixo.",
    "avisos.noapta": "Ademais, estes valores quedaron fóra do seu valor paramétrico. Por si sós non fan que a auga deixe de ser apta:",
    "avisos.apta": "A auga saíu apta. Aínda así, estes valores quedaron fóra do seu valor paramétrico, algo que non fai que a auga deixe de ser apta:",
    "sin.marcas": "Ningún valor desta análise quedou marcado como fóra do permitido.",
    "nota.noapta": "Unha análise non apta non sempre significa que a auga fose perigosa: a autoridade sanitaria valora cada caso e dá as recomendacións que correspondan.",
    recomendacion: "Recomendación sanitaria: {texto}",
    todos: "Ver os {n} parámetros medidos",
    "nota.ceros": "Un 0 pode significar que a cantidade estaba por debaixo do que o laboratorio pode detectar.",
    "tabla.parametro": "Parámetro",
    "tabla.valor": "Valor",
    "tabla.unidad": "Unidade",
    "tabla.estado": "Estado",
    "estado.causa": "Causa de auga non apta",
    "estado.aviso": "Aviso",

    "tira.aria": "Historial: {n} análises, {a} con auga apta e {na} con auga non apta",
    "leyenda.apta": "Auga apta",
    "leyenda.noapta": "Auga non apta",
    "leyenda.sin": "Radioactividade, sen cualificar",
    "leyenda.nota": "Cada tubo é unha análise, da máis antiga á máis recente. Os tubos anchos son análises completas.",

    "red.sin": "Sen análises publicadas",
    "red.ultima": "Última análise: {fecha}.",
    "red.uno": "{n} análise con auga non apta nos últimos {v}",
    "red.varios": "{n} análises con auga non apta nos últimos {v}",
    "red.ok": "Sen análises con auga non apta nos últimos {v}",
    "red.abastece": "Abastece a: ",
    "sub.noapta": "Auga non apta nos últimos {v}",
    "sub.ultimoapto": "Última análise completa con auga apta",
    "sub.antiguas": "Análises anteriores con auga non apta ({n})",
    "anio.uno": "1 ano",
    "anio.varios": "{n} anos",
    meses: "{n} meses",

    "mun.prov": "{p}.",
    "mun.red1": "1 rede de distribución.",
    "mun.redes": "{n} redes de distribución.",
    "mun.act": "Datos comprobados por última vez o {fecha}.",
    "mun.guia": "Cada rede abastece a unhas localidades distintas. Busca a túa para ver que che corresponde.",
    "mun.sinredes": "O SINAC non ten redes de distribución publicadas para este concello.",

    cargando: "Cargando datos…",
    "error.datos": "Non puidemos cargar os datos deste concello. Recarga a páxina ou téntao de novo máis tarde.",
    "error.file": "Esta páxina necesita un servidor para ler os datos. Abre o terminal na carpeta do proxecto, escribe {c1} e visita {c2}.",
    "error.indice": "Non puidemos cargar a lista de concellos. Se estás a probar no teu ordenador, executa antes {c1}.",
    nofound: "Non atopamos ese concello. Comproba como está escrito. De momento WaterCheck só ten datos dalgunhas provincias.",
  },

  es: {
    titulo: "WaterCheck: qué hay en el agua de tu municipio",
    meta: "Consulta si el agua de consumo de tu municipio ha tenido incidencias recientes, con datos del SINAC del Ministerio de Sanidad.",
    salto: "Ir a los resultados",
    idioma: "Idioma",
    h1: "¿Qué hay en el agua de tu municipio?",
    intro: "Escribe tu municipio y te contamos, sin tecnicismos, si su agua de consumo ha tenido incidencias recientes. Los datos son del SINAC, el sistema de información del Ministerio de Sanidad, y se actualizan cada semana.",
    etiqueta: "Tu municipio",
    placeholder: "Por ejemplo, Allariz",
    boton: "Ver mi agua",
    sugerencias: "Municipios sugeridos",
    "ejemplos.pre": "Prueba con ",
    "ejemplos.o": " o ",
    "ejemplos.fin": ".",

    "ayuda.aria": "Ayuda",
    "ayuda.resumen": "Cómo leer estos datos",
    ayuda1t: "Agua apta y no apta.",
    ayuda1: "Cada análisis que un laboratorio envía al SINAC recibe una calificación. «No apta» significa que algún valor quedó fuera de lo que permite el Real Decreto 3/2023. No siempre implica un riesgo inmediato: la autoridad sanitaria valora cada caso y da las recomendaciones que correspondan.",
    ayuda2t: "Avisos.",
    ayuda2: "Algunos parámetros, como el hierro, el pH o el índice de Langelier, son indicadores de calidad. Si superan su valor paramétrico (el límite que fija la norma), el agua sigue siendo apta, pero el operador debe corregirlo. Solo deja de serlo cuando llegan a su «valor de no aptitud». WaterCheck los muestra como avisos.",
    ayuda3t: "Qué análisis vemos.",
    ayuda3: "El SINAC publica los diez últimos análisis de control, los diez últimos completos y los cinco últimos de radiactividad de cada red. Los más antiguos no aparecen.",
    ayuda4t: "Los ceros.",
    ayuda4: "Un 0 puede significar que la cantidad estaba por debajo de lo que el laboratorio es capaz de detectar, y no que haya exactamente cero.",
    ayuda5t: "Tu red.",
    ayuda5: "Un municipio puede tener varias redes de distribución. Cada una abastece a unas localidades, así que fíjate en la que incluye la tuya.",
    ayuda6t: "Actualización semanal.",
    ayuda6: "Una vez por semana, un programa automático vuelve a consultar el SINAC y actualiza los datos de esta web. Bajo el nombre de cada municipio ves la fecha de la última comprobación. Si un laboratorio tarda en notificar un análisis al SINAC, también tardará en aparecer aquí.",
    pie1: "WaterCheck es un proyecto independiente y no es un servicio oficial. Los datos proceden del ",
    pie2: " (Ministerio de Sanidad) y pueden tener retraso o errores. Para información oficial, consulta el SINAC o pregunta a tu ayuntamiento.",

    "tipo.control": "Análisis de control",
    "tipo.completo": "Análisis completo",
    "tipo.radiactividad": "Análisis de radiactividad",
    "calif.apta": "agua apta",
    "calif.no_apta": "agua no apta",
    "calif.gestionada_por_consejeria": "calificación gestionada por la Consejería",
    "calif.desconocida": "sin calificación",
    "etiqueta.apta": "Agua apta",
    "etiqueta.no_apta": "Agua no apta",
    "chip.causa": "Causa de agua no apta: ",
    "chip.aviso": "Aviso: ",

    "meta.punto": "Punto de muestreo",
    "meta.zona": "Zona de abastecimiento",
    "meta.fecha": "Fecha de toma",
    "meta.tipo": "Tipo",
    "meta.lab": "Laboratorio",
    "sin.detalle": "No hemos podido leer el detalle de este análisis. Puedes consultarlo directamente en el SINAC.",
    "causas.intro": "El SINAC califica este análisis como agua no apta para el consumo porque estos valores quedaron fuera de lo permitido:",
    "sin.causa": "El SINAC califica este análisis como agua no apta, pero no señala qué valor lo causó. Puedes revisar todos los parámetros más abajo.",
    "avisos.noapta": "Además, estos valores quedaron fuera de su valor paramétrico. Por sí solos no hacen que el agua deje de ser apta:",
    "avisos.apta": "El agua salió apta. Aun así, estos valores quedaron fuera de su valor paramétrico, algo que no hace que el agua deje de ser apta:",
    "sin.marcas": "Ningún valor de este análisis quedó marcado como fuera de lo permitido.",
    "nota.noapta": "Un análisis no apto no siempre significa que el agua fuera peligrosa: la autoridad sanitaria valora cada caso y da las recomendaciones que correspondan.",
    recomendacion: "Recomendación sanitaria: {texto}",
    todos: "Ver los {n} parámetros medidos",
    "nota.ceros": "Un 0 puede significar que la cantidad estaba por debajo de lo que el laboratorio puede detectar.",
    "tabla.parametro": "Parámetro",
    "tabla.valor": "Valor",
    "tabla.unidad": "Unidad",
    "tabla.estado": "Estado",
    "estado.causa": "Causa de agua no apta",
    "estado.aviso": "Aviso",

    "tira.aria": "Historial: {n} análisis, {a} con agua apta y {na} con agua no apta",
    "leyenda.apta": "Agua apta",
    "leyenda.noapta": "Agua no apta",
    "leyenda.sin": "Radiactividad, sin calificar",
    "leyenda.nota": "Cada tubo es un análisis, del más antiguo al más reciente. Los tubos anchos son análisis completos.",

    "red.sin": "Sin análisis publicados",
    "red.ultima": "Último análisis: {fecha}.",
    "red.uno": "{n} análisis con agua no apta en los últimos {v}",
    "red.varios": "{n} análisis con agua no apta en los últimos {v}",
    "red.ok": "Sin análisis con agua no apta en los últimos {v}",
    "red.abastece": "Abastece a: ",
    "sub.noapta": "Agua no apta en los últimos {v}",
    "sub.ultimoapto": "Último análisis completo con agua apta",
    "sub.antiguas": "Análisis anteriores con agua no apta ({n})",
    "anio.uno": "1 año",
    "anio.varios": "{n} años",
    meses: "{n} meses",

    "mun.prov": "{p}.",
    "mun.red1": "1 red de distribución.",
    "mun.redes": "{n} redes de distribución.",
    "mun.act": "Datos comprobados por última vez el {fecha}.",
    "mun.guia": "Cada red abastece a unas localidades distintas. Busca la tuya para ver qué le corresponde.",
    "mun.sinredes": "El SINAC no tiene redes de distribución publicadas para este municipio.",

    cargando: "Cargando datos…",
    "error.datos": "No hemos podido cargar los datos de este municipio. Recarga la página o inténtalo de nuevo más tarde.",
    "error.file": "Esta página necesita un servidor para leer los datos. Abre el terminal en la carpeta del proyecto, escribe {c1} y visita {c2}.",
    "error.indice": "No hemos podido cargar la lista de municipios. Si estás probando en tu ordenador, ejecuta antes {c1}.",
    nofound: "No encontramos ese municipio. Comprueba cómo está escrito. De momento WaterCheck solo tiene datos de algunas provincias.",
  },
};

/* Explicación de los parámetros en lenguaje sencillo.
   La clave es el nombre exacto que usa el SINAC.
   Comprobados en el BOE (RD 3/2023, anexo I): arsénico, THM y AHAs (parte B)
   y todos los de la parte C con las notas de la tabla 3.
   PENDIENTE: la fecha de los AHAs (2 de enero de 2025) y la nota del índice
   de Langelier (nota 18). */
const PARAMETROS = {
  "Arsénico": {
    gl: {
      quees: "Elemento que aparece de forma natural nalgunhas rochas e pode pasar á auga subterránea.",
      limite: "Límite legal: 10 µg/L.",
    },
    es: {
      quees: "Elemento que aparece de forma natural en algunas rocas y puede pasar al agua subterránea.",
      limite: "Límite legal: 10 µg/L.",
    },
  },
  "Suma 4 Trihalometanos (THM)": {
    gl: {
      nombre: "Trihalometanos (THM)",
      quees: "Subprodutos que se forman cando o cloro que desinfecta a auga reacciona con materia orgánica.",
      limite: "Límite legal: 100 µg/L.",
    },
    es: {
      nombre: "Trihalometanos (THM)",
      quees: "Subproductos que se forman cuando el cloro que desinfecta el agua reacciona con materia orgánica.",
      limite: "Límite legal: 100 µg/L.",
    },
  },
  "Suma 5 AHAs": {
    gl: {
      nombre: "Ácidos haloacéticos (AHA)",
      quees: "Outro grupo de subprodutos da desinfección con cloro, semellante aos trihalometanos.",
      limite: "Límite legal: 60 µg/L, esixible desde xaneiro de 2025.",
    },
    es: {
      nombre: "Ácidos haloacéticos (AHA)",
      quees: "Otro grupo de subproductos de la desinfección con cloro, parecido a los trihalometanos.",
      limite: "Límite legal: 60 µg/L, exigible desde enero de 2025.",
    },
  },
  "Turbidez": {
    gl: {
      quees: "Mide o turbia que está a auga polas partículas que leva en suspensión.",
      limite: "Valor paramétrico: 4 UNF na rede de distribución. A auga considérase non apta a partir de 6 UNF na rede e de 2 UNF á saída da planta.",
    },
    es: {
      quees: "Mide lo turbia que está el agua por las partículas que lleva en suspensión.",
      limite: "Valor paramétrico: 4 UNF en la red de distribución. El agua se considera no apta a partir de 6 UNF en la red y de 2 UNF a la salida de la planta.",
    },
  },
  "Hierro": {
    gl: {
      nombre: "Ferro",
      quees: "Metal que pode vir do terreo ou das tubaxes. En exceso pode dar cor e turbidez á auga.",
      limite: "Valor paramétrico: 200 µg/L. A auga considérase non apta a partir de 600 µg/L.",
    },
    es: {
      quees: "Metal que puede venir del terreno o de las tuberías. En exceso puede dar color y turbidez al agua.",
      limite: "Valor paramétrico: 200 µg/L. El agua se considera no apta a partir de 600 µg/L.",
    },
  },
  "Indice de Langelier": {
    gl: {
      nombre: "Índice de Langelier",
      quees: "Indica se a auga tende a corroer as tubaxes (valores negativos) ou a formar incrustacións (valores positivos).",
      limite: "Valor paramétrico: entre −0,5 e +0,5.",
    },
    es: {
      nombre: "Índice de Langelier",
      quees: "Indica si el agua tiende a corroer las tuberías (valores negativos) o a formar incrustaciones (valores positivos).",
      limite: "Valor paramétrico: entre −0,5 y +0,5.",
    },
  },
  "PH": {
    gl: {
      nombre: "pH",
      quees: "Mide a acidez da auga.",
      limite: "Valor paramétrico: entre 6,5 e 9,5. A auga considérase non apta por debaixo de 4,5 ou por riba de 10,0.",
    },
    es: {
      nombre: "pH",
      quees: "Mide la acidez del agua.",
      limite: "Valor paramétrico: entre 6,5 y 9,5. El agua se considera no apta por debajo de 4,5 o por encima de 10,0.",
    },
  },
  "Recuento de colonias a 22ºC": {
    gl: {
      nombre: "Reconto de colonias a 22 ºC",
      quees: "Reconto xeral de bacterias que crecen a 22 ºC. Serve para comprobar que o tratamento e a rede funcionan ben.",
      limite: "Valor paramétrico: 100 UFC/ml. Á saída do tratamento, a auga considérase non apta a partir de 1.000 UFC/ml.",
    },
    es: {
      nombre: "Recuento de colonias a 22 ºC",
      quees: "Recuento general de bacterias que crecen a 22 ºC. Sirve para comprobar que el tratamiento y la red funcionan bien.",
      limite: "Valor paramétrico: 100 UFC/ml. A la salida del tratamiento, el agua se considera no apta a partir de 1.000 UFC/ml.",
    },
  },

  /* ----- Parte A: microbiología ----- */
  "Escherichia coli": {
    gl: { quees: "Bacteria de orixe intestinal: a súa presenza indica contaminación fecal.", limite: "Límite legal: 0 UFC/100 ml." },
    es: { quees: "Bacteria de origen intestinal: su presencia indica contaminación fecal.", limite: "Límite legal: 0 UFC/100 ml." },
  },
  "Enterococo": {
    gl: { nombre: "Enterococos intestinais", quees: "Bacterias de orixe intestinal: a súa presenza indica contaminación fecal.", limite: "Límite legal: 0 UFC/100 ml." },
    es: { nombre: "Enterococos intestinales", quees: "Bacterias de origen intestinal: su presencia indica contaminación fecal.", limite: "Límite legal: 0 UFC/100 ml." },
  },
  "Clostridium perfringens (incluidas las esporas)": {
    gl: { nombre: "Clostridium perfringens (con esporas)", quees: "Bacteria intestinal que forma esporas moi resistentes: a súa presenza é un indicador de contaminación fecal.", limite: "Límite legal: 0 UFC/100 ml." },
    es: { quees: "Bacteria intestinal que forma esporas muy resistentes: su presencia es un indicador de contaminación fecal.", limite: "Límite legal: 0 UFC/100 ml." },
  },

  /* ----- Parte C: indicadores de calidad ----- */
  "Bacterias coliformes": {
    gl: { quees: "Grupo de bacterias indicadoras. A súa presenza indica que a desinfección non foi suficiente ou que houbo unha recontaminación.", limite: "Valor paramétrico: 0 UFC/100 ml. A auga considérase non apta a partir de 100 UFC/100 ml." },
    es: { quees: "Grupo de bacterias indicadoras. Su presencia indica que la desinfección no fue suficiente o que hubo una recontaminación.", limite: "Valor paramétrico: 0 UFC/100 ml. El agua se considera no apta a partir de 100 UFC/100 ml." },
  },
  "Colifagos somáticos": {
    gl: { nombre: "Colífagos somáticos", quees: "Virus que infectan bacterias e serven de indicador de posible contaminación viral.", limite: "Valor paramétrico: 0 UFP/100 ml." },
    es: { quees: "Virus que infectan bacterias y sirven de indicador de posible contaminación viral.", limite: "Valor paramétrico: 0 UFP/100 ml." },
  },
  "Aluminio": {
    gl: { quees: "Metal presente de forma natural nos solos. Tamén pode quedar na auga se se usan sales de aluminio no tratamento.", limite: "Valor paramétrico: 200 µg/L. A auga considérase non apta a partir de 600 µg/L." },
    es: { quees: "Metal presente de forma natural en los suelos. También puede quedar en el agua si se usan sales de aluminio en el tratamiento.", limite: "Valor paramétrico: 200 µg/L. El agua se considera no apta a partir de 600 µg/L." },
  },
  "Amonio": {
    gl: { quees: "Indicador de posible contaminación. En cantidades altas reduce a eficacia da desinfección con cloro.", limite: "Valor paramétrico: 0,50 mg/L. A auga considérase non apta a partir de 1,00 mg/L." },
    es: { quees: "Indicador de posible contaminación. En cantidades altas reduce la eficacia de la desinfección con cloro.", limite: "Valor paramétrico: 0,50 mg/L. El agua se considera no apta a partir de 1,00 mg/L." },
  },
  "Carbono Orgánico total": {
    gl: { nombre: "Carbono orgánico total", quees: "Mide a cantidade de materia orgánica que leva a auga.", limite: "Valor paramétrico: 5,0 mg/L. A auga considérase non apta a partir de 7,0 mg/L." },
    es: { nombre: "Carbono orgánico total", quees: "Mide la cantidad de materia orgánica que lleva el agua.", limite: "Valor paramétrico: 5,0 mg/L. El agua se considera no apta a partir de 7,0 mg/L." },
  },
  "Cloro combinado residual": {
    gl: { quees: "Cloro que xa reaccionou con outras substancias (como o amonio) e desinfecta menos que o cloro libre.", limite: "Valor paramétrico: 2,0 mg/L. A auga considérase non apta a partir de 3,0 mg/L." },
    es: { quees: "Cloro que ya reaccionó con otras sustancias (como el amonio) y desinfecta menos que el cloro libre.", limite: "Valor paramétrico: 2,0 mg/L. El agua se considera no apta a partir de 3,0 mg/L." },
  },
  "Cloro libre residual": {
    gl: { quees: "Cloro que queda na auga despois de desinfectala e que a protexe ata que chega á billa.", limite: "Valor paramétrico: 1,0 mg/L. A auga considérase non apta a partir de 5,0 mg/L." },
    es: { quees: "Cloro que queda en el agua después de desinfectarla y que la protege hasta que llega al grifo.", limite: "Valor paramétrico: 1,0 mg/L. El agua se considera no apta a partir de 5,0 mg/L." },
  },
  "Cloruro": {
    gl: { quees: "Sal que aparece de forma natural ou por contaminación. En cantidades altas dá sabor salgado á auga.", limite: "Valor paramétrico: 250 mg/L." },
    es: { quees: "Sal que aparece de forma natural o por contaminación. En cantidades altas da sabor salado al agua.", limite: "Valor paramétrico: 250 mg/L." },
  },
  "Conductividad": {
    gl: { nombre: "Condutividade", quees: "Mide a cantidade de sales disoltas na auga.", limite: "Valor paramétrico: 2.500 µS/cm a 20 ºC. A auga considérase non apta a partir de 4.000 µS/cm." },
    es: { quees: "Mide la cantidad de sales disueltas en el agua.", limite: "Valor paramétrico: 2.500 µS/cm a 20 ºC. El agua se considera no apta a partir de 4.000 µS/cm." },
  },
  "Manganeso": {
    gl: { quees: "Metal presente de forma natural no terreo. En exceso pode dar cor e turbidez á auga e deixar manchas na roupa e nos sanitarios.", limite: "Valor paramétrico: 50 µg/L. A auga considérase non apta a partir de 80 µg/L." },
    es: { quees: "Metal presente de forma natural en el terreno. En exceso puede dar color y turbidez al agua y dejar manchas en la ropa y los sanitarios.", limite: "Valor paramétrico: 50 µg/L. El agua se considera no apta a partir de 80 µg/L." },
  },
  "Oxidabilidad": {
    gl: { nombre: "Oxidabilidade", quees: "Mide a materia orgánica da auga que se pode oxidar.", limite: "Valor paramétrico: 5,0 mg O₂/L. A auga considérase non apta a partir de 7,0 mg O₂/L." },
    es: { quees: "Mide la materia orgánica del agua que se puede oxidar.", limite: "Valor paramétrico: 5,0 mg O₂/L. El agua se considera no apta a partir de 7,0 mg O₂/L." },
  },
  "Sodio": {
    gl: { quees: "Sal presente de forma natural na auga.", limite: "Valor paramétrico: 200 mg/L. A auga considérase non apta a partir de 600 mg/L." },
    es: { quees: "Sal presente de forma natural en el agua.", limite: "Valor paramétrico: 200 mg/L. El agua se considera no apta a partir de 600 mg/L." },
  },
  "Sulfato": {
    gl: { quees: "Sal presente de forma natural no terreo. En cantidades altas pode facer a auga máis agresiva coas tubaxes.", limite: "Valor paramétrico: 250 mg/L. A auga considérase non apta a partir de 750 mg/L." },
    es: { quees: "Sal presente de forma natural en el terreno. En cantidades altas puede hacer el agua más agresiva con las tuberías.", limite: "Valor paramétrico: 250 mg/L. El agua se considera no apta a partir de 750 mg/L." },
  },

  /* ----- Parte D: características organolépticas (aquí sí es «valor de referencia») ----- */
  "Color": {
    gl: { quees: "Mide se a auga ten cor visible.", limite: "Valor de referencia: 15 mg/L Pt/Co." },
    es: { quees: "Mide si el agua tiene color visible.", limite: "Valor de referencia: 15 mg/L Pt/Co." },
  },
  "Olor": {
    gl: { quees: "Índice de dilución: cantas veces hai que diluír a auga ata que deixa de notarse o olor.", limite: "Valor de referencia: 3 (índice de dilución)." },
    es: { quees: "Índice de dilución: cuántas veces hay que diluir el agua hasta que deja de notarse el olor.", limite: "Valor de referencia: 3 (índice de dilución)." },
  },
  "Sabor": {
    gl: { quees: "Índice de dilución: cantas veces hai que diluír a auga ata que deixa de notarse o sabor.", limite: "Valor de referencia: 3 (índice de dilución)." },
    es: { quees: "Índice de dilución: cuántas veces hay que diluir el agua hasta que deja de notarse el sabor.", limite: "Valor de referencia: 3 (índice de dilución)." },
  },
};

/* ---------- Idioma ---------- */
const LOCALES = { gl: "gl-ES", es: "es-ES" };
let idioma = IDIOMA_POR_DEFECTO;

/* Devuelve un texto en el idioma actual y rellena los huecos {clave}. */
function t(clave, valores = {}) {
  let texto = TEXTOS[idioma][clave];
  if (texto === undefined) texto = TEXTOS[IDIOMA_POR_DEFECTO][clave];
  if (texto === undefined) return clave;
  for (const [nombre, valor] of Object.entries(valores)) {
    texto = texto.split(`{${nombre}}`).join(String(valor));
  }
  return texto;
}

function infoParametro(nombreSinac) {
  const entrada = PARAMETROS[nombreSinac];
  return (entrada && entrada[idioma]) || {};
}

function guardarIdioma(codigo) {
  try {
    localStorage.setItem("watercheck-idioma", codigo);
  } catch (error) {
    /* si el navegador no deja guardar, no pasa nada */
  }
}

function leerIdiomaGuardado() {
  try {
    const guardado = localStorage.getItem("watercheck-idioma");
    return TEXTOS[guardado] ? guardado : null;
  } catch (error) {
    return null;
  }
}

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
  return fecha.toLocaleDateString(LOCALES[idioma], { day: "numeric", month: "long", year: "numeric" });
}

function fechaCorta(fecha) {
  return fecha.toLocaleDateString(LOCALES[idioma]);
}

function hace(meses) {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - meses);
  return fecha;
}

function ventanaTexto() {
  if (MESES_RECIENTES % 12 === 0) {
    const anios = MESES_RECIENTES / 12;
    return anios === 1 ? t("anio.uno") : t("anio.varios", { n: anios });
  }
  return t("meses", { n: MESES_RECIENTES });
}

function numero(valor) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString(LOCALES[idioma], { maximumFractionDigits: 6 });
}

/* Convierte "texto {c1} texto {c2}" en texto con etiquetas <code>. */
function textoConCodigos(texto, codigos) {
  return texto.split(/(\{c\d\})/).map((parte) => {
    const m = /^\{c(\d)\}$/.exec(parte);
    return m ? crear("code", { text: codigos[Number(m[1]) - 1] }) : parte;
  });
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
  const info = infoParametro(p.parametro);
  const nombre = info.nombre || p.parametro;
  const prefijo = clase === "no-apta" ? t("chip.causa") : t("chip.aviso");
  return crear(
    "span",
    { class: `chip chip--${clase}` },
    crear("span", { class: "sr", text: prefijo }),
    `${nombre} ${numero(p.valor)} ${p.unidad || ""}`.trim()
  );
}

function pintarParametro(p, clase) {
  const info = infoParametro(p.parametro);
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
    [t("meta.punto"), bonito(d.punto_muestreo)],
    [t("meta.zona"), bonito(d.zona_abastecimiento)],
    [t("meta.fecha"), b.fecha],
    [t("meta.tipo"), [d.tipo_analisis, d.tipo_boletin].filter(Boolean).join(", ")],
    [t("meta.lab"), (d.laboratorios || []).join(", ")],
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
      crear("th", { scope: "row", text: infoParametro(p.parametro).nombre || p.parametro }),
      crear("td", { class: "num", text: numero(p.valor) }),
      crear("td", { text: p.unidad || "" }),
      crear("td", { text: noApta ? t("estado.causa") : marcado ? t("estado.aviso") : "" })
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
          crear("th", { scope: "col", text: t("tabla.parametro") }),
          crear("th", { scope: "col", class: "num", text: t("tabla.valor") }),
          crear("th", { scope: "col", text: t("tabla.unidad") }),
          crear("th", { scope: "col", text: t("tabla.estado") })
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
        text: noApta ? t("etiqueta.no_apta") : t("etiqueta.apta"),
      }),
      crear("span", { class: "fecha", text: fechaLarga(b.fecha_date) }),
      crear("span", { class: "tipo", text: TEXTOS[idioma][`tipo.${b.tipo}`] || b.tipo })
    ),
    d && d.punto_muestreo
      ? crear("div", { class: "donde", text: `${t("meta.punto")}: ${bonito(d.punto_muestreo)}` })
      : null,
    causas.length || avisos.length
      ? crear("div", { class: "chips" }, causas.map((p) => chip(p, "no-apta")), avisos.map((p) => chip(p, "aviso")))
      : null
  );

  /* Contenido que aparece al abrir */
  const cuerpo = crear("div", { class: "analisis-cuerpo" });

  if (!d) {
    cuerpo.append(crear("p", { text: t("sin.detalle") }));
  } else {
    if (noApta && causas.length) {
      cuerpo.append(crear("p", { text: t("causas.intro") }));
      causas.forEach((p) => cuerpo.append(pintarParametro(p, "no-apta")));
    } else if (noApta) {
      cuerpo.append(crear("p", { text: t("sin.causa") }));
    }

    if (avisos.length) {
      cuerpo.append(crear("p", { text: noApta ? t("avisos.noapta") : t("avisos.apta") }));
      avisos.forEach((p) => cuerpo.append(pintarParametro(p, "aviso")));
    }

    if (!noApta && !avisos.length) {
      cuerpo.append(crear("p", { text: t("sin.marcas") }));
    }

    if (noApta) {
      cuerpo.append(crear("p", { text: t("nota.noapta") }));
    }

    if (d.recomendacion) {
      cuerpo.append(crear("p", { text: t("recomendacion", { texto: d.recomendacion }) }));
    }

    cuerpo.append(pintarMeta(b, d));

    if (params.length) {
      const todos = crear(
        "details",
        { class: "todos" },
        crear("summary", { text: t("todos", { n: params.length }) })
      );
      // La tabla se dibuja solo cuando la persona abre el desplegable
      todos.addEventListener("toggle", () => {
        if (todos.open && !todos.dataset.listo) {
          todos.dataset.listo = "1";
          todos.append(crear("p", { class: "nota-ceros", text: t("nota.ceros") }), pintarTabla(params));
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
    const tipo = (TEXTOS[idioma][`tipo.${b.tipo}`] || b.tipo).toLowerCase();
    const calif = TEXTOS[idioma][`calif.${b.calificacion}`] || "";
    const descripcion = `${fechaCorta(b.fecha_date)}: ${tipo}, ${calif}`;
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
    crear("li", {}, crear("span", { class: "vial vial--mini vial--apta", "aria-hidden": "true" }), t("leyenda.apta")),
    crear("li", {}, crear("span", { class: "vial vial--mini vial--no-apta", "aria-hidden": "true" }), t("leyenda.noapta")),
    crear("li", {}, crear("span", { class: "vial vial--mini vial--sin", "aria-hidden": "true" }), t("leyenda.sin"))
  );

  return crear(
    "div",
    {},
    crear("ul", { class: "tira", "aria-label": t("tira.aria", { n: orden.length, a: aptos, na: noAptos }) }, tubos),
    leyenda,
    crear("p", { class: "leyenda-nota", text: t("leyenda.nota") })
  );
}

function pintarRed(red) {
  const a = analizarRed(red);

  let clase = "sin-datos";
  let titular = t("red.sin");
  let detalle = "";

  if (a.ultimo) {
    detalle = t("red.ultima", { fecha: fechaLarga(a.ultimo.fecha_date) });
    if (a.recientes.length) {
      clase = "incidencia";
      const n = a.recientes.length;
      titular = t(n === 1 ? "red.uno" : "red.varios", { n, v: ventanaTexto() });
    } else {
      clase = "ok";
      titular = t("red.ok", { v: ventanaTexto() });
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
      ? crear("p", { class: "localidades" }, crear("strong", { text: t("red.abastece") }), localidades.join(", "))
      : null,
    a.lista.length ? pintarTira(a.lista) : null
  );

  if (a.recientes.length) {
    seccion.append(crear("h4", { class: "subtitulo", text: t("sub.noapta", { v: ventanaTexto() }) }), pintarLista(a.recientes));
  }
  if (a.ultimoAptoCompleto) {
    seccion.append(crear("h4", { class: "subtitulo", text: t("sub.ultimoapto") }), pintarLista([a.ultimoAptoCompleto]));
  }
  if (a.antiguos.length) {
    seccion.append(
      crear(
        "details",
        { class: "antiguas" },
        crear("summary", { text: t("sub.antiguas", { n: a.antiguos.length }) }),
        pintarLista(a.antiguos)
      )
    );
  }
  return seccion;
}

/* ---------- Lo que hay ahora en la zona de resultados ----------
   Guardamos QUÉ se está enseñando (un concello, un mensaje o nada)
   para poder repintarlo si la persona cambia de idioma. */
const zonaResultado = $("#resultado");
let vista = { tipo: "vacia" };

function pintarMunicipio(datos, enfocar) {
  const redes = datos.redes || [];
  const provincia = provinciaDe(datos.codigo);
  // Fecha de la última comprobación de la provincia; si no existe, la del archivo del concello
  const fechaComprobada = estado[String(datos.codigo).slice(0, 2)] || datos.actualizado;
  const actualizado = fechaComprobada ? new Date(`${fechaComprobada}T00:00:00`) : null;

  const partes = [];
  if (provincia) partes.push(t("mun.prov", { p: provincia }));
  partes.push(redes.length === 1 ? t("mun.red1") : t("mun.redes", { n: redes.length }));
  if (actualizado) partes.push(t("mun.act", { fecha: fechaLarga(actualizado) }));

  const titulo = crear("h2", { tabindex: "-1", text: bonito(datos.nombre) });
  const cabecera = crear(
    "header",
    { class: "municipio-cab" },
    titulo,
    crear("p", { text: partes.join(" ") }),
    redes.length > 1 ? crear("p", { text: t("mun.guia") }) : null
  );

  zonaResultado.replaceChildren(cabecera);

  if (redes.length === 0) {
    zonaResultado.append(crear("div", { class: "mensaje" }, t("mun.sinredes")));
  }
  redes.forEach((red) => zonaResultado.append(pintarRed(red)));

  if (enfocar) titulo.focus();
}

function pintarMensaje(v) {
  const texto = textoConCodigos(t(v.clave), v.codigos || []);
  zonaResultado.replaceChildren(
    crear("div", { class: v.error ? "mensaje mensaje--error" : "mensaje", role: v.error ? "alert" : null }, texto)
  );
}

function pintarVista(enfocar) {
  if (vista.tipo === "municipio") pintarMunicipio(vista.datos, enfocar);
  else if (vista.tipo === "mensaje") pintarMensaje(vista);
  else zonaResultado.replaceChildren();
}

function mostrarMensaje(clave, opciones = {}) {
  vista = { tipo: "mensaje", clave, codigos: opciones.codigos, error: Boolean(opciones.error) };
  pintarVista(false);
}

/* ---------- Carga de datos ---------- */
let indice = [];
let estado = {};  // fecha de la última comprobación de cada provincia (data/estado.json)

function provinciaDe(codigo) {
  const m = indice.find((x) => x.codigo === codigo);
  return m ? m.provincia : "";
}

async function cargarMunicipio(codigo, guardarEnUrl) {
  if (!/^\d{5}$/.test(codigo)) return;
  mostrarMensaje("cargando");
  try {
    const respuesta = await fetch(`${RUTA_DATOS}municipios/${codigo}.json`);
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const datos = await respuesta.json();
    vista = { tipo: "municipio", datos };
    pintarVista(true);
    if (guardarEnUrl) history.pushState({}, "", `?m=${codigo}`);
  } catch (error) {
    console.error(error);
    mostrarMensaje("error.datos", { error: true });
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
  if (elegido) elegir(elegido);
  else mostrarMensaje("nofound");
});

/* ---------- Ejemplos clicables bajo el buscador ---------- */
function pintarEjemplos() {
  const zona = $("#ejemplos");
  const muestra = indice.slice(0, 3);
  zona.replaceChildren();
  if (!muestra.length) return;
  zona.append(t("ejemplos.pre"));
  muestra.forEach((m, i) => {
    zona.append(crear("button", { type: "button", onclick: () => elegir(m), text: m.bonito }));
    if (i < muestra.length - 2) zona.append(", ");
    else if (i === muestra.length - 2) zona.append(t("ejemplos.o"));
  });
  zona.append(t("ejemplos.fin"));
}

/* ---------- Cambio de idioma ---------- */
const botonesIdioma = document.querySelectorAll("[data-idioma]");

function aplicarIdioma() {
  document.documentElement.lang = idioma;
  document.title = t("titulo");
  const descripcion = $('meta[name="description"]');
  if (descripcion) descripcion.setAttribute("content", t("meta"));

  // Textos fijos de index.html
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  // Atributos (placeholder, aria-label): data-i18n-attr="atributo:clave"
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const [atributo, clave] = el.dataset.i18nAttr.split(":");
    el.setAttribute(atributo, t(clave));
  });

  botonesIdioma.forEach((boton) => {
    boton.setAttribute("aria-pressed", String(boton.dataset.idioma === idioma));
  });

  cerrarSugerencias();
  pintarEjemplos();
  pintarVista(false);
}

function cambiarIdioma(codigo) {
  if (!TEXTOS[codigo] || codigo === idioma) return;
  idioma = codigo;
  guardarIdioma(codigo);
  aplicarIdioma();
}

botonesIdioma.forEach((boton) => {
  boton.addEventListener("click", () => cambiarIdioma(boton.dataset.idioma));
});

/* ---------- Arranque ---------- */
function leerUrl() {
  const codigo = new URLSearchParams(location.search).get("m");
  if (codigo) {
    cargarMunicipio(codigo, false);
  } else {
    vista = { tipo: "vacia" };
    pintarVista(false);
  }
}

async function iniciar() {
  idioma = leerIdiomaGuardado() || IDIOMA_POR_DEFECTO;
  aplicarIdioma();

  if (location.protocol === "file:") {
    mostrarMensaje("error.file", {
      error: true,
      codigos: ["python3 -m http.server 8000", "http://localhost:8000"],
    });
    return;
  }

  try {
    const respuesta = await fetch(`${RUTA_DATOS}indice.json`);
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const bruto = await respuesta.json();
    indice = bruto.map((m) => ({ ...m, bonito: bonito(m.nombre), plano: plano(m.nombre) }));
  } catch (error) {
    console.error(error);
    mostrarMensaje("error.indice", { error: true, codigos: ["python3 crear_indice.py"] });
    return;
  }

  // Es opcional: si todavía no existe, se usa la fecha de cada archivo
  try {
    const respuestaEstado = await fetch(`${RUTA_DATOS}estado.json`);
    if (respuestaEstado.ok) estado = await respuestaEstado.json();
  } catch (error) {
    estado = {};
  }

  pintarEjemplos();
  leerUrl();
}

window.addEventListener("popstate", leerUrl);
iniciar();