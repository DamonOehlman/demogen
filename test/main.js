var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    Generator = require('../lib/demogen').Generator,
    rePathDemogen = /^(.*?\/demogen)\/?.*$/i,
    testPath = process.cwd().replace(rePathDemogen, '$1/test/testproject'),
    testOpts = {
        path: testPath
    },
    builder = new Generator(testOpts);
    suite = vows.describe('Demogen Tests');
    
builder.on('ready', function() {
    suite.addBatch({
        'Project Creation': {
            topic: function() {
                builder.create(testOpts, this.callback);
            },
            
            'deck file created': function(err) {
                assert.ok(! err);
                assert.ok(path.existsSync(path.join(testPath, 'deck.jade')), 'deck.jade does not exist');
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

