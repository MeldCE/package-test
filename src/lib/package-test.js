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
let optionsSchema = require('./options.js');

/** @private
 * Walk through a directory ignore the files specified in the ignore filter,
 * return a list of the files and folder encountered, and, optionally, copy
 * the folders and files encountered into a destination folder
 *
 * @param {string} dir Directory to walk
 * @param {ignore-doc-filter} ignoreFilter Ignore filter to use to ignore files
 *        during the walk
 * @param {string} dest Directory to copy the encountered files into
 * @param {string} base The directory path to remove from the start of the
 *        encountered file paths when copying to the destination folder
 *
 * @returns {Array} An array containing the encountered files
 */
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

/** @private
 * Copy the files given by the glob to the given destination folder
 *
 * @param {string} globString Glob to use to find the files to copy
 * @param {string} dest Directory to copy the found files into
 * @param {string} base The directory path to remove from the start of the
 *        found file paths when copying to the destination folder
 *
 * @returns {Promise} A promise that all files found will be copied
 */
function globCopy(globString, dest, base) {
  return new Promise(function(resolve, reject) {
    if (!dest) {
      reject(new Error('No folder given to copy the files into'));
    } else {
      access(dest, fs.W_OK).then(function() {
      }, function(err) {
        if (err.code === 'ENOENT') {
          // Try creating the destination folder
          return mkdirp(dest).catch(function(merr) {
            merr.message = 'Error creating destination folder: '
                + merr.message;
            return Promise.reject(merr);
          });
        } else {
          err.message = 'Error with destination folder: ' + err.message;
          return Promise.reject(err);
        }
      }).then(function() {
        return glob(globString);
      }).then(function(files) {
        let f, cps = [];
        for (f in files) {
          let file = files[f];
          cps.push(stat(file).then(function(stats) {
            let destPath;

            if (!base 
                || (destPath = path.relative(base, file))
                || destPath.length > file.length) {
              destPath = file;
            }

            if (stats.isDirectory()) {
              return mkdirp(path.join(dest, destPath)).then(function() {
                return Promise.resolve(file);
              });
            } else if (dest) {
              return cp(file, path.join(dest, destPath)).then(function() {
                return Promise.resolve(file);
              });
            }
          }));
        }

        return Promise.all(cps);
      }, function(err) {
        reject(err);
      });
    }
  });
}

/**
 * Retrieve the package.json in the working folder
 *
 * @param {string} ignoreMissing Whether to ignore a file does not exist error
 *        and instead resolve to undefined
 *
 * @returns {Promise} A promise that will resolve to the Object contained
 *          in the package.json file
 */
function packageJson(ignoreMissing) {
  return new Promise(function packageJsonPromise(resolve, reject) {
    let packageFile = path.join(process.cwd(), 'package.json');
    access(packageFile, fs.R_OK).then(function() {
      try {
        resolve(require(packageFile));
      } catch(err) {
        err.message = 'package.json: ' + err.message;
        reject(err);
      }
    }, function(err) {
      if (ignoreMissing && err.code === 'ENOENT') {
        resolve();
      } else {
        err.message = 'package.json: ' + err.message;
        reject(err);
      }
    });
  });
}

/**
 * Retrieve the .package-test.json file in the working folder
 *
 * @param {string} ignoreMissing Whether to ignore a file does not exist error
 *        and instead resolve to undefined
 *
 * @returns {Promise} A promise that will resolve to the Object contained
 *          in the .package-test.json file
 */
function testConfig(ignoreMissing) {
  return new Promise(function testConfigPromise(resolve, reject) {
    let testConfigFile = path.join(process.cwd(), '.package-test.json');
    access(testConfigFile, fs.R_OK).then(function() {
      try {
        resolve(require(testConfigFile));
      } catch(err) {
        err.message = '.package-test.json: ' + err.message;
        reject(err);
      }
    }, function(err) {
      if (ignoreMissing && err.code === 'ENOENT') {
        resolve();
      } else {
        err.message = '.package-test.json: ' + err.message;
        reject(err);
      }
    });
  });
}

/**
 * Sets up a package test environment (a folder) by copying the package as it
 * would be exported by NPM, installing any dependencies (by running
 * `npm install --production` in the module folder) and then copying any
 * additional testing files.
 *
 * @param {object} options package-test options
%%packageTestOptions%%
 *
 * @returns {Promise} A promise of setting up the package test folder
 */
module.exports = function packageTest(options) {
  let packageInfo; 
   
  return new Promise(function packageTestPromise(resolve, reject) {
    Promise.all([
      packageJson(),
      testConfig(true)
    ]).then(function(data) {
      packageInfo = data[0];

      try {
        options = skemer.validateNew({
          parameterName: 'options',
          schema: optionsSchema
        }, data[1], options || {});
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
    // Check if the folder already exists
    return access(options.testFolder, fs.F_OK).then(function() {
      if (options.deleteFolder) {
        // Try an delete folder
        return rimraf(options.testFolder);
      } else {
        // Reject as don't want a polluted fake environment
        return Promise.reject(new Error('Test folder already exists'));
      }
    }, function(err) {
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

              // Copy over production files as would be by npm
              ignoreWalk('', ignoreDoc(ignore), path.join(options.testFolder,
                      'node_modules', packageInfo.name));

              // Copy files specified in options
              if (options.testFiles) {
                let cps;

                
                if (typeof options.testFiles === 'string') {
                  cps.push(globCopy(options.testFiles, options.testFolder));
                } else if (options.testFiles instanceof Array) {
                  // Copy all files to test directory
                  let f;
                  for (f in options.testFiles) {
                    cps.push(globCopy(options.testFiles[f],
                        options.testFolder));
                  }
                } else {
                  let f;
                  for (f in options.testFiles) {
                    if (!options.testFiles[f].destination) {
                      options.testFiles[f].destination = options.testFolder;
                    }

                    if (typeof options.testFiles[f].files === 'string') {
                      cps.push(globCopy(options.testFiles[f].files,
                          options.testFiles[f].destination,
                          options.testFiles[f].base));
                    } else if (options.testFiles[f].files  instanceof Array) {
                      // Copy all files to test directory
                      let i;
                      for (i in options.testFiles[f].files) {
                        cps.push(globCopy(options.testFiles[f].files[i],
                            options.testFiles[f].destination,
                            options.testFiles[f].base));
                      }
                    }
                  }
                }

                return Promise.all(cps);
              } else {
                return Promise.resolve();
              }
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

module.exports.testConfig = testConfig;
module.exports.packageJson = packageJson;
