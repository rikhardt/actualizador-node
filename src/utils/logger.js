function log(level, message) {
    const timestamp = new Date().toLocaleString('es-CL', { 
        timeZone: 'America/Santiago', 
        hour12: false 
    });
    console.log(`${timestamp} [${level.toUpperCase()}]: ${message}`);
}

module.exports = {
    log
};
