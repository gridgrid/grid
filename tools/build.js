// More info on Webpack's Node API here: https://webpack.github.io/docs/node.js-api.html
// Allowing console calls below since this is a build file.
/* eslint-disable no-console */
import webpack from 'webpack';
import createConfig from '../webpack/webpack.config';

const branchName = process.env.npm_package_config_build_branch; // ok if this is undefined
process.env.NODE_ENV = 'production'; // this assures React is built in prod mode and that the Babel dev config doesn't apply.

console.log('Generating minified bundle for production via Webpack. This will take a moment...');

webpack([
  createConfig(true)
]).run((error, stats) => {
    console.log('anything?');
  if (error) { // so a fatal error occurred. Stop here.
    console.log(error);
    return 1;
  }

  const jsonStats = stats.toJson();
  if (jsonStats.errors.length) {
    return jsonStats.errors.map(error => console.log(error));
  }

  // // uncomment if you want warnings, but there are a LOT
  // if (jsonStats.warnings.length) {
  //   console.log(chalkWarning('Webpack generated the following warnings: '));
  //   jsonStats.warnings.map(warning => console.log(chalkWarning(warning)));
  // }

  // console.log(`Webpack stats: ${stats}`);

  // if we got this far, the build succeeded.
  console.log('Your app is compiled in production mode in /dist. It\'s ready to roll!');

  return 0;
});
