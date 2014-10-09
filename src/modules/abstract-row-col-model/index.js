module.exports = function (_grid, name, lengthName, defaultLength) {
    var grid = _grid;

    var DEFAULT_LENGTH = defaultLength;
    var descriptors = [];
    var numFixed = 0;

    var api = {
        add: function (descriptor) {
            //if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
            if (descriptor.fixed) {
                if (!descriptors.length || descriptors[descriptors.length - 1].fixed) {
                    numFixed++;
                } else {
                    throw 'Cannot add a fixed column after an unfixed one';
                }
            }
            descriptors.push(descriptor);
            grid.eventLoop.fire('grid-' + name + '-change');
        },
        get: function (index) {
            return descriptors[index];
        },
        length: function () {
            return descriptors.length;
        },

        numFixed: function () {
            return numFixed;
        }
    };

    //basically height or width
    api[lengthName] = function (index) {
        if (!descriptors[index]) {
            return NaN;
        }
        
        return descriptors[index] && descriptors[index][lengthName] || DEFAULT_LENGTH;
    };

    return api;
};