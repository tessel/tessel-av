'use strict';

// System Objects
const cp = require('child_process');
const path = require('path');

// Third Party Dependencies
const glob = require('glob');
const tags = require('common-tags');


module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    nodeunit: {
      tests: [
        'test/common/bootstrap.js',
        'test/unit/shared.js',
        'test/unit/*.js'
      ]
    },
    jshint: {
      all: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: [
          'lib/**/*.js',
          'Gruntfile.js',
        ]
      },
      tests: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: [
          'test/**/*.js',
        ]
      }
    },
    jscs: {
      all: [
        'lib/**/*.js',
        'test/**/*.js',
        'Gruntfile.js',
      ],
      options: {
        config: '.jscsrc'
      }
    },
    jsbeautifier: {
      all: [
        'lib/**/*.js',
        'test/**/*.js',
        'Gruntfile.js',
      ],
      options: {
        js: {
          braceStyle: 'collapse',
          breakChainedMethods: false,
          e4x: false,
          evalCode: false,
          indentChar: ' ',
          indentLevel: 0,
          indentSize: 2,
          indentWithTabs: false,
          jslintHappy: false,
          keepArrayIndentation: false,
          keepFunctionIndentation: false,
          maxPreserveNewlines: 10,
          preserveNewlines: true,
          spaceBeforeConditional: true,
          spaceInParen: false,
          unescapeStrings: false,
          wrapLineLength: 0
        }
      }
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-jsbeautifier');


  // 'npm test' runs these tasks
  grunt.registerTask('test', ['jshint', 'jscs', 'jsbeautifier', 'nodeunit']);

  // Default task.
  grunt.registerTask('default', ['test']);


  // This new runner will eventually supersede "nodeunit:only"
  grunt.registerTask('nodeunit:file', 'Run a subset of tests by specifying a file name or glob expression. Usage: "grunt nodeunit:file:<file.ext>" or "grunt nodeunit:file:<expr>"', (input) => {

    var config = [
      'test/common/bootstrap.js',
    ];

    if (input) {
      if (!input.endsWith('.js')) {
        if (!input.endsWith('*') || !input.endsWith('**/*')) {
          input = `{${path.normalize(input + '*')},${path.normalize(input + '**/*')}}`;
        }
      }

      var expr = `test/unit/${input}`;
      var inputs = glob.sync(expr).filter((file) => file.endsWith('.js'));

      if (inputs) {
        inputs.forEach(input => config.push(input));
        grunt.config('nodeunit.tests', config);
      }
    }

    grunt.task.run('nodeunit');
  });


  grunt.registerTask('nodeunit:files', 'Run a subset of tests by specifying a file name, bracket list of file names, or glob expression. Usage: "grunt nodeunit:file:<file.ext>" or "grunt nodeunit:file:<expr>"', (file) => {
    grunt.task.run('nodeunit:file:' + file);
  });

  grunt.registerTask('changelog', 'changelog', '"changelog:v0.0.0..v0.0.2" or "changelog:v0.0.0"', (arg) => {
    const done = grunt.task.current.async();
    const tags = cp.execSync('git tag --sort version:refname').toString().split('\n');
    let tagIndex = -1;
    let range;
    let revisionRange;

    if (!arg) {
      // grunt changelog
      range = tags.filter(Boolean).slice(-2);
    } else {
      if (arg.includes('..')) {
        // grunt changelog:<revision-range>
        if (!arg.startsWith('v') || !arg.includes('..v')) {
          range = arg.split('..').map(tag => tag.startsWith('v') ? tag : `v${tag}`);
        } else {
          // arg is a well formed <revision-range>
          revisionRange = arg;
        }
      } else {
        // grunt changelog:<revision>
        if (!arg.startsWith('v')) {
          arg = `v${arg}`;
        }

        tagIndex = tags.indexOf(arg);
        range = [tags[tagIndex - 1], tags[tagIndex]];
      }
    }

    if (!range && revisionRange) {
      range = revisionRange.split('..');
    }

    if (!revisionRange && (range && range.length)) {
      revisionRange = `${range[0]}..${range[1]}`;
    }

    cp.exec(`git log --format='|%h|%s|' ${revisionRange}`, (error, result) => {
      if (error) {
        console.log(error.message);
        return;
      }

      var rows = result.split('\n').filter(commit => {
        return !commit.includes('|Merge ') && !commit.includes(range[0]);
      });

      // Extra whitespace above and below makes it easier to quickly copy/paste from terminal
      grunt.log.writeln(`\n\n${changelog(rows)}\n\n`);

      done();
    });
  });
};

function changelog(rows) {
  return tags.stripIndent `
| Commit | Message/Description |
| ------ | ------------------- |
${rows.join('\n')}
`;
}
