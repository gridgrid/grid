const tsConfig = require('./tsconfig.json');
const transformPaths = require('transform-ts-paths').transformPaths;

module.exports = (transformAlias, transformPath) => {
  return transformPaths(tsConfig, transformAlias, transformPath);
};
