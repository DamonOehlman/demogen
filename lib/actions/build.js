var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    out = require('out'),
    jade = require('jade'),
    ncp = require('ncp').ncp,
    _ = require('underscore'),
    reIgnore = /^_/,
    reSnippetFile = /^demo/i,
    readers = {};
    
/* define some readers */

readers.text = function(filename) {
    var contents;
    
    try {
        contents = fs.readFileSync(filename, 'utf8');
    }
    catch (e) {
        out('Could not read contents of file: !{underline}' + filename);
    } // try..catch
    
    return contents;
};

function compile(builder, deckPath, template, opts, callback) {
    var outputFile = path.join(deckPath, 'index.html'),
        targetFile = path.join(deckPath, 'deck.jade');
    
    fs.readFile(targetFile, 'utf8', function(err, data) {
        if (! err) {
            var deck = jade.compile(data, {
                    filename: targetFile
                }),
                deckContent = deck(opts),
                templateOutput = template(_.extend({
                    deck: deckContent,
                    title: 'Untitled Deck',
                    theme: 'default'
                }, opts));
            
            fs.writeFile(outputFile, templateOutput);
        } // if
        
        callback();
    });
} // compile

function findSnippets(builder, targetPath, config, callback) {
    var subdirs = [],
        snippets = [],
        isDemo = false,
        configFile = path.join(targetPath, 'demo.json'),
        configSections = {
            '^demo\.js': {
                targetKey: 'script'
            },
            
            '^readme\.md': {
                targetKey: 'readme',
                reader: 'markdown'
            }
        },
        childConfig = _.extend({}, config, { 
            clientpath: getClientPath(targetPath, config.basePath)
        }),
        key;
        
    function checkPath(file, callback) {
        var testPath = path.join(targetPath, file);
        
        fs.stat(testPath, function(statErr, stats) {
            if (statErr) {
                callback(statErr);
            }
            else if (stats.isDirectory() && (! reIgnore.test(file))) {
                findSnippets(builder, testPath, childConfig, function(childSnippets) {
                    snippets = snippets.concat(childSnippets);
                    callback(null);
                });
            }
            else {
                isDemo = isDemo || reSnippetFile.test(file);

                // iterate through the config sections and see if we have a file match
                for (key in configSections) {
                    var regex = new RegExp(key, 'i'),
                        keyCfg = configSections[key],
                        readerFn = readers[keyCfg.reader || 'text'] || readers.text;
                        
                    if (regex.test(file)) {
                        childConfig[keyCfg.targetKey] = readerFn.call(null, testPath);
                    } // if
                } // for
                
                callback(null);
            } // if..else
        });
    } // checkPath
    
    // attempt to read a configuration file
    fs.readFile(configFile, 'utf8', function(err, data) {
        // if we read the configuration successfully, then update the config
        if (! err) {
            try {
                _.extend(childConfig, JSON.parse(data));
            }
            catch (e) {
                builder.out('!{red}Error parsing deck config @ {0}', configFile);
            } // try..catch
        } // if
        
        // read the contents of the directory
        fs.readdir(targetPath, function(err, files) {
            if (err) {
                callback();
            }
            else {
                async.forEach(files, checkPath, function(err) {
                    if (isDemo) {
                        snippets.unshift({
                            path: targetPath,
                            config: childConfig
                        });
                    } // if

                    callback(snippets);
                });
            } // if..else
        });
    });
} // findSnippets

function getClientPath(targetPath, basePath) {
    var clientPath = '';
    
    while (targetPath.length > basePath.length) {
        clientPath = path.join(path.basename(targetPath), clientPath);
        targetPath = path.dirname(targetPath);
    } // while
    
    return clientPath;
} // getClientPath

function loadTemplate(templatePath, callback) {
    var layoutFile = path.join(templatePath, 'layout.jade');
    
    fs.readFile(layoutFile, 'utf8', function(err, data) {
        if (err) {
            throw new Error('Unable to load template from path: ' + templatePath);
        } // if
        
        callback(jade.compile(data, {
            filename: layoutFile
        }));
    });
} // loadTemplate

module.exports = function(opts, callback) {
    var templatePath = this.getAssetPath('templates/' + this.template),
        builder = this;
        
    path.exists(templatePath, function(exists) {
        if (! exists) {
            templatePath = builder.getAssetPath('templates/default');
        } // if
        
        loadTemplate(templatePath, function(template) {
            builder.out('Template loaded from: !{underline}{0}', templatePath);
            
            findSnippets(builder, builder.targetPath, { basePath: builder.targetPath }, function(snippets) {
                // copy the client files to the root build path
                ncp(builder.getAssetPath('client'), builder.targetPath, callback);
                
                console.log(snippets);
                
                // compile each of the decks
                async.forEach(
                    snippets, 
                    function(deck, compileCallback) {
                        compile(builder, deck.path, template, deck.config, compileCallback);
                    },
                    function(err) {
                        
                    }
                );
            });
        });
    });
};