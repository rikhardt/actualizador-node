const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

const packageJson = require('./package.json');
const configPath = path.join(__dirname, 'config.json');

// Funciones de utilidad
const colors = {
    reset: "\x1b[0m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        cyan: "\x1b[36m"
    }
};

function colorize(color, text) {
    return `${color}${text}${colors.reset}`;
}

function log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [${level.toUpperCase()}]: ${message}`);
}

function getConfig() {
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { lastUsedVersion: null, preferredInstallMethod: 'remote' };
}

function setConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

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

function detectarSistemaOperativo() {
    const platform = os.platform();
    if (platform === 'darwin') return 'macOS';
    if (platform === 'linux') {
        const isWSL = fs.existsSync('/proc/version') &&
            fs.readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft');
        return isWSL ? 'WSL' : 'Linux';
    }
    return 'Desconocido';
}

function getUserHome() {
    return process.env.HOME || process.env.USERPROFILE;
}

function cargarNVM() {
    const nvmDir = path.join(getUserHome(), '.nvm');
    const nvmScript = path.join(nvmDir, 'nvm.sh');
    if (fs.existsSync(nvmScript)) {
        return `. "${nvmScript}" && `;
    }
    return '';
}

function ejecutarComando(comando) {
    return new Promise((resolve, reject) => {
        const nvmPrefix = cargarNVM();
        const shell = spawn('bash', ['-c', `
            ${nvmPrefix}
            ${comando}
        `], { stdio: ['inherit', 'pipe', 'pipe'] });

        let output = '';
        shell.stdout.on('data', (data) => { output += data.toString(); });
        shell.stderr.on('data', (data) => { log('error', `Error en comando: ${data}`); });
        shell.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Comando falló con código de salida ${code}`));
            } else {
                resolve(output.trim());
            }
        });
    });
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

async function obtenerVersionActual() {
    try {
        return await ejecutarComando('node --version');
    } catch (error) {
        log('error', 'Error al obtener la versión de Node.js:', error.message);
        return null;
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
        return [];
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

async function actualizarDependencias(rutaProyecto) {
    try {
        log('info', 'Actualizando dependencias del proyecto...');
        console.log('Actualizando dependencias...');
        await ejecutarComando(`cd ${rutaProyecto} && npm update`);
        console.log('Dependencias actualizadas correctamente.');
    } catch (error) {
        log('error', 'Error al actualizar dependencias:', error.message);
    }
}

async function verificarVersionInstalada(version) {
    try {
        await ejecutarComando(`nvm ls ${version}`);
        return true;
    } catch (error) {
        return false;
    }
}

function extraerVersionDesdeNombreArchivo(nombreArchivo) {
    const match = nombreArchivo.match(/v?\d+\.\d+\.\d+/);
    return match ? match[0] : null;
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

function validarArchivoLocal(rutaArchivo) {
    log('info', `Validando archivo local: ${rutaArchivo}`);

    if (!fs.existsSync(rutaArchivo)) {
        log('error', `Error: El archivo no existe en la ruta especificada.`);
        log('warn', `Compruebe que la ruta sea correcta y que tenga permisos de lectura.`);
        return false;
    }

    const stats = fs.statSync(rutaArchivo);
    if (!stats.isFile()) {
        log('error', `Error: La ruta especificada no es un archivo.`);
        return false;
    }

    const nombreArchivo = path.basename(rutaArchivo).toLowerCase();
    if (!nombreArchivo.endsWith('.tar.xz') && !nombreArchivo.endsWith('.tar.gz') && !nombreArchivo.endsWith('.pkg')) {
        log('error', `Error: El archivo no tiene una extensión válida (.tar.xz, .tar.gz o .pkg).`);
        log('warn', `Nombre de archivo detectado: ${nombreArchivo}`);
        return false;
    }

    log('info', `Archivo local validado correctamente.`);
    return true;
}

async function buscarArchivoLocal() {
    while (true) {
        const rutaArchivo = await pregunta(colorize(colors.fg.green, 'Ingrese la ruta completa del archivo de Node.js (o "cancelar" para salir): '));

        if (rutaArchivo.toLowerCase() === 'cancelar') {
            return null;
        }

        if (validarArchivoLocal(rutaArchivo)) {
            return rutaArchivo;
        }

        console.log(colorize(colors.fg.red, 'Por favor, intente nuevamente con una ruta válida.'));
    }
}

async function copiarArchivoAWSL(rutaArchivoWindows) {
    try {
        const nombreArchivo = path.basename(rutaArchivoWindows);
        const rutaDestino = path.join(getUserHome(), nombreArchivo);

        log('info', `Copiando archivo ${rutaArchivoWindows} a ${rutaDestino}...`);

        await ejecutarComando(`cp "${rutaArchivoWindows}" "${rutaDestino}"`);

        log('info', `Archivo copiado: ${rutaDestino}`);
        return rutaDestino;
    } catch (error) {
        log('error', `Error al copiar archivo a WSL: ${error.message}`);
        throw error;
    }
}

async function descomprimirArchivo(rutaArchivo) {
    const directorioDestino = path.join(getUserHome(), 'node-temp');
    await ejecutarComando(`mkdir -p "${directorioDestino}"`);
    await ejecutarComando(`tar -xf "${rutaArchivo}" -C "${directorioDestino}" --strip-components=1`);
    return directorioDestino;
}

async function moverDirectorio(origen, destino) {
    try {
        await ejecutarComando(`sudo mkdir -p "${destino}"`);
        await ejecutarComando(`sudo cp -R "${origen}"/* "${destino}"/`);
        await ejecutarComando(`sudo rm -rf "${origen}"`);
        log('info', `Contenido movido exitosamente de ${origen} a ${destino}`);
    } catch (error) {
        log('error', `Error al mover directorio: ${error.message}`);
        throw error;
    }
}

async function actualizarNodejs(version, tipoInstalacion, rutaArchivoLocal = '') {
    try {
        let versionLimpia = version.split(' ')[0];
        const SO = detectarSistemaOperativo();

        const versionInstalada = await verificarVersionInstalada(versionLimpia);

        if (versionInstalada) {
            log('info', `La versión ${versionLimpia} ya está instalada. Cambiando a esta versión...`);
        } else {
            console.log(`Instalando Node.js versión ${versionLimpia}...`);
            switch (tipoInstalacion) {
                case 'local':
                    log('info', `Instalando Node.js versión ${versionLimpia} desde archivo local...`);
                    if (SO === 'WSL') {
                        rutaArchivoLocal = await copiarArchivoAWSL(rutaArchivoLocal);
                        const directorioTemporal = await descomprimirArchivo(rutaArchivoLocal);
                        const directorioDestino = `/usr/local/node-v${versionLimpia}`;

                        await moverDirectorio(directorioTemporal, directorioDestino);

                        // Configurar variables de entorno
                        const rcFile = process.env.SHELL.includes('zsh') ? '.zshrc' : '.bashrc';
                        const rcPath = path.join(getUserHome(), rcFile);
                        const exportLine = `export PATH=${directorioDestino}/bin:$PATH`;

                        fs.appendFileSync(rcPath, `\n${exportLine}\n`);

                        log('info', `Node.js ${versionLimpia} instalado correctamente en ${directorioDestino}`);
                        console.log(colorize(colors.fg.green, `Node.js ${versionLimpia} instalado correctamente.`));
                        console.log(colorize(colors.fg.yellow, 'Por favor, reinicie su terminal o ejecute "source ~/.bashrc" (o ~/.zshrc) para aplicar los cambios.'));
                    } else {
                        await ejecutarComando(`nvm install ${versionLimpia} --binary-file=${rutaArchivoLocal}`);
                    }
                    break;
                case 'remoto':
                default:
                    log('info', `Instalando Node.js versión ${versionLimpia} desde repositorios oficiales...`);
                    await ejecutarComando(`nvm install ${versionLimpia}`);
                    break;
            }
            console.log(`Node.js versión ${versionLimpia} instalado correctamente.`);
        }

        await ejecutarComando(`nvm use ${versionLimpia}`);
        log('info', `Node.js actualizado a la versión ${versionLimpia}`);

        await ejecutarComando(`nvm alias default ${versionLimpia}`);
        log('info', `Node.js ${versionLimpia} establecido como versión predeterminada`);

        const rutaProyecto = process.cwd();
        const nvmrcPath = path.join(rutaProyecto, '.nvmrc');
        fs.writeFileSync(nvmrcPath, versionLimpia);
        log('info', `.nvmrc ${fs.existsSync(nvmrcPath) ? 'actualizado' : 'creado'} con la nueva versión`);

        setConfig('lastUsedVersion', versionLimpia);
        setConfig('preferredInstallMethod', tipoInstalacion);

        return versionLimpia;
    } catch (error) {
        log('error', 'Error al actualizar Node.js:', error.message);
        console.error(colorize(colors.fg.red, `Error: ${error.message}`));
        return null;
    }
}

async function activarNuevaVersion(version) {
    try {
        log('info', `Activando Node.js versión ${version}...`);
        console.log(`Activando Node.js versión ${version}...`);
        await ejecutarComando(`nvm use ${version}`);
        const versionActual = await obtenerVersionActual();
        if (versionActual === version) {
            console.log(`Node.js ${version} activado correctamente.`);
            return true;
        } else {
            console.log(`No se pudo activar Node.js ${version}. Versión actual: ${versionActual}`);
            return false;
        }
    } catch (error) {
        log('error', 'Error al activar la nueva versión de Node.js:', error.message);
        return false;
    }
}

async function generarInforme(versionAnterior, nuevaVersion, tipoInstalacion) {
    const informe = `
Informe de Actualización de Node.js
===================================
Fecha: ${new Date().toLocaleString()}
Versión anterior: ${versionAnterior}
Nueva versión: ${nuevaVersion}
Método de instalación: ${tipoInstalacion}
Sistema Operativo: ${detectarSistemaOperativo()}
Ruta del proyecto: ${process.cwd()}
`.trim();

    const nombreArchivo = `informe_actualizacion_${nuevaVersion.replace('v', '')}.txt`;
    fs.writeFileSync(nombreArchivo, informe);
    log('info', `Informe de actualización generado: ${nombreArchivo}`);
    console.log(colorize(colors.fg.green, `Se ha generado un informe de la actualización en ${nombreArchivo}`));
}

async function main() {
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

        const versionesDisponibles = await verificarActualizaciones();
        if (versionesDisponibles.length === 0) {
            throw new Error('No se pudieron obtener las versiones disponibles de Node.js');
        }

        const opcionesUnificadas = [
            'Instalar última versión LTS par desde repositorios oficiales',
            'Instalar versión específica desde repositorios oficiales',
            'Instalar desde archivo local',
            'Ver todas las versiones disponibles'
        ];

        const seleccionUnificada = await mostrarMenu(opcionesUnificadas);

        let versionObjetivo, tipoInstalacion, rutaArchivoLocal;

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
                versionObjetivo = path.basename(rutaArchivoLocal).match(/v?\d+\.\d+\.\d+/)[0];
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

        if (versionObjetivo) {
            log('info', `Versión objetivo para el upgrade: ${versionObjetivo}`);
            console.log(colorize(colors.fg.yellow, `Versión objetivo para el upgrade: ${versionObjetivo}`));

            const deseaActualizar = await pregunta(colorize(colors.fg.green, '¿Desea actualizar a esta versión? (s/n): '));

            if (deseaActualizar.toLowerCase() === 's') {
                const nuevaVersion = await actualizarNodejs(versionObjetivo, tipoInstalacion, rutaArchivoLocal);

                if (nuevaVersion) {
                    if (await activarNuevaVersion(nuevaVersion)) {
                        const rutaProyecto = process.cwd();
                        const actualizarDeps = await pregunta(colorize(colors.fg.green, '¿Desea actualizar las dependencias del proyecto con la nueva versión de Node.js? (s/n): '));
                        if (actualizarDeps.toLowerCase() === 's') {
                            await actualizarDependencias(rutaProyecto);
                        }
                        await generarInforme(versionActual, nuevaVersion, tipoInstalacion);
                    } else {
                        console.log(colorize(colors.fg.red, 'No se pudo activar la nueva versión. Las dependencias no se actualizarán.'));
                        console.log(colorize(colors.fg.yellow, '\nPara aplicar los cambios en nuevas sesiones de terminal, por favor ejecute los siguientes comandos:'));
                        console.log(colorize(colors.fg.cyan, `nvm use ${nuevaVersion}`));
                        console.log(colorize(colors.fg.cyan, 'npm install'));
                    }
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

main();
