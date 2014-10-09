var addDirtyProps = require('@grid/add-dirty-props');
module.exports = function (range, dirtyClean, parentDirtyClean) {
    range = range || {}; //allow mixin functionality
    range.isDirty = dirtyClean.isDirty;

    var watchedProperties = ['top', 'left', 'height', 'width', 'units', 'space'];
    var dirtyCleans = [dirtyClean];
    if (parentDirtyClean) {
        dirtyCleans.push(parentDirtyClean);
    }

    addDirtyProps(range, watchedProperties, dirtyCleans);
    //defaults
    range.units = 'cell';
    range.space = 'virtual';

    return range;
};