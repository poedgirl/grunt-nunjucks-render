/**
 * grunt-nunjucks-render
 * https://github.com/piwi/grunt-nunjucks-render
 *
 * Copyright (c) 2015 Pierre Cassat
 * Licensed under the Apache 2.0 license.
 */

'use strict';

// node/external libs
var path        = require('path');
var nunjucks    = require('nunjucks');
var loader      = require('../lib/loader');
var lib         = require('../lib/lib');
var nlib        = require('nunjucks/src/lib');

module.exports = function gruntTask(grunt) {

    // GRUNT task "nunjucks_render"
    grunt.registerMultiTask('nunjucks_render', 'Render nunjucks templates', function () {
        // prepare task timing
        var start, src_counter,
            time = function(){ return ((new Date()).getTime() - start) + "ms"; };

        // merge task-specific and/or target-specific options with these defaults
        var opts = this.options({
            name:           /(.*)/,
            searchPaths:    false,
            baseDir :       '.',
            extensions :    [ '.j2' ],
            autoescape:     false,
            watch:          true,
            asFunction:     false,
            data:           null,
            processData:    function(data){ return data; },
            env:            null
        });
        opts.extensions = nlib.isArray(opts.extensions) ? opts.extensions : [opts.extensions];
        for (var i in opts.extensions) {
            opts.extensions[i] = lib.dotExtension(opts.extensions[i]);
        }
        if (opts.baseDir) {
            opts.baseDir = lib.slashPath(opts.baseDir);
        }

        var nameFunc = nlib.isFunction(opts.name) ? opts.name : function(filepath) {
            return filepath;
        };

        // set up Nunjucks environment
        var searchPaths = [];
        if (!opts.searchPaths) {
            grunt.log.debug(">> no 'searchPaths' defined, using auto search paths (will take much longer!!!)");
            searchPaths = grunt.file.expand({filter: 'isDirectory'}, ['**', '!node_modules/**']);
        } else {
            searchPaths = grunt.file.expand(opts.searchPaths);
        }
    	var fileLoader = new loader.FileSystemLoader( searchPaths, opts.name, {
    	    baseDir:        opts.baseDir,
    	    extensions:     opts.extensions,
            autoescape:     opts.autoescape,
            watch:          opts.watch
    	});
    	var env_opts = opts.env ? [opts_env, fileLoader] : [fileLoader];
        opts.env = new nunjucks.Environment(env_opts);

        // iterate over all specified file groups
        this.files.forEach(function (f) {
            start = (new Date()).getTime();
            src_counter = 0;

            var fopts = lib.parseData((f.options !== undefined) ? f.options : undefined);
            fopts = lib.merge(opts, fopts);

            // prepare data
            var data = lib.parseData((f.data !== undefined) ? grunt.file.expand(f.data) : undefined);
            data = lib.merge(lib.parseData(opts.data), data);
            if (opts.processData) {
                data = opts.processData(data);
            }
            
            // concat specified files
            var src = f.src.filter(function (filepath) {
                // Warn on and remove invalid source files (if nonull was set)
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('File "' + filepath + '" not found!');
                    return false;
                }
                return true;
            }).map(function(filepath) {
                src_counter++;
                var filename = filepath;
                if (filepath.substr(0, opts.baseDir.length) === opts.baseDir) {
                    filename = filepath.substr(opts.baseDir.length);
                }
                data.name = nameFunc(filename);

                if (opts.asFunction) {
                    return nunjucks.precompile(filepath, {
                        name:       nameFunc(filename),
                        asFunction: true,
                        env:        opts.env,
                        data:       data
                    });
                }

                return opts.env.render(filename, data);

            }).join('');

            // show data on debug
            if (grunt.option('debug')) {
                grunt.log.writeflags(data);
            }

            // write the destination file
            grunt.file.write(f.dest, src);

            // print a success message
            grunt.log.debug('file "' + f.dest + '" created');
            grunt.log.ok(src_counter + ' file(s) parsed / 1 file created (' + time() + ')');
        });
    });

};
