var async = require('async'),
    debug = require('debug')('demogen-build'),
    fs = require('fs'),
    path = require('path'),
    handlebars = require('handlebars'),
    _ = require('underscore'),
    reIgnore = /^_/,
    reDemoFile = /\.js$/i,
    reScriptHelper = /^(init|cleanup)\.js$/i,
    reKeyedFile = /^(.*)\.(js|css)$/i,
    readers = {},
    
    // define some typical config sections
    configSections = [
        {
            regex: '^(.*)\.js$',
            key: 'scripts',
            reader: 'keyedText'
        },
        
        {
            regex: '^(.*)\.css$',
            key: 'css',
            reader: 'keyedText'
        },
        
        {
            regex: '^readme\.md',
            key: 'readme',
            reader: 'markdown'
        },
        
        {
            regex: '^readme(\.txt)?$',
            key: 'readme'
        },
        
        {
            regex: '^\_?layout\.html?$',
            key: 'layout',
            reader: 'layout',
            last: true
        },
        
        {
            regex: '^(.*)\.html?$',
            key: '$1'
        }
    ];
    
/* define some readers */

readers.keyedText = function(filename, existingValue) {
    // ensure we have an existing value
    existingValue = _.clone(existingValue || {});
    
    // read the contents of the file
    var contents = readers.text(filename),
        fileKey = path.basename(filename).replace(reKeyedFile, '$1');
    
    // add the style to the css values
    existingValue[fileKey] = contents;
    
    // return the key with the new rules
    return existingValue;
};

readers.text = function(filename, existingValue) {
    var contents = existingValue ? existingValue + '\n' : '';
    return contents + fs.readFileSync(filename, 'utf8');
};

// return the text value, but override any existing value
readers.layout = function(filename, existingValue) {
    return readers.text(filename);
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

function compile(scaffolder, demo, callback) {
    var outputFile = path.join(demo.basePath, demo.key + '.html'),
        template;
        
    // reset the includes
    demo.includes = [];
    debug('compiling demo, output file: ' + outputFile);
    
    // if we have demo.css then this is a css demo, not js
    if (demo.css.demo) {
        demo.code = demo.css.demo;
        demo.mode = 'css';
        
        // delete the demo css from the css
        delete demo.css.demo;
    }
    else if (demo.demo) {
        demo.code = demo.demo;
        demo.mode = 'htmlmixed';
    }
    else {
        // reformat the scripts (init script needs to be first)
        demo.code = orderScripts(demo.scripts);
    } // if..else
    
    // save the settings
    demo.settings = JSON.stringify(extractSettings(demo));
    
    // reformat the css into an array so we can do something intelligent with it in handlebars
    demo.css = _.values(demo.css || {});
    
    // initialise the keymappings
    demo.keys = demo.keys || [];
    
    // prepare the views
    prepareViews(scaffolder, demo, function(err) {
        if (err) return callback(err);
        
        // if we have a layout for the demo, then build
        if (demo.key && demo.layout) {
            template = handlebars.compile(demo.layout);

            // write the file
            fs.writeFile(outputFile, template(demo), function(err) {
                if (! err) {
                    scaffolder.out('Generated demo file: !{underline}{0}', outputFile);
                } // if..else

                callback(err);
            });
        }
        else {
            callback();
        } // if..else
    });
} // compile

function extractSettings(config) {
    // create a copy of the onfig
    var settings = _.clone(config),
        nonSettings = [
            'basePath',
            'includes',
            'layout',
            'scripts',
            'css',
            'demo',
            'code',
            'views',
            'readme',
            'author',
            'description',
            'key'
        ];
    
    // delete non setting sections
    nonSettings.forEach(function(key) {
        delete settings[key];
    });
    
    return settings;
} // extractSettings

function findSnippets(scaffolder, targetPath, config, callback) {
    var subdirs = [],
        snippets = [],
        isDemo = false,
        configFile = path.join(targetPath, 'demo.json'),
        demoPath = getDemoPath(targetPath, config.basePath),
        childConfig = _.extend({}, config, { 
            key: demoPath.split('/').slice(1).join('-') 
        }),
        key;
        
    debug('config path: ' + configFile);
    debug('demo path:   ' + demoPath);
        
    function checkPath(file, pathCallback) {
        var testPath = path.join(targetPath, file);
        
        fs.stat(testPath, function(statErr, stats) {
            if (statErr) {
                callback(statErr);
            }
            else {
                if (stats.isDirectory()) {
                    if (! reIgnore.test(file)) {
                        subdirs.push(testPath);
                    } // if
                }
                else {
                    // check for files that are valid for child configurations
                    for (var ii = 0; ii < configSections.length; ii++) {
                        var sectionData = configSections[ii],
                            regex = new RegExp(sectionData.regex, 'i'),
                            readerFn = readers[sectionData.reader || 'text'] || readers.text,
                            targetKey;

                        if (regex.test(file)) {
                            // get the target key
                            targetKey = file.replace(regex, sectionData.key);

                            // update the config
                            childConfig[targetKey] = readerFn(testPath, childConfig[targetKey], targetKey);

                            // if this is the last expression, then break from the loop
                            if (sectionData.last) {
                                break;
                            } // if
                        } // if
                    } // for
                    
                    // determine if this is a demo
                    isDemo = isDemo || (reDemoFile.test(file) && (! reScriptHelper.test(file)));
                } // if..else

                pathCallback(null);
            } // if..else 
        });
    } // checkPath
    
    // attempt to read a configuration file
    fs.readFile(configFile, 'utf8', function(err, data) {
        // if we read the configuration successfully, then update the config
        if (! err) {
            try {
                // save any includes
                var includes = _.clone(childConfig.includes);
                
                // extend the child config
                _.extend(childConfig, JSON.parse(data));
                
                // combine the includes
                childConfig.includes = _.select(_.union(childConfig.includes, includes), function(val) {
                    return typeof val == 'string';
                });
            }
            catch (e) {
                return callback(new Error('Error parsing config file: ' + configFile));
            } // try..catch
        } // if

        // read the contents of the directory
        fs.readdir(targetPath, function(err, files) {
            if (err) {
                return callback(new Error('Unable to read directory: ' + targetPath));
            }
            else {
                async.forEach(files, checkPath, function(err) {
                    if (isDemo) {
                        snippets.unshift({
                            path: targetPath,
                            config: childConfig
                        });
                    } // if

                    // parse the subdirectories
                    async.forEach(
                        subdirs, 
                        function(testPath, dirCallback) {
                            findSnippets(scaffolder, testPath, childConfig, function(err, childSnippets) {
                                if (! err) {
                                    snippets = snippets.concat(childSnippets);
                                }
                                
                                dirCallback(err);
                            });
                        },
                        function(err) {
                            callback(null, snippets);
                        }
                    );
                });
            } // if..else
        });
    });
} // findSnippets

function getDemoPath(targetPath, basePath) {
    var demoPath = '';
    
    while (targetPath.length > basePath.length) {
        demoPath = path.join(path.basename(targetPath), demoPath);
        targetPath = path.dirname(targetPath);
    } // while
    
    return demoPath;
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

/**
The orderScripts function is used to convert an object literal containing which 
references script names to script chunks.  This object is converted to a single 
string of code that is used to generate the demo.

Apart from optional `init` and `cleanup` scripts, the script names are concatenated
in natural sort order, so if a particular script should be executed before another 
ensure that it would be output from a javascript `sort()` operation sooner than others.

The `init` and `cleanup` scripts (if present), will always be placed first and last 
respectively in the generated code
*/
function orderScripts(scripts) {
    var output = [],
        scriptsCopy = _.clone(scripts) || {},
        cleanup,
        keys;
    
    // if we have an init script, then add that to the output as the first script
    if (scriptsCopy.init) {
        output.push(scriptsCopy.init);
        delete scriptsCopy.init;
    } // if
    
    // grab the cleanup script
    cleanup = scriptsCopy.cleanup;
    delete scriptsCopy.cleanup;
    
    // get the keys
    _.keys(scriptsCopy).sort().forEach(function(key) {
        output.push(scriptsCopy[key]);
    });
    
    // if we have a cleanup script, then append it
    output.push(cleanup);
    
    // return the code
    return output.join('\n\n').replace(/\n*$/, '');
} // orderScripts

function prepareViews(scaffolder, demo, callback) {
    var views = (demo.views || 'editor').split(/[\s\,]/),
        preparedViews = {};
        
    debug('preparing views for demo: ' + (demo.key || ''), views);
    
    // iterate through the views and add them to the views
    async.forEach(
        views,
        function(view, viewCallback) {
            var viewFn;
            
            try {
                viewFn = require('../views/' + view);
            }
            catch (e) {
            } // try..catch
            
            if (viewFn) {
                viewFn.call(null, scaffolder, demo, function(err, contents) {
                    if (! err) {
                        preparedViews[view] = contents;
                    }
                    
                    viewCallback(err);
                });
            }
            else {
                viewCallback(new Error('Could not load view renderer: ' + view));
            } // if..else
        },
        function(err) {
            demo.views = preparedViews;
            if (callback) {
                callback(err);
            } // if
        }
    );
} // prepareViews

/* exports */

exports.run = function(opts, callback) {
    var scaffolder = this,
        baseConfig = {
            basePath: path.resolve(),
            theme: 'dawn',
            mode: 'javascript'
        };
    
    this.out('Looking for demos in: !{underline}{0}', baseConfig.basePath);
    findSnippets(scaffolder, path.join(baseConfig.basePath, '_sources'), baseConfig, function(err, snippets) {
        if (! err) {
            debug('found ' + snippets.length + ' snippets');
            
            // compile each of the decks
            async.forEach(
                snippets, 
                function(demo, compileCallback) {
                    compile(scaffolder, demo.config, compileCallback);
                },
                callback || function() {}
            );
        }
        else {
            callback(err);
        }
    });
};