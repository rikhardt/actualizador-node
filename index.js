const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Función para detectar el sistema operativo
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

const SO = detectarSistemaOperativo();
console.log(`Sistema operativo detectado: ${SO}`);

// Función para ejecutar comandos NVM
function ejecutarComandoNVM(comando) {
    return new Promise((resolve, reject) => {
        const shell = spawn('bash', ['-c', `source ~/.nvm/nvm.sh && ${comando}`], {
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

// Función para verificar si NVM está instalado
async function verificarNVM() {
    try {
        const version = await ejecutarComandoNVM('nvm --version');
        console.log(`NVM encontrado. Versión: ${version}`);
        return true;
    } catch (error) {
        console.error('Error al verificar NVM:', error.message);
        console.log('NVM no se pudo cargar o no está instalado correctamente.');
        console.log('Por favor, asegúrese de que NVM está instalado y configurado correctamente.');
        return false;
    }
}

// Función para obtener la versión actual de Node.js
async function obtenerVersionActual() {
    try {
        return await ejecutarComandoNVM('node --version');
    } catch (error) {
        console.error('Error al obtener la versión de Node.js:', error.message);
        return null;
    }
}

// Función para verificar actualizaciones disponibles (solo versiones pares)
async function verificarActualizaciones() {
    try {
        console.log('Verificando actualizaciones disponibles...');
        const versiones = await ejecutarComandoNVM('nvm ls-remote --lts');
        const versionesPares = versiones.split('\n')
            .filter(v => v.includes('v'))
            .map(v => v.trim().split(' ')[0])  // Tomar solo la parte de la versión
            .filter(v => parseInt(v.split('.')[0].slice(1)) % 2 === 0);
        console.log(`Se encontraron ${versionesPares.length} versiones LTS pares.`);
        return versionesPares;
    } catch (error) {
        console.error('Error al verificar actualizaciones:', error.message);
        return [];
    }
}

// Función para determinar la versión objetivo del upgrade
function determinarVersionObjetivo(versionActual, versionesDisponibles) {
    const versionActualSemver = versionActual.replace('v', '').split('.');
    const versionMayorActual = parseInt(versionActualSemver[0]);
    const siguienteVersionMayor = versionMayorActual + 2; // Siguiente versión par

    const versionesCompatibles = versionesDisponibles.filter(v => {
        const versionSemver = v.replace('v', '').split('.');
        return parseInt(versionSemver[0]) === siguienteVersionMayor;
    });

    return versionesCompatibles.length > 0 ? versionesCompatibles[versionesCompatibles.length - 1] : null;
}

// Función para actualizar dependencias en package.json
async function actualizarDependencias(rutaProyecto) {
    try {
        console.log('Actualizando dependencias...');
        await ejecutarComandoNVM(`cd ${rutaProyecto} && npm update`);
        console.log('Dependencias actualizadas correctamente.');
    } catch (error) {
        console.error('Error al actualizar dependencias:', error.message);
    }
}

// Función para seleccionar una versión de Node.js desde una ruta local
async function seleccionarVersionLocal(rutaLocal, versionObjetivo) {
    const archivos = fs.readdirSync(rutaLocal);
    const versionesDisponibles = archivos
        .filter(archivo => archivo.startsWith('node-v') && archivo.endsWith('.tar.gz'))
        .filter(archivo => {
            const version = archivo.match(/node-v(\d+\.\d+\.\d+)/)[1];
            return version.startsWith(versionObjetivo.replace('v', ''));
        });
    
    if (versionesDisponibles.length === 0) {
        console.log(`No se encontraron versiones de Node.js compatibles con ${versionObjetivo} en la ruta especificada.`);
        return null;
    }

    console.log('Versiones disponibles:');
    versionesDisponibles.forEach((version, index) => {
        console.log(`${index + 1}. ${version}`);
    });

    const seleccion = await pregunta('Seleccione el número de la versión que desea instalar: ');
    const indice = parseInt(seleccion) - 1;

    if (indice >= 0 && indice < versionesDisponibles.length) {
        return path.join(rutaLocal, versionesDisponibles[indice]);
    } else {
        console.log('Selección inválida.');
        return null;
    }
}

// Función para realizar la actualización de Node.js
async function actualizarNodejs(version) {
    try {
        // Extraer solo la parte de la versión (por ejemplo, v20.17.0)
        const versionLimpia = version.split(' ')[0];
        console.log(`Actualizando Node.js a la versión ${versionLimpia}...`);
        await ejecutarComandoNVM(`nvm install ${versionLimpia}`);
        await ejecutarComandoNVM(`nvm use ${versionLimpia}`);
        console.log(`Node.js actualizado a la versión ${versionLimpia}`);

        // Establecer la nueva versión como predeterminada
        await ejecutarComandoNVM(`nvm alias default ${versionLimpia}`);
        // await ejecutarComandoNVM(`nvm use ${versionLimpia}`);
        // await ejecutarComandoNVM(`nvm install ${versionLimpia}`);
        console.log(`Node.js ${versionLimpia} establecido como versión predeterminada`);

        // Actualizar o crear .nvmrc
        const rutaProyecto = process.cwd();
        const nvmrcPath = path.join(rutaProyecto, '.nvmrc');
        fs.writeFileSync(nvmrcPath, versionLimpia);
        console.log(`.nvmrc ${fs.existsSync(nvmrcPath) ? 'actualizado' : 'creado'} con la nueva versión`);

        console.log('Para aplicar los cambios, por favor ejecute los siguientes comandos en su terminal:');
        console.log(`nvm use ${versionLimpia}`);
        console.log('npm install');
    } catch (error) {
        console.error('Error al actualizar Node.js:', error.message);
    }
}

// Función principal
async function main() {
    try {
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

        const deseaIngresarVersion = await pregunta('¿Desea ingresar una versión específica de Node.js para actualizar? (s/n): ');

        let versionObjetivo;
        if (deseaIngresarVersion.toLowerCase() === 's') {
            const versionEspecifica = await pregunta('Ingrese la versión específica de Node.js que desea instalar (formato: vX.X.X): ');
            versionObjetivo = versionEspecifica;
        } else {
            versionObjetivo = determinarVersionObjetivo(versionActual, versionesDisponibles);
        }

        if (versionObjetivo) {
            console.log(`Versión objetivo para el upgrade: ${versionObjetivo}`);
            
            const deseaActualizar = await pregunta('¿Desea actualizar a esta versión? (s/n): ');

            if (deseaActualizar.toLowerCase() === 's') {
                const rutaProyecto = process.cwd();
                // await actualizarDependencias(rutaProyecto);

                const usarVersionLocal = await pregunta('¿Desea usar una versión local de Node.js? (s/n): ');

                if (usarVersionLocal.toLowerCase() === 's') {
                    const rutaLocal = await pregunta('Ingrese la ruta donde se encuentran las versiones locales de Node.js: ');
                    const versionLocal = await seleccionarVersionLocal(rutaLocal, versionObjetivo);
                    if (versionLocal) {
                        await actualizarNodejs(versionLocal);
                    }
                } else {
                    await actualizarNodejs(versionObjetivo);
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