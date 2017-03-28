const _ = require('lodash');
const async = require('async');
const BreakError = require('./BreakError');
const utils = require('./utils');

class RBAC {

  constructor(rules, checkFullPath, cacheTrees) {
    if (typeof rules === 'function') {
      this.getRules = rules;
    } else {
      this.getRules = callback => callback(null, rules);
    }

    this.checkFullPath = !!checkFullPath;
    this.cacheTrees = !!cacheTrees;
    if (this.cacheTrees) {
      this.trees = {};
    }
  }

  check(role, permission, params, cb) {
    let result = false;

    // If params not given, consider last argument as callback
    if (arguments.length < 4) {
      cb = params;
      params = {};
    }

    this.getTree(role, (err, tree) => {
      if (err) {
        return cb(err);
      }

      // Find all paths from root to permission
      let paths = utils.findPaths(tree, permission);
      // Sort by shortest first (i.e. no. of nodes)
      paths = _.sortBy(paths, function(path) {
        return path.length;
      });

      const checkFullPath = this.checkFullPath;
      // Check each path serially
      async.eachSeries(paths, function(path, cb) {
        utils.checkPath(path, 1, params, checkFullPath, function(err, res) {
          if (!err && res) {
            result = true;
            return cb(new BreakError('passed'));
          }

          cb(err, null);
        });
      }, function(err) {
        if (err && err instanceof BreakError) {
          return cb(null, result);
        }

        cb(err, result);
      });
    });
  }

  getTree(role, callback) {
    this.getRules((err, rules) => {
      if (err) {
        return callback(err);
      }

      if (!this.cacheTrees) {
        return callback(null, {
          value: role,
          children: utils.toTree(role, rules)
        });
      }

      if (this.trees[role]) {
        return callback(null, this.trees[role]);
      }

      this.trees[role] = {
        value: role,
        children: utils.toTree(role, rules)
      };

      return callback(null, this.trees[role]);
    });
  }
}

module.exports = RBAC;
