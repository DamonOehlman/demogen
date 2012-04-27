var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    rePathDemogen = /^(.*?\/demogen)\/?.*$/i,
    testOpts = {
        path: __dirname
    },
    suite = vows.describe('Demogen Tests'),
    builder = require('scaffolder').create(path.resolve(__dirname, '../'), testOpts);
    
builder.once('ready', function() {
    suite.addBatch({
        'Project Creation': {
            topic: function() {
                builder.create(this.callback);
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
});