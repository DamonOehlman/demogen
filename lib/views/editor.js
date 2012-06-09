var fs = require('fs'),
    path = require('path'),
    handlebars = require('handlebars');

module.exports = function(scaffolder, demo, callback) {
    var template;
    
    scaffolder.readFile('views/editor.css', 'utf8', function(err, data) {
        if (err) return callback(err);

        // add the data to the demo css
        demo.css.push(data);
        
        scaffolder.readFile('views/editor.html', 'utf8', function(err, data) {
            if (err) return callback(err);
            
            // compile the handlebars template
            template = handlebars.compile(data);

            // fire the callback, returning the view contents
            callback(null, template(demo));
        });
    });
};