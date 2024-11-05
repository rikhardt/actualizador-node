# Actualizador de Node.js

Esta herramienta permite actualizar fácilmente la versión de Node.js en entornos WSL, Linux y macOS utilizando NVM (Node Version Manager).

## Estructura del Proyecto

```
actualizador-node/
├── src/
│   ├── config/
│   │   └── config.js         # Manejo de configuración
│   ├── services/
│   │   ├── actualizador.js   # Lógica principal
│   │   └── nodeService.js    # Servicios de Node.js
│   └── utils/
│       ├── colors.js         # Utilidades de colores
│       ├── command.js        # Ejecución de comandos
│       ├── logger.js         # Sistema de logging
│       └── system.js         # Utilidades del sistema
├── index.js                  # Punto de entrada
├── package.json
└── README.md
```

## Requisitos previos

- NVM (Node Version Manager) instalado y configurado correctamente
- Bash shell disponible (para WSL, Linux y macOS)
- Permisos de escritura en el directorio de instalación de NVM

## Características principales

- Detección automática del sistema operativo (WSL, Linux, macOS)
- Verificación y validación de NVM
- Múltiples métodos de instalación:
  - Instalación desde repositorios oficiales
  - Instalación desde archivo local
  - Actualización a última versión LTS par
- Gestión inteligente de versiones:
  - Verificación de versiones instaladas
  - Determinación automática de versión objetivo
  - Validación de formato de versiones
- Sistema robusto de manejo de errores y logging
- Actualización automática de .nvmrc
- Gestión de dependencias del proyecto
- Interfaz de usuario amigable con colores

## Instalación

1. Clone el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/actualizador-node.git
   ```

2. Instale las dependencias:
   ```bash
   cd actualizador-node
   npm install
   ```

## Uso

1. Ejecute el actualizador:
   ```bash
   node index.js
   ```
   o
   ```bash
   npm start
   ```

2. Siga las instrucciones en pantalla para:
   - Seleccionar el método de instalación
   - Elegir la versión de Node.js
   - Confirmar la actualización
   - Actualizar dependencias (opcional)

## Métodos de Instalación

### 1. Desde Repositorios Oficiales
- Descarga automática desde nodejs.org
- Verificación de integridad
- Instalación optimizada

### 2. Desde Archivo Local
- Soporte para archivos .tar.xz, .tar.gz y .pkg
- Validación de formato y contenido
- Instalación segura

### 3. Última Versión LTS Par
- Detección automática de versiones disponibles
- Selección inteligente de versión objetivo
- Actualización directa

## Manejo de Errores

El sistema incluye:
- Validación exhaustiva de entradas
- Logging detallado de operaciones
- Mensajes de error claros y descriptivos
- Recuperación automática de fallos
- Rollback en caso de errores críticos

## Configuración

El sistema mantiene un archivo de configuración (config.json) que almacena:
- Última versión utilizada
- Método de instalación preferido
- Configuraciones personalizadas

## Logs

Los logs incluyen:
- Timestamp con zona horaria
- Nivel de log (INFO, WARN, ERROR)
- Mensajes detallados
- Seguimiento de operaciones

## Solución de problemas

1. Verificar NVM:
   ```bash
   nvm --version
   ```

2. Comprobar permisos:
   ```bash
   ls -la ~/.nvm
   ```

3. Verificar conectividad:
   ```bash
   curl -Is https://nodejs.org/dist/
   ```

## Contribuir

1. Fork el repositorio
2. Cree una rama para su feature (`git checkout -b feature/AmazingFeature`)
3. Commit sus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abra un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - vea el archivo LICENSE para más detalles.
