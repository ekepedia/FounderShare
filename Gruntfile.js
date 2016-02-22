/*
 * Copyright (c) 2014 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the grunt file
 *
 * Changes in version 1.1:
 * - Set timeout for mocha tests
 *
 * Changes in version 1.2:
 * - Don't run lint task before test task
 *
 *
 * Changes in version 1.3:
 * - Added mocha tests for forum 
 *
 * @author TCSASSEMBLER
 * @version 1.3
 */
"use strict";

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        mocha_istanbul: {
            coverage: {
                src: 'test', // a folder works nicely
                options: {
                    mask: '**/*.js'
                }
            }
        },
        istanbul_check_coverage: {
            default: {
                options: {
                    coverageFolder: 'coverage*', // will check both coverage folders and merge the coverage results
                    check: {
                        lines: 90,
                        statements: 90
                    }
                }
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
		    timeout: 10000
                },
                src: ['test/**/*.js']
            }
        },
        jshint: {
            files: ['src/**/*.js', 'test/**/*.js', 'test_files/**/*.js'],
            options: {
                jshintrc: true
            }
        },
        jscs: {
            src: ['src/**/*.js', 'test/**/*.js', 'test_files/**/*.js'],
            options: {
                config: ".jscsrc"
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks("grunt-jscs");
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('lint', ['jshint', 'jscs']);
    grunt.registerTask('test', ['mochaTest']);

    grunt.registerTask('coverage', ['mocha_istanbul:coverage']);
    grunt.registerTask('default', ['lint', 'coverage']);
};
