var path = require('path'),
    fs = require('fs'),
    reSnippets = /^snippets/i;

module.exports = function(callback) {
    callback = callback || function() {};
    
    var builder = this;
    
    fs.readdir(this.targetPath, function(err, files) {
        var snippetsExist = false;
        
        if (err) {
            builder.out('!{red}Unable to scaffold demo area: {0} not found', builder.targetPath);
            callback(err);
            return;
        } // if
        
        files.forEach(function(file) {
            snippetsExist = snippetsExist || reSnippets.test(file);
        });
        
        // if the deck already exists, then report an error
        if (snippetsExist) {
            builder.out('!{red}Unable to create: demo area already created in {0}', builder.targetPath);
            callback('demo area already exists');
        }
        else {
            builder.copyAssets('scaffold', callback);
        } // if..else
    });
};