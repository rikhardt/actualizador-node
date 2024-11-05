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

module.exports = {
    colors,
    colorize
};
