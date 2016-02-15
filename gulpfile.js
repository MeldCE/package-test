var path = require('path');
var del = require('del');
var rename = require('rename');
var packageInfo = require('./package.json');

var gulp = require('gulp');
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var jasmine = require('gulp-jasmine');
var documentation = require('gulp-documentation');
var concat = require('gulp-concat');
var checkDeps = require('gulp-check-deps');
var replace = require('gulp-replace');
var istanbul = require('gulp-istanbul');
var stripDebug = require('gulp-strip-debug');
var coveralls = require('gulp-coveralls');
var foreach = require('gulp-foreach');
var rename = require('gulp-rename');
var include = require('gulp-include');
var coolReporter = require('jasmine2-reporter').Jasmine2Reporter;
var complexity = require('gulp-complexity');
var toc = require('gulp-doctoc');

var paths = {
  dist: './',
  build: 'build/',
  reports: 'reports/',
  docs: 'docs/',
  libSrc: 'src/lib/**/*.js',
  binSrc: 'src/bin/**/*.js',
  docsSrc: 'build/docsSrc',
  exampleSrc: 'src/example.js',
  testDir: 'src/spec',
  testSrc: 'src/*.spec.js',
  srcTests: 'src/spec/**/*.spec.js',
  srcTestLib: 'src/spec/lib/*.js',
  srcJasmineJson: 'src/spec/support/jasmine.json',
  tests: 'spec/**/*.spec.js',
  lcov: 'coverage/lcov.info',
  mddoc: 'doc.md'
};

gulp.task('clean', [], function() {
  del([
    path.join(paths.dist, '**'),
    path.join(paths.build, '**')
  ], {force: true});
});

gulp.task('check:deps', function() {
  return gulp.src('package.json')
      .pipe(checkDeps());
});

gulp.task('lint', function() {
  return gulp.src([paths.libSrc, paths.binSrc])
      .pipe(eslint({
        useEslintrc: true,
        env: {
          node: true,
          es6: true
        }
      }))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
});

gulp.task('lint:test', function() {
  return gulp.src([paths.srcTests, paths.srcTestLib])
      .pipe(eslint({
        useEslintrc: true,
        env: {
          node: true,
          es6: true,
          jasmine: true
        }
      }))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
});

gulp.task('compile:tests', function() {
  return gulp.src(paths.testSrc)
      .pipe(include())
      .pipe(eslint({
        useEslintrc: true,
        env: {
          node: true,
          es6: true,
          jasmine: true
        }
      }))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError())
      .pipe(gulp.dest(paths.testDir));
});

gulp.task('compile:example', function() {
  return gulp.src(paths.exampleSrc)
      .pipe(include())
      .pipe(eslint({
        useEslintrc: true,
        env: {
          node: true,
          es6: true,
          jasmine: true
        }
      }))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError())
      .pipe(gulp.dest(paths.dist));
});


gulp.task('pre-test', ['lint', 'lint:test'], function() {
  return gulp.src([paths.libSrc, paths.binSrc])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire())
    // Write the covered files to a temporary directory
    .pipe(gulp.dest('test-tmp/'));
});

gulp.task('jasmine', ['compile:tests', 'lint', 'lint:test', 'pre-test'], function() {
  return gulp.src(paths.srcTests)
      .pipe(jasmine())
      .pipe(istanbul.writeReports());
});

gulp.task('jasmine:production', ['copy', 'jasmine'], function() {
  return gulp.src(paths.tests)
      .pipe(jasmine())
      .pipe(istanbul.writeReports())
      .pipe(istanbul.enforceThresholds({ thresholds: { each: {
        statements: 100,
        branches: 80,
        lines: 100
      } } }));
});

gulp.task('coveralls', ['jasmine:production'], function() {
  return gulp.src(paths.lcov)
        .pipe(coveralls());
});

gulp.task('complexity', ['lint', 'lint:test'], function() {
  return gulp.src([paths.libSrc, paths.binSrc])
      .pipe(complexity());
});

gulp.task('compile:docs', ['lint'], function() {
  var packageTestOptions = require('./src/lib/options.js');
  var skemer = require('skemer');

  var toCompile = {
    packageTestOptions: {
      schema: packageTestOptions,
      options: {
        preLine: '   * ',
        name: 'options',
        wrap: 80,
        type: 'param'
      }
    },
  };

  var builtDocs = {};
  var d;

  for (d in toCompile) {
    //console.log('doing', d, toCompile[d].schema);
    builtDocs[d] = skemer.buildJsDocs(toCompile[d].schema,
        toCompile[d].options);
  }

  return gulp.src(paths.libSrc)
			.pipe(replace(/%%([a-zA-Z0-9-_.]+)%%/g, function(match, param) {
				if (builtDocs[param]) {
					return builtDocs[param];
				} else {
					return match;
				}
			}))
      .pipe(gulp.dest(paths.docsSrc));
});

gulp.task('docs', ['compile:docs', 'htmldocs', 'mddocs']);

gulp.task('htmldocs', ['lint', 'compile:docs'], function() {
	return gulp.src(path.join(paths.docsSrc, '**/*.js'))
			.pipe(documentation({ format: 'html' }))
			.pipe(gulp.dest(paths.docs));
});

gulp.task('mddocs', ['lint', 'compile:docs'], function() {
	return gulp.src(path.join(paths.docsSrc, '**/*.js'))
			.pipe(foreach(function(stream, file) {
				return stream
						.pipe(documentation({ format: 'md', shallow: true }))
						.pipe(replace(/^#/gm, '##'))
						.pipe(concat(file.relative + '.md'));
						//.pipe(rename({
						//	basename: file.name,
						//	extname: '.md'
						//}));
			}))
			//.pipe(concat(paths.mddoc))
			.pipe(gulp.dest(paths.build));
});

/*gulp.task('mddocs', ['lint'], function() {
  return gulp.src([paths.libSrc, paths.binSrc])
      .pipe(documentation({ format: 'md' }))
      //.pipe(concat(paths.mddoc))
      .pipe(gulp.dest(paths.build));
});*/

gulp.task('readme', ['mddocs'], function() {
  return gulp.src(['src/README.md', path.join(paths.build, paths.mddoc)])
      .pipe(concat('README.md'))
      .pipe(replace(/%%([a-zA-Z0-9-_.]+)%%/g, function(match, param) {
        if (packageInfo[param]) {
          return packageInfo[param];
        } else {
          return match;
        }
      }))
      .pipe(include())
      .pipe(toc())
      .pipe(gulp.dest('./'));
});

gulp.task('copy', ['jasmine', 'copy:jasmine.json'], function() {
  return gulp.src([paths.libSrc, paths.binSrc, paths.srcTests, paths.srcTestLib], { base: 'src' })
    .pipe(stripDebug())
    .pipe(gulp.dest(paths.dist));
});

gulp.task('copy:jasmine.json', ['jasmine'], function() {
  return gulp.src(paths.srcJasmineJson, { base: 'src' })
    .pipe(gulp.dest(paths.dist));
});

gulp.task('test', ['lint', 'lint:test', 'compile:tests'], function() {
  return gulp.src(paths.srcTests)
      .pipe(jasmine({
        reporter: new coolReporter({
          inColors: true
        })
      }))
});

gulp.task('watch', function() {
  gulp.watch([paths.libSrc, paths.binSrc, paths.srcTests], ['jasmine']);
  gulp.watch([paths.libSrc, paths.binSrc], ['lint']);
  gulp.watch(paths.testSrc, ['compile:tests']);
  gulp.watch(paths.srcTests, ['lint:test']);
  gulp.watch(['src/README.md', [paths.libSrc, paths.binSrc]], ['readme']);
  gulp.watch([paths.libSrc, paths.binSrc], ['docs']);
  gulp.watch('package.json', ['check:deps']);
});

defaultTasks = ['check:deps', 'compile:example', 'jasmine', /*'complexity',*/ 'docs', 'readme'];

gulp.task('one', defaultTasks);

gulp.task('default', defaultTasks.concat(['watch']));

gulp.task('production', defaultTasks.concat(['copy', 'jasmine:production']));

gulp.task('coveralls', defaultTasks.concat(['copy', 'jasmine:production', 'coveralls']));
