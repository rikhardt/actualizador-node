# Actualizador de Node.js

Esta herramienta permite actualizar fácilmente la versión de Node.js en entornos WSL, Linux y macOS utilizando NVM (Node Version Manager).

## Requisitos previos

- NVM (Node Version Manager) instalado y configurado correctamente.
- Bash shell disponible (para WSL, Linux y macOS).

## Características

- Detección automática del sistema operativo (WSL, Linux, macOS).
- Verificación de la versión actual de Node.js.
- Opciones para seleccionar la versión de actualización:
  - Ingresar una versión específica.
  - Usar la última versión LTS par disponible.
  - Ver y seleccionar de una lista de versiones disponibles.
- Múltiples opciones de instalación:
  - Desde repositorios oficiales.
  - Desde un archivo local.
  - Desde SharePoint (para entornos corporativos).
- Actualización opcional de dependencias del proyecto después de instalar la nueva versión de Node.js.
- Creación/actualización automática del archivo .nvmrc.
- Manejo mejorado de permisos y advertencias cuando se ejecuta con privilegios de superusuario.

## Cómo usar

1. Asegúrese de tener NVM instalado y configurado correctamente.
2. Clone este repositorio o descargue los archivos en su máquina local.
3. Abra una terminal y navegue hasta el directorio del proyecto.
4. Ejecute el siguiente comando:

   ```
   node index.js
   ```

   O si prefiere usar npm:

   ```
   npm start
   ```

5. Siga las instrucciones en pantalla para seleccionar la versión de Node.js que desea instalar y el método de instalación.
6. Después de instalar la nueva versión de Node.js, se le preguntará si desea actualizar las dependencias del proyecto.

### Uso con privilegios elevados

Se recomienda ejecutar el script sin privilegios de superusuario siempre que sea posible. Sin embargo, si necesita ejecutar el script con privilegios elevados, use el siguiente comando:

```
sudo -E -u $SUDO_USER node index.js
```

Este comando ejecutará el script con privilegios de superusuario, pero mantendrá el entorno del usuario original, lo que es crucial para el correcto funcionamiento de NVM.

**Nota importante:** El script detectará si se está ejecutando con sudo y mostrará una advertencia. Se le pedirá confirmación antes de continuar para evitar posibles problemas de permisos.

## Flujo de la aplicación

1. Detección del sistema operativo y verificación de privilegios de ejecución.
2. Verificación de NVM.
3. Obtención de la versión actual de Node.js.
4. Verificación de actualizaciones disponibles.
5. Selección de la versión objetivo.
6. Elección del método de instalación (repositorios oficiales, archivo local, SharePoint).
7. Instalación de la nueva versión de Node.js.
8. Actualización opcional de las dependencias del proyecto con la nueva versión de Node.js.

## Notas importantes

- La herramienta utiliza NVM para gestionar las versiones de Node.js. Asegúrese de que NVM esté correctamente instalado y configurado en su sistema.
- Para entornos WSL, asegúrese de ejecutar la herramienta dentro del entorno WSL.
- Si elige la opción de instalación desde un archivo local o SharePoint, asegúrese de tener los permisos necesarios y acceso a los archivos requeridos.
- La actualización de las dependencias del proyecto se realiza después de instalar la nueva versión de Node.js para garantizar la compatibilidad.
- El script ahora maneja mejor los problemas de permisos y proporciona advertencias claras cuando se ejecuta con privilegios elevados.

## Solución de problemas

Si encuentra algún problema durante la ejecución de la herramienta, asegúrese de:

1. Tener NVM correctamente instalado y configurado.
2. Tener permisos suficientes para ejecutar comandos y acceder a los directorios necesarios.
3. Tener una conexión a internet estable si está instalando desde repositorios oficiales o SharePoint.
4. Si necesita usar privilegios elevados, use el comando recomendado en la sección "Uso con privilegios elevados".
5. Si recibe advertencias sobre permisos, considere ejecutar el script sin sudo o seguir las instrucciones proporcionadas para usar sudo correctamente.

Si los problemas persisten, por favor, abra un issue en este repositorio con una descripción detallada del problema y los pasos para reproducirlo.

## Contribuir

Las contribuciones son bienvenidas. Por favor, abra un issue para discutir los cambios propuestos antes de enviar un pull request.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulte el archivo LICENSE para más detalles.
