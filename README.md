# CAPSTONE APT122

Repositorio base para ordenar las evidencias del proyecto CAPSTONE APT122.

## GitHub Pages

Auditor disponible en:

https://ernestoleonidas.github.io/base_capstone/

## Uso del auditor

1. Abrir la GitHub Page.
2. Seleccionar un grupo o pegar la URL de su repositorio GitHub.
3. Presionar `Revisar`.
4. Corregir los archivos o carpetas marcados como faltantes, incorrectos o fuera de estructura.

El auditor revisa repositorios publicos de GitHub usando la estructura definida en `index.json`.

## Validacion por participante

`index.json` contiene los 12 grupos y los 30 participantes del listado del curso.
Las entradas con `perParticipant: true` se exigen una vez por integrante:
1.1, 1.2 y 1.3 de Fase 1; 2.1 de Fase 2; y 3.1 de Fase 3.
Las evidencias grupales y carpetas comunes se comprueban una sola vez.

Cada documento individual debe permanecer en su carpeta `Evidencias Individuales`
y conservar el sufijo del formulario y la extension `.docx`. Por ejemplo:

```text
Fase 1/Evidencias Individuales/Escobar_Ociel_1.1_APT122_AutoevaluacionCompetenciasFase1.docx
Fase 1/Evidencias Individuales/Escobar_Ferrada_Ociel_Andres_1.1_APT122_AutoevaluacionCompetenciasFase1.docx
Fase 1/Evidencias Individuales/oci.escobar_1.1_APT122_AutoevaluacionCompetenciasFase1.docx
```

Se aceptan nombres y apellidos en ambos ordenes, primer nombre o nombres completos,
primer apellido o apellidos completos, y el usuario institucional registrado.
Las tildes, mayusculas y separadores del nombre no cambian la identidad.
Los apellidos compuestos conservan una parte significativa: `De_Gianluca` no basta.

Las plantillas `Apellido_Nombre` no cuentan como entregas. Una identidad ambigua,
un duplicado, un archivo de cero bytes o una carpeta con nombre de documento no
obtienen cumplimiento. El reporte muestra los faltantes por persona.
Gamboa y Najera quedan pendientes hasta completar `firstNames` en el grupo 9;
no se deducen sus nombres desde el repositorio.

Los documentos adicionales estan permitidos dentro de las carpetas de evidencias.
`Bot/`, `index.html`, `index.json` y `README.md` son opcionales para los grupos.
El auditor valida nombres, ubicacion y presencia; no evalua el contenido academico
ni garantiza la integridad interna de un documento Office.

Para un repositorio alternativo, pegar primero su URL y luego seleccionar el grupo.
Las URLs registradas identifican automaticamente al grupo correspondiente.

## Pruebas

```powershell
node --test Bot/*.test.mjs
```

## Estructura esperada

La raiz del repositorio debe contener solamente:

- `Fase 1`
- `Fase 2`
- `Fase 3`
- `README.md`

## Trabajo de los estudiantes

Cada grupo debe mantener los nombres y ubicaciones de las carpetas y archivos base. Los documentos de evidencia se completan o reemplazan manteniendo el mismo nombre cuando corresponda.
