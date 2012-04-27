var fs = require('fs'),
    path = require('path'),
    scaffolder = require('scaffolder')(module);

function Generator() {
    
} // Generator

Generator.prototype.readFile = function(filename, callback) {
    scaffolder.getPath(function(filepath) {
        fs.readFile(path.join(filepath, 'assets', filename), 'utf8', callback);
    });
};

module.exports = new Generator();