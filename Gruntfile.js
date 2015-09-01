'use strict';
var path = require('path');

module.exports = function(grunt) {
    var pkg, taskName;
    pkg = grunt.file.readJSON('package.json');
    grunt.initConfig({
        pkg: pkg,
        dir: {
            src: 'src',
            lib: 'lib',
            release: 'release'
        },
        // grunt-release
        release: {
            options: {
                file: "src/bower_components/x-webmidi/bower.json",
                npm: false,
                add: false,
                commit: false,
                push: false,
                tag: false,
                pushTags: false
            }
        },
        // copy files
        copy: {
            createRelease: {
                files: [
                    {
                        expand: true,
                        cwd: "<%= dir.src %>/",
                        src: ["**"],
                        dest: "<%= dir.release %>/"
                    }
                ]
            },
            createLib: {
                files: [
                    {
                        expand: true,
                        cwd: "<%= dir.src %>/bower_components/x-webmidi/",
                        src: ["**"],
                        dest: "<%= dir.lib %>/"
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
                ]
            },
            // delete unnecessary files in lib directory
            deleteLibFolder00: {
                src: [
                    '<%= dir.lib %>/',
                    '<%= dir.src %>*/.DS_Store',
                    '<%= dir.src %>*/Thumbs.db'
                ],
            }
        },
        // banner
        usebanner: {
            dist: {
                options: {
                    position: 'top',
                    process: function ( filepath ) {
                        var crstate='<%= filename %> (<%= grunt.template.today("yyyy/mm/dd") %>)';
                        switch((filepath.match(/\/([^/]*)$/)[1]).split(".").pop()) {
                          case "html":
                            crstate='<!-- '+crstate+' -->';
                            break;
                          case "js":
                          case "css":
                          default:
                            crstate='/*! '+crstate+' */';
                            break;
                            
                        }
                        return grunt.template.process(
                            crstate, {
                                data: {
                                    filename: filepath.match(/\/([^/]*)$/)[1]
                                }
                            }
                        );
                    }
                },
                                files: {
                    src: [
                        '<%= dir.lib %>/x-webmidiinput.html',
                        '<%= dir.lib %>/x-webmidioutput.html',
                        '<%= dir.lib %>/x-webmidirequestaccess.html'
                    ]
                }
            }
        },
        // configuration of localhost
        // check on http://localhost:9001/
        connect: {
            createRelease: {
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
    grunt.registerTask('createRelease', ['clean:deleteReleaseFolder00', 'copy:createRelease']);
    grunt.registerTask('createLib', ['clean:deleteLibFolder00', 'copy:createLib', 'usebanner']);

    grunt.registerTask('eatwarnings', function() {
        grunt.warn = grunt.fail.warn = function(warning) {
            grunt.log.error(warning);
        };
    });
};