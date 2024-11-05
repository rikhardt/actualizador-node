const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config.json');

function getConfig() {
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { 
        lastUsedVersion: null, 
        preferredInstallMethod: 'remote' 
    };
}

function setConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
    getConfig,
    setConfig
};
