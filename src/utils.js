const _ = require('lodash');

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

module.exports = {
  toTree,
  checkPath,
  findPaths
};
