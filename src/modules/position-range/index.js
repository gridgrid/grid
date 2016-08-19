var addDirtyProps = require('../add-dirty-props');
module.exports = function (range, dirtyClean, parentDirtyClean, propOpts) {
    range = range || {}; // allow mixin functionality
    range.isDirty = dirtyClean.isDirty;
    range._positionRangeDirtyClean = dirtyClean;

    var watchedProperties = ['top', 'left', 'height', 'width', 'units', 'space'];
    if (propOpts) {
        watchedProperties = watchedProperties.map(function (propName) {
            return {
                name: propName,
                onDirty: propOpts.onDirty,
                preDirty: propOpts.preDirty
            };
        });
    }
    var dirtyCleans = [dirtyClean];
    if (parentDirtyClean) {
        dirtyCleans.push(parentDirtyClean);
    }

    addDirtyProps(range, watchedProperties, dirtyCleans);
    // defaults
    range.units = 'cell';
    range.space = 'data';

    return range;
};
