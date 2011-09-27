var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    out = require('out'),
    jade = require('jade'),
    ncp = require('ncp').ncp,
    _ = require('underscore'),
    reIgnore = /^_/,
    reSnippetFile = /^demo/i,
    readers = {},
    
    // define some typical config sections
    configSections = {
        '^demo\.js': {
            key: 'script'
        },
        
        '^readme\.md': {
            key: 'readme',
            reader: 'markdown'
        },
        
        '^readme(\.txt)?$': {
            key: 'readme'
        }
    };
    
/* define some readers */

readers.text = function(filename, existingValue) {
    var contents = existingValue ? existingValue + '\n' : '';
    
    try {
        contents += fs.readFileSync(filename, 'utf8');
    }
    catch (e) {
        out('Could not read contents of file: !{underline}' + filename);
    } // try..catch
    
    return contents;
};

readers.markdown = function(filename, existingValue) {
    // try importing a markdown library
    var md = getMarkdownParser(),
        contents = existingValue ? existingValue + '\n' : '',
        str = readers.text(filename);
    
    // str = str.replace(/\\n/g, '\n');
    return contents + md.parse(str)/* .replace(/\n/g, '\\n') */.replace(/'/g,'&#39;');
};

/* internal functions */

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
            else {
                // check for files that are valid for child configurations
                for (key in configSections) {
                    var regex = new RegExp(key, 'i'),
                        keyCfg = configSections[key],
                        readerFn = readers[keyCfg.reader || 'text'] || readers.text;

                    if (regex.test(file)) {
                        childConfig[keyCfg.key] = readerFn(testPath, childConfig[keyCfg.key]);
                    } // if
                } // for

                if (stats.isDirectory() && (! reIgnore.test(file))) {
                    findSnippets(builder, testPath, childConfig, function(childSnippets) {
                        snippets = snippets.concat(childSnippets);
                        callback(null);
                    });
                }
                else {
                    isDemo = isDemo || reSnippetFile.test(file);

                    callback(null);
                } // if..else
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

// markdown parser attempts
// from: https://github.com/visionmedia/jade/blob/master/lib/filters.js#L61
function getMarkdownParser() {
    var md;

    // support markdown / discount
    try {
      md = require('markdown');
    } catch (err){
      try {
        md = require('discount');
      } catch (err) {
        try {
          md = require('markdown-js');
        } catch (err) {
          throw new Error('Cannot find markdown library, install markdown or discount');
        }
      }
    }

    return md;
}

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