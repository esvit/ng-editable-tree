path = require 'path'

# Build configurations.
module.exports = (grunt) ->
    grunt.initConfig
        # Deletes built file and temp directories.
        clean:
            working:
                src: [
                    'ng-editable-tree.*'
                    './.temp/'
                ]
        copy:
            styles:
                files: [
                    src: './src/styles/ng-editable-tree.css'
                    dest: './ng-editable-tree.css'
                ]

        uglify:
            # concat js files before minification
            js:
                src: ['src/scripts/jquery.mjs.nestedSortable.js','src/scripts/ng-editable-tree.js']
                dest: 'ng-editable-tree.js'
                options:
                  sourceMap: (fileName) ->
                    fileName.replace /\.js$/, '.map'
        concat:
            # concat js files before minification
            js:
                src: ['.temp/scripts/jquery.mjs.nestedSortable.js','.temp/scripts/ng-editable-tree.js']
                dest: 'ng-editable-tree.js'

        less:
            css:
                files:
                    'ng-editable-tree.css': ['src/styles/nav-nested-editable.less']

        cssmin:
            css:
                files:
                    'ng-editable-tree.css': 'ng-editable-tree.css'

    # Register grunt tasks supplied by grunt-contrib-*.
    # Referenced in package.json.
    # https://github.com/gruntjs/grunt-contrib
    grunt.loadNpmTasks 'grunt-contrib-clean'
    grunt.loadNpmTasks 'grunt-contrib-copy'
    grunt.loadNpmTasks 'grunt-contrib-less'
    grunt.loadNpmTasks 'grunt-contrib-cssmin'
    grunt.loadNpmTasks 'grunt-contrib-uglify'
    grunt.loadNpmTasks 'grunt-contrib-concat'


    # Register grunt tasks supplied by grunt-hustler.
    # Referenced in package.json.
    # https://github.com/CaryLandholt/grunt-hustler
    grunt.loadNpmTasks 'grunt-hustler'

    grunt.registerTask 'default', [
        'clean'
        'uglify'
        'less'
        'cssmin'
        'copy'
    ]
    grunt.registerTask 'dev', [
        'clean'
        'concat'
        'less'
        'copy'
    ]
