var fs = require('fs'),
    path = require('path');

module.exports = function(scaffolder, demo, callback) {
    demo.includes = demo.includes || [];

    // if we have a demo mode, then specify the mode
    // demo.includes.unshift('_demogen/js/fakeconsole.js');
    
    // read the fakeconsole files
    scaffolder.readFile('views/console.css', 'utf8', function(err, data) {
        if (err) return callback(err);

        // add teh css
        demo.css.push(data);
        scaffolder.readFile('views/console.html', 'utf8', callback);
    });
};