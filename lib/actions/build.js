var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    out = require('out'),
    handlebars = require('handlebars'),
    ncp = require('ncp').ncp,
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

function compile(builder, demo, callback) {
    var outputFile = path.join(demo.basePath, demo.key + '.html'),
        template;

    // save the settings
    demo.settings = JSON.stringify(extractSettings(demo));

    // reformat the css into an array so we can do something intelligent with it in handlebars
    demo.css = _.values(demo.css || {});
    
    // reformat the scripts (init script needs to be first)
    demo.code = orderScripts(demo.scripts);
    
    // if we have a layout for the demo, then build
    if (demo.key && demo.layout) {
        template = handlebars.compile(demo.layout);
        
        // write the file
        fs.writeFile(outputFile, template(demo), function(err) {
            if (err) {
                builder.out('!{red}Unable to generate!{} file !{underline}{0}', outputFile);
            }
            else {
                builder.out('Generated demo file: !{underline}{0}', outputFile);
            } // if..else
            
            callback(err);
        });
    }
    else {
        callback();
    } // if..else
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

function findSnippets(builder, targetPath, config, callback) {
    var subdirs = [],
        snippets = [],
        isDemo = false,
        configFile = path.join(targetPath, 'demo.json'),
        demoPath = getDemoPath(targetPath, config.basePath),
        childConfig = _.extend({}, config, { 
            key: demoPath.split('/').slice(1).join('-') 
        }),
        key;
        
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
                
                console.log(childConfig.includes);
            }
            catch (e) {
                builder.out('!{red}Error parsing deck config @ {0}', configFile);
            } // try..catch
        } // if
        
        // read the contents of the directory
        fs.readdir(targetPath, function(err, files) {
            if (err) {
                out('Unable to read directory: {0}', targetPath);
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

                    // parse the subdirectories
                    async.forEach(
                        subdirs, 
                        function(testPath, dirCallback) {
                            findSnippets(builder, testPath, childConfig, function(childSnippets) {
                                snippets = snippets.concat(childSnippets);
                                dirCallback(null);
                            });
                        },
                        function(err) {
                            callback(snippets);
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
        scriptsCopy = _.clone(scripts),
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
    return output.join('\n\n');
} // orderScripts

module.exports = function(opts, callback) {
    var builder = this,
        baseConfig = {
            basePath: builder.targetPath,
            theme: 'twilight',
            mode: 'javascript'
        };
    
    out('Looking for demos in: !{underline}{0}', builder.targetPath);
    findSnippets(builder, path.join(builder.targetPath, '_sources'), baseConfig, function(snippets) {
        // copy the client files to the root build path
        ncp(builder.getAssetPath('client'), builder.targetPath, function() {
            // compile each of the decks
            async.forEach(
                snippets, 
                function(demo, compileCallback) {
                    compile(builder, demo.config, compileCallback);
                },
                callback
            );
        });
    });
};