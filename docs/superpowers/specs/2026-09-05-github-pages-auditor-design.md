# GitHub Pages Auditor Design

## Objetivo

Crear una GitHub Page estática que revise repositorios de grupos CAPSTONE APT122 y entregue un reporte de cambios necesarios según la estructura base de este repositorio.

## Alcance

La página debe:

- Revisar si este repositorio base cumple con la estructura indicada.
- Permitir ingresar una URL de repositorio GitHub.
- Obtener la estructura de carpetas y archivos del repositorio ingresado mediante la API pública de GitHub.
- Comparar la estructura encontrada contra una referencia incluida en este repositorio.
- Mostrar un reporte con elementos correctos, faltantes, ubicados fuera de lugar y extras.
- Mantener el orden esperado de carpetas y archivos en la referencia y en el reporte.

La página no debe agregar código de aplicación de ejemplo para los estudiantes. El código creado corresponde solamente a la GitHub Page de auditoría.

## Arquitectura

La solución será estática y compatible con GitHub Pages. `index.html` define la interfaz, `assets/styles.css` define la presentación, `assets/app.js` conecta la UI con GitHub, `assets/structure-audit.js` contiene la lógica pura de comparación y `expected-structure.json` contiene la estructura base ordenada.

La lógica de auditoría trabaja con rutas normalizadas separadas por `/`. Para carpetas vacías, `.gitkeep` permite que Git conserve la carpeta, pero el reporte acepta una carpeta como presente si existe como entrada de directorio o si contiene archivos.

## Datos

La referencia incluye entradas con:

- `path`: ruta exacta.
- `type`: `file` o `directory`.
- `required`: siempre `true` para la estructura base.
- `gitkeepForEmptyDirectory`: `true` solo en los `.gitkeep` usados para conservar carpetas vacías.

## Flujo

1. Al cargar, la página lee `expected-structure.json`.
2. La página ejecuta una auditoría local de la referencia para mostrar si este repositorio base está completo.
3. El usuario ingresa una URL de GitHub.
4. La página obtiene el repositorio, detecta su rama por defecto y descarga el árbol recursivo.
5. La auditoría compara rutas esperadas contra rutas encontradas.
6. El reporte muestra resumen y listas accionables.

## Manejo de errores

La página debe mostrar mensajes claros cuando la URL no sea válida, el repositorio sea privado sin token, GitHub limite la tasa de peticiones o la API no responda correctamente.

## Verificación

La lógica de comparación tendrá pruebas con `node:test` para validar repositorios completos, faltantes, extras y carpetas conservadas por contenido en vez de `.gitkeep`.
