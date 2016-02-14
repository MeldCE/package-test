'use strict';

var skemer = require('skemer');
var fs = require('fs');
var path = require('path');
var process = require('process');
var ignoreDoc = require('ignore-doc');
var Promise = require('promise');
var mkdir = require('mkdirp');
var cp = require('cp');

var rimraf = Promise.denodeify(require('rimraf'));
var mkdirp = Promise.denodeify(require('mkdirp'));
var cpp = Promise.denodeify(cp);
var access = Promise.denodeify(fs.access);
var glob = Promise.denodeify(require('glob'));
var readFile = Promise.denodeify(fs.readFile);
var stat = Promise.denodeify(fs.stat);
let readdir = Promise.denodeify(fs.readdir);

var packageInfo = {
  name: 'todo'
};

var schemaOptions = { type: {
  packageDirectory: {
    type: 'string'
  },
  testFolder: {
    type: 'string',
    default: 'package-test'
  },
  /*XXX testPackageFile: {
    type: 'string',
    default: 'package.json'
  },*/
  testFiles: {
    doc: 'An Array or an Object of Arrays',
    types: {
      string: {
        doc: 'A glob of files to recursively copy over to the test folder',
        type: 'string'
      },
      array: {
        doc: 'An array of globs of files to recursively copy over to the '
            + 'test folder',
        type: 'string',
        multiple: true
      },
      object: {
        doc: 'An array of sets of objects to copy accross',
        type: {
          files: {
            types: {
              string: {
                doc: 'A glob of files to recursively copy over to the test '
                    + 'folder',
                type: 'string'
              },
              array: {
                doc: 'An array of globs of files to recursively copy over to '
                    + 'the test folder',
                type: 'string',
                multiple: true,
                required: [1]
              }
            },
            required: true
          },
          base: {
            type: 'string'
          },
          destination: {
            type: 'string'
          }
        },
        multiple: true
      }
    },
    multiple: true,
    object: true
  },
  deleteFolder: {
    type: 'boolean',
    default: true
  }
}, required: true};


function ignoreWalk(dir, ignoreFilter, dest, base) {
  let array = [];

  let f, files = fs.readdirSync((dir ? dir : '.'));

  for (f in files) {
    let file = (dir ? path.join(dir, files[f]) : files[f]);
    if (ignoreFilter(file)) {
      // Add to list
      array.push(file);

      // Go into if a directory
      let stats = fs.statSync(file);

      let destPath;

      if (dest) {
        if (!base 
            || (destPath = path.relative(base, file))
            || destPath.length > file.length) {
          destPath = file;
        }
      }

      if (stats.isDirectory()) {
        if (dest) {
          mkdir.sync(path.join(dest, destPath));
        }
        array = array.concat(ignoreWalk(file, ignoreFilter, dest, base));
      } else if (dest) {
        cp.sync(file, path.join(dest, destPath));
      }
    }
  }

  return array;
}


module.exports = function packageTest(options) {
  return new Promise(function packageTestPromise(resolve, reject) {
    let fileOptions;
    // Check package.json exists
    access(path.join(process.cwd(), 'package.json'), fs.R_OK).then(function() {
      // Check if there is a settings file
      return access(path.join(process.cwd(), '.package-test.json'), fs.R_OK)
          .then(function() {
            fileOptions = require(path.join(process.cwd(),
                '.package-test.json'));
            return Promise.resolve();
          }, function() {
            return Promise.resolve();
          });
    }).then(function() {
      //var package = require('./package.json');
      try {
        options = skemer.validateNew({
          parameterName: 'options',
          schema: schemaOptions
        }, fileOptions, options);
        console.log('options are', options | {});
        resolve();
      } catch(err) {
        console.log('err', err);
        reject(err);
      }
    }, function(err) {
      reject(new Error('Couldn\'t access package.json file: '
          + path.join(process.cwd(), 'package.json'), err));
    });
  }).then(function() {
    console.log('options are', options);
    // Check if the folder already exists
    return access(options.testFolder, fs.F_OK).then(function() {
      console.log('got no error when accessing test folder', arguments);
      if (options.deleteFolder) {
        // Try an delete folder
        return rimraf(options.testFolder);
      } else {
        // Reject as don't want a polluted fake environment
        return Promise.reject(new Error('Test folder already exists'));
      }
    }, function(err) {
      console.log('got access error on test folder');
      if (err.errno !== -2) {
        err.message = 'Error checking test folder existence: ' + err.message;
        return Promise.reject(err);
      } else {
        return Promise.resolve();
      }
    }).then(function() {
      console.log('creating test folder', path.join(options.testFolder,
          'node_modules', packageInfo.name));
      // Make the test folder
      return mkdirp(path.join(options.testFolder, 'node_modules',
          packageInfo.name));
    }).then(function() {
      // Copy over the package.json and the a
      return Promise.all([
        cpp('package.json', path.join(options.testFolder, 'node_modules',
            packageInfo.name, 'package.json')),
        readFile('.npmignore')
            .catch(function() { 
              console.log('no .npmignore, trying .gitignore');
              return readFile('.gitignore');
            })
            .catch(function() {
              console.log('no .gitignore');
              return Promise.resolve('');
            })
            .then(function(ignore) {
              if (ignore) {
                ignore = ignore.toString();
              }
              // Add files npm ignores by default to ignore list
              // https://docs.npmjs.com/misc/developers#keeping-files-out-of-your-package
              ignore = options.testFolder + '\n.*.swp\n._*\n.DS_Store\n'
                  + '.git\n.hg\n.npmrc\n'
                  + '.lock-wscript\n.svn\n.wafpickle-*\nconfig.gypi\nCVS\n'
                  + 'npm-debug.log\nnode_modules\n' + ignore;
              
              console.log('ignore is', ignore);

              // Copy over production files as would be by npm
              ignoreWalk('', ignoreDoc(ignore), path.join(options.testFolder,
                      'node_modules', packageInfo.name));

              /* TODO / Copy files specified in options
              if (options.testFiles) {
                if (options.testFiles instanceof Array) {
                  // Copy all files to test directory
                  filters.push({
                    filter: ignoreDoc('', options.testFiles),
                    destination: options.testFolder
                  });
                } else {
                  let f;
                  for (f in options.testFiles) {
                    if (!options.testFiles[f].destination) {
                      options.testFiles[f].destination = options.testFolder;
                    }
                    options.testFiles[f].filter = ignoreDoc('',
                        options.testFiles[f].files);
                    filters.push(options.testFiles[f]);
                  }
                }
              }*/

              return Promise.resolve();
            })
      ]).then(function() {
        console.log('cps finished', arguments);
        return Promise.resolve({
          testFolder: options.testFolder,
          packageFolder: path.join(options.testFolder,
              'node_modules', packageInfo.name)
        });
      });
    });
  });
};
