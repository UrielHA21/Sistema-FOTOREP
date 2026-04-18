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
