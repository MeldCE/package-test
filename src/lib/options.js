/**
 * Options that can either be passing to the package-test function or
 * stored as a JSON object in `.package-test.json`
 */
var packageTestOptions = module.exports = { type: {
  /*packageDirectory: {
    doc: '
    type: 'string'
  },*/
  testFolder: {
    doc: 'The path to the test folder to create. If not given, it will '
        + 'default to the name of the package',
    type: 'string'
  },
  /*XXX testPackageFile: {
    type: 'string',
    default: 'package.json'
  },*/
  testFiles: {
    doc: 'A glob string to match the test files to copy over to the test '
        + 'folder, an Array of globs string match test files to copy over '
        + 'or an Array of Objects with a `files` parameter, specyfing the '
        + 'glob  or array of globs to match the files to copy, a '
        + '`destination` parameter, specifying where to copy the files to, '
        + 'and a `base` parameter, specifying a part of the path to remove '
        + ' from the test files when copying',
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
  testCommand: {
    doc: 'Test command that should be run instead of the one specified in '
        + 'the package.json file',
    types: {
      string: {
        type: 'string'
      },
      bool: {
        type: 'boolean',
        values: [false]
      }
    }
  },
  noDeleteFolder: {
    doc: 'Whether or not to not delete the test folder (and fail) if it '
        + 'already exists. If `testFolder` is not set, this must be set to '
        + '`false` to delete the existing folder',
    type: 'boolean'
  }
}, required: true};
