const { spawn } = require('child_process');
const { cargarNVM } = require('./system');

function ejecutarComando(comando, silenciarErrores = false) {
    return new Promise((resolve, reject) => {
        const nvmPrefix = cargarNVM();
        const shell = spawn('zsh', ['-c', `
            ${nvmPrefix}
            ${comando}
        `], { stdio: ['inherit', 'pipe', silenciarErrores ? 'ignore' : 'pipe'] });

        let output = '';
        let errorOutput = '';
        
        shell.stdout.on('data', (data) => { 
            output += data.toString(); 
        });
        
        if (!silenciarErrores) {
            shell.stderr.on('data', (data) => { 
                errorOutput += data.toString(); 
            });
        }
        
        shell.on('close', (code) => {
            if (code !== 0 && !silenciarErrores) {
                reject(new Error(errorOutput || `Comando falló con código de salida ${code}`));
            } else {
                resolve(output.trim());
            }
        });
    });
}

module.exports = {
    ejecutarComando
};
