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
              return glob('**').then(function(files) {
                //console.log(files);
                let f;

                let cps = [];
                // Copy package files into the package directory
                console.log('have filters', filters);
                try {
                  for (f in files) {
                    let i;
                    for (i in filters) {
                        let file = files[f];
                        if (filters[i].filter(files[f])) {
                          let stats = fs.statSync(file);
                          let destFile;
                          // Shorten the file name with base if it is available
                          if (!filters[i].base 
                              || (destFile = path.relative(filters[i].base, files[f]))
                              || destFile.length > files[f].length) {
                            destFile = files[f];
                          }
                          if (stats.isDirectory()) {
                            console.log('mkdir', path.join(filters[i].destination, destFile));
                            mkdir.sync(path.join(filters[i].destination, destFile));
                          } else {
                            console.log('cp', file, path.join(filters[i].destination, destFile));
                            cp.sync(file,
                                path.join(filters[i].destination, destFile));
                          }
                        }
                    }
                    console.log('.');
                  }

                  console.log('finished looking through files, returning resolved');
                  return Promise.resolve();
                } catch(err) {
                  console.log(err);
                  return Promise.reject(err);
                }
              });
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
