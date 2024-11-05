const fs = require('fs');
const path = require('path');
const https = require('https');
const { log } = require('../utils/logger');
const { ejecutarComando } = require('../utils/command');
const { getUserHome } = require('../utils/system');

async function obtenerVersionActual() {
    try {
        return await ejecutarComando('node --version');
    } catch (error) {
        log('error', 'Error al obtener la versión de Node.js:', error.message);
        return null;
    }
}

async function verificarNVM() {
    try {
        log('info', 'Verificando NVM...');
        const version = await ejecutarComando('nvm --version');
        log('info', `NVM encontrado. Versión: ${version}`);
        return true;
    } catch (error) {
        log('error', 'Error al verificar NVM:', error.message);
        log('warn', 'NVM no se pudo cargar o no está instalado correctamente.');
        return false;
    }
}

async function verificarVersionInstalada(version) {
    try {
        log('info', `Verificando si la versión ${version} está instalada...`);
        
        // Verificar si el directorio existe
        const nvmDir = process.env.NVM_DIR || path.join(getUserHome(), '.nvm');
        const directorioVersion = path.join(nvmDir, 'versions', 'node', version);
        
        if (fs.existsSync(directorioVersion)) {
            log('info', `La versión ${version} ya está instalada en ${directorioVersion}`);
            return true;
        }

        // Verificar también usando nvm
        try {
            const resultado = await ejecutarComando(`nvm ls ${version}`);
            if (resultado.includes(version)) {
                log('info', `La versión ${version} está instalada según nvm`);
                return true;
            }
        } catch (error) {
            // Si hay error al ejecutar nvm ls, continuamos con la verificación del directorio
        }

        log('info', `La versión ${version} no está instalada`);
        return false;
    } catch (error) {
        log('error', `Error al verificar la versión instalada: ${error.message}`);
        return false;
    }
}

async function verificarActualizaciones() {
    try {
        log('info', 'Verificando actualizaciones disponibles...');
        console.log('Obteniendo lista de versiones...');
        const versiones = await ejecutarComando('nvm ls-remote --lts');
        console.log('Lista de versiones obtenida');
        const versionesPares = versiones.split('\n')
            .filter(v => v.includes('v'))
            .map(v => v.trim().split(' ')[0])
            .filter(v => parseInt(v.split('.')[0].slice(1)) % 2 === 0);
        log('info', `Se encontraron ${versionesPares.length} versiones LTS pares.`);
        return versionesPares;
    } catch (error) {
        log('error', 'Error al verificar actualizaciones:', error.message);
        throw error;
    }
}

function determinarVersionObjetivo(versionActual, versionesDisponibles) {
    const versionActualSemver = versionActual.replace('v', '').split('.');
    const versionMayorActual = parseInt(versionActualSemver[0]);
    const siguienteVersionMayor = versionMayorActual + 2;

    const versionesCompatibles = versionesDisponibles.filter(v => {
        const versionSemver = v.replace('v', '').split('.');
        return parseInt(versionSemver[0]) === siguienteVersionMayor;
    });

    return versionesCompatibles.length > 0 ? versionesCompatibles[versionesCompatibles.length - 1] : null;
}

async function descargarBinarioNode(version) {
    const arquitectura = process.arch === 'x64' ? 'x64' : 'x86';
    const url = `https://nodejs.org/dist/${version}/node-${version}-linux-${arquitectura}.tar.xz`;
    const nombreArchivo = `node-${version}-linux-${arquitectura}.tar.xz`;
    const rutaDestino = path.join(getUserHome(), nombreArchivo);

    return new Promise((resolve, reject) => {
        log('info', `Descargando Node.js ${version} para ${arquitectura}...`);
        const file = fs.createWriteStream(rutaDestino);
        https.get(url, (response) => {
            if (response.statusCode === 404) {
                log('error', `La versión ${version} no existe en el repositorio.`);
                reject(new Error(`La versión ${version} no existe en el repositorio.`));
                return null;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                log('info', `Descarga completada: ${rutaDestino}`);
                resolve(rutaDestino);
            });
        }).on('error', (err) => {
            fs.unlink(rutaDestino, () => {});
            reject(err);
        });
    });
}

async function descomprimirArchivo(rutaArchivo) {
    try {
        const directorioDestino = path.join(getUserHome(), 'node-temp');
        log('info', `Descomprimiendo archivo en: ${directorioDestino}`);
        
        // Asegurarse de que el directorio temporal esté limpio
        if (fs.existsSync(directorioDestino)) {
            await ejecutarComando(`rm -rf "${directorioDestino}"`);
        }
        
        await ejecutarComando(`mkdir -p "${directorioDestino}"`);
        await ejecutarComando(`tar -xf "${rutaArchivo}" -C "${directorioDestino}" --strip-components=1`);
        
        log('info', 'Archivo descomprimido correctamente');
        return directorioDestino;
    } catch (error) {
        log('error', `Error al descomprimir archivo: ${error.message}`);
        throw error;
    }
}

async function moverDirectorio(origen, destino) {
    try {
        log('info', `Moviendo archivos de ${origen} a ${destino}`);
        
        // Crear el directorio destino si no existe
        await ejecutarComando(`sudo mkdir -p "${destino}"`);
        
        // Copiar archivos
        await ejecutarComando(`sudo cp -R "${origen}/"* "${destino}/"`);
        
        // Limpiar directorio temporal
        await ejecutarComando(`sudo rm -rf "${origen}"`);
        
        log('info', `Contenido movido exitosamente de ${origen} a ${destino}`);
    } catch (error) {
        log('error', `Error al mover directorio: ${error.message}`);
        throw error;
    }
}

async function eliminarArchivo(rutaArchivo) {
    log('info', `Eliminando archivo ${rutaArchivo}`);
    await ejecutarComando(`sudo rm -rf "${rutaArchivo}"`);
}

module.exports = {
    obtenerVersionActual,
    verificarNVM,
    verificarVersionInstalada,
    verificarActualizaciones,
    determinarVersionObjetivo,
    descargarBinarioNode,
    descomprimirArchivo,
    moverDirectorio,
    eliminarArchivo
};
