'use strict';

var skemer = require('skemer');
var fs = require('fs');
var path = require('path');
var process = require('process');
var ignoreDoc = require('ignore-doc');
var Promise = require('promise');

var rimraf = Promise.denodeify(require('rimraf'));
var mkdirp = Promise.denodeify(require('mkdirp'));
var cp = Promise.denodeify(require('node-cp'));
var access = Promise.denodeify(fs.access);
var glob = Promise.denodeify(require('glob'));
var readFile = Promise.denodeify(fs.readFile);

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
      array: {
        type: 'string',
        multiple: true
      },
      object: {
        type: {
          files: {
            type: 'string',
            multiple: true,
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

module.exports = function packageTest(options) {
  return new Promise(function packageTestPromise(resolve, reject) {
    // Check package.json exists
    access(path.join(process.cwd(), 'package.json'), fs.R_OK)
        .then(function() {
          //var package = require('./package.json');
          try {
            options = skemer.validateNew({
              parameterName: 'options',
              schema: schemaOptions
            }, options);
            void 0;
            resolve();
          } catch(err) {
            void 0;
            reject(err);
          }
        }, function(err) {
          reject(new Error('Couldn\'t access package.json file: '
              +path.join(process.cwd(), 'package.json'), err));
        });
  }).then(function() {
    void 0;
    // Check if the folder already exists
    return access(options.testFolder, fs.F_OK).then(function() {
      void 0;
      if (options.deleteFolder) {
        // Try an delete folder
        return rimraf(options.testFolder);
      } else {
        // Reject as don't want a polluted fake environment
        return Promise.reject(new Error('Test folder already exists'));
      }
    }, function(err) {
      void 0;
      if (err.errno !== -2) {
        err.message = 'Error checking test folder existence: ' + err.message;
        return Promise.reject(err);
      } else {
        return Promise.resolve();
      }
    }).then(function() {
      void 0;
      // Make the test folder
      return mkdirp(path.join(options.testFolder, 'node_modules',
          packageInfo.name));
    }).then(function() {
      // Copy over the package.json and the a
      return Promise.all([
        cp('package.json', path.join(options.testFolder, 'node_modules',
            packageInfo.name)),
        readFile('.npmignore')
            .catch(function() { return readFile('.gitignore'); })
            .catch(function() { return Promise.resolve(''); })
            .then(function(ignore) {
              new Promise(function(resolve, reject) {
                if (ignore) {
                  ignore = ignore.toString();
                }
                // Add files npm ignores by default to ignore list
                // https://docs.npmjs.com/misc/developers#keeping-files-out-of-your-package
                ignore = options.testFolder + '\n.*.swp\n._*\n.DS_Store\n'
                    + '.git\n.hg\n.npmrc\n'
                    + '.lock-wscript\n.svn\n.wafpickle-*\nconfig.gypi\nCVS\n'
                    + 'npm-debug.log\nnode_modules\n' + ignore;
                
                //console.log('ignore is', ignore);

                let filters = [
                  {
                    filter: ignoreDoc(ignore),
                    destination: path.join(options.testFolder,
                        'node_modules', packageInfo.name)
                  }
                ];

                // Add test file destinations
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
                }

                // Change into the filter
                glob('**').then(function(files) {
                  //console.log(files);
                  let f;

                  let cps = [];
                  // Copy package files into the package directory
                  for (f in files) {
                    let i;
                    for (i in filters) {
                      let file;
                      if (filters[i].filter(files[f])) {
                        // Shorten the file name with base if it is available
                        if (!filters[i].base 
                            || (file = path.relative(filters[i].base, files[f]))
                            || file.length > files[f].length) {
                          file = files[f];
                        }
                        //console.log('cp', files[f]);
                        cps.push(cp(files[f],
                            path.join(filters[i].destination, file)));
                      }
                    }
                  }

                  resolve(Promise.all(cps));
                });
              });
            })
      ]).then(function() {
        return Promise.resolve({
          testFolder: options.testFolder,
          packageFolder: path.join(options.testFolder,
              'node_modules', packageInfo.name)
        });
      });
    });
  });
};
