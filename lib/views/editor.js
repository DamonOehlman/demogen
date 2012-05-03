var fs = require('fs'),
    path = require('path'),
    handlebars = require('handlebars');

module.exports = function(scaffolder, demo, callback) {
    scaffolder.readFile('views/editor.css', function(err, data) {
        if (! err) {
            demo.css.push(data);
        } // if
        
        scaffolder.readFile('views/editor.html', function(err, data) {
            if (err) {
                data = '<div id="editor">{{{ code }}}</div>';
            } // if
            
            // compile the handlebars template
            var template = handlebars.compile(data);

            // fire the callback, returning the view contents
            callback(template(demo));
        });
    });
};