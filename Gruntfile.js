'use strict';
var path = require('path');

module.exports = function(grunt) {
    var pkg, taskName;
    pkg = grunt.file.readJSON('package.json');
    grunt.initConfig({
        pkg: pkg,
        dir: {
            src: 'src',
            release: 'release'
        },
        // copy files
        copy: {
            release: {
                files: [
                    {
                        expand: true,
                        cwd: "<%= dir.src %>/",
                        src: ["**"],
                        dest: "<%= dir.release %>/"
                    }
                ]
            }
        },
                // delete unnecessary files
        clean: {
            // delete inside of release directory
            deleteReleaseFolder00: {
                src: [
                    '<%= dir.release %>/',
                    '<%= dir.src %>*/.DS_Store',
                    '<%= dir.src %>*/Thumbs.db'
                ],
            }
            // delete unnecessary files in release
        },
        // configuration of localhost
        // check on http://localhost:9001/
        connect: {
            release: {
                options: {
                    port: 9001,
                    hostname: 'localhost',
                    base: '<%= dir.release %>',
                    keepalive: true,
                    open: false
                }
            }
        }
    });
    
    // autoload packages which are listed in pakage.json
    for(taskName in pkg.devDependencies) {
        if(taskName.substring(0, 6) == 'grunt-') {
            grunt.loadNpmTasks(taskName);
        }
    }

    // Grunt command for creating deliver release
    grunt.registerTask('release', ['clean:deleteReleaseFolder00', 'copy:release']);

    grunt.registerTask('eatwarnings', function() {
        grunt.warn = grunt.fail.warn = function(warning) {
            grunt.log.error(warning);
        };
    });
};