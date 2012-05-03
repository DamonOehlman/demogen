var fs = require('fs'),
    path = require('path');

module.exports = function(scaffolder, demo, callback) {
    demo.includes = demo.includes || [];

    // if we have a demo mode, then specify the mode
    // demo.includes.unshift('_demogen/js/fakeconsole.js');
    
    // read the fakeconsole files
    scaffolder.readFile('views/console.css', function(err, data) {
        if (! err) {
            demo.css.push(data);
        } // if
        
        scaffolder.readFile('views/console.html', function(err, data) {
            callback(data);
        });
    });
};