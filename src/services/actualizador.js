const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { colors, colorize } = require('../utils/colors');
const { log } = require('../utils/logger');
const { detectarSistemaOperativo, verificarConectividad } = require('../utils/system');
const { setConfig } = require('../config/config');
const { ejecutarComando } = require('../utils/command');
const {
    obtenerVersionActual,
    verificarNVM,
    verificarActualizaciones,
    determinarVersionObjetivo,
    verificarVersionInstalada,
    descomprimirArchivo,
    moverDirectorio,
    descargarBinarioNode,
    eliminarArchivo
} = require('./nodeService');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function mostrarMenu(opciones) {
    console.log(colorize(colors.fg.cyan, '\nSeleccione una opción:'));
    opciones.forEach((opcion, index) => {
        console.log(colorize(colors.fg.yellow, `${index + 1}. ${opcion}`));
    });
    const seleccion = await pregunta(colorize(colors.fg.green, 'Ingrese el número de su elección: '));
    const indice = parseInt(seleccion) - 1;
    if (indice >= 0 && indice < opciones.length) {
        return indice;
    } else {
        console.log(colorize(colors.fg.red, 'Selección inválida. Por favor, intente de nuevo.'));
        return mostrarMenu(opciones);
    }
}

function validarFormatoVersion(version) {
    const regex = /^v?\d+\.\d+\.\d+$/;
    return regex.test(version);
}

async function solicitarVersionValida() {
    let versionObjetivo;
    do {
        versionObjetivo = await pregunta(colorize(colors.fg.green, 'Ingrese la versión específica de Node.js que desea instalar (formato: vX.X.X): '));
        versionObjetivo = versionObjetivo.trim();
        if (!validarFormatoVersion(versionObjetivo)) {
            console.log(colorize(colors.fg.red, 'Formato de versión no válido. Por favor, use el formato vX.X.X o X.X.X (por ejemplo, v14.17.0 o 14.17.0)'));
        }
    } while (!validarFormatoVersion(versionObjetivo));

    return versionObjetivo.startsWith('v') ? versionObjetivo : `v${versionObjetivo}`;
}

function extraerVersionDesdeNombreArchivo(nombreArchivo) {
    const match = nombreArchivo.match(/v?\d+\.\d+\.\d+/);
    return match ? match[0] : null;
}

function validarArchivoLocal(rutaArchivo) {
    log('info', `Validando archivo local: ${rutaArchivo}`);

    try {
        if (!fs.existsSync(rutaArchivo)) {
            throw new Error('El archivo no existe en la ruta especificada.');
        }

        const stats = fs.statSync(rutaArchivo);
        if (!stats.isFile()) {
            throw new Error('La ruta especificada no es un archivo.');
        }

        const nombreArchivo = path.basename(rutaArchivo).toLowerCase();
        if (!nombreArchivo.endsWith('.tar.xz') && !nombreArchivo.endsWith('.tar.gz') && !nombreArchivo.endsWith('.pkg')) {
            throw new Error(`El archivo no tiene una extensión válida (.tar.xz, .tar.gz o .pkg). Nombre de archivo detectado: ${nombreArchivo}`);
        }

        log('info', `Archivo local validado correctamente.`);
        return true;
    } catch (error) {
        log('error', `Error: ${error.message}`);
        log('warn', 'Compruebe que la ruta sea correcta y que tenga permisos de lectura.');
        log('warn', 'Si estás en un entorno de WSL, la ruta debería ser algo como esto: /mnt/c/Users/<user_name>/Downloads/node-<version>-linux-x64.tar.xz.');
        return false;
    }
}

async function buscarArchivoLocal() {
    while (true) {
        const rutaArchivo = await pregunta(colorize(colors.fg.green, 'Ingrese la ruta completa del archivo de Node.js (o "cancelar" para salir): '));

        if (rutaArchivo.toLowerCase() === 'cancelar') {
            return null;
        }

        // Quitar comillas y espacios al inicio y al final de la ruta
        const rutaLimpia = rutaArchivo.replace(/^['"\s]+|['"\s]+$/g, '');      

        if (validarArchivoLocal(rutaLimpia)) {
            return rutaLimpia;
        }

        console.log(colorize(colors.fg.red, 'Por favor, intente nuevamente con una ruta válida.'));
    }
}

async function instalarDesdeArchivoLocal(rutaArchivo, version) {
    try {
        log('info', `Instalando Node.js versión ${version} desde archivo local...`);
        const directorioTemporal = await descomprimirArchivo(rutaArchivo);
        const directorioDestino = path.join(process.env.NVM_DIR || path.join(process.env.HOME, '.nvm'), 'versions', 'node', version);

        await moverDirectorio(directorioTemporal, directorioDestino);

        await ejecutarComando(`sudo chown -R user ${directorioDestino}`);
        await ejecutarComando(`sudo chmod -R u+w ${directorioDestino}`);
        
        log('info', `Node.js ${version} instalado correctamente en ${directorioDestino}`);
        console.log(colorize(colors.fg.green, `Node.js ${version} instalado correctamente.`));
        
        return true;
    } catch (error) {
        log('error', `Error al instalar desde archivo local: ${error.message}`);
        return false;
    }
}

async function instalarDesdeRemoto(version) {
    try {
        log('info', `Descargando Node.js versión ${version}...`);
        const rutaArchivo = await descargarBinarioNode(version);
        const resultadoInstalacion = await instalarDesdeArchivoLocal(rutaArchivo, version);
        
        if (resultadoInstalacion) { 
            await eliminarArchivo(rutaArchivo); 
            log('info', `Archivo ${rutaArchivo} eliminado después de la instalación.`); 
        }

        return resultadoInstalacion;

    } catch (error) {
        log('error', `Error al instalar desde remoto: ${error.message}`);
        return false;
    }
}

async function iniciarActualizacion() {
    try {
        console.log(colorize(colors.fg.cyan, 'Bienvenido al Actualizador de Node.js'));
        console.log(colorize(colors.fg.cyan, '====================================='));

        const SO = detectarSistemaOperativo();
        log('info', `Sistema operativo detectado: ${SO}`);

        if (!await verificarNVM()) {
            return;
        }

        const versionActual = await obtenerVersionActual();
        if (!versionActual) {
            throw new Error('No se pudo obtener la versión actual de Node.js');
        }
        log('info', `Versión actual de Node.js: ${versionActual}`);
        console.log(colorize(colors.fg.yellow, `Versión actual de Node.js: ${versionActual}`));

        const hayConectividad = await verificarConectividad();
        let versionObjetivo, tipoInstalacion, rutaArchivoLocal;

        if (!hayConectividad) {
            console.log(colorize(colors.fg.yellow, 'No se detectó conectividad. Se procederá con la instalación desde archivo local.'));
            rutaArchivoLocal = await buscarArchivoLocal();
            if (!rutaArchivoLocal) {
                log('info', 'Selección de archivo cancelada por el usuario.');
                return;
            }
            versionObjetivo = extraerVersionDesdeNombreArchivo(rutaArchivoLocal);
            tipoInstalacion = 'local';
        } else {
            try {
                const versionesDisponibles = await verificarActualizaciones();
                if (versionesDisponibles.length === 0) {
                    throw new Error('No se encontraron versiones LTS pares disponibles.');
                }

                const opcionesUnificadas = [
                    'Instalar última versión LTS par desde repositorios oficiales',
                    'Instalar versión específica desde repositorios oficiales',
                    'Instalar desde archivo local',
                    'Ver todas las versiones disponibles'
                ];

                const seleccionUnificada = await mostrarMenu(opcionesUnificadas);

                switch (seleccionUnificada) {
                    case 0:
                        versionObjetivo = determinarVersionObjetivo(versionActual, versionesDisponibles);
                        tipoInstalacion = 'remoto';
                        break;
                    case 1:
                        versionObjetivo = await solicitarVersionValida();
                        tipoInstalacion = 'remoto';
                        break;
                    case 2:
                        rutaArchivoLocal = await buscarArchivoLocal();
                        if (!rutaArchivoLocal) {
                            log('info', 'Selección de archivo cancelada por el usuario.');
                            return;
                        }
                        versionObjetivo = extraerVersionDesdeNombreArchivo(rutaArchivoLocal);
                        tipoInstalacion = 'local';
                        break;
                    case 3:
                        console.log(colorize(colors.fg.cyan, 'Versiones LTS pares disponibles:'));
                        versionesDisponibles.forEach(v => console.log(colorize(colors.fg.yellow, v)));
                        versionObjetivo = await solicitarVersionValida();
                        tipoInstalacion = 'remoto';
                        break;
                    default:
                        throw new Error('Opción no válida');
                }
            } catch (error) {
                log('error', 'Error al obtener versiones disponibles:', error.message);
                console.log(colorize(colors.fg.yellow, 'Debido a un error, se procederá con la instalación desde archivo local.'));
                rutaArchivoLocal = await buscarArchivoLocal();
                if (!rutaArchivoLocal) {
                    log('info', 'Selección de archivo cancelada por el usuario.');
                    return;
                }
                versionObjetivo = extraerVersionDesdeNombreArchivo(rutaArchivoLocal);
                tipoInstalacion = 'local';
            }
        }

        if (versionObjetivo) {
            log('info', `Versión objetivo para el upgrade: ${versionObjetivo}`);
            console.log(colorize(colors.fg.yellow, `Versión objetivo para el upgrade: ${versionObjetivo}`));

            const deseaActualizar = await pregunta(colorize(colors.fg.green, '¿Desea actualizar a esta versión? (s/n): '));

            if (deseaActualizar.toLowerCase() === 's') {
                let instalacionExitosa = false;

                // Verificar si la versión ya está instalada
                const versionInstalada = await verificarVersionInstalada(versionObjetivo);
                if (versionInstalada) {
                    log('info', `La versión ${versionObjetivo} ya está instalada.`);
                    console.log(colorize(colors.fg.yellow, `La versión ${versionObjetivo} ya está instalada.`));
                    instalacionExitosa = true;
                } else {
                    if (SO === 'WSL') {
                        if (tipoInstalacion === 'remoto') {
                            instalacionExitosa = await instalarDesdeRemoto(versionObjetivo);
                        } else {
                            instalacionExitosa = await instalarDesdeArchivoLocal(rutaArchivoLocal, versionObjetivo);

                        }
                    } else {
                        if (tipoInstalacion === 'local') {
                            instalacionExitosa = await instalarDesdeArchivoLocal(rutaArchivoLocal, versionObjetivo);
                        } else {
                            // Para sistemas no-WSL, usar nvm install directamente
                            try {
                                await ejecutarComando(`nvm install ${versionObjetivo}`);
                                instalacionExitosa = true;
                            } catch (error) {
                                log('error', `Error al instalar Node.js ${versionObjetivo}: ${error.message}`);
                                instalacionExitosa = false;
                            }
                        }
                    }
                }

                if (instalacionExitosa) {
                    // Actualizar .nvmrc y config
                    const rutaProyecto = process.cwd();
                    const nvmrcPath = path.join(rutaProyecto, '.nvmrc');
                    fs.writeFileSync(nvmrcPath, versionObjetivo);
                    log('info', `.nvmrc ${fs.existsSync(nvmrcPath) ? 'actualizado' : 'creado'} con la nueva versión`);

                    setConfig('lastUsedVersion', versionObjetivo);
                    setConfig('preferredInstallMethod', tipoInstalacion);

                    // Mostrar mensaje al usuario sobre cómo activar la versión
                    console.log(colorize(colors.fg.cyan, '\nPara activar la nueva versión de Node.js, ejecute el siguiente comando en su terminal:'));
                    console.log(colorize(colors.fg.yellow, `nvm use ${versionObjetivo}`));
                }
            } else {
                log('info', 'Actualización cancelada por el usuario.');
                console.log(colorize(colors.fg.yellow, 'Actualización cancelada por el usuario.'));
            }
        } else {
            log('warn', 'No hay actualizaciones disponibles a la siguiente versión par de Node.js.');
            console.log(colorize(colors.fg.yellow, 'No hay actualizaciones disponibles a la siguiente versión par de Node.js.'));
        }
    } catch (error) {
        log('error', 'Error durante la ejecución del script:', error.message);
        console.error(colorize(colors.fg.red, 'Error durante la ejecución del script:', error.message));
    } finally {
        rl.close();
    }
}

module.exports = {
    iniciarActualizacion
};
