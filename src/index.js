const _ = require('lodash');
const async = require('async');

function RBAC(rules, checkFullPath, cacheTrees) {
  this.rules = rules;
  this.checkFullPath = !!checkFullPath;
  this.cacheTrees = !!cacheTrees;
  if (this.cacheTrees) {
    this.trees = {};
  }
}
RBAC.prototype = {
  check(role, permission, params, cb) {
    let result = false;

    // If params not given, consider last argument as callback
    if (arguments.length < 4) {
      cb = params;
      params = {};
    }

    // Create a rbac tree from the current role
    const tree = this.getTree(role);

    // Find all paths from root to permission
    let paths = findPaths(tree, permission);
    // Sort by shortest first (i.e. no. of nodes)
    paths = _.sortBy(paths, function(path) {
      return path.length;
    });

    const checkFullPath = this.checkFullPath;
    // Check each path serially
    async.eachSeries(paths, function(path, cb) {
      checkPath(path, 1, params, checkFullPath, function(err, res) {
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
  },
  getTree(role) {
    if (!this.cacheTrees) {
      return {
        value: role,
        children: toTree(role, this.rules)
      };
    }
    if (this.trees[role]) {
      return this.trees[role];
    }
    this.trees[role] = {
      value: role,
      children: toTree(role, this.rules)
    };
    return this.trees[role];
  }
};

function BreakError(...params) {
  Error.apply(this, params);
}
BreakError.prototype = new Error();

function toTree(role, rules) {
  return _.reduce(rules, function(arr, rule) {
    if (rule.a === role) {
      arr.push({
        value: rule.can,
        when: rule.when,
        children: toTree(rule.can, rules)
      });
    }
    return arr;
  }, []);
}

function findPaths(root, permission) {
  const paths = [];

  if (root.value === permission) {
    paths.push([root]);
  } else {
    _.each(root.children, function(child) {
      const childpaths = findPaths(child, permission);

      _.each(childpaths, function(childpath) {
        const path = [root];
        path.push(...childpath);
        paths.push(path);
      });
    });
  }

  return paths;
}

function checkPath(path, index, params, checkFullPath, cb) {
  if (index >= path.length) {
    // reached end
    return cb(null, true);
  }

  const node = path[index];

  if (!node.when) {
    if (!checkFullPath || !node.children) {
      // no condition to get access to this node,
      // permission granted
      return cb(null, true);
    }

    return checkPath(path, index + 1, params, checkFullPath, cb);
  }

  // test condition associated with current node
  node.when(params, function(err, res) {
    if (!err && res) {
      // reached this node, move on to next
      checkPath(path, index + 1, params, checkFullPath, cb);
    } else {
      return cb(err, false);
    }
  });
}

module.exports = RBAC;
