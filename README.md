# FOTOREP: Sistema de Gestión de Evidencia Fotográfica

## Descripción del Proyecto
Aplicación web de nivel empresarial diseñada para la estructuración, gestión y exportación estandarizada de reportes de evidencia fotográfica orientada a la Comisión Federal de Electricidad (CFE) - División Sureste. El sistema tiene como objetivo principal optimizar el flujo de trabajo de residentes de obra y supervisores, transicionando de un ensamblado de documentos manual y propenso a errores hacia un modelo de generación automatizada, auditable y alineado a las normativas de la institución.

## Características Arquitectónicas y Funcionales

* **Renderizado de Documentos PDF (Cloud Functions):** Implementación de un motor de renderizado del lado del servidor utilizando `pdf-lib`. Se garantiza una maquetación rígida en formato A4, inyección de firmas dinámicas y algoritmos de escalado inteligente de imágenes (`Contain Fit`) para asegurar la fidelidad visual y el cumplimiento de los estándares de auditoría.
* **Control de Acceso Basado en Roles (RBAC):** Arquitectura de seguridad integrada con autenticación de tokens JWT. Se establecen fronteras de acceso mediante la segregación de perfiles:
  * **Administrador:** Privilegios de escritura y lectura globales, con acceso a la gestión de catálogos y modificación de la configuración global (Singleton).
  * **Colaborador:** Acceso operativo restringido exclusivamente a la captura de datos y exportación de reportes.
* **Modelado de Datos (Patrón Singleton y Catálogos Dinámicos):** Implementación del patrón de diseño Singleton para gestionar la configuración institucional estática, acoplado con un sistema de catálogos relacionales para firmas zonales, eliminando la redundancia y garantizando la integridad referencial.
* **Optimización de Procesamiento de Imágenes:** Desarrollo de un motor de compresión nativo en el cliente. El tratamiento de imágenes se realiza previo a la transmisión de red hacia el almacenamiento en la nube, reduciendo la latencia de carga y optimizando el consumo de ancho de banda.
* **Interfaz de Previsualización WYSIWYG:** Módulo de renderizado en tiempo real que permite validar la estructura del documento y la distribución de las evidencias fotográficas mediante controles de visualización dinámicos antes de su compilación en el servidor.
* **Gestión Asíncrona de Autenticación y Recuperación de Accesos:** Refactorización del ciclo de vida de la sesión (estableciendo una única fuente de verdad) para la mitigación de condiciones de carrera (race conditions) durante el enrutamiento. Integra un flujo automatizado de recuperación de credenciales a través de los servicios de Firebase Authentication.
* **Seguridad de Enrutamiento y Prevención de Pérdida de Datos:** Implementación de bloqueos preventivos de navegación (Routing Guards) en interfaces operativas críticas. Este mecanismo intercepta eventos del ciclo de vida del navegador (`beforeunload`) para asegurar la integridad de transacciones asíncronas de entrada/salida (I/O), previniendo interrupciones durante cargas masivas de archivos y exportaciones de binarios.
* **Ingeniería de Calidad (Testing) y Estandarización de Interfaz:** Integración de un marco robusto de pruebas unitarias empleando `Vitest` y simulaciones del modelo de objetos del documento (`jsdom`) para validar la lógica de estado y renderización. En paralelo, se implementaron normativas globales de accesibilidad visual y consistencia de diseño UI/UX para todos los elementos interactivos del sistema.

## Pila Tecnológica (Tech Stack)

**Frontend:**
* React 18 - Biblioteca de interfaces de usuario
* TypeScript - Superconjunto de JavaScript con tipado estático estricto
* Mantine v7 - Sistema de diseño y librería de componentes
* React Router - Gestión de enrutamiento y estado de navegación

**Backend e Infraestructura (BaaS):**
* Authentication - Gestión de sesiones y protección de endpoints
* Firestore - Base de datos NoSQL para almacenamiento de metadatos, catálogos y perfiles RBAC
* Cloud Storage - Almacenamiento seguro de recursos multimedia
* Cloud Functions (Node.js/V2) - Microservicios dedicados al ensamblaje intensivo de binarios

## Estructura del Repositorio

El código fuente sigue un patrón de diseño modular para facilitar su escalabilidad y mantenimiento:

```text
/
├── src/
│   ├── assets/          # Recursos estáticos e institucionales
│   ├── modules/         # Dominios principales (Administración, Reportes, Exportación)
│   ├── shared/          # Componentes compartidos, utilidades y contextos (AuthContext)
│   └── App.tsx          # Componente raíz y enrutador principal
├── functions/
│   └── src/index.ts     # Lógica central del motor de procesamiento PDF
└── package.json         # Dependencias y configuración del entorno

## Novedades y Optimizaciones Recientes

El sistema cuenta con un conjunto de optimizaciones enfocadas en rendimiento de red, accesibilidad universal (WCAG), compatibilidad de navegadores y seguridad en producción:

### 1. Rendimiento y Optimización en Carga Masiva
* **Procesamiento en Paralelo (`Promise.all`):** Refactorización del flujo de carga masiva en [useParesFotograficos.ts](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/modules/reports/hooks/useParesFotograficos.ts) para enviar peticiones concurrentes a Firebase Storage y Firestore en lugar de realizarlas secuencialmente, maximizando la eficiencia de carga de archivos en lotes.
* **Metadatos y Cabeceras en Firebase Storage:** Se configuró la subida de archivos en [useParesFotograficos.ts](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/modules/reports/hooks/useParesFotograficos.ts) agregando metadatos explícitos (`contentType: 'image/jpeg'` y `cacheControl: 'public, max-age=31536000, immutable'`) a la llamada de `uploadBytes`. Esto garantiza que Google Storage sirva los recursos de imagen con el tipo de medio correcto (evitando advertencias de tipo `application/json` o `text/plain`) y almacenamiento persistente en caché óptimo.
* **Compresión Confiable de Imágenes:** Se configuró el optimizador local en [imageOptimizer.ts](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/shared/utils/imageOptimizer.ts) para realizar la compresión en el hilo principal (`useWebWorker: false`), eliminando bloqueos y fallas de inicialización de Web Workers en navegadores restringidos o bajo conexiones saturadas.
* **Control del Ciclo de Vida de Previsualización:** El renderizado de previsualizaciones locales en [MassUploadPage.tsx](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/modules/reports/MassUploadPage.tsx) se encapsuló en un componente autónomo (`ImagePreview`) que libera recursos de memoria mediante `URL.revokeObjectURL` al desmontarse, mitigando la sobrecarga y fugas de memoria en el navegador.
* **Progreso Granular por Imagen:** El visualizador de carga reporta ahora el estado individual de cada imagen procesada (ej. *"Procesando foto 3 de 10..."*) en tiempo real, en lugar de hacerlo de forma agrupada por par completo, eliminando la percepción de congelamiento de la aplicación.

### 2. Accesibilidad Universal y Widget Flotante (WCAG)
* **Widget de Accesibilidad Dinámico:** Incorporación de un control flotante y arrastrable lateralmente que inyecta en el tema de la aplicación configuraciones como:
  * **Alto Contraste:** Paleta de colores oscura especial con la identidad visual de CFE que cumple con el estándar de relación de contraste WCAG.
  * **Escalado de Texto:** Incremento dinámico de la escala de la tipografía global para legibilidad.
  * **Fuente para Dislexia:** Configuración alternativa de la tipografía para facilitar la lectura.
  * **Modo Minimalista:** Colapso responsivo de los botones de acción para mostrar exclusivamente iconos (ahorrando espacio en pantallas táctiles) y simplificación de las interfaces.
* **Estandarización de Controles y Botones Interactivos:** 
  * Se inyectaron atributos `aria-label` y `title` en todos los elementos interactivos `ActionIcon` de la aplicación (menú flotante, botones de edición en tablas, controles de rotación/espejo/zoom en el editor de imágenes, menú de usuario y borrado), asegurando un nombre descriptivo discernible para lectores de pantalla ("Buttons must have discernible text").
  * Inyección de atributos `aria-label`, `title` y descripciones en componentes invisibles del DOM (como los inputs de archivos autogenerados de Dropzone) y tarjetas de previsualización para cumplir con las directivas de lectores de pantalla.

### 3. Seguridad en la Nube y Políticas de Caché
* **Directivas CSP en Producción:** Ajuste de las reglas de seguridad en [firebase.json](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/firebase.json) agregando la directiva `worker-src 'self' blob; child-src 'self' blob;` para permitir la instanciación de Web Workers de manera controlada y habilitación de `frame-ancestors 'none'` para anular amenazas de clickjacking.
* **Estrategias de Caché y Entrega de Recursos:**
  * **Páginas de Aplicación (`index.html`):** Configurado con `Cache-Control: no-cache` para garantizar que los clientes carguen inmediatamente las actualizaciones y bundles más recientes.
  * **Activos Compilados (`/assets/**`):** Forzado con `Cache-Control: public, max-age=31536000, immutable` para almacenamiento a largo plazo, complementado con hashes de cache-busting dinámicos de Vite.
* **Mitigación de Cabeceras Obsoletas:** Reemplazo de herramientas vulnerables por directivas modernas, como la configuración de `X-Content-Type-Options: nosniff` y la anulación del filtro XSS antiguo mediante `X-XSS-Protection: 0`.

### 4. Compatibilidad Global de CSS (Autoprefixer)
* **Integración PostCSS:** Inclusión del procesador `autoprefixer` en la configuración de compilación en [vite.config.ts](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/vite.config.ts). Esto asegura que propiedades de estilos experimentales o específicas de navegadores (como `appearance`, `text-size-adjust` o `text-wrap`) tengan sus prefijos correspondientes y funcionen de manera idéntica en Edge, Chrome, Safari y Firefox.

### 5. Flujo de Trabajo, Control de Estados y Validaciones
* **Ciclo de Vida de Reportes y Circuitos:** Implementación de un flujo lógico de estados secuenciales y validados para estructurar la revisión:
  * **Estados de Circuito:** `Pendiente` (por defecto al crear), `En Progreso` (transiciona automáticamente al cargar fotos masivas), y `Realizado` (marcado explícitamente mediante el botón en el Editor de Imágenes).
  * **Estados de Reporte:** `Borrador` (inicial), `En Revisión` (se activa únicamente cuando todos los circuitos están en `En Progreso` o `Realizado`), y `Completado` (se alcanza si todos los circuitos están marcados como `Realizado`).
* **Validación de Exportación:** Seguridad contra descargas de reportes incompletos. El botón de exportación (ZIP/PDF) en [ExportacionPage.tsx](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/modules/export/ExportacionPage.tsx) permanece deshabilitado si el reporte está en estado `Borrador`, requiriendo estar en `En Revisión` o `Completado`.
* **Consolidación de Acciones:** Se reemplazó el botón "Descargar ZIP" del editor de imágenes por el botón de control de estado del circuito ("Marcar como Realizado"), delegando las tareas de exportación al módulo unificado correspondiente.

### 6. Búsqueda Inteligente Adaptativa y Mejoras de Usabilidad
* **Búsqueda Compuesta (`useSmartSearch.ts`):** Nuevo hook que parsea cadenas libres en tokens lógicos en [useSmartSearch.ts](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/modules/reports/hooks/useSmartSearch.ts):
  * Permite combinar parámetros como tipo de formato ("tipo a", "tb"), estado ("borrador", "en revision"), o texto libre (nombre de zona, área, revisor o estimación) en una sola consulta estructurada (ej. `"villaflores b"`, `"borrador tipo a ing"`).
  * Soporta normalización (insensibilidad a mayúsculas, minúsculas y acentos) y aliases.
* **Componentes de Búsqueda Interactivos (Dashboard):** La barra de búsqueda inteligente en [DashboardPage.tsx](file:///D:/andre/proyectos%20vs/Sistema%20Inteligente%20REP/fotorep-frontend/src/modules/reports/DashboardPage.tsx) incluye ahora:
  * Chips de colores dinámicos que muestran visualmente los filtros identificados (Tipo de Formato, Estado, Texto Libre).
  * Contador en tiempo real de resultados coincidentes.
  * Pantalla de estado vacío ("Sin resultados") con sugerencias.
  * Soporte de teclado (ejecución con `Enter`, borrado rápido con `Esc` o botón "X").
* **Consistencia de Espaciado y Alineación en UI:**
  * **Modo Minimalista Corregido:** Se solucionó el desplazamiento a la izquierda de los iconos en botones pequeños cuando el texto se ocultaba. Ahora el contenido se centra simétricamente evaluando la propiedad `showText` para centrar directamente el componente `<Icon />` sin el margen de `leftSection`.
  * **Corrección de Padding:** Remoción de la propiedad limitante `px={0}` de todos los botones de retroceso ("Volver al Dashboard" y "Volver") en las vistas principales (`CircuitosPage`, `EditorParesPage`, `ExportacionPage`, `PrevisualizacionPdfPage`, `MassUploadPage`), eliminando la colisión del texto con los bordes del botón.
  * **Iconografía Contextualizada:** Adición del icono `IconMapPin` junto al nombre de la zona/área y reemplazo del icono genérico de circuito (`IconPlug`) por `IconTree` (bosque/árboles) para ajustarse mejor a la naturaleza de la infraestructura.
