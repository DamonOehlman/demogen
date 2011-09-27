var events = require('events'),
    util = require('util'),
    path = require('path'),
    fs = require('fs'),
    optDefaults = {
        title: 'Untitled presentation',
        template: 'default'
    };

var Generator = exports.Generator = function(opts) {
    // initialise options
    opts = opts || {};
    
    // initialise members
    this.targetPath = opts.path || path.resolve('.');
    this.assetPath = path.resolve(__dirname, '../assets');
    this.out = opts.out || require('out');

    var generator = this;
    this.loadConfig(opts, function() {
        generator.emit('ready');
    });
}; // DeckBuilder

util.inherits(Generator, events.EventEmitter);

Generator.prototype.getAssetPath = function(asset) {
    return path.join(this.assetPath, asset || '');
}; // getAssetPath

Generator.prototype.loadActions = function(opts, callback) {
    var generator = this;
    
    fs.readdir(path.resolve(__dirname, 'actions'), function(err, files) {
        // iterate through the files found
        files.forEach(function(file) {
            var actionName = path.basename(file, '.js');
            
            // add the action to the generator
            generator[actionName] = require('./actions/' + actionName);
        });
        
        // fire the callback
        if (callback) {
            callback();
        } // if
    });
};

Generator.prototype.loadConfig = function(opts, callback) {
    var configFile = path.resolve(this.targetPath, 'config.json'),
        generator = this;
    
    fs.readFile(configFile, 'utf8', function(err, data) {
        var config = {};
        
        if (! err) {
            try {
                config = JSON.parse(data);
            }
            catch (e) {
                console.warn('invalid config file: ' + configFile);
            } // try..catch
        } // if
        
        // initialise the options
        for (var key in optDefaults) {
            generator[key] = opts[key] || config[key] || optDefaults[key];
        } // for

        // load the actions
        generator.loadActions(opts, callback);
    });
};
