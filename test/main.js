var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    rePathDemogen = /^(.*?\/demogen)\/?.*$/i,
    testPath = process.cwd().replace(rePathDemogen, '$1/test/testproject'),
    testOpts = {
        path: testPath
    },
    suite = vows.describe('Demogen Tests');
    
require('scaffolder').create(path.resolve(__dirname, '../'), function(builder) {
    suite.addBatch({
        'Project Creation': {
            topic: function() {
                builder.create(testOpts, this.callback);
            },
            
            'deck file created': function(err) {
                assert.ok(! err);
                assert.ok(path.existsSync(path.join(testPath, '_sources')), 'demo snippets do not exist');
            }
        }
    });
    
    suite.addBatch({
        'Project Build': {
            topic: function() {
                builder.build(testOpts, this.callback);
            },
            
            'deck output file exists': function() {
                
            }
        }
    });
    
    suite.run();
}, testOpts);