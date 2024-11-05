const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { log } = require('./logger');

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

function NVM_DIR() {
    if (process.env.NVM_DIR) {
        return process.env.NVM_DIR;
    }
    // Si no está definido en el ambiente, usar la ubicación por defecto
    return path.join(getUserHome(), '.nvm');
}

function cargarNVM() {
    const nvmDir = NVM_DIR();
    const nvmScript = path.join(nvmDir, 'nvm.sh');
    if (fs.existsSync(nvmScript)) {
        return `. "${nvmScript}" && `;
    }
    return '';
}

async function verificarConectividad() {
    let timeoutId;
    let child;

    try {
        return await new Promise((resolve) => {
            timeoutId = setTimeout(() => {
                if (child) child.kill();
                log('warn', 'Timeout al intentar conectar con https://nodejs.org/dist/');
                resolve(false);
            }, 3000);

            child = exec('curl -Is https://nodejs.org/dist/ | head -n 1', (error, stdout) => {
                clearTimeout(timeoutId);
                
                if (error) {
                    log('warn', 'No se pudo establecer conexión con https://nodejs.org/dist/');
                    resolve(false);
                    return;
                }
                
                const tieneConexion = stdout.includes('HTTP/') && stdout.includes('200');
                if (tieneConexion) {
                    log('info', 'Conectividad verificada exitosamente.');
                } else {
                    log('warn', 'No se pudo establecer conexión con https://nodejs.org/dist/');
                }
                resolve(tieneConexion);
            });
        });
    } catch (error) {
        clearTimeout(timeoutId);
        if (child) child.kill();
        log('warn', 'Error al verificar conectividad');
        return false;
    }
}

module.exports = {
    detectarSistemaOperativo,
    getUserHome,
    NVM_DIR,
    cargarNVM,
    verificarConectividad
};
