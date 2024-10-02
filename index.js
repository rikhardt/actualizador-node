const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');
const https = require('https');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function mostrarMenu(opciones) {
    console.log('\nSeleccione una opción:');
    opciones.forEach((opcion, index) => {
        console.log(`${index + 1}. ${opcion}`);
    });
    const seleccion = await pregunta('Ingrese el número de su elección: ');
    const indice = parseInt(seleccion) - 1;
    if (indice >= 0 && indice < opciones.length) {
        return indice;
    } else {
        console.log('Selección inválida. Por favor, intente de nuevo.');
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

function ejecutarComandoNVM(comando) {
    return new Promise((resolve, reject) => {
        const shell = spawn('bash', ['-c', `
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
            ${comando}
        `], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        let output = '';
        shell.stdout.on('data', (data) => {
            output += data.toString();
        });

        shell.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

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
        console.log('Verificando NVM...');
        const version = await ejecutarComandoNVM('nvm --version');
        console.log(`NVM encontrado. Versión: ${version}`);
        return true;
    } catch (error) {
        console.error('Error al verificar NVM:', error.message);
        console.log('Intentando cargar NVM manualmente...');
        
        try {
            const homeDir = os.homedir();
            const nvmScript = path.join(homeDir, '.nvm', 'nvm.sh');
            
            if (fs.existsSync(nvmScript)) {
                console.log('Archivo nvm.sh encontrado. Intentando cargar...');
                await ejecutarComandoNVM('source ~/.nvm/nvm.sh && nvm --version');
                console.log('NVM cargado correctamente.');
                return true;
            } else {
                console.log('No se encontró el archivo nvm.sh en la ubicación esperada.');
                console.log('Por favor, asegúrese de que NVM está instalado y configurado correctamente.');
                return false;
            }
        } catch (secondError) {
            console.error('Error al cargar NVM manualmente:', secondError.message);
            console.log('NVM no se pudo cargar o no está instalado correctamente.');
            console.log('Por favor, asegúrese de que NVM está instalado y configurado correctamente.');
            return false;
        }
    }
}

async function obtenerVersionActual() {
    try {
        return await ejecutarComandoNVM('node --version');
    } catch (error) {
        console.error('Error al obtener la versión de Node.js:', error.message);
        return null;
    }
}

async function verificarActualizaciones() {
    try {
        console.log('Verificando actualizaciones disponibles...');
        const versiones = await ejecutarComandoNVM('nvm ls-remote --lts');
        const versionesPares = versiones.split('\n')
            .filter(v => v.includes('v'))
            .map(v => v.trim().split(' ')[0])
            .filter(v => parseInt(v.split('.')[0].slice(1)) % 2 === 0);
        console.log(`Se encontraron ${versionesPares.length} versiones LTS pares.`);
        return versionesPares;
    } catch (error) {
        console.error('Error al verificar actualizaciones:', error.message);
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
        console.log('Actualizando dependencias del proyecto...');
        await ejecutarComandoNVM(`cd ${rutaProyecto} && npm update`);
        console.log('Dependencias actualizadas correctamente.');
    } catch (error) {
        console.error('Error al actualizar dependencias:', error.message);
    }
}

async function verificarVersionInstalada(version) {
    try {
        await ejecutarComandoNVM(`nvm ls ${version}`);
        return true;
    } catch (error) {
        return false;
    }
}

async function descargarDesdeSharePoint(url, rutaDestino) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(rutaDestino);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Archivo descargado exitosamente en ${rutaDestino}`);
                    resolve(rutaDestino);
                });
            } else {
                reject(new Error(`Error al descargar: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function validarFormatoVersion(version) {
    const regex = /^v?\d+\.\d+\.\d+$/;
    return regex.test(version);
}

async function solicitarVersionValida() {
    let versionObjetivo;
    do {
        versionObjetivo = await pregunta('Ingrese la versión específica de Node.js que desea instalar (formato: vX.X.X): ');
        if (!validarFormatoVersion(versionObjetivo)) {
            console.log('Formato de versión no válido. Por favor, use el formato vX.X.X (por ejemplo, v14.17.0)');
        }
    } while (!validarFormatoVersion(versionObjetivo));
    
    return versionObjetivo.startsWith('v') ? versionObjetivo : `v${versionObjetivo}`;
}

function validarArchivoLocal(rutaArchivo) {
    console.log(`Validando archivo local: ${rutaArchivo}`);
    
    if (!fs.existsSync(rutaArchivo)) {
        console.error(`Error: El archivo no existe en la ruta especificada.`);
        console.log(`Compruebe que la ruta sea correcta y que tenga permisos de lectura.`);
        return false;
    }

    const stats = fs.statSync(rutaArchivo);
    if (!stats.isFile()) {
        console.error(`Error: La ruta especificada no es un archivo.`);
        return false;
    }

    const extension = path.extname(rutaArchivo).toLowerCase();
    if (!['.tar.gz', '.pkg'].includes(extension)) {
        console.error(`Error: El archivo no tiene una extensión válida (.tar.gz o .pkg).`);
        console.log(`Extensión detectada: ${extension}`);
        return false;
    }

    console.log(`Archivo local validado correctamente.`);
    return true;
}

async function buscarArchivoLocal() {
    while (true) {
        const rutaArchivo = await pregunta('Ingrese la ruta completa del archivo de Node.js (o "cancelar" para salir): ');
        
        if (rutaArchivo.toLowerCase() === 'cancelar') {
            return null;
        }

        if (validarArchivoLocal(rutaArchivo)) {
            return rutaArchivo;
        }

        console.log('Por favor, intente nuevamente con una ruta válida.');
    }
}

async function actualizarNodejs(version, tipoInstalacion, urlSharePoint = '') {
    try {
        const versionLimpia = version.split(' ')[0];
        const versionInstalada = await verificarVersionInstalada(versionLimpia);
        
        if (versionInstalada) {
            console.log(`La versión ${versionLimpia} ya está instalada. Cambiando a esta versión...`);
        } else {
            switch (tipoInstalacion) {
                case 'sharepoint':
                    console.log(`Descargando Node.js versión ${versionLimpia} desde SharePoint...`);
                    const rutaDescarga = path.join(os.tmpdir(), `node-${versionLimpia}.tar.gz`);
                    await descargarDesdeSharePoint(urlSharePoint, rutaDescarga);
                    console.log(`Instalando Node.js versión ${versionLimpia} desde archivo descargado...`);
                    await ejecutarComandoNVM(`nvm install ${versionLimpia} --binary-file=${rutaDescarga}`);
                    break;
                case 'local':
                    console.log(`Instalando Node.js versión ${versionLimpia} desde archivo local...`);
                    await ejecutarComandoNVM(`nvm install ${versionLimpia} --binary-file=${urlSharePoint}`);
                    break;
                case 'remoto':
                default:
                    console.log(`Instalando Node.js versión ${versionLimpia} desde repositorios oficiales...`);
                    await ejecutarComandoNVM(`nvm install ${versionLimpia}`);
                    break;
            }
        }

        await ejecutarComandoNVM(`nvm use ${versionLimpia}`);
        console.log(`Node.js actualizado a la versión ${versionLimpia}`);

        await ejecutarComandoNVM(`nvm alias default ${versionLimpia}`);
        console.log(`Node.js ${versionLimpia} establecido como versión predeterminada`);

        const rutaProyecto = process.cwd();
        const nvmrcPath = path.join(rutaProyecto, '.nvmrc');
        fs.writeFileSync(nvmrcPath, versionLimpia);
        console.log(`.nvmrc ${fs.existsSync(nvmrcPath) ? 'actualizado' : 'creado'} con la nueva versión`);

        return versionLimpia;
    } catch (error) {
        console.error('Error al actualizar Node.js:', error.message);
        return null;
    }
}

async function activarNuevaVersion(version) {
    try {
        console.log(`Activando Node.js versión ${version}...`);
        await ejecutarComandoNVM(`nvm use ${version}`);
        const versionActual = await obtenerVersionActual();
        if (versionActual === version) {
            console.log(`Node.js ${version} activado correctamente.`);
            return true;
        } else {
            console.error(`No se pudo activar Node.js ${version}. Versión actual: ${versionActual}`);
            return false;
        }
    } catch (error) {
        console.error('Error al activar la nueva versión de Node.js:', error.message);
        return false;
    }
}

async function main() {
    try {
        console.log('Bienvenido al Actualizador de Node.js');
        console.log('=====================================');
        
        const SO = detectarSistemaOperativo();
        console.log(`Sistema operativo detectado: ${SO}`);

        if (!await verificarNVM()) {
            return;
        }

        const versionActual = await obtenerVersionActual();
        if (!versionActual) {
            throw new Error('No se pudo obtener la versión actual de Node.js');
        }
        console.log(`Versión actual de Node.js: ${versionActual}`);

        const versionesDisponibles = await verificarActualizaciones();
        if (versionesDisponibles.length === 0) {
            throw new Error('No se pudieron obtener las versiones disponibles de Node.js');
        }

        const opcionesUnificadas = [
            'Instalar última versión LTS par desde repositorios oficiales',
            'Instalar versión específica desde repositorios oficiales',
            'Instalar desde archivo local',
            'Instalar desde SharePoint',
            'Ver todas las versiones disponibles'
        ];

        const seleccionUnificada = await mostrarMenu(opcionesUnificadas);

        let versionObjetivo, tipoInstalacion, urlSharePoint;

        switch (seleccionUnificada) {
            case 0: // Última versión LTS par desde repositorios oficiales
                versionObjetivo = determinarVersionObjetivo(versionActual, versionesDisponibles);
                tipoInstalacion = 'remoto';
                break;
            case 1: // Versión específica desde repositorios oficiales
                versionObjetivo = await solicitarVersionValida();
                tipoInstalacion = 'remoto';
                break;
            case 2: // Desde archivo local
                const rutaLocal = await buscarArchivoLocal();
                if (!rutaLocal) {
                    console.log('Selección de archivo cancelada por el usuario.');
                    return;
                }
                versionObjetivo = path.basename(rutaLocal).match(/v\d+\.\d+\.\d+/)[0];
                tipoInstalacion = 'local';
                urlSharePoint = rutaLocal; // Usamos urlSharePoint para almacenar la ruta local
                break;
            case 3: // Desde SharePoint
                versionObjetivo = await solicitarVersionValida();
                tipoInstalacion = 'sharepoint';
                urlSharePoint = await pregunta('Ingrese la URL de SharePoint para descargar Node.js: ');
                break;
            case 4: // Ver todas las versiones disponibles
                console.log('Versiones LTS pares disponibles:');
                versionesDisponibles.forEach(v => console.log(v));
                versionObjetivo = await solicitarVersionValida();
                tipoInstalacion = 'remoto';
                break;
            default:
                throw new Error('Opción no válida');
        }

        if (versionObjetivo) {
            console.log(`Versión objetivo para el upgrade: ${versionObjetivo}`);
            
            const deseaActualizar = await pregunta('¿Desea actualizar a esta versión? (s/n): ');

            if (deseaActualizar.toLowerCase() === 's') {
                const nuevaVersion = await actualizarNodejs(versionObjetivo, tipoInstalacion, urlSharePoint);
                
                if (nuevaVersion) {
                    if (await activarNuevaVersion(nuevaVersion)) {
                        const rutaProyecto = process.cwd();
                        const actualizarDeps = await pregunta('¿Desea actualizar las dependencias del proyecto con la nueva versión de Node.js? (s/n): ');
                        if (actualizarDeps.toLowerCase() === 's') {
                            await actualizarDependencias(rutaProyecto);
                        }
                    } else {
                        console.log('No se pudo activar la nueva versión. Las dependencias no se actualizarán.');
                        console.log('\nPara aplicar los cambios en nuevas sesiones de terminal, por favor ejecute los siguientes comandos:');
                        console.log(`nvm use ${nuevaVersion}`);
                        console.log('npm install');
                    }

                }
            } else {
                console.log('Actualización cancelada por el usuario.');
            }
        } else {
            console.log('No hay actualizaciones disponibles a la siguiente versión par de Node.js.');
        }
    } catch (error) {
        console.error('Error durante la ejecución del script:', error.message);
    } finally {
        rl.close();
    }
}

main();