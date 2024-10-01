# Actualizador Inteligente de Node.js para WSL y macOS

Esta herramienta automatiza el proceso de actualización de Node.js en entornos WSL (Windows Subsystem for Linux) y macOS, teniendo en cuenta las dependencias del proyecto y permitiendo la selección de versiones locales.

## Características

- Compatible con WSL y macOS.
- Detecta la versión actual de Node.js instalada.
- Identifica la siguiente versión par disponible para la actualización.
- Actualiza las dependencias del proyecto en el archivo package.json.
- Permite la selección de versiones de Node.js desde una ubicación local.
- Realiza actualizaciones solo a versiones pares de Node.js.

## Requisitos

- WSL (Windows Subsystem for Linux) o macOS.
- Node.js y npm instalados.
- NVM (Node Version Manager) instalado.

### Instalación de NVM

Si no tiene NVM instalado, puede instalarlo siguiendo estos pasos:

1. Abra su terminal (WSL o macOS).
2. Ejecute el siguiente comando para descargar e instalar NVM:
   ```
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
   ```
3. Cierre y vuelva a abrir su terminal, o ejecute el siguiente comando para cargar NVM:
   ```
   source ~/.nvm/nvm.sh
   ```
4. Verifique que NVM se ha instalado correctamente ejecutando:
   ```
   nvm --version
   ```

## Instalación del Actualizador

1. Clone este repositorio o descargue los archivos en su sistema.
2. Navegue al directorio del proyecto:
   ```
   cd actualizador-node-wsl
   ```
3. Instale las dependencias necesarias:
   ```
   npm install
   ```

## Uso

1. Asegúrese de estar en el directorio del proyecto que desea actualizar.
2. Ejecute el script:
   ```
   node index.js
   ```
3. El script detectará automáticamente si está en WSL o macOS.
4. Se verificará la instalación de NVM y se cargará si es necesario.
5. Siga las instrucciones en pantalla para completar el proceso de actualización.

## Notas importantes

- El script verificará si hay una nueva versión par de Node.js disponible para la actualización.
- Se le preguntará si desea proceder con la actualización.
- Tiene la opción de usar una versión local de Node.js si no tiene acceso a internet para descargar la nueva versión.
- Las dependencias del proyecto se actualizarán automáticamente.

## Solución de problemas

Si encuentra algún problema durante la ejecución del script, asegúrese de:

1. Tener NVM instalado correctamente. Si el script indica que NVM no está instalado, siga las instrucciones en la sección "Instalación de NVM" de este README.
2. Tener permisos suficientes para ejecutar comandos y modificar archivos en el directorio del proyecto.
3. Tener una conexión a internet estable (a menos que esté usando versiones locales).
4. Tener Node.js y npm correctamente instalados en su entorno.

Si los problemas persisten, por favor, revise los mensajes de error proporcionados por el script y consulte la documentación de Node.js, npm y NVM según sea necesario.

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abra un issue para discutir los cambios propuestos o envíe un pull request con sus mejoras.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulte el archivo LICENSE para más detalles.