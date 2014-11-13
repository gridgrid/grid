(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

angular.module('riq-grid', []).
    factory('riqGrid', function () {
        return require('@grid/core');
    })
;


},{"@grid/core":10}],2:[function(require,module,exports){
var addDirtyProps = require('@grid/add-dirty-props');
var util = require('@grid/util');
var noop = require('@grid/no-op');

module.exports = function (_grid, name, lengthName, defaultLength) {
    var grid = _grid;

    var DEFAULT_LENGTH = defaultLength;
    var descriptors = [];
    var numFixed = 0;
    var numHeaders = 0;
    var makeDirtyClean = require('@grid/dirty-clean');
    var dirtyClean = makeDirtyClean(grid);
    var builderDirtyClean = makeDirtyClean(grid);
    var selected = [];

    function setDescriptorsDirty() {
        grid.eventLoop.fire('grid-' + name + '-change');
        dirtyClean.setDirty();
        builderDirtyClean.setDirty();
    }

    function fireSelectionChange() {
        grid.eventLoop.fire('grid-' + name + '-selection-change');
    }

    var api = {
        areBuildersDirty: builderDirtyClean.isDirty,
        isDirty: dirtyClean.isDirty,
        add: function (toAdd) {
            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (descriptor) {
                if (descriptor.header) {
                    descriptors.splice(numHeaders, 0, descriptor);
                    numFixed++;
                    numHeaders++;
                }

                else {
                    //if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
                    if (descriptor.fixed) {
                        if (!descriptors.length || descriptors[descriptors.length - 1].fixed) {
                            numFixed++;
                        } else {
                            throw 'Cannot add a fixed column after an unfixed one';
                        }
                    }
                    descriptors.push(descriptor);
                }
            });

            setDescriptorsDirty();
        },
        addHeaders: function (toAdd) {
            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (header) {
                header.header = true;
            });
            api.add(toAdd);
        },
        header: function (index) {
            return descriptors[index];
        },
        get: function (index) {
            return descriptors[index];
        },
        length: function (includeHeaders) {
            var subtract = includeHeaders ? 0 : numHeaders;
            return descriptors.length - subtract;
        },
        remove: function (descriptor) {
            var index = descriptors.indexOf(descriptor);
            if (index !== -1) {
                descriptors.splice(index, 1);
                if (descriptor.header) {
                    numFixed--;
                    numHeaders--;
                } else if (descriptor.fixed) {
                    numFixed--;
                }
            }
        },
        clear: function (includeHeaders) {
            descriptors.slice(0).forEach(function (descriptor) {
                if (includeHeaders || !descriptor.header) {
                    api.remove(descriptor);
                }
            });
        },
        move: function (start, target) {
            descriptors.splice(target, 0, descriptors.splice(start, 1)[0]);
            setDescriptorsDirty();
        },
        numHeaders: function () {
            return numHeaders;
        },
        numFixed: function () {
            return numFixed;
        },
        toVirtual: function (dataIndex) {
            return dataIndex + api.numHeaders();
        },
        toData: function (virtualIndex) {
            return virtualIndex - api.numHeaders();
        },

        select: function (index) {

            var descriptor = api[name](index);
            if (!descriptor.selected) {
                descriptor.selected = true;
                selected.push(index);
                fireSelectionChange();
            }
        },
        deselect: function (index, dontNotify) {
            var descriptor = api[name](index);
            if (descriptor.selected) {
                descriptor.selected = false;
                selected.splice(selected.indexOf(index), 1);
                if (!dontNotify) {
                    fireSelectionChange();
                }
            }
        },
        toggleSelect: function (index) {
            var descriptor = api[name](index);
            if (descriptor.selected) {
                api.deselect(index);
            } else {
                api.select(index);
            }
        },
        clearSelected: function () {
            var length = selected.length;
            selected.slice(0).forEach(function (index) {
                api.deselect(index, true);
            });
            if (length) {
                fireSelectionChange();
            }
        },
        getSelected: function () {
            return selected;
        },
        create: function (builder) {
            var descriptor = {};
            var fixed = false;
            Object.defineProperty(descriptor, 'fixed', {
                enumerable: true,
                get: function () {
                    return descriptor.header || fixed;
                },
                set: function (_fixed) {
                    fixed = _fixed;
                }
            });

            addDirtyProps(descriptor, ['builder'], [builderDirtyClean]);
            descriptor.builder = builder;

            return addDirtyProps(descriptor, [
                {
                    name: lengthName,
                    onDirty: function () {
                        grid.eventLoop.fire('grid-' + name + '-change');
                    }
                }
            ], [dirtyClean]);
        },
        createBuilder: function (render, update) {
            return {render: render || noop, update: update || noop};
        }
    };

    //basically height or width
    api[lengthName] = function (index) {
        if (!descriptors[index]) {
            return NaN;
        }

        return descriptors[index] && descriptors[index][lengthName] || DEFAULT_LENGTH;
    };

    //row or col get
    api[name] = function (index) {
        return descriptors[index + numHeaders];
    };

    return api;
};
},{"@grid/add-dirty-props":3,"@grid/dirty-clean":14,"@grid/no-op":20,"@grid/util":26}],3:[function(require,module,exports){
module.exports = function (obj, props, dirtyCleans) {
    props.forEach(function (prop) {
        var val;
        var name = prop.name || prop;
        Object.defineProperty(obj, name, {
            enumerable: true,
            get: function () {
                return val;
            }, set: function (_val) {
                if (_val !== val) {
                    dirtyCleans.forEach(function (dirtyClean) {
                        dirtyClean.setDirty();
                    });
                    if (prop.onDirty) {
                        prop.onDirty();
                    }
                }
                val = _val;
            }
        });
    });
    return obj;
};
},{}],4:[function(require,module,exports){
var positionRange = require('@grid/position-range');
var makeDirtyClean = require('@grid/dirty-clean');
var addDirtyProps = require('@grid/add-dirty-props');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);
    var descriptors = [];

    var api = {
        add: function (descriptor) {
            descriptors.push(descriptor);
            dirtyClean.setDirty();
        },
        remove: function (descriptor) {
            descriptors.splice(descriptors.indexOf(descriptor), 1);
            dirtyClean.setDirty();
        },
        getAll: function () {
            return descriptors.slice(0);
        },
        create: function (top, left, className, height, width, space) {
            var thisDirtyClean = makeDirtyClean(grid);
            var descriptor = {};
            //mixins
            positionRange(descriptor, thisDirtyClean, dirtyClean);
            addDirtyProps(descriptor, ['class'], [thisDirtyClean, dirtyClean]);

            //all of these are optional
            descriptor.top = top;
            descriptor.left = left;
            //default to single cell ranges
            descriptor.height = height || 1;
            descriptor.width = width || 1;
            descriptor.class = className;
            descriptor.space = space || descriptor.space;
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };


    return api;
};
},{"@grid/add-dirty-props":3,"@grid/dirty-clean":14,"@grid/position-range":22}],5:[function(require,module,exports){
var customEvent = require('@grid/custom-event');

var PROPS_TO_COPY_FROM_MOUSE_EVENTS = ['clientX', 'clientY', 'gridX', 'gridY', 'layerX', 'layerY', 'row', 'col', 'realRow', 'realCol'];


module.exports = function (_grid) {
    var grid = _grid;

    var model = {};

    var wasDragged = false;

    model._annotateEvent = function annotateEvent(e) {
        switch (e.type) {
            case 'click':
                e.wasDragged = wasDragged;
            /* jshint -W086 */
            case 'mousedown':
            /* jshint +W086 */
            case 'mousemove':
            case 'mouseup':
                model._annotateEventInternal(e);
                break;

        }
    };

    model._annotateEventInternal = function (e) {
        var y = grid.viewPort.toGridY(e.clientY);
        var x = grid.viewPort.toGridX(e.clientX);
        e.realRow = grid.viewPort.getRowByTop(y);
        e.realCol = grid.viewPort.getColByLeft(x);
        e.virtualRow = grid.viewPort.toVirtualRow(e.realRow);
        e.virtualCol = grid.viewPort.toVirtualCol(e.realCol);
        e.row = e.virtualRow - grid.rowModel.numHeaders();
        e.col = e.virtualCol - grid.colModel.numHeaders();
        e.gridX = x;
        e.gridY = y;
    };

    grid.eventLoop.addInterceptor(function (e) {
        model._annotateEvent(e);

        if (e.type === 'mousedown') {
            setupDragEventForMouseDown(e);
        }
    });

    function setupDragEventForMouseDown(downEvent) {
        wasDragged = false;
        var lastDragRow = downEvent.row;
        var lastDragCol = downEvent.col;
        var dragStarted = false;
        var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {
            if (dragStarted && !e.which) {
                //got a move event without mouse down which means we somehow missed the mouseup
                console.log('mousemove unbind, how on earth do these happen?');
                handleMouseUp(e);
                return;
            }

            if (!dragStarted) {
                wasDragged = true;
                createAndFireDragEvent('grid-drag-start', downEvent);
                dragStarted = true;
            }

            createAndFireDragEvent('grid-drag', e);

            if (e.row !== lastDragRow || e.col !== lastDragCol) {
                createAndFireDragEvent('grid-cell-drag', e);

                lastDragRow = e.row;
                lastDragCol = e.col;
            }

        });

        var unbindUp = grid.eventLoop.bind('mouseup', window, handleMouseUp);

        function handleMouseUp(e) {
            unbindMove();
            unbindUp();

            var dragEnd = createDragEventFromMouseEvent('grid-drag-end', e);

            //row, col, x, and y should inherit
            grid.eventLoop.fire(dragEnd);
        }
    }

    function createDragEventFromMouseEvent(type, e) {
        var event = customEvent(type, true, true);
        PROPS_TO_COPY_FROM_MOUSE_EVENTS.forEach(function (prop) {
            event[prop] = e[prop];
        });
        event.originalEvent = e;
        return event;
    }

    function createAndFireDragEvent(type, e) {
        var drag = createDragEventFromMouseEvent(type, e);
        if (e.target) {
            e.target.dispatchEvent(drag);
        } else {
            grid.eventLoop.fire(drag);
        }
        return drag;
    }

    return model;
};
},{"@grid/custom-event":11}],6:[function(require,module,exports){
var util = require('@grid/util');
var capitalize = require('capitalize');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);


    var row;
    var model = {col: 0};
    Object.defineProperty(model, 'row', {
        enumerable: true,
        get: function () {
            return row;
        },
        set: function (r) {
            if (r < 0 || isNaN(r)) {
                debugger;
            }
            row = r;
        }
    });
    model.row = 0;

    model.isDirty = dirtyClean.isDirty;

    model.scrollTo = function (r, c, dontFire) {
        if (isNaN(r) || isNaN(c)) {
            return;
        }
        var maxRow = (grid.rowModel.length() || 1) - 1;
        var maxCol = (grid.colModel.length() || 1) - 1;
        var lastRow = model.row;
        var lastCol = model.col;
        model.row = util.clamp(r, 0, maxRow);
        model.col = util.clamp(c, 0, maxCol);
        if (lastRow !== model.row || lastCol !== model.col) {
            dirtyClean.setDirty();
            if (!dontFire) {
                var top = grid.virtualPixelCellModel.height(0, model.row - 1);
                var left = grid.virtualPixelCellModel.width(0, model.col - 1);
                grid.pixelScrollModel.scrollTo(top, left, true);
            }
        }
    };

    function convertVirtualToScroll(virtualCoord, rowOrCol) {
        return virtualCoord - grid[rowOrCol + 'Model'].numFixed();
    }

    function getScrollToRowOrCol(virtualCoord, rowOrCol, heightWidth) {
        var currentScroll = model[rowOrCol];
        var scrollTo = currentScroll;
        if (grid.viewPort[rowOrCol + 'IsInView'](virtualCoord)) {
            return scrollTo;
        }

        var targetScroll = convertVirtualToScroll(virtualCoord, rowOrCol);
        if (targetScroll < currentScroll) {
            scrollTo = targetScroll;
        } else if (targetScroll > currentScroll) {

            var lengthToCell = grid.virtualPixelCellModel[heightWidth](0, virtualCoord);
            var numFixed = grid[rowOrCol + 'Model'].numFixed();
            scrollTo = 0;
            for (var i = numFixed; i < virtualCoord; i++) {
                lengthToCell -= grid.virtualPixelCellModel[heightWidth](i);
                scrollTo = i - (numFixed - 1);
                if (lengthToCell <= grid.viewPort[heightWidth]) {
                    break;
                }
            }
        }

        return scrollTo;
    }

    model.scrollIntoView = function (vr, vc) {
        vr = grid.virtualPixelCellModel.clampRow(vr);
        vc = grid.virtualPixelCellModel.clampCol(vc);
        var newRow = getScrollToRowOrCol(vr, 'row', 'height');
        var newCol = getScrollToRowOrCol(vc, 'col', 'width');
        model.scrollTo(newRow, newCol);
    };


    return model;
};
},{"@grid/dirty-clean":14,"@grid/util":26,"capitalize":30}],7:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;

    var api = require('@grid/abstract-row-col-model')(grid, 'col', 'width', 100);

    return api;
};
},{"@grid/abstract-row-col-model":2}],8:[function(require,module,exports){
var elementClass = require('element-class');
var util = require('@grid/util');


module.exports = function (_grid) {
    var grid = _grid;

    var api = {annotateDecorator: makeReorderDecorator};

    function makeReorderDecorator(headerDecorator) {
        var col = headerDecorator.left;
        headerDecorator._dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real');

        headerDecorator._dragRect.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-rect');
        };

        headerDecorator._onDragStart = function (e) {
            if (e.realCol < grid.colModel.numFixed()) {
                return;
            }


            grid.decorators.add(headerDecorator._dragRect);

            headerDecorator._dragRect.width = grid.viewPort.getColWidth(col);
            var colOffset = e.gridX - headerDecorator.getDecoratorLeft();

            headerDecorator._dragRect._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
            headerDecorator._dragRect._targetCol.postRender = function (div) {
                div.setAttribute('class', 'grid-reorder-target');
                headerDecorator._dragRect._targetCol._renderedElem = div;
            };
            grid.decorators.add(headerDecorator._dragRect._targetCol);

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                headerDecorator._dragRect.left = util.clamp(e.gridX - colOffset, grid.viewPort.getColLeft(grid.colModel.numFixed()), Infinity);
                headerDecorator._dragRect._targetCol.left = util.clamp(e.realCol, grid.colModel.numFixed(), Infinity);
                if (e.realCol > col) {
                    elementClass(headerDecorator._dragRect._targetCol._renderedElem).add('right');
                } else {
                    elementClass(headerDecorator._dragRect._targetCol._renderedElem).remove('right');
                }


            });

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                var targetCol = headerDecorator._dragRect._targetCol.left;

                grid.colModel.move(grid.viewPort.toVirtualCol(col), grid.viewPort.toVirtualCol(targetCol));
                grid.decorators.remove([headerDecorator._dragRect._targetCol, headerDecorator._dragRect]);
                headerDecorator._unbindDrag();
                headerDecorator._unbindDragEnd();
            });
        };

        headerDecorator.postRender = function (div) {
            div.setAttribute('class', 'grid-col-reorder');
            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
        };

        return headerDecorator;
    }

    require('@grid/header-decorators')(grid, api);

    return api;
};
},{"@grid/header-decorators":16,"@grid/util":26,"element-class":31}],9:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;


    var api = {annotateDecorator: annotateDecorator};

    function annotateDecorator(headerDecorator) {
        var col = headerDecorator.left;
        headerDecorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');

        headerDecorator._dragLine.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-line');
        };

        headerDecorator._onDragStart = function (e) {

            grid.decorators.add(headerDecorator._dragLine);

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                var minX = headerDecorator.getDecoratorLeft() + 10;
                headerDecorator._dragLine.left = Math.max(e.gridX, minX);
            });

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                grid.colModel.get(grid.viewPort.toVirtualCol(col)).width = headerDecorator._dragLine.left - headerDecorator.getDecoratorLeft();
                grid.decorators.remove(headerDecorator._dragLine);
                headerDecorator._unbindDrag();
                headerDecorator._unbindDragEnd();
            });
        };

        headerDecorator.postRender = function (div) {
            div.style.transform = 'translateX(50%)';
            div.style.webkitTransform = 'translateX(50%)';

            div.style.removeProperty('left');
            div.setAttribute('class', 'col-resize');

            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
        };
    }

    require('@grid/header-decorators')(grid, api);

    return api;
};
},{"@grid/header-decorators":16}],10:[function(require,module,exports){
var elementClass = require('element-class');
var dirtyClean = require('@grid/dirty-clean');

module.exports = function () {

    var grid = {};

    //the order here matters because some of these depend on each other
    grid.eventLoop = require('@grid/event-loop')(grid);
    grid.decorators = require('@grid/decorators')(grid);
    grid.cellClasses = require('@grid/cell-classes')(grid);
    grid.rowModel = require('@grid/row-model')(grid);
    grid.colModel = require('@grid/col-model')(grid);
    grid.dataModel = require('@grid/simple-data-model')(grid);
    grid.virtualPixelCellModel = require('@grid/virtual-pixel-cell-model')(grid);
    grid.cellScrollModel = require('@grid/cell-scroll-model')(grid);
    grid.cellMouseModel = require('@grid/cell-mouse-model')(grid);

    grid.viewPort = require('@grid/view-port')(grid);
    grid.viewLayer = require('@grid/view-layer')(grid);

    //things with logic that also register decorators (slightly less core than the other models)
    grid.navigationModel = require('@grid/navigation-model')(grid);
    grid.pixelScrollModel = require('@grid/pixel-scroll-model')(grid);
    grid.colResize = require('@grid/col-resize')(grid);
    grid.colReorder = require('@grid/col-reorder')(grid);

    //sort functionality has no api, it just sets up an event listener
    //for now disable header click sort cause we're gonna use the click for selection instead
    //require('@grid/col-sort')(grid);


    var drawRequested = false;
    grid.requestDraw = function () {
        if (!grid.eventLoop.isRunning) {
            grid.viewLayer.draw();
        } else {
            drawRequested = true;
        }
    };

    grid.eventLoop.bind('grid-draw', function () {
        drawRequested = false;
    });

    grid.eventLoop.addExitListener(function () {
        if (drawRequested) {
            grid.viewLayer.draw();
        }
    });

    function createFocusTextArea(container) {
        var textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.left = '-100000px';
        textarea.addEventListener('focus', function () {
            if (container) {
                elementClass(container).add('focus');
            }
        });

        textarea.addEventListener('blur', function () {
            if (container) {
                elementClass(container).remove('focus');
            }
        });

        container.appendChild(textarea);
        if (!container.getAttribute('tabIndex')) {
            container.tabIndex = 0;
        }
        container.addEventListener('focus', function () {
            if (textarea) {
                textarea.focus();
            }
        });

        return textarea;
    }

    grid.build = function (container) {
        createFocusTextArea(container);
        grid.viewPort.sizeToContainer(container);
        grid.viewLayer.build(container);
        grid.eventLoop.setContainer(container);
    };

    grid.makeDirtyClean = function () {
        return dirtyClean(grid);
    };

    return grid;
};
},{"@grid/cell-classes":4,"@grid/cell-mouse-model":5,"@grid/cell-scroll-model":6,"@grid/col-model":7,"@grid/col-reorder":8,"@grid/col-resize":9,"@grid/decorators":13,"@grid/dirty-clean":14,"@grid/event-loop":15,"@grid/navigation-model":19,"@grid/pixel-scroll-model":21,"@grid/row-model":24,"@grid/simple-data-model":25,"@grid/view-layer":27,"@grid/view-port":28,"@grid/virtual-pixel-cell-model":29,"element-class":31}],11:[function(require,module,exports){
module.exports = function (name, bubbles, cancelable, detail) {
    var event = document.createEvent('CustomEvent');  // MUST be 'CustomEvent'
    event.initCustomEvent(name, bubbles, cancelable, detail);
    return event;
};
},{}],12:[function(require,module,exports){
module.exports = function (fn, delay) {
    var f = function debounced() {
        if (f.timeout) {
            clearTimeout(f.timeout);
            f.timeout = undefined;
        }
        f.timeout = setTimeout(fn, delay);
    };
    return f;
};
},{}],13:[function(require,module,exports){
var util = require('@grid/util');
var makeDirtyClean = require('@grid/dirty-clean');
var positionRange = require('@grid/position-range');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);

    var aliveDecorators = [];
    var deadDecorators = [];

    var decorators = {
        add: function (decorator) {
            aliveDecorators.push(decorator);
            dirtyClean.setDirty();
        },
        remove: function (decorators) {
            if (!util.isArray(decorators)) {
                decorators = [decorators];
            }
            decorators.forEach(function (decorator) {
                var index = aliveDecorators.indexOf(decorator);
                if (index !== -1) {
                    aliveDecorators.splice(index, 1);
                    deadDecorators.push(decorator);
                    dirtyClean.setDirty();
                }
            });
        },
        getAlive: function () {
            return aliveDecorators.slice(0);
        },
        popAllDead: function () {
            var oldDead = deadDecorators;
            deadDecorators = [];
            return oldDead;
        },
        isDirty: dirtyClean.isDirty,
        create: function (t, l, h, w, u, s) {
            var decorator = {};
            var thisDirtyClean = makeDirtyClean(grid);

            //mixin the position range functionality
            positionRange(decorator, thisDirtyClean, dirtyClean);
            decorator.top = t;
            decorator.left = l;
            decorator.height = h;
            decorator.width = w;
            decorator.units = u || decorator.units;
            decorator.space = s || decorator.space;

            //they can override but we should have an empty default to prevent npes
            decorator.render = function () {
                var div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.top = '0px';
                div.style.left = '0px';
                div.style.bottom = '0px';
                div.style.right = '0px';
                if (decorator.postRender) {
                    decorator.postRender(div);
                }
                return div;
            };
            return decorator;

        }

    };


    return decorators;
};
},{"@grid/dirty-clean":14,"@grid/position-range":22,"@grid/util":26}],14:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;
    var dirty = true;

    grid.eventLoop.bind('grid-draw', function () {
        api.setClean();
    });


    var api = {
        isDirty: function () {
            return dirty;
        },
        isClean: function () {
            return !dirty;
        },
        setDirty: function () {
            dirty = true;
            //when things are initalizing sometimes this doesn't exist yet
            //we have to hope that at the end of initialization the grid will call request draw itself
            if (grid.requestDraw) {
                grid.requestDraw();
            }
        },
        setClean: function () {
            dirty = false;
        }
    };
    return api;
};
},{}],15:[function(require,module,exports){
var mousewheel = require('@grid/mousewheel');
var util = require('@grid/util');
var listeners = require('@grid/listeners');

var EVENTS = ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup'];

var GRID_EVENTS = ['grid-drag-start', 'grid-drag', 'grid-cell-drag', 'grid-drag-end'];

var eventLoop = function (_grid) {
    var grid = _grid;
    var eloop = {
        isRunning: false
    };

    var handlersByName = {};
    var domUnbindFns = [];

    var unbindAll;

    eloop.setContainer = function (container) {
        var unbindMouseWheelFn = mousewheel.bind(container, mainLoop);

        EVENTS.forEach(function (name) {
            bindToDomElement(container, name, mainLoop);
        });

        GRID_EVENTS.forEach(function (name) {
            bindToDomElement(window, name, mainLoop);
        });

        unbindAll = function () {
            unbindMouseWheelFn();

            //have to copy the array since the unbind will actually remove itself from the array which modifies it mid iteration
            domUnbindFns.slice(0).forEach(function (unbind) {
                unbind();
            });
        };
    };

    function getHandlers(name) {
        var handlers = handlersByName[name];
        if (!handlers) {
            handlers = handlersByName[name] = [];
        }
        return handlers;
    }

    function bindToDomElement(elem, name, listener) {
        elem.addEventListener(name, listener);
        var unbindFn = function () {
            elem.removeEventListener(name, listener);
            domUnbindFns.splice(domUnbindFns.indexOf(unbindFn), 1);
        };
        domUnbindFns.push(unbindFn);
        return unbindFn;
    }

    eloop.bind = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var name = args.filter(function (arg) {
            return typeof arg === 'string';
        })[0];

        var handler = args.filter(function (arg) {
            return typeof arg === 'function';
        })[0];

        if (!handler || !name) {
            throw 'cannot bind without at least name and function';
        }


        var elem = args.filter(function (arg) {
            return util.isElement(arg) || arg === window || arg === document;
        })[0];

        if (!elem) {
            getHandlers(name).push(handler);
            return function () {
                var handlers = getHandlers(name);
                handlers.splice(handlers.indexOf(handler), 1);
            };
        } else {
            var listener = loopWith(handler);
            //make sure the elem can receive events
            if (elem.style) {
                elem.style.pointerEvents = 'all';
            }
            return bindToDomElement(elem, name, listener);
        }
    };

    eloop.fire = function (event) {
        event = typeof event === 'string' ? {type: event} : event;
        mainLoop(event);
    };

    var interceptors = listeners();
    var exitListeners = listeners();

    eloop.addInterceptor = interceptors.addListener;
    eloop.addExitListener = exitListeners.addListener;

    function loopWith(fn) {
        return function (e) {
            loop(e, fn);
        };
    }

    var mainLoop = loopWith(function (e) {
        //have to copy the array because handlers can unbind themselves which modifies the array
        //we use some so that we can break out of the loop if need be
        getHandlers(e.type).slice(0).some(function (handler) {
            handler(e);
            if (e.gridStopBubbling) {
                return true;
            }
        });
    });

    function loop(e, bodyFn) {
        var isOuterLoopRunning = eloop.isRunning;
        eloop.isRunning = true;
        interceptors.notify(e);
        if (!e.gridStopBubbling) {
            bodyFn(e);
        }

        if (!isOuterLoopRunning) {
            eloop.isRunning = false;
            exitListeners.notify(e);
        }
    }

    eloop.bind('grid-destroy', function () {
        unbindAll();
        eloop.destroyed = true;
    });

    eloop.stopBubbling = function (e) {
        e.gridStopBubbling = true;
        return e;
    };

    return eloop;
};


eventLoop.EVENTS = EVENTS;
eventLoop.GRID_EVENTS = GRID_EVENTS;
module.exports = eventLoop;
},{"@grid/listeners":17,"@grid/mousewheel":18,"@grid/util":26}],16:[function(require,module,exports){
module.exports = function (_grid, model) {
    var grid = _grid;

    var api = model || {};
    api._decorators = {};

    function makeDecorator(col) {
        var decorator = grid.decorators.create(0, col, 1, 1, 'cell', 'real');


        decorator.getDecoratorLeft = function () {
            var firstRect = decorator.boundingBox && decorator.boundingBox.getClientRects() && decorator.boundingBox.getClientRects()[0] || {};
            return grid.viewPort.toGridX(firstRect.left) || 0;
        };

        if (api.annotateDecorator) {
            api.annotateDecorator(decorator);
        }


        return decorator;
    }

    function ensureDecoratorPerCol() {
        for (var c = 0; c < grid.viewPort.cols; c++) {
            if (!api._decorators[c]) {
                var decorator = makeDecorator(c);
                api._decorators[c] = decorator;
                grid.decorators.add(decorator);
            }
        }
    }

    grid.eventLoop.bind('grid-viewport-change', function () {
        ensureDecoratorPerCol();
    });
    ensureDecoratorPerCol();

    return api;
};
},{}],17:[function(require,module,exports){
/*
 A simple package for creating a list of listeners that can be added to and notified
 */

module.exports = function () {
    var listeners = [];
    return {
        //returns a removal function to unbind the listener
        addListener: function (fn) {
            listeners.push(fn);
            return function () {
                listeners.splice(listeners.indexOf(fn), 1);
            };
        },
        notify: function (e) {
            listeners.forEach(function (listener) {
                listener(e);
            });
        }
    };
};
},{}],18:[function(require,module,exports){
var EVENT_NAMES = ['mousewheel', 'wheel', 'DOMMouseScroll'];

var api = {
    getDelta: function (event, xaxis) {
        if (event.wheelDelta) { //for everything but firefox
            var delta = event.wheelDeltaY;
            if (xaxis) {
                delta = event.wheelDeltaX;
            }
            return delta;

        } else if (event.detail) { //for firefox pre version 17
            if (event.axis && ((event.axis === 1 && xaxis) || (event.axis === 2 && !xaxis))) {
                return -1 * event.detail * 12;
            }
        } else if (event.deltaX || event.deltaY) {
            if (xaxis) {
                return -1 * event.deltaX;
            } else {
                return -1 * event.deltaY;
            }
        }
        return 0;
    },

    //binds a cross browser normalized mousewheel event, and returns a function that will unbind the listener;
    bind: function (elem, listener) {
        var normalizedListener = function (e) {
            listener(normalizeWheelEvent(e));
        };

        EVENT_NAMES.forEach(function (name) {
            elem.addEventListener(name, normalizedListener);
        });

        return function () {
            EVENT_NAMES.forEach(function (name) {
                elem.removeEventListener(name, normalizedListener);
            });
        };

    },
    normalize: normalizeWheelEvent
};

function normalizeWheelEvent(e) {
    var deltaX = api.getDelta(e, true);
    var deltaY = api.getDelta(e);
    var newEvent = Object.create(e,
        {
            deltaY: {value: deltaY},
            deltaX: {value: deltaX},
            type: {value: 'mousewheel'}
        });

    newEvent.preventDefault = function () {
        newEvent.defaultPrevented = true;
        if (e && e.preventDefault) {
            e.preventDefault();
        }
    };
    return newEvent;
}

module.exports = api;
},{}],19:[function(require,module,exports){
var key = require('key');
var util = require('@grid/util');
var rangeUtil = require('@grid/range-util');

module.exports = function (_grid) {
    var grid = _grid;

    var model = {
        focus: {
            row: 0,
            col: 0
        }
    };

    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);

    model.focusDecorator = grid.decorators.create(0, 0, 1, 1);
    model.focusDecorator.render = function () {
        var div = defaultRender();
        div.setAttribute('class', 'grid-focus-decorator');
        return div;
    };
    grid.decorators.add(model.focusDecorator);


    function clampRowToMinMax(row) {
        return util.clamp(row, 0, grid.rowModel.length() - 1);
    }

    function clampColToMinMax(col) {
        return util.clamp(col, 0, grid.colModel.length() - 1);
    }

    model.setFocus = function setFocus(row, col, optionalEvent) {
        row = clampRowToMinMax(row);
        col = clampColToMinMax(col);
        model.focus.row = row;
        model.focus.col = col;
        focusClass.top = row;
        focusClass.left = col;
        model.focusDecorator.top = row;
        model.focusDecorator.left = col;
        grid.cellScrollModel.scrollIntoView(row, col);
        //focus changes always clear the selection
        clearSelection();
    };

    grid.eventLoop.bind('keydown', function (e) {
        var arrow = key.code.arrow;
        if (!key.is(arrow, e.which)) {
            return;
        }
        //focus logic

        if (!e.shiftKey) {
            //if nothing changes great we'll stay where we are
            var navToRow = model.focus.row;
            var navToCol = model.focus.col;


            switch (e.which) {
                case arrow.down.code:
                    navToRow++;
                    break;
                case arrow.up.code:
                    navToRow--;
                    break;
                case arrow.right.code:
                    navToCol++;
                    break;
                case arrow.left.code:
                    navToCol--;
                    break;
            }
            model.setFocus(navToRow, navToCol, e);
        } else {
            //selection logic
            var newSelection;
            //stand in for if it's cleared
            if (model.selection.top === -1) {
                newSelection = {top: model.focus.row, left: model.focus.col, height: 1, width: 1};
            } else {
                newSelection = {
                    top: model.selection.top,
                    left: model.selection.left,
                    height: model.selection.height,
                    width: model.selection.width
                };
            }

            switch (e.which) {
                case arrow.down.code:
                    if (model.focus.row === newSelection.top) {
                        newSelection.height++;
                    } else {
                        newSelection.top++;
                        newSelection.height--;
                    }
                    break;
                case arrow.up.code:
                    if (model.focus.row === newSelection.top + newSelection.height - 1) {
                        newSelection.top--;
                        newSelection.height++;
                    } else {
                        newSelection.height--;

                    }
                    break;
                case arrow.right.code:
                    if (model.focus.col === newSelection.left) {
                        newSelection.width++;
                    } else {
                        newSelection.left++;
                        newSelection.width--;
                    }
                    break;
                case arrow.left.code:
                    if (model.focus.col === newSelection.left + newSelection.width - 1) {
                        newSelection.left--;
                        newSelection.width++;
                    } else {
                        newSelection.width--;
                    }
                    break;
            }
            if (newSelection.height === 1 && newSelection.width === 1) {
                clearSelection();
            } else {
                model.setSelection(newSelection);
            }

        }
    });

    function outsideMinMax(row, col) {
        return row < 0 || row > grid.rowModel.length() || col < 0 || col > grid.colModel.length();
    }

    grid.eventLoop.bind('mousedown', function (e) {
        //assume the event has been annotated by the cell mouse model interceptor
        var row = e.row;
        var col = e.col;
        if (row < 0 && col >= 0) {
            grid.colModel.toggleSelect(col);
        }
        if (col < 0 && row >= 0) {
            grid.rowModel.toggleSelect(row);
        }

        if (row < 0 && col < 0) {
            return;
        }

        if (!e.shiftKey) {
            model.setFocus(row, col, e);
        } else {
            setSelectionFromPoints(model.focus.row, model.focus.col, row, col);
        }

    });

    model._rowSelectionDecorators = [];
    model._colSelectionDecorators = [];
    //row col selection
    function handleRowColSelectionChange(rowOrCol) {
        var decoratorsField = ('_' + rowOrCol + 'SelectionDecorators');
        model[decoratorsField].forEach(function (selectionDecorator) {
            grid.decorators.remove(selectionDecorator);
        });
        model[decoratorsField] = [];

        grid[rowOrCol + 'Model'].getSelected().forEach(function (index) {
            var virtualIndex = grid[rowOrCol + 'Model'].toVirtual(index);
            var top = rowOrCol === 'row' ? virtualIndex : 0;
            var left = rowOrCol === 'col' ? virtualIndex : 0;
            var decorator = grid.decorators.create(top, left, 1, 1, 'cell', 'virtual');
            decorator.postRender = function (elem) {
                elem.setAttribute('class', 'grid-header-selected');
            };
            grid.decorators.add(decorator);
            model[decoratorsField].push(decorator);
        });
    }

    grid.eventLoop.bind('grid-row-selection-change', function () {
        handleRowColSelectionChange('row');
    });

    grid.eventLoop.bind('grid-col-selection-change', function () {
        handleRowColSelectionChange('col');
    });

    var selection = grid.decorators.create();

    var defaultRender = selection.render;
    selection.render = function () {
        var div = defaultRender();
        div.setAttribute('class', 'grid-selection');
        return div;
    };

    grid.decorators.add(selection);

    model.setSelection = function setSelection(newSelection) {
        selection.top = newSelection.top;
        selection.left = newSelection.left;
        selection.height = newSelection.height;
        selection.width = newSelection.width;
    };

    function clearSelection() {
        model.setSelection({top: -1, left: -1, height: -1, width: -1});
    }

    function setSelectionFromPoints(fromRow, fromCol, toRow, toCol) {
        var newSelection = rangeUtil.createFromPoints(fromRow, fromCol, clampRowToMinMax(toRow), clampColToMinMax(toCol));
        model.setSelection(newSelection);
    }

    selection._onDragStart = function (e) {
        if (outsideMinMax(e.row, e.col)) {
            return;
        }
        var fromRow = model.focus.row;
        var fromCol = model.focus.col;
        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (e) {
            setSelectionFromPoints(fromRow, fromCol, e.row, e.col);
        });

        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            unbindDrag();
            unbindDragEnd();
        });
    };

    grid.eventLoop.bind('grid-drag-start', selection._onDragStart);
    clearSelection();

    model.selection = selection;

    return model;
};
},{"@grid/range-util":23,"@grid/util":26,"key":37}],20:[function(require,module,exports){
module.exports = function () {
    //a noop function to use
};
},{}],21:[function(require,module,exports){
var util = require('@grid/util');
var debounce = require('@grid/debounce');
var capitalize = require('capitalize');

module.exports = function (_grid) {
    var grid = _grid;
    var model = {top: 0, left: 0};
    var scrollBarWidth = 10;

    grid.eventLoop.bind('grid-virtual-pixel-cell-change', function () {
        var scrollHeight = grid.virtualPixelCellModel.totalHeight() - grid.virtualPixelCellModel.fixedHeight();
        var scrollWidth = grid.virtualPixelCellModel.totalWidth() - grid.virtualPixelCellModel.fixedWidth();
        model.setScrollSize(scrollHeight, scrollWidth);
        sizeScrollBars();
    });


    grid.eventLoop.bind('grid-viewport-change', sizeScrollBars);
    //assumes a standardized wheel event that we create through the mousewheel package
    grid.eventLoop.bind('mousewheel', function handleMouseWheel(e) {
        var deltaY = e.deltaY;
        var deltaX = e.deltaX;
        model.scrollTo(model.top - deltaY, model.left - deltaX, true);
        debouncedNotify();
        e.preventDefault();
    });

    model.setScrollSize = function (h, w) {
        model.height = h;
        model.width = w;
    };

    function notifyListeners() {
        //TODO: possibly keep track of delta since last update and send it along. for now, no
        grid.eventLoop.fire('grid-pixel-scroll');

        //update the cell scroll
        var scrollTop = model.top;
        var row = grid.virtualPixelCellModel.getRow(scrollTop);

        var scrollLeft = model.left;
        var col = grid.virtualPixelCellModel.getCol(scrollLeft);

        grid.cellScrollModel.scrollTo(row, col, true);
    }

    var debouncedNotify = debounce(notifyListeners, 1);

    model.scrollTo = function (top, left, dontNotify) {
        model.top = util.clamp(top, 0, model.height - getScrollableViewHeight());
        model.left = util.clamp(left, 0, model.width - getScrollableViewWidth());

        positionScrollBars();

        if (!dontNotify) {
            notifyListeners();
        }


    };


    /* SCROLL BAR LOGIC */
    function getScrollPositionFromReal(scrollBarRealClickCoord, heightWidth, vertHorz) {
        var scrollBarTopClick = scrollBarRealClickCoord - grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
        var scrollRatio = scrollBarTopClick / getMaxScrollBarCoord(heightWidth, vertHorz);
        var scrollCoord = scrollRatio * getMaxScroll(heightWidth);
        return scrollCoord;
    }

    function makeScrollBarDecorator(isHorz) {
        var decorator = grid.decorators.create();
        var xOrY = isHorz ? 'X' : 'Y';
        var heightWidth = isHorz ? 'width' : 'height';
        var vertHorz = isHorz ? 'horz' : 'vert';
        var gridCoordField = 'grid' + xOrY;
        var layerCoordField = 'layer' + xOrY;
        var viewPortClampFn = grid.viewPort['clamp' + xOrY];

        decorator.render = function () {
            var scrollBarElem = document.createElement('div');
            scrollBarElem.setAttribute('class', 'grid-scroll-bar');
            decorator._onDragStart = function (e) {
                if (e.target !== scrollBarElem) {
                    return;
                }
                var scrollBarOffset = e[layerCoordField];

                decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                    var gridCoord = viewPortClampFn(e[gridCoordField]);
                    var scrollBarRealClickCoord = gridCoord - scrollBarOffset;
                    var scrollCoord = getScrollPositionFromReal(scrollBarRealClickCoord, heightWidth, vertHorz);
                    if (isHorz) {
                        model.scrollTo(model.top, scrollCoord);
                    } else {
                        model.scrollTo(scrollCoord, model.left);
                    }
                });

                decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                    decorator._unbindDrag();
                    decorator._unbindDragEnd();
                });

                e.stopPropagation();
            };

            grid.eventLoop.bind('grid-drag-start', scrollBarElem, decorator._onDragStart);
            grid.eventLoop.bind('mousedown', scrollBarElem, function (e) {
                grid.eventLoop.stopBubbling(e);
            });

            return scrollBarElem;
        };

        decorator.units = 'px';
        decorator.space = 'real';

        return decorator;
    }

    model.vertScrollBar = makeScrollBarDecorator();
    model.horzScrollBar = makeScrollBarDecorator(true);
    model.vertScrollBar.width = scrollBarWidth;
    model.horzScrollBar.height = scrollBarWidth;

    function getMaxScroll(heightWidth) {
        return model[heightWidth] - getViewScrollHeightOrWidth(heightWidth);
    }

    function getScrollRatioFromVirtualScrollCoords(scroll, heightWidth) {
        var maxScroll = getMaxScroll(heightWidth);
        var scrollRatio = scroll / maxScroll;
        return scrollRatio;
    }

    function getMaxScrollBarCoord(heightWidth, vertHorz) {
        return getViewScrollHeightOrWidth(heightWidth) - model[vertHorz + 'ScrollBar'][heightWidth];
    }

    function getRealScrollBarPosition(scroll, heightWidth, vertHorz) {
        var scrollRatio = getScrollRatioFromVirtualScrollCoords(scroll, heightWidth);
        var maxScrollBarScroll = getMaxScrollBarCoord(heightWidth, vertHorz);
        //in scroll bar coords
        var scrollBarCoord = scrollRatio * maxScrollBarScroll;
        //add the fixed height to translate back into real coords
        return scrollBarCoord + grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
    }

    model._getRealScrollBarPosition = getRealScrollBarPosition;
    model._getScrollPositionFromReal = getScrollPositionFromReal;

    function calcScrollBarRealTop() {
        return getRealScrollBarPosition(model.top, 'height', 'vert');
    }

    function calcScrollBarRealLeft() {
        return getRealScrollBarPosition(model.left, 'width', 'horz');
    }

    function positionScrollBars() {
        model.vertScrollBar.top = calcScrollBarRealTop();
        model.horzScrollBar.left = calcScrollBarRealLeft();
    }

    function getViewScrollHeightOrWidth(heightWidth) {
        return grid.viewPort[heightWidth] - grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
    }

    function getScrollableViewWidth() {
        return getViewScrollHeightOrWidth('width');
    }

    function getScrollableViewHeight() {
        return getViewScrollHeightOrWidth('height');
    }

    function sizeScrollBars() {
        model.vertScrollBar.left = grid.viewPort.width - scrollBarWidth;
        model.horzScrollBar.top = grid.viewPort.height - scrollBarWidth;
        var scrollableViewHeight = getScrollableViewHeight();
        var scrollableViewWidth = getScrollableViewWidth();
        model.vertScrollBar.height = Math.max(scrollableViewHeight / grid.virtualPixelCellModel.totalHeight() * scrollableViewHeight, 20);
        model.horzScrollBar.width = Math.max(scrollableViewWidth / grid.virtualPixelCellModel.totalWidth() * scrollableViewWidth, 20);
        positionScrollBars();
    }

    grid.decorators.add(model.vertScrollBar);
    grid.decorators.add(model.horzScrollBar);
    /* END SCROLL BAR LOGIC */

    return model;
};
},{"@grid/debounce":12,"@grid/util":26,"capitalize":30}],22:[function(require,module,exports){
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
    range.space = 'data';

    return range;
};
},{"@grid/add-dirty-props":3}],23:[function(require,module,exports){
module.exports = {
    //takes a point and a length as the ranges in array form
    intersect: function (range1, range2) {
        var range2Start = range2[0];
        var range1Start = range1[0];
        var range1End = range1Start + range1[1] - 1;
        var range2End = range2Start + range2[1] - 1;
        if (range2Start > range1End || range2End < range1Start) {
            return null;
        }
        var resultStart = (range1Start > range2Start ? range1Start : range2Start);
        var resultEnd = (range1End < range2End ? range1End : range2End);
        return [
            resultStart,
            resultEnd - resultStart + 1
        ];
    },
    //takes a point and a length as the ranges in array form
    union: function (range1, range2) {
        if (!range1) {
            return range2;
        }
        if (!range2) {
            return range1;
        }
        var range2Start = range2[0];
        var range2End = range2Start + range2[1] - 1;
        var range1Start = range1[0];
        var range1End = range1Start + range1[1] - 1;
        var resultStart = (range1Start < range2Start ? range1Start : range2Start);
        return [
            resultStart,
            (range1End > range2End ? range1End : range2End) - resultStart + 1
        ];
    },

    //takes two row, col points and creates a normal position range
    createFromPoints: function (r1, c1, r2, c2) {
        var range = {};
        if (r1 < r2) {
            range.top = r1;
            range.height = r2 - r1 + 1;
        } else {
            range.top = r2;
            range.height = r1 - r2 + 1;
        }

        if (c1 < c2) {
            range.left = c1;
            range.width = c2 - c1 + 1;
        } else {
            range.left = c2;
            range.width = c1 - c2 + 1;
        }
        return range;
    }
};


},{}],24:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;

    var api = require('@grid/abstract-row-col-model')(grid, 'row', 'height', 30);

    return api;
};
},{"@grid/abstract-row-col-model":2}],25:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;

    var cellData = [];
    var headerData = [];
    var sortedCol;
    var ascending;
    var dirtyClean = require('@grid/dirty-clean')(grid);
    var internalSet = function (data, r, c, datum) {
        if (!data[r]) {
            data[r] = [];
        }
        data[r][c] = datum;
        dirtyClean.setDirty();
    };

    var api = {
        isDirty: dirtyClean.isDirty,
        set: function (r, c, datum) {
            internalSet(cellData, r, c, datum);
        },
        setHeader: function (r, c, datum) {
            internalSet(headerData, r, c, datum);
        },
        get: function (r, c) {
            var dataRow = cellData[grid.rowModel.row(r).dataRow];
            var datum = dataRow && dataRow[grid.colModel.col(c).dataCol];
            var value = datum && datum.value;
            return {
                value: value,
                formatted: value && 'r' + value[0] + ' c' + value[1] || ''
            };
        },
        getHeader: function (r, c) {
            var dataRow = headerData[grid.rowModel.get(r).dataRow];

            var datum = dataRow && dataRow[grid.colModel.get(c).dataCol];
            var value = datum && datum.value;
            return {
                value: value,
                formatted: value && 'hr' + value[0] + ' hc' + value[1] || ''
            };
        },

        toggleSort: function (c) {
            var retVal = -1;
            var compareMethod = function (val1, val2) {
                return val1 < (val2) ? retVal : -1 * retVal;
            };
            if (c === sortedCol) {
                if (ascending) {
                    retVal = 1;
                }
                ascending = !ascending;
            } else {
                sortedCol = c;
                ascending = true;
            }
            cellData.sort(function (dataRow1, dataRow2) {
                if (!dataRow1 || !dataRow1[c]) {
                    return retVal;
                }
                if (!dataRow2 || !dataRow2[c]) {
                    return retVal * -1;
                }
                return compareMethod(dataRow1[c].value, dataRow2[c].value);
            });
            dirtyClean.setDirty();
        }
    };

    return api;
};
},{"@grid/dirty-clean":14}],26:[function(require,module,exports){
module.exports = {
    clamp: function (num, min, max, returnNaN) {
        if (num > max) {
            return returnNaN ? NaN : max;
        }
        if (num < min) {
            return returnNaN ? NaN : min;
        }
        return num;

    },
    isNumber: function (number) {
        return typeof number === 'number' && !isNaN(number);
    },
    isElement: function (node) {
        return !!(node &&
        (node.nodeName || // we are a direct element
        (node.prop && node.attr && node.find)));  // we have an on and find method part of jQuery API
    },
    isArray: function (value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    },
    position: function (elem, t, l, b, r) {
        elem.style.top = t + 'px';
        elem.style.left = l + 'px';
        elem.style.bottom = b + 'px';
        elem.style.right = r + 'px';
        elem.style.position = 'absolute';
        
    }
};
},{}],27:[function(require,module,exports){
var customEvent = require('@grid/custom-event');
var debounce = require('@grid/debounce');
var util = require('@grid/util');


module.exports = function (_grid) {
    var viewLayer = {};


    var grid = _grid;
    var container;
    var root;
    var cellContainer;
    var decoratorContainer;
    var borderWidth;

    var GRID_CELL_CONTAINER_BASE_CLASS = 'grid-cells';
    var GRID_VIEW_ROOT_CLASS = 'js-grid-view-root';
    var CELL_CLASS = 'grid-cell';

    var cells; //matrix of rendered cell elements;
    var rows; //array of all rendered rows
    var builtCols; //map from col index to an array of built elements for the column to update on scroll
    var builtRows; //map from row index to an array of built elements for the row to update on scroll

    //add the cell classes through the standard method
    grid.cellClasses.add(grid.cellClasses.create(0, 0, CELL_CLASS, Infinity, Infinity, 'virtual'));

    var rowHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-row-header', Infinity, 0, 'virtual');
    var colHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-col-header', 0, Infinity, 'virtual');
    var fixedColClasses = grid.cellClasses.create(0, -1, 'grid-last-fixed-col', Infinity, 1, 'virtual');
    var fixedRowClasses = grid.cellClasses.create(-1, 0, 'grid-last-fixed-row', 1, Infinity, 'virtual');

    grid.cellClasses.add(rowHeaderClasses);
    grid.cellClasses.add(colHeaderClasses);
    grid.cellClasses.add(fixedRowClasses);
    grid.cellClasses.add(fixedColClasses);


    grid.eventLoop.bind('grid-col-change', function () {
        fixedColClasses.left = grid.colModel.numFixed() - 1;
        rowHeaderClasses.width = grid.colModel.numHeaders();
    });

    grid.eventLoop.bind('grid-row-change', function () {
        fixedRowClasses.top = grid.rowModel.numFixed() - 1;
        colHeaderClasses.height = grid.rowModel.numHeaders();
    });


    viewLayer.build = function (elem) {
        cleanup();

        container = elem;

        cellContainer = document.createElement('div');
        cellContainer.setAttribute('dts', 'grid-cells');
        cellContainer.setAttribute('class', GRID_CELL_CONTAINER_BASE_CLASS);
        util.position(cellContainer, 0, 0, 0, 0);
        cellContainer.style.zIndex = 0;

        decoratorContainer = document.createElement('div');
        decoratorContainer.setAttribute('dts', 'grid-decorators');
        util.position(decoratorContainer, 0, 0, 0, 0);
        decoratorContainer.style.zIndex = 0;
        decoratorContainer.style.pointerEvents = 'none';

        root = document.createElement('div');
        root.setAttribute('class', GRID_VIEW_ROOT_CLASS);

        root.appendChild(cellContainer);
        root.appendChild(decoratorContainer);

        container.appendChild(root);

    };


    function measureBorderWidth() {
        //read the border width, for the rare case of larger than 1px borders, otherwise the draw will default to 1
        if (borderWidth) {
            return;
        }
        var jsGridCell = cells[0] && cells[0][0];
        if (jsGridCell) {
            var oldClass = jsGridCell.className;
            jsGridCell.className = CELL_CLASS;
            var computedStyle = getComputedStyle(jsGridCell);
            var borderWidthProp = computedStyle.getPropertyValue('border-left-width');
            borderWidth = parseInt(borderWidthProp);
            jsGridCell.className = oldClass;
        }
        borderWidth = isNaN(borderWidth) || !borderWidth ? undefined : borderWidth;
        return borderWidth;
    }

    //only draw once per js turn, may need to create a synchronous version
    viewLayer.draw = debounce(function () {
        viewLayer._draw();
    }, 1);

    viewLayer._draw = function () {
        //return if we haven't built yet
        if (!container) {
            return;
        }

        var rebuilt = grid.viewPort.isDirty();
        if (rebuilt) {
            viewLayer._buildCells(cellContainer);
        }

        var builtColsDirty = grid.colModel.areBuildersDirty();
        if (rebuilt || builtColsDirty) {
            viewLayer._buildCols();
        }

        var builtRowsDirty = grid.rowModel.areBuildersDirty();
        if (rebuilt || builtRowsDirty) {
            viewLayer._buildRows();
        }

        var cellsPositionOrSizeChanged = grid.colModel.isDirty() || grid.rowModel.isDirty() || grid.cellScrollModel.isDirty();

        if (grid.cellClasses.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
            viewLayer._drawCellClasses();
        }

        if (rebuilt || cellsPositionOrSizeChanged || builtColsDirty || builtRowsDirty || grid.dataModel.isDirty()) {
            viewLayer._drawCells();
        }

        if (grid.decorators.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
            viewLayer._drawDecorators(cellsPositionOrSizeChanged);
        }

        grid.eventLoop.fire('grid-draw');
    };

    /* CELL LOGIC */
    function getBorderWidth() {
        return borderWidth || 1;
    }

    viewLayer._drawCells = function () {
        measureBorderWidth();
        var bWidth = getBorderWidth();
        var headerRows = grid.rowModel.numHeaders();
        var headerCols = grid.colModel.numHeaders();
        grid.viewPort.iterateCells(function drawCell(r, c) {
            var cell = cells[r][c];
            var width = grid.viewPort.getColWidth(c);
            cell.style.width = width + bWidth + 'px';

            var left = grid.viewPort.getColLeft(c);
            cell.style.left = left + 'px';

            while (cell.firstChild) {
                cell.removeChild(cell.firstChild);
            }
            var virtualRow = grid.viewPort.toVirtualRow(r);
            var virtualCol = grid.viewPort.toVirtualCol(c);
            var data;
            if (r < headerRows || c < headerCols) {
                data = grid.dataModel.getHeader(virtualRow, virtualCol);
            } else {
                data = grid.dataModel.get(grid.rowModel.toData(virtualRow), grid.colModel.toData(virtualCol));
            }
            //artificially only get builders for row headers for now
            var builder = virtualRow < headerRows && grid.rowModel.get(virtualRow).builder || undefined;
            var hasRowBuilder = true;
            if (!builder) {
                hasRowBuilder = false;
                builder = grid.colModel.get(virtualCol).builder;
            }

            var cellChild;
            if (builder) {
                var builtElem;
                if (hasRowBuilder) {
                    builtElem = builtRows[virtualRow][c];
                } else {
                    builtElem = builtCols[virtualCol][r];
                }
                cellChild = builder.update(builtElem, {
                    virtualCol: virtualCol,
                    virtualRow: virtualRow,
                    data: data
                });
            }
            //if we didn't get a child from the builder use a regular text node
            if (!cellChild) {
                cellChild = document.createTextNode(data.formatted);
            }
            cell.appendChild(cellChild);
        }, function drawRow(r) {
            var height = grid.viewPort.getRowHeight(r);
            var row = rows[r];
            row.style.height = height + bWidth + 'px';
            var top = grid.viewPort.getRowTop(r);
            row.style.top = top + 'px';
        });

        if (grid.cellScrollModel.row % 2) {
            cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
        } else {
            cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS;
        }
    };


    viewLayer._buildCells = function buildCells(cellContainer) {
        while (cellContainer.firstChild) {
            cellContainer.removeChild(cellContainer.firstChild);
        }


        cells = [];
        rows = [];
        var row;
        grid.viewPort.iterateCells(function (r, c) {
            var cell = buildDivCell();
            cells[r][c] = cell;
            row.appendChild(cell);
        }, function (r) {
            cells[r] = [];
            row = document.createElement('div');
            row.setAttribute('class', 'grid-row');
            row.setAttribute('dts', 'grid-row');
            row.style.position = 'absolute';
            row.style.left = 0;
            row.style.right = 0;
            rows[r] = row;
            cellContainer.appendChild(row);
        });
    };

    function buildDivCell() {
        var cell = document.createElement('div');
        cell.setAttribute('dts', 'grid-cell');
        var style = cell.style;
        style.position = 'absolute';
        style.boxSizing = 'border-box';
        style.top = '0px';
        style.bottom = '0px';
        return cell;
    }

    /* END CELL LOGIC */

    /* COL BUILDER LOGIC */
    viewLayer._buildCols = function () {
        builtCols = {};
        for (var c = 0; c < grid.colModel.length(true); c++) {
            var builder = grid.colModel.get(c).builder;
            if (builder) {
                builtCols[c] = [];
                for (var realRow = 0; realRow < grid.viewPort.rows; realRow++) {
                    builtCols[c][realRow] = builder.render();
                }
            }
        }
    };
    /* END COL BUILDER LOGIC */

    /* ROW BUILDER LOGIC 
     *  for now we only build headers
     * */

    viewLayer._buildRows = function () {
        builtRows = {};
        for (var r = 0; r < grid.rowModel.numHeaders(); r++) {
            var builder = grid.rowModel.get(r).builder;
            if (builder) {
                builtRows[r] = [];
                for (var realCol = 0; realCol < grid.viewPort.cols; realCol++) {
                    builtRows[r][realCol] = builder.render();
                }
            }
        }
    };
    /* END ROW BUILDER LOGIC*/

    /* DECORATOR LOGIC */
    function setPosition(boundingBox, top, left, height, width) {
        var style = boundingBox.style;
        style.top = top + 'px';
        style.left = left + 'px';
        style.height = height + 'px';
        style.width = width + 'px';
        style.position = 'absolute';
    }

    function positionDecorator(bounding, t, l, h, w) {
        setPosition(bounding, t, l, util.clamp(h, 0, grid.viewPort.height), util.clamp(w, 0, grid.viewPort.width));
    }

    function positionCellDecoratorFromViewCellRange(realCellRange, boundingBox) {
        var realPxRange = grid.viewPort.toPx(realCellRange);
        positionDecorator(boundingBox, realPxRange.top, realPxRange.left, realPxRange.height + getBorderWidth(), realPxRange.width + getBorderWidth());
    }

    function createRangeForDescriptor(descriptor) {
        var range = {
            top: descriptor.top,
            left: descriptor.left,
            height: descriptor.height,
            width: descriptor.width
        };
        if (descriptor.space === 'data' && descriptor.units === 'cell') {
            range.top += grid.rowModel.numHeaders();
            range.left += grid.colModel.numHeaders();
        }
        return range;
    }

    viewLayer._drawDecorators = function (cellsPositionOrSizeChanged) {
        var aliveDecorators = grid.decorators.getAlive();
        aliveDecorators.forEach(function (decorator) {

            var boundingBox = decorator.boundingBox;
            if (!boundingBox) {
                boundingBox = document.createElement('div');
                boundingBox.style.pointerEvents = 'none';
                decorator.boundingBox = boundingBox;
                var decElement = decorator.render();
                if (decElement) {
                    boundingBox.appendChild(decElement);
                    decoratorContainer.appendChild(boundingBox);
                }
            }

            if (decorator.isDirty() || cellsPositionOrSizeChanged) {
                if (decorator.space === 'real') {
                    switch (decorator.units) {
                        case 'px':
                            positionDecorator(boundingBox, decorator.top, decorator.left, decorator.height, decorator.width);
                            break;
                        case 'cell':
                            positionCellDecoratorFromViewCellRange(decorator, boundingBox);
                            break;
                    }
                }
                else if (decorator.space === 'virtual' || decorator.space === 'data') {
                    switch (decorator.units) {
                        case 'px':
                            break;
                        case 'cell':
                        /* jshint -W086 */
                        default:
                            var range = createRangeForDescriptor(decorator);
                            var realCellRange = grid.viewPort.intersect(range);
                            if (realCellRange) {
                                positionCellDecoratorFromViewCellRange(realCellRange, boundingBox);
                            } else {
                                positionDecorator(boundingBox, -1, -1, -1, -1);
                            }
                            break;
                        /* jshint +W086 */
                    }

                }
            }
        });

        removeDecorators(grid.decorators.popAllDead());
    };

    function removeDecorators(decorators) {
        decorators.forEach(function (decorator) {
            var boundingBox = decorator.boundingBox;
            if (boundingBox) {
                //if they rendered an element previously we attached it to the bounding box as the only child
                var renderedElement = boundingBox.firstChild;
                if (renderedElement) {
                    //create a destroy dom event that bubbles
                    var destroyEvent = customEvent('decorator-destroy', true);
                    renderedElement.dispatchEvent(destroyEvent);
                }
                decoratorContainer.removeChild(boundingBox);
                decorator.boundingBox = undefined;
            }
        });
    }

    /* END DECORATOR LOGIC */

    /* CELL CLASSES LOGIC */
    viewLayer._drawCellClasses = function () {
        grid.viewPort.iterateCells(function (r, c) {
            cells[r][c].className = '';
        });
        grid.cellClasses.getAll().forEach(function (descriptor) {
            var range = createRangeForDescriptor(descriptor);
            var intersection = grid.viewPort.intersect(range);
            if (intersection) {
                rowLoop:
                    for (var r = 0; r < intersection.height; r++) {
                        for (var c = 0; c < intersection.width; c++) {
                            var row = intersection.top + r;
                            var col = intersection.left + c;

                            var cellRow = cells[row];
                            if (!cellRow) {
                                continue rowLoop;
                            }
                            var cell = cellRow[col];
                            if (!cell) {
                                continue;
                            }
                            cell.className = (cell.className ? cell.className + ' ' : '') + descriptor.class;
                        }
                    }
            }
        });
    };

    /* END CELL CLASSES LOGIC*/

    viewLayer.destroy = cleanup;

    function cleanup() {
        removeDecorators(grid.decorators.getAlive().concat(grid.decorators.popAllDead()));
        if (!container) {
            return;
        }
        var querySelectorAll = container.querySelectorAll('.' + GRID_VIEW_ROOT_CLASS);
        for (var i = 0; i < querySelectorAll.length; ++i) {
            var root = querySelectorAll[i];
            container.removeChild(root);
        }
    }

    grid.eventLoop.bind('grid-destroy', function () {
        viewLayer.destroy();
        clearTimeout(viewLayer.draw.timeout);
    });

    return viewLayer;
};
},{"@grid/custom-event":11,"@grid/debounce":12,"@grid/util":26}],28:[function(require,module,exports){
var util = require('@grid/util');
var rangeUtil = require('@grid/range-util');
var capitalize = require('capitalize');
var addDirtyProps = require('@grid/add-dirty-props');
var debounce = require('@grid/debounce');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);
    var container;

    var viewPort = addDirtyProps({}, ['rows', 'cols', 'width', 'height'], [dirtyClean]);
    viewPort.rows = 0;
    viewPort.cols = 0;
    viewPort.isDirty = dirtyClean.isDirty;

    //these probably trigger reflow so we may need to think about caching the value and updating it at on draws or something
    function getFirstClientRect() {
        return container && container.getClientRects && container.getClientRects() && container.getClientRects()[0] || {};
    }

    Object.defineProperty(viewPort, 'top', {
        enumerable: true,
        get: function () {
            return getFirstClientRect().top || 0;
        }
    });

    Object.defineProperty(viewPort, 'left', {
        enumerable: true,
        get: function () {
            return getFirstClientRect().left || 0;
        }
    });

    viewPort.toGridX = function (clientX) {
        return clientX - viewPort.left;
    };

    viewPort.toGridY = function (clientY) {
        return clientY - viewPort.top;
    };


    var fixed = {rows: 0, cols: 0};

    function getFixed(rowOrCol) {
        return fixed[rowOrCol + 's'];
    }

    viewPort.sizeToContainer = function (elem) {
        container = elem;
        viewPort.width = elem.offsetWidth;
        viewPort.height = elem.offsetHeight;
        viewPort.rows = calculateMaxLengths(viewPort.height, grid.rowModel);
        viewPort.cols = calculateMaxLengths(viewPort.width, grid.colModel);
        grid.eventLoop.fire('grid-viewport-change');
    };

    viewPort._onResize = debounce(function () {
        viewPort._resize();
    }, 200);

    grid.eventLoop.bind('grid-destroy', function () {
        clearTimeout(viewPort._onResize.timeout);
        clearTimeout(shortDebouncedResize.timeout);
    });

    viewPort._resize = function () {
        if (container) {
            viewPort.sizeToContainer(container);
        }
    };

    var shortDebouncedResize = debounce(function () {
        viewPort._resize();
    }, 1);


    grid.eventLoop.bind('resize', window, function () {
        //we don't bind the handler directly so that tests can mock it out
        viewPort._onResize();
    });

    grid.eventLoop.bind('grid-row-change', function () {
        fixed.rows = grid.rowModel.numFixed();
        shortDebouncedResize();
    });

    grid.eventLoop.bind('grid-col-change', function () {
        fixed.cols = grid.colModel.numFixed();
        shortDebouncedResize();
    });

    function convertRealToVirtual(coord, rowOrCol, coordIsVirtual) {
        //could cache this on changes i.e. row-change or col-change events
        var numFixed = getFixed(rowOrCol);
        if (coord < numFixed) {
            return coord;
        }
        return coord + (coordIsVirtual ? -1 : 1) * grid.cellScrollModel[rowOrCol];
    }

// converts a viewport row or column to a real row or column 
// clamps it if the column would be outside the range
    function getVirtualRowColUnsafe(realCoord, rowOrCol) {
        return convertRealToVirtual(realCoord, rowOrCol);
    }

    function getVirtualRowColClamped(viewCoord, rowOrCol) {
        var virtualRowCol = getVirtualRowColUnsafe(viewCoord, rowOrCol);
        return grid.virtualPixelCellModel['clamp' + capitalize(rowOrCol)](virtualRowCol);
    }

    viewPort.toVirtualRow = function (r) {
        return getVirtualRowColClamped(r, 'row');
    };

    viewPort.toVirtualCol = function (c) {
        return getVirtualRowColClamped(c, 'col');
    };

    function getRealRowColClamped(virtualCoord, rowOrCol) {
        var numFixed = getFixed(rowOrCol);
        if (virtualCoord < numFixed) {
            return virtualCoord;
        }
        var maxViewPortIndex = viewPort[rowOrCol + 's'] - 1;
        return util.clamp(virtualCoord - grid.cellScrollModel[rowOrCol], numFixed, maxViewPortIndex, true);
    }

    viewPort.rowIsInView = function (virtualRow) {
        var realRow = viewPort.toRealRow(virtualRow);
        return !isNaN(realRow) && getLengthBetweenViewCoords(0, realRow, 'row', 'height', true) < viewPort.height;
    };

    viewPort.colIsInView = function (virtualCol) {
        var realCol = viewPort.toRealCol(virtualCol);
        return !isNaN(realCol) && getLengthBetweenViewCoords(0, realCol, 'col', 'width', true) < viewPort.width;
    };


//default unclamped cause that seems to be the more likely use case converting this direction
    viewPort.toRealRow = function (virtualRow) {
        return getRealRowColClamped(virtualRow, 'row');
    };

    viewPort.toRealCol = function (virtualCol) {
        return getRealRowColClamped(virtualCol, 'col');
    };

    viewPort.clampRow = function (r) {
        return util.clamp(r, 0, viewPort.rows - 1);
    };

    viewPort.clampCol = function (c) {
        return util.clamp(c, 0, viewPort.cols - 1);
    };

    viewPort.clampY = function (y) {
        return util.clamp(y, 0, viewPort.height);
    };

    viewPort.clampX = function (x) {
        return util.clamp(x, 0, viewPort.width);
    };

    function getLengthBetweenViewCoords(startCoord, endCoord, rowOrCol, heightOrWidth, inclusive) {
        var rowOrColCap = capitalize(rowOrCol);
        var toVirtual = viewPort['toVirtual' + rowOrColCap];
        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
        var clampFn = viewPort['clamp' + rowOrColCap];
        var pos = 0;
        var numFixed = getFixed(rowOrCol);
        var isInNonfixedArea = endCoord >= numFixed;
        var isInFixedArea = startCoord < numFixed;
        var exclusiveOffset = (inclusive ? 0 : 1);
        if (isInFixedArea) {
            var fixedEndCoord = (isInNonfixedArea ? numFixed - 1 : endCoord - exclusiveOffset);
            pos += lengthFn(startCoord, fixedEndCoord);
        }
        if (isInNonfixedArea) {
            pos += lengthFn((isInFixedArea ? toVirtual(numFixed) : toVirtual(startCoord)), toVirtual(clampFn(endCoord)) - exclusiveOffset);
        }
        return pos;
    }

    function getTopOrLeft(endCoord, rowOrCol, heightOrWidth) {
        return getLengthBetweenViewCoords(0, endCoord, rowOrCol, heightOrWidth);
    }

    viewPort.getRowTop = function (viewPortCoord) {
        return getTopOrLeft(viewPortCoord, 'row', 'height');
    };

    viewPort.getColLeft = function (viewPortCol) {
        return getTopOrLeft(viewPortCol, 'col', 'width');
    };

    viewPort.toPx = function (realCellRange) {
        return {
            top: viewPort.getRowTop(realCellRange.top),
            left: viewPort.getColLeft(realCellRange.left),
            height: getLengthBetweenViewCoords(realCellRange.top, realCellRange.top + realCellRange.height - 1, 'row', 'height', true),
            width: getLengthBetweenViewCoords(realCellRange.left, realCellRange.left + realCellRange.width - 1, 'col', 'width', true)
        };
    };

    function getRowOrColFromPosition(pos, rowOrCol, heightOrWidth, returnVirtual) {
        //we could do this slighly faster with binary search to get log(n) instead of n, but will only do it if we actually need to optimize this
        var rowOrColCap = capitalize(rowOrCol);
        var viewMax = viewPort[rowOrCol + 's'];
        var toVirtual = viewPort['toVirtual' + rowOrColCap];
        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
        var summedLength = 0;
        for (var i = 0; i < viewMax; i++) {
            var virtual = toVirtual(i);
            var length = lengthFn(virtual);
            var newSum = summedLength + length;
            if (newSum > pos) {
                return returnVirtual ? virtual : i;
            }
            summedLength = newSum;
        }
        return NaN;
    }

    viewPort.getVirtualRowByTop = function (top) {
        return getRowOrColFromPosition(top, 'row', 'height', true);
    };

    viewPort.getVirtualColByLeft = function (left) {
        return getRowOrColFromPosition(left, 'col', 'width', true);
    };

    viewPort.getRowByTop = function (top) {
        return getRowOrColFromPosition(top, 'row', 'height');
    };

    viewPort.getColByLeft = function (left) {
        return getRowOrColFromPosition(left, 'col', 'width');
    };

    viewPort.getRowHeight = function (viewPortRow) {
        return grid.virtualPixelCellModel.height(viewPort.toVirtualRow(viewPort.clampRow(viewPortRow)));
    };

    viewPort.getColWidth = function (viewPortCol) {
        return grid.virtualPixelCellModel.width(viewPort.toVirtualCol(viewPort.clampCol(viewPortCol)));
    };

    function intersectRowsOrCols(intersection, range, topOrLeft, rowOrCol, heightOrWidth) {
        var numFixed = fixed[rowOrCol + 's'];
        var fixedRange = [0, numFixed];

        var virtualRange = [range[topOrLeft], range[heightOrWidth]];
        var fixedIntersection = rangeUtil.intersect(fixedRange, virtualRange);
        var scrollRange = [numFixed, viewPort[rowOrCol + 's'] - numFixed];
        virtualRange[0] -= grid.cellScrollModel[rowOrCol];
        var scrollIntersection = rangeUtil.intersect(scrollRange, virtualRange);
        var resultRange = rangeUtil.union(fixedIntersection, scrollIntersection);
        if (!resultRange) {
            return null;
        }

        intersection[topOrLeft] = resultRange[0];
        intersection[heightOrWidth] = resultRange[1];
        return intersection;
    }

    viewPort.intersect = function (range) {
        //assume virtual cells for now
        var intersection = intersectRowsOrCols({}, range, 'top', 'row', 'height');
        if (!intersection) {
            return null;
        }
        return intersectRowsOrCols(intersection, range, 'left', 'col', 'width');
    };


    function calculateMaxLengths(totalLength, lengthModel) {
        var lengthMethod = lengthModel.width && grid.virtualPixelCellModel.width || grid.virtualPixelCellModel.height;
        var numFixed = lengthModel.numFixed();
        var windowLength = 0;
        var maxSize = 0;
        var fixedLength = 0;
        var windowStartIndex = numFixed;

        for (var fixed = 0; fixed < numFixed; fixed++) {
            fixedLength += lengthMethod(fixed);
        }

        //it might be safer to actually sum the lengths in the virtualPixelCellModel but for now here is ok
        for (var index = numFixed; index < lengthModel.length(true); index++) {
            windowLength += lengthMethod(index);
            while (windowLength + fixedLength > totalLength && windowStartIndex < index) {
                windowLength -= lengthMethod(index);
                windowStartIndex++;
            }
            var windowSize = index - windowStartIndex + 1; // add the one because we want the last index that didn't fit
            if (windowSize > maxSize) {
                maxSize = windowSize;
            }

        }
        return maxSize + numFixed + 1;
    }


    viewPort.iterateCells = function (cellFn, optionalRowFn, optionalMaxRow, optionalMaxCol) {
        optionalMaxRow = optionalMaxRow || Infinity;
        optionalMaxCol = optionalMaxCol || Infinity;
        for (var r = 0; r < Math.min(viewPort.rows, optionalMaxRow); r++) {
            if (optionalRowFn) {
                optionalRowFn(r);
            }
            if (cellFn) {
                for (var c = 0; c < Math.min(viewPort.cols, optionalMaxCol); c++) {
                    cellFn(r, c);

                }
            }
        }
    };

    return viewPort;
}
},{"@grid/add-dirty-props":3,"@grid/debounce":12,"@grid/dirty-clean":14,"@grid/range-util":23,"@grid/util":26,"capitalize":30}],29:[function(require,module,exports){
var util = require('@grid/util');

module.exports = function (_grid) {
    var grid = _grid;
    var model = {};

    //all pixels are assumed to be in the virtual world, no real world pixels are dealt with here :)
    model.getRow = function (topPx) {
        if (topPx < 0) {
            return NaN;
        }
        var sumLength = 0;
        for (var r = 0; r < grid.rowModel.length(true); r++) {
            sumLength += grid.rowModel.height(r);
            if (topPx < sumLength) {
                return r;
            }
        }
        return NaN;
    };

    //yes these are very similar but there will be differences
    model.getCol = function (leftPx) {
        if (leftPx < 0) {
            return NaN;
        }
        var sumLength = 0;
        for (var c = 0; c < grid.colModel.length(true); c++) {
            sumLength += grid.colModel.width(c);
            if (leftPx < sumLength) {
                return c;
            }
        }
        return NaN;
    };


    function clampRowOrCol(virtualRowCol, rowOrCol) {
        var maxRowCol = grid[rowOrCol + 'Model'].length(true) - 1;
        return util.clamp(virtualRowCol, 0, maxRowCol);
    }

    model.clampRow = function (virtualRow) {
        return clampRowOrCol(virtualRow, 'row');
    };

    model.clampCol = function (virtualCol) {
        return clampRowOrCol(virtualCol, 'col');
    };

    //for now these just call through to the row and column model, but very likely it will need to include some other calculations
    model.height = function (virtualRowStart, virtualRowEnd) {
        return heightOrWidth(virtualRowStart, virtualRowEnd, 'row');
    };

    model.width = function (virtualColStart, virtualColEnd) {
        return heightOrWidth(virtualColStart, virtualColEnd, 'col');
    };

    function heightOrWidth(start, end, rowOrCol) {
        var length = 0;
        if (end < start) {
            return 0;
        }
        end = util.isNumber(end) ? end : start;
        end = clampRowOrCol(end, rowOrCol);
        start = clampRowOrCol(start, rowOrCol);
        var lengthModel = grid[rowOrCol + 'Model'];
        var lengthFn = lengthModel.width || lengthModel.height;
        for (var i = start; i <= end; i++) {
            length += lengthFn(i);
        }
        return length;
    }

    model.totalHeight = function () {
        return model.height(0, grid.rowModel.length(true) - 1);
    };

    model.totalWidth = function () {
        return model.width(0, grid.colModel.length(true) - 1);
    };

    model.fixedHeight = function () {
        return model.height(0, grid.rowModel.numFixed() - 1);
    };

    model.fixedWidth = function () {
        return model.width(0, grid.colModel.numFixed() - 1);
    };

    function sizeChangeListener() {
        //for now we don't cache anything about this so we just notify
        grid.eventLoop.fire('grid-virtual-pixel-cell-change');
    }

    grid.eventLoop.bind('grid-col-change', sizeChangeListener);
    grid.eventLoop.bind('grid-row-change', sizeChangeListener);

    return model;
};
},{"@grid/util":26}],30:[function(require,module,exports){
module.exports = function (string) {
  return string.charAt(0).toUpperCase() + string.substring(1);
}

module.exports.words = function (string) {
  return string.replace(/(^|\W)(\w)/g, function (m) {
    return m.toUpperCase()
  })
}

},{}],31:[function(require,module,exports){
module.exports = function(opts) {
  return new ElementClass(opts)
}

function ElementClass(opts) {
  if (!(this instanceof ElementClass)) return new ElementClass(opts)
  var self = this
  if (!opts) opts = {}

  // similar doing instanceof HTMLElement but works in IE8
  if (opts.nodeType) opts = {el: opts}

  this.opts = opts
  this.el = opts.el || document.body
  if (typeof this.el !== 'object') this.el = document.querySelector(this.el)
}

ElementClass.prototype.add = function(className) {
  var el = this.el
  if (!el) return
  if (el.className === "") return el.className = className
  var classes = el.className.split(' ')
  if (classes.indexOf(className) > -1) return classes
  classes.push(className)
  el.className = classes.join(' ')
  return classes
}

ElementClass.prototype.remove = function(className) {
  var el = this.el
  if (!el) return
  if (el.className === "") return
  var classes = el.className.split(' ')
  var idx = classes.indexOf(className)
  if (idx > -1) classes.splice(idx, 1)
  el.className = classes.join(' ')
  return classes
}

ElementClass.prototype.has = function(className) {
  var el = this.el
  if (!el) return
  var classes = el.className.split(' ')
  return classes.indexOf(className) > -1
}

},{}],32:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var alnum, ref;

  ref = require('../ref').ref;

  alnum = {
    '0': ref('0', 48),
    '1': ref('1', 49),
    '2': ref('2', 50),
    '3': ref('3', 51),
    '4': ref('4', 52),
    '5': ref('5', 53),
    '6': ref('6', 54),
    '7': ref('7', 55),
    '8': ref('8', 56),
    '9': ref('9', 57),
    a: ref('A', 65),
    b: ref('B', 66),
    c: ref('C', 67),
    d: ref('D', 68),
    e: ref('E', 69),
    f: ref('F', 70),
    g: ref('G', 71),
    h: ref('H', 72),
    i: ref('I', 73),
    j: ref('J', 74),
    k: ref('K', 75),
    l: ref('L', 76),
    m: ref('M', 77),
    n: ref('N', 78),
    o: ref('O', 79),
    p: ref('P', 80),
    q: ref('Q', 81),
    r: ref('R', 82),
    s: ref('S', 83),
    t: ref('T', 84),
    u: ref('U', 85),
    v: ref('V', 86),
    w: ref('W', 87),
    x: ref('X', 88),
    y: ref('Y', 89),
    z: ref('Z', 90)
  };

  module.exports = alnum;

}).call(this);

},{"../ref":38}],33:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var arrow, ref;

  ref = require('../ref').ref;

  arrow = {
    left: ref('Left', 37),
    up: ref('Up', 38),
    right: ref('Right', 39),
    down: ref('Down', 40)
  };

  module.exports = arrow;

}).call(this);

},{"../ref":38}],34:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var brand, ref;

  ref = require('../ref').ref;

  brand = {
    apple: ref('Apple &#8984;', 224),
    windows: {
      start: ref('Windows start', [91, 92]),
      menu: ref('Windows menu', 93)
    }
  };

  module.exports = brand;

}).call(this);

},{"../ref":38}],35:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var punctuation, ref;

  ref = require('../ref').ref;

  punctuation = {
    colon: ref('Colon/Semicolon', [59, 186]),
    equal: ref('Equal/Plus', [61, 187]),
    comma: ref('Comma/Less Than', [44, 188]),
    hyphen: ref('Hyphen/Underscore', [45, 109, 189]),
    period: ref('Period/Greater Than', [46, 190]),
    tilde: ref('Tilde/Back Tick', [96, 192]),
    apostrophe: ref('Apostrophe/Quote', [39, 222]),
    slash: {
      forward: ref('Forward Slash/Question Mark', [47, 191]),
      backward: ref('Backward Slash/Pipe', 220)
    },
    brace: {
      square: {
        open: ref('Open Square/Curly Brace', 219),
        close: ref('Close Square/Curly Brace', 221)
      }
    }
  };

  punctuation.semicolon = punctuation.colon;

  punctuation.plus = punctuation.equal;

  punctuation.lessthan = punctuation.comma;

  punctuation.underscore = punctuation.hyphen;

  punctuation.greaterthan = punctuation.period;

  punctuation.question = punctuation.slash.forward;

  punctuation.backtick = punctuation.tilde;

  punctuation.pipe = punctuation.slash.backward;

  punctuation.quote = punctuation.apostrophe;

  punctuation.brace.curly = punctuation.brace.square;

  module.exports = punctuation;

}).call(this);

},{"../ref":38}],36:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var ref, special;

  ref = require('../ref').ref;

  special = {
    backspace: ref('Backspace', 8),
    tab: ref('Tab', 9),
    enter: ref('Enter', 13),
    shift: ref('Shift', 16),
    ctrl: ref('Ctrl', 17),
    alt: ref('Alt', 18),
    caps: ref('Caps Lock', 20),
    esc: ref('Escape', 27),
    space: ref('Space', 32),
    num: ref('Num Lock', 144)
  };

  module.exports = special;

}).call(this);

},{"../ref":38}],37:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var isRef, iterator, key,
    _this = this,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty;

  isRef = require('./ref').isRef;

  key = {};

  key.code = {
    special: require('./code/special'),
    arrow: require('./code/arrow'),
    punctuation: require('./code/punctuation'),
    alnum: require('./code/alnum'),
    brand: require('./code/brand')
  };

  key.get = function(pressed) {
    return iterator(key.code, pressed);
  };

  key.is = function(ref, pressed) {
    if (!isRef(ref)) {
      ref = iterator(ref, pressed);
    }
    if (isRef(ref)) {
      if (isRef(pressed)) {
        return pressed === ref;
      } else {
        return pressed === ref.code || __indexOf.call(ref.code, pressed) >= 0;
      }
    } else {
      return pressed === ref;
    }
  };

  iterator = function(context, pressed) {
    var i, out, ref;
    for (i in context) {
      if (!__hasProp.call(context, i)) continue;
      ref = context[i];
      if (isRef(ref)) {
        if (key.is(ref, pressed)) {
          return ref;
        }
      } else {
        out = iterator(ref, pressed);
        if (isRef(out)) {
          return out;
        }
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.key = key;
  }

  module.exports = key;

}).call(this);

},{"./code/alnum":32,"./code/arrow":33,"./code/brand":34,"./code/punctuation":35,"./code/special":36,"./ref":38}],38:[function(require,module,exports){
// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var Reference, assertRef, isRef, ref;

  Reference = (function() {

    function Reference(name, code) {
      this.name = name;
      this.code = code;
    }

    return Reference;

  })();

  ref = function(name, code) {
    return new Reference(name, code);
  };

  isRef = function(ref) {
    return ref instanceof Reference;
  };

  assertRef = function(ref) {
    if (!isRef(ref)) {
      throw new Error('Invalid reference');
    }
    return ref;
  };

  module.exports = {
    ref: ref,
    isRef: isRef,
    assertRef: assertRef
  };

}).call(this);

},{}]},{},[1])
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbW9kdWxlcy9yaXEtZ3JpZC1lbnRyeS5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9hYnN0cmFjdC1yb3ctY29sLW1vZGVsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BncmlkL2FkZC1kaXJ0eS1wcm9wcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9jZWxsLWNsYXNzZXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvY2VsbC1tb3VzZS1tb2RlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9jZWxsLXNjcm9sbC1tb2RlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9jb2wtbW9kZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvY29sLXJlb3JkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvY29sLXJlc2l6ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9jb3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BncmlkL2N1c3RvbS1ldmVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9kZWNvcmF0b3JzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BncmlkL2RpcnR5LWNsZWFuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BncmlkL2V2ZW50LWxvb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvaGVhZGVyLWRlY29yYXRvcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvbGlzdGVuZXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BncmlkL21vdXNld2hlZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvbmF2aWdhdGlvbi1tb2RlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9uby1vcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9waXhlbC1zY3JvbGwtbW9kZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvcG9zaXRpb24tcmFuZ2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvcmFuZ2UtdXRpbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC9yb3ctbW9kZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvc2ltcGxlLWRhdGEtbW9kZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGdyaWQvdXRpbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC92aWV3LWxheWVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0BncmlkL3ZpZXctcG9ydC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AZ3JpZC92aXJ0dWFsLXBpeGVsLWNlbGwtbW9kZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FwaXRhbGl6ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50LWNsYXNzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2tleS9saWIvY29kZS9hbG51bS5qcyIsIm5vZGVfbW9kdWxlcy9rZXkvbGliL2NvZGUvYXJyb3cuanMiLCJub2RlX21vZHVsZXMva2V5L2xpYi9jb2RlL2JyYW5kLmpzIiwibm9kZV9tb2R1bGVzL2tleS9saWIvY29kZS9wdW5jdHVhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9rZXkvbGliL2NvZGUvc3BlY2lhbC5qcyIsIm5vZGVfbW9kdWxlcy9rZXkvbGliL2tleS5qcyIsIm5vZGVfbW9kdWxlcy9rZXkvbGliL3JlZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFBBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdyaXEtZ3JpZCcsIFtdKS5cbiAgICBmYWN0b3J5KCdyaXFHcmlkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcmVxdWlyZSgnQGdyaWQvY29yZScpO1xuICAgIH0pXG47XG5cbiIsInZhciBhZGREaXJ0eVByb3BzID0gcmVxdWlyZSgnQGdyaWQvYWRkLWRpcnR5LXByb3BzJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcbnZhciBub29wID0gcmVxdWlyZSgnQGdyaWQvbm8tb3AnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQsIG5hbWUsIGxlbmd0aE5hbWUsIGRlZmF1bHRMZW5ndGgpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIERFRkFVTFRfTEVOR1RIID0gZGVmYXVsdExlbmd0aDtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSBbXTtcbiAgICB2YXIgbnVtRml4ZWQgPSAwO1xuICAgIHZhciBudW1IZWFkZXJzID0gMDtcbiAgICB2YXIgbWFrZURpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpO1xuICAgIHZhciBkaXJ0eUNsZWFuID0gbWFrZURpcnR5Q2xlYW4oZ3JpZCk7XG4gICAgdmFyIGJ1aWxkZXJEaXJ0eUNsZWFuID0gbWFrZURpcnR5Q2xlYW4oZ3JpZCk7XG4gICAgdmFyIHNlbGVjdGVkID0gW107XG5cbiAgICBmdW5jdGlvbiBzZXREZXNjcmlwdG9yc0RpcnR5KCkge1xuICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKCdncmlkLScgKyBuYW1lICsgJy1jaGFuZ2UnKTtcbiAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICBidWlsZGVyRGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpcmVTZWxlY3Rpb25DaGFuZ2UoKSB7XG4gICAgICAgIGdyaWQuZXZlbnRMb29wLmZpcmUoJ2dyaWQtJyArIG5hbWUgKyAnLXNlbGVjdGlvbi1jaGFuZ2UnKTtcbiAgICB9XG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBhcmVCdWlsZGVyc0RpcnR5OiBidWlsZGVyRGlydHlDbGVhbi5pc0RpcnR5LFxuICAgICAgICBpc0RpcnR5OiBkaXJ0eUNsZWFuLmlzRGlydHksXG4gICAgICAgIGFkZDogZnVuY3Rpb24gKHRvQWRkKSB7XG4gICAgICAgICAgICBpZiAoIXV0aWwuaXNBcnJheSh0b0FkZCkpIHtcbiAgICAgICAgICAgICAgICB0b0FkZCA9IFt0b0FkZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b0FkZC5mb3JFYWNoKGZ1bmN0aW9uIChkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3IuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0b3JzLnNwbGljZShudW1IZWFkZXJzLCAwLCBkZXNjcmlwdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgbnVtRml4ZWQrKztcbiAgICAgICAgICAgICAgICAgICAgbnVtSGVhZGVycysrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2lmIHRoZSBjb2x1bW4gaXMgZml4ZWQgYW5kIHRoZSBsYXN0IG9uZSBhZGRlZCBpcyBmaXhlZCAod2Ugb25seSBhbGxvdyBmaXhlZCBhdCB0aGUgYmVnaW5uaW5nIGZvciBub3cpXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yLmZpeGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRlc2NyaXB0b3JzLmxlbmd0aCB8fCBkZXNjcmlwdG9yc1tkZXNjcmlwdG9ycy5sZW5ndGggLSAxXS5maXhlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bUZpeGVkKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93ICdDYW5ub3QgYWRkIGEgZml4ZWQgY29sdW1uIGFmdGVyIGFuIHVuZml4ZWQgb25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdG9ycy5wdXNoKGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzZXREZXNjcmlwdG9yc0RpcnR5KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEhlYWRlcnM6IGZ1bmN0aW9uICh0b0FkZCkge1xuICAgICAgICAgICAgaWYgKCF1dGlsLmlzQXJyYXkodG9BZGQpKSB7XG4gICAgICAgICAgICAgICAgdG9BZGQgPSBbdG9BZGRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9BZGQuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyLmhlYWRlciA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwaS5hZGQodG9BZGQpO1xuICAgICAgICB9LFxuICAgICAgICBoZWFkZXI6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzW2luZGV4XTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBkZXNjcmlwdG9yc1tpbmRleF07XG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKGluY2x1ZGVIZWFkZXJzKSB7XG4gICAgICAgICAgICB2YXIgc3VidHJhY3QgPSBpbmNsdWRlSGVhZGVycyA/IDAgOiBudW1IZWFkZXJzO1xuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzLmxlbmd0aCAtIHN1YnRyYWN0O1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uIChkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBkZXNjcmlwdG9ycy5pbmRleE9mKGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0b3JzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3IuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bUZpeGVkLS07XG4gICAgICAgICAgICAgICAgICAgIG51bUhlYWRlcnMtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRlc2NyaXB0b3IuZml4ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtRml4ZWQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoaW5jbHVkZUhlYWRlcnMpIHtcbiAgICAgICAgICAgIGRlc2NyaXB0b3JzLnNsaWNlKDApLmZvckVhY2goZnVuY3Rpb24gKGRlc2NyaXB0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUhlYWRlcnMgfHwgIWRlc2NyaXB0b3IuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaS5yZW1vdmUoZGVzY3JpcHRvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIG1vdmU6IGZ1bmN0aW9uIChzdGFydCwgdGFyZ2V0KSB7XG4gICAgICAgICAgICBkZXNjcmlwdG9ycy5zcGxpY2UodGFyZ2V0LCAwLCBkZXNjcmlwdG9ycy5zcGxpY2Uoc3RhcnQsIDEpWzBdKTtcbiAgICAgICAgICAgIHNldERlc2NyaXB0b3JzRGlydHkoKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVtSGVhZGVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bUhlYWRlcnM7XG4gICAgICAgIH0sXG4gICAgICAgIG51bUZpeGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVtRml4ZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHRvVmlydHVhbDogZnVuY3Rpb24gKGRhdGFJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFJbmRleCArIGFwaS5udW1IZWFkZXJzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvRGF0YTogZnVuY3Rpb24gKHZpcnR1YWxJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHZpcnR1YWxJbmRleCAtIGFwaS5udW1IZWFkZXJzKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiBmdW5jdGlvbiAoaW5kZXgpIHtcblxuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBhcGlbbmFtZV0oaW5kZXgpO1xuICAgICAgICAgICAgaWYgKCFkZXNjcmlwdG9yLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRvci5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQucHVzaChpbmRleCk7XG4gICAgICAgICAgICAgICAgZmlyZVNlbGVjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZXNlbGVjdDogZnVuY3Rpb24gKGluZGV4LCBkb250Tm90aWZ5KSB7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IGFwaVtuYW1lXShpbmRleCk7XG4gICAgICAgICAgICBpZiAoZGVzY3JpcHRvci5zZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0b3Iuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZC5zcGxpY2Uoc2VsZWN0ZWQuaW5kZXhPZihpbmRleCksIDEpO1xuICAgICAgICAgICAgICAgIGlmICghZG9udE5vdGlmeSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJlU2VsZWN0aW9uQ2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0b2dnbGVTZWxlY3Q6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBhcGlbbmFtZV0oaW5kZXgpO1xuICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3Iuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBhcGkuZGVzZWxlY3QoaW5kZXgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcGkuc2VsZWN0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJTZWxlY3RlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IHNlbGVjdGVkLmxlbmd0aDtcbiAgICAgICAgICAgIHNlbGVjdGVkLnNsaWNlKDApLmZvckVhY2goZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgYXBpLmRlc2VsZWN0KGluZGV4LCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGZpcmVTZWxlY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3RlZDtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAoYnVpbGRlcikge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSB7fTtcbiAgICAgICAgICAgIHZhciBmaXhlZCA9IGZhbHNlO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRlc2NyaXB0b3IsICdmaXhlZCcsIHtcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVzY3JpcHRvci5oZWFkZXIgfHwgZml4ZWQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uIChfZml4ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZml4ZWQgPSBfZml4ZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGFkZERpcnR5UHJvcHMoZGVzY3JpcHRvciwgWydidWlsZGVyJ10sIFtidWlsZGVyRGlydHlDbGVhbl0pO1xuICAgICAgICAgICAgZGVzY3JpcHRvci5idWlsZGVyID0gYnVpbGRlcjtcblxuICAgICAgICAgICAgcmV0dXJuIGFkZERpcnR5UHJvcHMoZGVzY3JpcHRvciwgW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbGVuZ3RoTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgb25EaXJ0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZC5ldmVudExvb3AuZmlyZSgnZ3JpZC0nICsgbmFtZSArICctY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLCBbZGlydHlDbGVhbl0pO1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGVCdWlsZGVyOiBmdW5jdGlvbiAocmVuZGVyLCB1cGRhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7cmVuZGVyOiByZW5kZXIgfHwgbm9vcCwgdXBkYXRlOiB1cGRhdGUgfHwgbm9vcH07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9iYXNpY2FsbHkgaGVpZ2h0IG9yIHdpZHRoXG4gICAgYXBpW2xlbmd0aE5hbWVdID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgIGlmICghZGVzY3JpcHRvcnNbaW5kZXhdKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzW2luZGV4XSAmJiBkZXNjcmlwdG9yc1tpbmRleF1bbGVuZ3RoTmFtZV0gfHwgREVGQVVMVF9MRU5HVEg7XG4gICAgfTtcblxuICAgIC8vcm93IG9yIGNvbCBnZXRcbiAgICBhcGlbbmFtZV0gPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzW2luZGV4ICsgbnVtSGVhZGVyc107XG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaiwgcHJvcHMsIGRpcnR5Q2xlYW5zKSB7XG4gICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICB2YXIgdmFsO1xuICAgICAgICB2YXIgbmFtZSA9IHByb3AubmFtZSB8fCBwcm9wO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBuYW1lLCB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgICAgIH0sIHNldDogZnVuY3Rpb24gKF92YWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoX3ZhbCAhPT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpcnR5Q2xlYW5zLmZvckVhY2goZnVuY3Rpb24gKGRpcnR5Q2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5Q2xlYW4uc2V0RGlydHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wLm9uRGlydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3Aub25EaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhbCA9IF92YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59OyIsInZhciBwb3NpdGlvblJhbmdlID0gcmVxdWlyZSgnQGdyaWQvcG9zaXRpb24tcmFuZ2UnKTtcbnZhciBtYWtlRGlydHlDbGVhbiA9IHJlcXVpcmUoJ0BncmlkL2RpcnR5LWNsZWFuJyk7XG52YXIgYWRkRGlydHlQcm9wcyA9IHJlcXVpcmUoJ0BncmlkL2FkZC1kaXJ0eS1wcm9wcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgZGlydHlDbGVhbiA9IG1ha2VEaXJ0eUNsZWFuKGdyaWQpO1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IFtdO1xuXG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgYWRkOiBmdW5jdGlvbiAoZGVzY3JpcHRvcikge1xuICAgICAgICAgICAgZGVzY3JpcHRvcnMucHVzaChkZXNjcmlwdG9yKTtcbiAgICAgICAgICAgIGRpcnR5Q2xlYW4uc2V0RGlydHkoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoZGVzY3JpcHRvcikge1xuICAgICAgICAgICAgZGVzY3JpcHRvcnMuc3BsaWNlKGRlc2NyaXB0b3JzLmluZGV4T2YoZGVzY3JpcHRvciksIDEpO1xuICAgICAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkZXNjcmlwdG9ycy5zbGljZSgwKTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAodG9wLCBsZWZ0LCBjbGFzc05hbWUsIGhlaWdodCwgd2lkdGgsIHNwYWNlKSB7XG4gICAgICAgICAgICB2YXIgdGhpc0RpcnR5Q2xlYW4gPSBtYWtlRGlydHlDbGVhbihncmlkKTtcbiAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yID0ge307XG4gICAgICAgICAgICAvL21peGluc1xuICAgICAgICAgICAgcG9zaXRpb25SYW5nZShkZXNjcmlwdG9yLCB0aGlzRGlydHlDbGVhbiwgZGlydHlDbGVhbik7XG4gICAgICAgICAgICBhZGREaXJ0eVByb3BzKGRlc2NyaXB0b3IsIFsnY2xhc3MnXSwgW3RoaXNEaXJ0eUNsZWFuLCBkaXJ0eUNsZWFuXSk7XG5cbiAgICAgICAgICAgIC8vYWxsIG9mIHRoZXNlIGFyZSBvcHRpb25hbFxuICAgICAgICAgICAgZGVzY3JpcHRvci50b3AgPSB0b3A7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLmxlZnQgPSBsZWZ0O1xuICAgICAgICAgICAgLy9kZWZhdWx0IHRvIHNpbmdsZSBjZWxsIHJhbmdlc1xuICAgICAgICAgICAgZGVzY3JpcHRvci5oZWlnaHQgPSBoZWlnaHQgfHwgMTtcbiAgICAgICAgICAgIGRlc2NyaXB0b3Iud2lkdGggPSB3aWR0aCB8fCAxO1xuICAgICAgICAgICAgZGVzY3JpcHRvci5jbGFzcyA9IGNsYXNzTmFtZTtcbiAgICAgICAgICAgIGRlc2NyaXB0b3Iuc3BhY2UgPSBzcGFjZSB8fCBkZXNjcmlwdG9yLnNwYWNlO1xuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3I7XG4gICAgICAgIH0sXG4gICAgICAgIGlzRGlydHk6IGRpcnR5Q2xlYW4uaXNEaXJ0eVxuICAgIH07XG5cblxuICAgIHJldHVybiBhcGk7XG59OyIsInZhciBjdXN0b21FdmVudCA9IHJlcXVpcmUoJ0BncmlkL2N1c3RvbS1ldmVudCcpO1xuXG52YXIgUFJPUFNfVE9fQ09QWV9GUk9NX01PVVNFX0VWRU5UUyA9IFsnY2xpZW50WCcsICdjbGllbnRZJywgJ2dyaWRYJywgJ2dyaWRZJywgJ2xheWVyWCcsICdsYXllclknLCAncm93JywgJ2NvbCcsICdyZWFsUm93JywgJ3JlYWxDb2wnXTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgbW9kZWwgPSB7fTtcblxuICAgIHZhciB3YXNEcmFnZ2VkID0gZmFsc2U7XG5cbiAgICBtb2RlbC5fYW5ub3RhdGVFdmVudCA9IGZ1bmN0aW9uIGFubm90YXRlRXZlbnQoZSkge1xuICAgICAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnY2xpY2snOlxuICAgICAgICAgICAgICAgIGUud2FzRHJhZ2dlZCA9IHdhc0RyYWdnZWQ7XG4gICAgICAgICAgICAvKiBqc2hpbnQgLVcwODYgKi9cbiAgICAgICAgICAgIGNhc2UgJ21vdXNlZG93bic6XG4gICAgICAgICAgICAvKiBqc2hpbnQgK1cwODYgKi9cbiAgICAgICAgICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICAgICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgICAgICAgICAgICBtb2RlbC5fYW5ub3RhdGVFdmVudEludGVybmFsKGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbW9kZWwuX2Fubm90YXRlRXZlbnRJbnRlcm5hbCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciB5ID0gZ3JpZC52aWV3UG9ydC50b0dyaWRZKGUuY2xpZW50WSk7XG4gICAgICAgIHZhciB4ID0gZ3JpZC52aWV3UG9ydC50b0dyaWRYKGUuY2xpZW50WCk7XG4gICAgICAgIGUucmVhbFJvdyA9IGdyaWQudmlld1BvcnQuZ2V0Um93QnlUb3AoeSk7XG4gICAgICAgIGUucmVhbENvbCA9IGdyaWQudmlld1BvcnQuZ2V0Q29sQnlMZWZ0KHgpO1xuICAgICAgICBlLnZpcnR1YWxSb3cgPSBncmlkLnZpZXdQb3J0LnRvVmlydHVhbFJvdyhlLnJlYWxSb3cpO1xuICAgICAgICBlLnZpcnR1YWxDb2wgPSBncmlkLnZpZXdQb3J0LnRvVmlydHVhbENvbChlLnJlYWxDb2wpO1xuICAgICAgICBlLnJvdyA9IGUudmlydHVhbFJvdyAtIGdyaWQucm93TW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICBlLmNvbCA9IGUudmlydHVhbENvbCAtIGdyaWQuY29sTW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICBlLmdyaWRYID0geDtcbiAgICAgICAgZS5ncmlkWSA9IHk7XG4gICAgfTtcblxuICAgIGdyaWQuZXZlbnRMb29wLmFkZEludGVyY2VwdG9yKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIG1vZGVsLl9hbm5vdGF0ZUV2ZW50KGUpO1xuXG4gICAgICAgIGlmIChlLnR5cGUgPT09ICdtb3VzZWRvd24nKSB7XG4gICAgICAgICAgICBzZXR1cERyYWdFdmVudEZvck1vdXNlRG93bihlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gc2V0dXBEcmFnRXZlbnRGb3JNb3VzZURvd24oZG93bkV2ZW50KSB7XG4gICAgICAgIHdhc0RyYWdnZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGxhc3REcmFnUm93ID0gZG93bkV2ZW50LnJvdztcbiAgICAgICAgdmFyIGxhc3REcmFnQ29sID0gZG93bkV2ZW50LmNvbDtcbiAgICAgICAgdmFyIGRyYWdTdGFydGVkID0gZmFsc2U7XG4gICAgICAgIHZhciB1bmJpbmRNb3ZlID0gZ3JpZC5ldmVudExvb3AuYmluZCgnbW91c2Vtb3ZlJywgd2luZG93LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGRyYWdTdGFydGVkICYmICFlLndoaWNoKSB7XG4gICAgICAgICAgICAgICAgLy9nb3QgYSBtb3ZlIGV2ZW50IHdpdGhvdXQgbW91c2UgZG93biB3aGljaCBtZWFucyB3ZSBzb21laG93IG1pc3NlZCB0aGUgbW91c2V1cFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb3VzZW1vdmUgdW5iaW5kLCBob3cgb24gZWFydGggZG8gdGhlc2UgaGFwcGVuPycpO1xuICAgICAgICAgICAgICAgIGhhbmRsZU1vdXNlVXAoZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRyYWdTdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgd2FzRHJhZ2dlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgY3JlYXRlQW5kRmlyZURyYWdFdmVudCgnZ3JpZC1kcmFnLXN0YXJ0JywgZG93bkV2ZW50KTtcbiAgICAgICAgICAgICAgICBkcmFnU3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNyZWF0ZUFuZEZpcmVEcmFnRXZlbnQoJ2dyaWQtZHJhZycsIGUpO1xuXG4gICAgICAgICAgICBpZiAoZS5yb3cgIT09IGxhc3REcmFnUm93IHx8IGUuY29sICE9PSBsYXN0RHJhZ0NvbCkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZUFuZEZpcmVEcmFnRXZlbnQoJ2dyaWQtY2VsbC1kcmFnJywgZSk7XG5cbiAgICAgICAgICAgICAgICBsYXN0RHJhZ1JvdyA9IGUucm93O1xuICAgICAgICAgICAgICAgIGxhc3REcmFnQ29sID0gZS5jb2w7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHVuYmluZFVwID0gZ3JpZC5ldmVudExvb3AuYmluZCgnbW91c2V1cCcsIHdpbmRvdywgaGFuZGxlTW91c2VVcCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTW91c2VVcChlKSB7XG4gICAgICAgICAgICB1bmJpbmRNb3ZlKCk7XG4gICAgICAgICAgICB1bmJpbmRVcCgpO1xuXG4gICAgICAgICAgICB2YXIgZHJhZ0VuZCA9IGNyZWF0ZURyYWdFdmVudEZyb21Nb3VzZUV2ZW50KCdncmlkLWRyYWctZW5kJywgZSk7XG5cbiAgICAgICAgICAgIC8vcm93LCBjb2wsIHgsIGFuZCB5IHNob3VsZCBpbmhlcml0XG4gICAgICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKGRyYWdFbmQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlRHJhZ0V2ZW50RnJvbU1vdXNlRXZlbnQodHlwZSwgZSkge1xuICAgICAgICB2YXIgZXZlbnQgPSBjdXN0b21FdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgUFJPUFNfVE9fQ09QWV9GUk9NX01PVVNFX0VWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICBldmVudFtwcm9wXSA9IGVbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50ID0gZTtcbiAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUFuZEZpcmVEcmFnRXZlbnQodHlwZSwgZSkge1xuICAgICAgICB2YXIgZHJhZyA9IGNyZWF0ZURyYWdFdmVudEZyb21Nb3VzZUV2ZW50KHR5cGUsIGUpO1xuICAgICAgICBpZiAoZS50YXJnZXQpIHtcbiAgICAgICAgICAgIGUudGFyZ2V0LmRpc3BhdGNoRXZlbnQoZHJhZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKGRyYWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkcmFnO1xuICAgIH1cblxuICAgIHJldHVybiBtb2RlbDtcbn07IiwidmFyIHV0aWwgPSByZXF1aXJlKCdAZ3JpZC91dGlsJyk7XG52YXIgY2FwaXRhbGl6ZSA9IHJlcXVpcmUoJ2NhcGl0YWxpemUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBkaXJ0eUNsZWFuID0gcmVxdWlyZSgnQGdyaWQvZGlydHktY2xlYW4nKShncmlkKTtcblxuXG4gICAgdmFyIHJvdztcbiAgICB2YXIgbW9kZWwgPSB7Y29sOiAwfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwsICdyb3cnLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgaWYgKHIgPCAwIHx8IGlzTmFOKHIpKSB7XG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgPSByO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbW9kZWwucm93ID0gMDtcblxuICAgIG1vZGVsLmlzRGlydHkgPSBkaXJ0eUNsZWFuLmlzRGlydHk7XG5cbiAgICBtb2RlbC5zY3JvbGxUbyA9IGZ1bmN0aW9uIChyLCBjLCBkb250RmlyZSkge1xuICAgICAgICBpZiAoaXNOYU4ocikgfHwgaXNOYU4oYykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF4Um93ID0gKGdyaWQucm93TW9kZWwubGVuZ3RoKCkgfHwgMSkgLSAxO1xuICAgICAgICB2YXIgbWF4Q29sID0gKGdyaWQuY29sTW9kZWwubGVuZ3RoKCkgfHwgMSkgLSAxO1xuICAgICAgICB2YXIgbGFzdFJvdyA9IG1vZGVsLnJvdztcbiAgICAgICAgdmFyIGxhc3RDb2wgPSBtb2RlbC5jb2w7XG4gICAgICAgIG1vZGVsLnJvdyA9IHV0aWwuY2xhbXAociwgMCwgbWF4Um93KTtcbiAgICAgICAgbW9kZWwuY29sID0gdXRpbC5jbGFtcChjLCAwLCBtYXhDb2wpO1xuICAgICAgICBpZiAobGFzdFJvdyAhPT0gbW9kZWwucm93IHx8IGxhc3RDb2wgIT09IG1vZGVsLmNvbCkge1xuICAgICAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICAgICAgaWYgKCFkb250RmlyZSkge1xuICAgICAgICAgICAgICAgIHZhciB0b3AgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC5oZWlnaHQoMCwgbW9kZWwucm93IC0gMSk7XG4gICAgICAgICAgICAgICAgdmFyIGxlZnQgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC53aWR0aCgwLCBtb2RlbC5jb2wgLSAxKTtcbiAgICAgICAgICAgICAgICBncmlkLnBpeGVsU2Nyb2xsTW9kZWwuc2Nyb2xsVG8odG9wLCBsZWZ0LCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb252ZXJ0VmlydHVhbFRvU2Nyb2xsKHZpcnR1YWxDb29yZCwgcm93T3JDb2wpIHtcbiAgICAgICAgcmV0dXJuIHZpcnR1YWxDb29yZCAtIGdyaWRbcm93T3JDb2wgKyAnTW9kZWwnXS5udW1GaXhlZCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNjcm9sbFRvUm93T3JDb2wodmlydHVhbENvb3JkLCByb3dPckNvbCwgaGVpZ2h0V2lkdGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRTY3JvbGwgPSBtb2RlbFtyb3dPckNvbF07XG4gICAgICAgIHZhciBzY3JvbGxUbyA9IGN1cnJlbnRTY3JvbGw7XG4gICAgICAgIGlmIChncmlkLnZpZXdQb3J0W3Jvd09yQ29sICsgJ0lzSW5WaWV3J10odmlydHVhbENvb3JkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNjcm9sbFRvO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRhcmdldFNjcm9sbCA9IGNvbnZlcnRWaXJ0dWFsVG9TY3JvbGwodmlydHVhbENvb3JkLCByb3dPckNvbCk7XG4gICAgICAgIGlmICh0YXJnZXRTY3JvbGwgPCBjdXJyZW50U2Nyb2xsKSB7XG4gICAgICAgICAgICBzY3JvbGxUbyA9IHRhcmdldFNjcm9sbDtcbiAgICAgICAgfSBlbHNlIGlmICh0YXJnZXRTY3JvbGwgPiBjdXJyZW50U2Nyb2xsKSB7XG5cbiAgICAgICAgICAgIHZhciBsZW5ndGhUb0NlbGwgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFtoZWlnaHRXaWR0aF0oMCwgdmlydHVhbENvb3JkKTtcbiAgICAgICAgICAgIHZhciBudW1GaXhlZCA9IGdyaWRbcm93T3JDb2wgKyAnTW9kZWwnXS5udW1GaXhlZCgpO1xuICAgICAgICAgICAgc2Nyb2xsVG8gPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IG51bUZpeGVkOyBpIDwgdmlydHVhbENvb3JkOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZW5ndGhUb0NlbGwgLT0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWxbaGVpZ2h0V2lkdGhdKGkpO1xuICAgICAgICAgICAgICAgIHNjcm9sbFRvID0gaSAtIChudW1GaXhlZCAtIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsZW5ndGhUb0NlbGwgPD0gZ3JpZC52aWV3UG9ydFtoZWlnaHRXaWR0aF0pIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNjcm9sbFRvO1xuICAgIH1cblxuICAgIG1vZGVsLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24gKHZyLCB2Yykge1xuICAgICAgICB2ciA9IGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLmNsYW1wUm93KHZyKTtcbiAgICAgICAgdmMgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC5jbGFtcENvbCh2Yyk7XG4gICAgICAgIHZhciBuZXdSb3cgPSBnZXRTY3JvbGxUb1Jvd09yQ29sKHZyLCAncm93JywgJ2hlaWdodCcpO1xuICAgICAgICB2YXIgbmV3Q29sID0gZ2V0U2Nyb2xsVG9Sb3dPckNvbCh2YywgJ2NvbCcsICd3aWR0aCcpO1xuICAgICAgICBtb2RlbC5zY3JvbGxUbyhuZXdSb3csIG5ld0NvbCk7XG4gICAgfTtcblxuXG4gICAgcmV0dXJuIG1vZGVsO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgYXBpID0gcmVxdWlyZSgnQGdyaWQvYWJzdHJhY3Qtcm93LWNvbC1tb2RlbCcpKGdyaWQsICdjb2wnLCAnd2lkdGgnLCAxMDApO1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwidmFyIGVsZW1lbnRDbGFzcyA9IHJlcXVpcmUoJ2VsZW1lbnQtY2xhc3MnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKF9ncmlkKSB7XG4gICAgdmFyIGdyaWQgPSBfZ3JpZDtcblxuICAgIHZhciBhcGkgPSB7YW5ub3RhdGVEZWNvcmF0b3I6IG1ha2VSZW9yZGVyRGVjb3JhdG9yfTtcblxuICAgIGZ1bmN0aW9uIG1ha2VSZW9yZGVyRGVjb3JhdG9yKGhlYWRlckRlY29yYXRvcikge1xuICAgICAgICB2YXIgY29sID0gaGVhZGVyRGVjb3JhdG9yLmxlZnQ7XG4gICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QgPSBncmlkLmRlY29yYXRvcnMuY3JlYXRlKDAsIHVuZGVmaW5lZCwgSW5maW5pdHksIHVuZGVmaW5lZCwgJ3B4JywgJ3JlYWwnKTtcblxuICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0LnBvc3RSZW5kZXIgPSBmdW5jdGlvbiAoZGl2KSB7XG4gICAgICAgICAgICBkaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLWRyYWctcmVjdCcpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGhlYWRlckRlY29yYXRvci5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUucmVhbENvbCA8IGdyaWQuY29sTW9kZWwubnVtRml4ZWQoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBncmlkLmRlY29yYXRvcnMuYWRkKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QpO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0LndpZHRoID0gZ3JpZC52aWV3UG9ydC5nZXRDb2xXaWR0aChjb2wpO1xuICAgICAgICAgICAgdmFyIGNvbE9mZnNldCA9IGUuZ3JpZFggLSBoZWFkZXJEZWNvcmF0b3IuZ2V0RGVjb3JhdG9yTGVmdCgpO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0Ll90YXJnZXRDb2wgPSBncmlkLmRlY29yYXRvcnMuY3JlYXRlKDAsIHVuZGVmaW5lZCwgSW5maW5pdHksIDEsICdjZWxsJywgJ3JlYWwnKTtcbiAgICAgICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5wb3N0UmVuZGVyID0gZnVuY3Rpb24gKGRpdikge1xuICAgICAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtcmVvcmRlci10YXJnZXQnKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0Ll90YXJnZXRDb2wuX3JlbmRlcmVkRWxlbSA9IGRpdjtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBncmlkLmRlY29yYXRvcnMuYWRkKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbCk7XG5cbiAgICAgICAgICAgIGhlYWRlckRlY29yYXRvci5fdW5iaW5kRHJhZyA9IGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZHJhZycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl9kcmFnUmVjdC5sZWZ0ID0gdXRpbC5jbGFtcChlLmdyaWRYIC0gY29sT2Zmc2V0LCBncmlkLnZpZXdQb3J0LmdldENvbExlZnQoZ3JpZC5jb2xNb2RlbC5udW1GaXhlZCgpKSwgSW5maW5pdHkpO1xuICAgICAgICAgICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5sZWZ0ID0gdXRpbC5jbGFtcChlLnJlYWxDb2wsIGdyaWQuY29sTW9kZWwubnVtRml4ZWQoKSwgSW5maW5pdHkpO1xuICAgICAgICAgICAgICAgIGlmIChlLnJlYWxDb2wgPiBjb2wpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudENsYXNzKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5fcmVuZGVyZWRFbGVtKS5hZGQoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudENsYXNzKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5fcmVuZGVyZWRFbGVtKS5yZW1vdmUoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWdFbmQgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctZW5kJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0Q29sID0gaGVhZGVyRGVjb3JhdG9yLl9kcmFnUmVjdC5fdGFyZ2V0Q29sLmxlZnQ7XG5cbiAgICAgICAgICAgICAgICBncmlkLmNvbE1vZGVsLm1vdmUoZ3JpZC52aWV3UG9ydC50b1ZpcnR1YWxDb2woY29sKSwgZ3JpZC52aWV3UG9ydC50b1ZpcnR1YWxDb2wodGFyZ2V0Q29sKSk7XG4gICAgICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLnJlbW92ZShbaGVhZGVyRGVjb3JhdG9yLl9kcmFnUmVjdC5fdGFyZ2V0Q29sLCBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0XSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl91bmJpbmREcmFnKCk7XG4gICAgICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl91bmJpbmREcmFnRW5kKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBoZWFkZXJEZWNvcmF0b3IucG9zdFJlbmRlciA9IGZ1bmN0aW9uIChkaXYpIHtcbiAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtY29sLXJlb3JkZXInKTtcbiAgICAgICAgICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZHJhZy1zdGFydCcsIGRpdiwgaGVhZGVyRGVjb3JhdG9yLl9vbkRyYWdTdGFydCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGhlYWRlckRlY29yYXRvcjtcbiAgICB9XG5cbiAgICByZXF1aXJlKCdAZ3JpZC9oZWFkZXItZGVjb3JhdG9ycycpKGdyaWQsIGFwaSk7XG5cbiAgICByZXR1cm4gYXBpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cblxuICAgIHZhciBhcGkgPSB7YW5ub3RhdGVEZWNvcmF0b3I6IGFubm90YXRlRGVjb3JhdG9yfTtcblxuICAgIGZ1bmN0aW9uIGFubm90YXRlRGVjb3JhdG9yKGhlYWRlckRlY29yYXRvcikge1xuICAgICAgICB2YXIgY29sID0gaGVhZGVyRGVjb3JhdG9yLmxlZnQ7XG4gICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ0xpbmUgPSBncmlkLmRlY29yYXRvcnMuY3JlYXRlKDAsIHVuZGVmaW5lZCwgSW5maW5pdHksIDEsICdweCcsICdyZWFsJyk7XG5cbiAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl9kcmFnTGluZS5wb3N0UmVuZGVyID0gZnVuY3Rpb24gKGRpdikge1xuICAgICAgICAgICAgZGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnZ3JpZC1kcmFnLWxpbmUnKTtcbiAgICAgICAgfTtcblxuICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChoZWFkZXJEZWNvcmF0b3IuX2RyYWdMaW5lKTtcblxuICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl91bmJpbmREcmFnID0gZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWluWCA9IGhlYWRlckRlY29yYXRvci5nZXREZWNvcmF0b3JMZWZ0KCkgKyAxMDtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdMaW5lLmxlZnQgPSBNYXRoLm1heChlLmdyaWRYLCBtaW5YKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWdFbmQgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctZW5kJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBncmlkLmNvbE1vZGVsLmdldChncmlkLnZpZXdQb3J0LnRvVmlydHVhbENvbChjb2wpKS53aWR0aCA9IGhlYWRlckRlY29yYXRvci5fZHJhZ0xpbmUubGVmdCAtIGhlYWRlckRlY29yYXRvci5nZXREZWNvcmF0b3JMZWZ0KCk7XG4gICAgICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLnJlbW92ZShoZWFkZXJEZWNvcmF0b3IuX2RyYWdMaW5lKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWcoKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWdFbmQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGhlYWRlckRlY29yYXRvci5wb3N0UmVuZGVyID0gZnVuY3Rpb24gKGRpdikge1xuICAgICAgICAgICAgZGl2LnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDUwJSknO1xuICAgICAgICAgICAgZGl2LnN0eWxlLndlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDUwJSknO1xuXG4gICAgICAgICAgICBkaXYuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2xlZnQnKTtcbiAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NvbC1yZXNpemUnKTtcblxuICAgICAgICAgICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnLXN0YXJ0JywgZGl2LCBoZWFkZXJEZWNvcmF0b3IuX29uRHJhZ1N0YXJ0KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXF1aXJlKCdAZ3JpZC9oZWFkZXItZGVjb3JhdG9ycycpKGdyaWQsIGFwaSk7XG5cbiAgICByZXR1cm4gYXBpO1xufTsiLCJ2YXIgZWxlbWVudENsYXNzID0gcmVxdWlyZSgnZWxlbWVudC1jbGFzcycpO1xudmFyIGRpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBncmlkID0ge307XG5cbiAgICAvL3RoZSBvcmRlciBoZXJlIG1hdHRlcnMgYmVjYXVzZSBzb21lIG9mIHRoZXNlIGRlcGVuZCBvbiBlYWNoIG90aGVyXG4gICAgZ3JpZC5ldmVudExvb3AgPSByZXF1aXJlKCdAZ3JpZC9ldmVudC1sb29wJykoZ3JpZCk7XG4gICAgZ3JpZC5kZWNvcmF0b3JzID0gcmVxdWlyZSgnQGdyaWQvZGVjb3JhdG9ycycpKGdyaWQpO1xuICAgIGdyaWQuY2VsbENsYXNzZXMgPSByZXF1aXJlKCdAZ3JpZC9jZWxsLWNsYXNzZXMnKShncmlkKTtcbiAgICBncmlkLnJvd01vZGVsID0gcmVxdWlyZSgnQGdyaWQvcm93LW1vZGVsJykoZ3JpZCk7XG4gICAgZ3JpZC5jb2xNb2RlbCA9IHJlcXVpcmUoJ0BncmlkL2NvbC1tb2RlbCcpKGdyaWQpO1xuICAgIGdyaWQuZGF0YU1vZGVsID0gcmVxdWlyZSgnQGdyaWQvc2ltcGxlLWRhdGEtbW9kZWwnKShncmlkKTtcbiAgICBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbCA9IHJlcXVpcmUoJ0BncmlkL3ZpcnR1YWwtcGl4ZWwtY2VsbC1tb2RlbCcpKGdyaWQpO1xuICAgIGdyaWQuY2VsbFNjcm9sbE1vZGVsID0gcmVxdWlyZSgnQGdyaWQvY2VsbC1zY3JvbGwtbW9kZWwnKShncmlkKTtcbiAgICBncmlkLmNlbGxNb3VzZU1vZGVsID0gcmVxdWlyZSgnQGdyaWQvY2VsbC1tb3VzZS1tb2RlbCcpKGdyaWQpO1xuXG4gICAgZ3JpZC52aWV3UG9ydCA9IHJlcXVpcmUoJ0BncmlkL3ZpZXctcG9ydCcpKGdyaWQpO1xuICAgIGdyaWQudmlld0xheWVyID0gcmVxdWlyZSgnQGdyaWQvdmlldy1sYXllcicpKGdyaWQpO1xuXG4gICAgLy90aGluZ3Mgd2l0aCBsb2dpYyB0aGF0IGFsc28gcmVnaXN0ZXIgZGVjb3JhdG9ycyAoc2xpZ2h0bHkgbGVzcyBjb3JlIHRoYW4gdGhlIG90aGVyIG1vZGVscylcbiAgICBncmlkLm5hdmlnYXRpb25Nb2RlbCA9IHJlcXVpcmUoJ0BncmlkL25hdmlnYXRpb24tbW9kZWwnKShncmlkKTtcbiAgICBncmlkLnBpeGVsU2Nyb2xsTW9kZWwgPSByZXF1aXJlKCdAZ3JpZC9waXhlbC1zY3JvbGwtbW9kZWwnKShncmlkKTtcbiAgICBncmlkLmNvbFJlc2l6ZSA9IHJlcXVpcmUoJ0BncmlkL2NvbC1yZXNpemUnKShncmlkKTtcbiAgICBncmlkLmNvbFJlb3JkZXIgPSByZXF1aXJlKCdAZ3JpZC9jb2wtcmVvcmRlcicpKGdyaWQpO1xuXG4gICAgLy9zb3J0IGZ1bmN0aW9uYWxpdHkgaGFzIG5vIGFwaSwgaXQganVzdCBzZXRzIHVwIGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgLy9mb3Igbm93IGRpc2FibGUgaGVhZGVyIGNsaWNrIHNvcnQgY2F1c2Ugd2UncmUgZ29ubmEgdXNlIHRoZSBjbGljayBmb3Igc2VsZWN0aW9uIGluc3RlYWRcbiAgICAvL3JlcXVpcmUoJ0BncmlkL2NvbC1zb3J0JykoZ3JpZCk7XG5cblxuICAgIHZhciBkcmF3UmVxdWVzdGVkID0gZmFsc2U7XG4gICAgZ3JpZC5yZXF1ZXN0RHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFncmlkLmV2ZW50TG9vcC5pc1J1bm5pbmcpIHtcbiAgICAgICAgICAgIGdyaWQudmlld0xheWVyLmRyYXcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyYXdSZXF1ZXN0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZHJhdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZHJhd1JlcXVlc3RlZCA9IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYWRkRXhpdExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGRyYXdSZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIGdyaWQudmlld0xheWVyLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlRm9jdXNUZXh0QXJlYShjb250YWluZXIpIHtcbiAgICAgICAgdmFyIHRleHRhcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgICAgICAgdGV4dGFyZWEuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICB0ZXh0YXJlYS5zdHlsZS5sZWZ0ID0gJy0xMDAwMDBweCc7XG4gICAgICAgIHRleHRhcmVhLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRDbGFzcyhjb250YWluZXIpLmFkZCgnZm9jdXMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGV4dGFyZWEuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Q2xhc3MoY29udGFpbmVyKS5yZW1vdmUoJ2ZvY3VzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0ZXh0YXJlYSk7XG4gICAgICAgIGlmICghY29udGFpbmVyLmdldEF0dHJpYnV0ZSgndGFiSW5kZXgnKSkge1xuICAgICAgICAgICAgY29udGFpbmVyLnRhYkluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGV4dGFyZWEpIHtcbiAgICAgICAgICAgICAgICB0ZXh0YXJlYS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGV4dGFyZWE7XG4gICAgfVxuXG4gICAgZ3JpZC5idWlsZCA9IGZ1bmN0aW9uIChjb250YWluZXIpIHtcbiAgICAgICAgY3JlYXRlRm9jdXNUZXh0QXJlYShjb250YWluZXIpO1xuICAgICAgICBncmlkLnZpZXdQb3J0LnNpemVUb0NvbnRhaW5lcihjb250YWluZXIpO1xuICAgICAgICBncmlkLnZpZXdMYXllci5idWlsZChjb250YWluZXIpO1xuICAgICAgICBncmlkLmV2ZW50TG9vcC5zZXRDb250YWluZXIoY29udGFpbmVyKTtcbiAgICB9O1xuXG4gICAgZ3JpZC5tYWtlRGlydHlDbGVhbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRpcnR5Q2xlYW4oZ3JpZCk7XG4gICAgfTtcblxuICAgIHJldHVybiBncmlkO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChuYW1lLCBidWJibGVzLCBjYW5jZWxhYmxlLCBkZXRhaWwpIHtcbiAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTsgIC8vIE1VU1QgYmUgJ0N1c3RvbUV2ZW50J1xuICAgIGV2ZW50LmluaXRDdXN0b21FdmVudChuYW1lLCBidWJibGVzLCBjYW5jZWxhYmxlLCBkZXRhaWwpO1xuICAgIHJldHVybiBldmVudDtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4sIGRlbGF5KSB7XG4gICAgdmFyIGYgPSBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgICAgIGlmIChmLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChmLnRpbWVvdXQpO1xuICAgICAgICAgICAgZi50aW1lb3V0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGYudGltZW91dCA9IHNldFRpbWVvdXQoZm4sIGRlbGF5KTtcbiAgICB9O1xuICAgIHJldHVybiBmO1xufTsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcbnZhciBtYWtlRGlydHlDbGVhbiA9IHJlcXVpcmUoJ0BncmlkL2RpcnR5LWNsZWFuJyk7XG52YXIgcG9zaXRpb25SYW5nZSA9IHJlcXVpcmUoJ0BncmlkL3Bvc2l0aW9uLXJhbmdlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKF9ncmlkKSB7XG4gICAgdmFyIGdyaWQgPSBfZ3JpZDtcblxuICAgIHZhciBkaXJ0eUNsZWFuID0gbWFrZURpcnR5Q2xlYW4oZ3JpZCk7XG5cbiAgICB2YXIgYWxpdmVEZWNvcmF0b3JzID0gW107XG4gICAgdmFyIGRlYWREZWNvcmF0b3JzID0gW107XG5cbiAgICB2YXIgZGVjb3JhdG9ycyA9IHtcbiAgICAgICAgYWRkOiBmdW5jdGlvbiAoZGVjb3JhdG9yKSB7XG4gICAgICAgICAgICBhbGl2ZURlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uIChkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICBpZiAoIXV0aWwuaXNBcnJheShkZWNvcmF0b3JzKSkge1xuICAgICAgICAgICAgICAgIGRlY29yYXRvcnMgPSBbZGVjb3JhdG9yc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZnVuY3Rpb24gKGRlY29yYXRvcikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IGFsaXZlRGVjb3JhdG9ycy5pbmRleE9mKGRlY29yYXRvcik7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhbGl2ZURlY29yYXRvcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgZGVhZERlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgICAgICAgICBkaXJ0eUNsZWFuLnNldERpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEFsaXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYWxpdmVEZWNvcmF0b3JzLnNsaWNlKDApO1xuICAgICAgICB9LFxuICAgICAgICBwb3BBbGxEZWFkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2xkRGVhZCA9IGRlYWREZWNvcmF0b3JzO1xuICAgICAgICAgICAgZGVhZERlY29yYXRvcnMgPSBbXTtcbiAgICAgICAgICAgIHJldHVybiBvbGREZWFkO1xuICAgICAgICB9LFxuICAgICAgICBpc0RpcnR5OiBkaXJ0eUNsZWFuLmlzRGlydHksXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKHQsIGwsIGgsIHcsIHUsIHMpIHtcbiAgICAgICAgICAgIHZhciBkZWNvcmF0b3IgPSB7fTtcbiAgICAgICAgICAgIHZhciB0aGlzRGlydHlDbGVhbiA9IG1ha2VEaXJ0eUNsZWFuKGdyaWQpO1xuXG4gICAgICAgICAgICAvL21peGluIHRoZSBwb3NpdGlvbiByYW5nZSBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICBwb3NpdGlvblJhbmdlKGRlY29yYXRvciwgdGhpc0RpcnR5Q2xlYW4sIGRpcnR5Q2xlYW4pO1xuICAgICAgICAgICAgZGVjb3JhdG9yLnRvcCA9IHQ7XG4gICAgICAgICAgICBkZWNvcmF0b3IubGVmdCA9IGw7XG4gICAgICAgICAgICBkZWNvcmF0b3IuaGVpZ2h0ID0gaDtcbiAgICAgICAgICAgIGRlY29yYXRvci53aWR0aCA9IHc7XG4gICAgICAgICAgICBkZWNvcmF0b3IudW5pdHMgPSB1IHx8IGRlY29yYXRvci51bml0cztcbiAgICAgICAgICAgIGRlY29yYXRvci5zcGFjZSA9IHMgfHwgZGVjb3JhdG9yLnNwYWNlO1xuXG4gICAgICAgICAgICAvL3RoZXkgY2FuIG92ZXJyaWRlIGJ1dCB3ZSBzaG91bGQgaGF2ZSBhbiBlbXB0eSBkZWZhdWx0IHRvIHByZXZlbnQgbnBlc1xuICAgICAgICAgICAgZGVjb3JhdG9yLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgZGl2LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgICAgICBkaXYuc3R5bGUudG9wID0gJzBweCc7XG4gICAgICAgICAgICAgICAgZGl2LnN0eWxlLmxlZnQgPSAnMHB4JztcbiAgICAgICAgICAgICAgICBkaXYuc3R5bGUuYm90dG9tID0gJzBweCc7XG4gICAgICAgICAgICAgICAgZGl2LnN0eWxlLnJpZ2h0ID0gJzBweCc7XG4gICAgICAgICAgICAgICAgaWYgKGRlY29yYXRvci5wb3N0UmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5wb3N0UmVuZGVyKGRpdik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkaXY7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBkaXJ0eSA9IHRydWU7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYXcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFwaS5zZXRDbGVhbigpO1xuICAgIH0pO1xuXG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBpc0RpcnR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZGlydHk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzQ2xlYW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhZGlydHk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldERpcnR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAvL3doZW4gdGhpbmdzIGFyZSBpbml0YWxpemluZyBzb21ldGltZXMgdGhpcyBkb2Vzbid0IGV4aXN0IHlldFxuICAgICAgICAgICAgLy93ZSBoYXZlIHRvIGhvcGUgdGhhdCBhdCB0aGUgZW5kIG9mIGluaXRpYWxpemF0aW9uIHRoZSBncmlkIHdpbGwgY2FsbCByZXF1ZXN0IGRyYXcgaXRzZWxmXG4gICAgICAgICAgICBpZiAoZ3JpZC5yZXF1ZXN0RHJhdykge1xuICAgICAgICAgICAgICAgIGdyaWQucmVxdWVzdERyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0Q2xlYW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRpcnR5ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBhcGk7XG59OyIsInZhciBtb3VzZXdoZWVsID0gcmVxdWlyZSgnQGdyaWQvbW91c2V3aGVlbCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCdAZ3JpZC91dGlsJyk7XG52YXIgbGlzdGVuZXJzID0gcmVxdWlyZSgnQGdyaWQvbGlzdGVuZXJzJyk7XG5cbnZhciBFVkVOVFMgPSBbJ2NsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJywgJ21vdXNlbW92ZScsICdkYmxjbGljaycsICdrZXlkb3duJywgJ2tleXByZXNzJywgJ2tleXVwJ107XG5cbnZhciBHUklEX0VWRU5UUyA9IFsnZ3JpZC1kcmFnLXN0YXJ0JywgJ2dyaWQtZHJhZycsICdncmlkLWNlbGwtZHJhZycsICdncmlkLWRyYWctZW5kJ107XG5cbnZhciBldmVudExvb3AgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBlbG9vcCA9IHtcbiAgICAgICAgaXNSdW5uaW5nOiBmYWxzZVxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlcnNCeU5hbWUgPSB7fTtcbiAgICB2YXIgZG9tVW5iaW5kRm5zID0gW107XG5cbiAgICB2YXIgdW5iaW5kQWxsO1xuXG4gICAgZWxvb3Auc2V0Q29udGFpbmVyID0gZnVuY3Rpb24gKGNvbnRhaW5lcikge1xuICAgICAgICB2YXIgdW5iaW5kTW91c2VXaGVlbEZuID0gbW91c2V3aGVlbC5iaW5kKGNvbnRhaW5lciwgbWFpbkxvb3ApO1xuXG4gICAgICAgIEVWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBiaW5kVG9Eb21FbGVtZW50KGNvbnRhaW5lciwgbmFtZSwgbWFpbkxvb3ApO1xuICAgICAgICB9KTtcblxuICAgICAgICBHUklEX0VWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBiaW5kVG9Eb21FbGVtZW50KHdpbmRvdywgbmFtZSwgbWFpbkxvb3ApO1xuICAgICAgICB9KTtcblxuICAgICAgICB1bmJpbmRBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB1bmJpbmRNb3VzZVdoZWVsRm4oKTtcblxuICAgICAgICAgICAgLy9oYXZlIHRvIGNvcHkgdGhlIGFycmF5IHNpbmNlIHRoZSB1bmJpbmQgd2lsbCBhY3R1YWxseSByZW1vdmUgaXRzZWxmIGZyb20gdGhlIGFycmF5IHdoaWNoIG1vZGlmaWVzIGl0IG1pZCBpdGVyYXRpb25cbiAgICAgICAgICAgIGRvbVVuYmluZEZucy5zbGljZSgwKS5mb3JFYWNoKGZ1bmN0aW9uICh1bmJpbmQpIHtcbiAgICAgICAgICAgICAgICB1bmJpbmQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRIYW5kbGVycyhuYW1lKSB7XG4gICAgICAgIHZhciBoYW5kbGVycyA9IGhhbmRsZXJzQnlOYW1lW25hbWVdO1xuICAgICAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICAgICAgICBoYW5kbGVycyA9IGhhbmRsZXJzQnlOYW1lW25hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJpbmRUb0RvbUVsZW1lbnQoZWxlbSwgbmFtZSwgbGlzdGVuZXIpIHtcbiAgICAgICAgZWxlbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgdmFyIHVuYmluZEZuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZWxlbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgIGRvbVVuYmluZEZucy5zcGxpY2UoZG9tVW5iaW5kRm5zLmluZGV4T2YodW5iaW5kRm4pLCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgZG9tVW5iaW5kRm5zLnB1c2godW5iaW5kRm4pO1xuICAgICAgICByZXR1cm4gdW5iaW5kRm47XG4gICAgfVxuXG4gICAgZWxvb3AuYmluZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICB2YXIgbmFtZSA9IGFyZ3MuZmlsdGVyKGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbiAgICAgICAgfSlbMF07XG5cbiAgICAgICAgdmFyIGhhbmRsZXIgPSBhcmdzLmZpbHRlcihmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgICAgfSlbMF07XG5cbiAgICAgICAgaWYgKCFoYW5kbGVyIHx8ICFuYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyAnY2Fubm90IGJpbmQgd2l0aG91dCBhdCBsZWFzdCBuYW1lIGFuZCBmdW5jdGlvbic7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBlbGVtID0gYXJncy5maWx0ZXIoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIHV0aWwuaXNFbGVtZW50KGFyZykgfHwgYXJnID09PSB3aW5kb3cgfHwgYXJnID09PSBkb2N1bWVudDtcbiAgICAgICAgfSlbMF07XG5cbiAgICAgICAgaWYgKCFlbGVtKSB7XG4gICAgICAgICAgICBnZXRIYW5kbGVycyhuYW1lKS5wdXNoKGhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFuZGxlcnMgPSBnZXRIYW5kbGVycyhuYW1lKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKSwgMSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gbG9vcFdpdGgoaGFuZGxlcik7XG4gICAgICAgICAgICAvL21ha2Ugc3VyZSB0aGUgZWxlbSBjYW4gcmVjZWl2ZSBldmVudHNcbiAgICAgICAgICAgIGlmIChlbGVtLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ2FsbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYmluZFRvRG9tRWxlbWVudChlbGVtLCBuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZWxvb3AuZmlyZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBldmVudCA9IHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycgPyB7dHlwZTogZXZlbnR9IDogZXZlbnQ7XG4gICAgICAgIG1haW5Mb29wKGV2ZW50KTtcbiAgICB9O1xuXG4gICAgdmFyIGludGVyY2VwdG9ycyA9IGxpc3RlbmVycygpO1xuICAgIHZhciBleGl0TGlzdGVuZXJzID0gbGlzdGVuZXJzKCk7XG5cbiAgICBlbG9vcC5hZGRJbnRlcmNlcHRvciA9IGludGVyY2VwdG9ycy5hZGRMaXN0ZW5lcjtcbiAgICBlbG9vcC5hZGRFeGl0TGlzdGVuZXIgPSBleGl0TGlzdGVuZXJzLmFkZExpc3RlbmVyO1xuXG4gICAgZnVuY3Rpb24gbG9vcFdpdGgoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsb29wKGUsIGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgbWFpbkxvb3AgPSBsb29wV2l0aChmdW5jdGlvbiAoZSkge1xuICAgICAgICAvL2hhdmUgdG8gY29weSB0aGUgYXJyYXkgYmVjYXVzZSBoYW5kbGVycyBjYW4gdW5iaW5kIHRoZW1zZWx2ZXMgd2hpY2ggbW9kaWZpZXMgdGhlIGFycmF5XG4gICAgICAgIC8vd2UgdXNlIHNvbWUgc28gdGhhdCB3ZSBjYW4gYnJlYWsgb3V0IG9mIHRoZSBsb29wIGlmIG5lZWQgYmVcbiAgICAgICAgZ2V0SGFuZGxlcnMoZS50eXBlKS5zbGljZSgwKS5zb21lKGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICBoYW5kbGVyKGUpO1xuICAgICAgICAgICAgaWYgKGUuZ3JpZFN0b3BCdWJibGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGxvb3AoZSwgYm9keUZuKSB7XG4gICAgICAgIHZhciBpc091dGVyTG9vcFJ1bm5pbmcgPSBlbG9vcC5pc1J1bm5pbmc7XG4gICAgICAgIGVsb29wLmlzUnVubmluZyA9IHRydWU7XG4gICAgICAgIGludGVyY2VwdG9ycy5ub3RpZnkoZSk7XG4gICAgICAgIGlmICghZS5ncmlkU3RvcEJ1YmJsaW5nKSB7XG4gICAgICAgICAgICBib2R5Rm4oZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzT3V0ZXJMb29wUnVubmluZykge1xuICAgICAgICAgICAgZWxvb3AuaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBleGl0TGlzdGVuZXJzLm5vdGlmeShlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsb29wLmJpbmQoJ2dyaWQtZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdW5iaW5kQWxsKCk7XG4gICAgICAgIGVsb29wLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBlbG9vcC5zdG9wQnViYmxpbmcgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLmdyaWRTdG9wQnViYmxpbmcgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGVsb29wO1xufTtcblxuXG5ldmVudExvb3AuRVZFTlRTID0gRVZFTlRTO1xuZXZlbnRMb29wLkdSSURfRVZFTlRTID0gR1JJRF9FVkVOVFM7XG5tb2R1bGUuZXhwb3J0cyA9IGV2ZW50TG9vcDsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCwgbW9kZWwpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIGFwaSA9IG1vZGVsIHx8IHt9O1xuICAgIGFwaS5fZGVjb3JhdG9ycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gbWFrZURlY29yYXRvcihjb2wpIHtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUoMCwgY29sLCAxLCAxLCAnY2VsbCcsICdyZWFsJyk7XG5cblxuICAgICAgICBkZWNvcmF0b3IuZ2V0RGVjb3JhdG9yTGVmdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBmaXJzdFJlY3QgPSBkZWNvcmF0b3IuYm91bmRpbmdCb3ggJiYgZGVjb3JhdG9yLmJvdW5kaW5nQm94LmdldENsaWVudFJlY3RzKCkgJiYgZGVjb3JhdG9yLmJvdW5kaW5nQm94LmdldENsaWVudFJlY3RzKClbMF0gfHwge307XG4gICAgICAgICAgICByZXR1cm4gZ3JpZC52aWV3UG9ydC50b0dyaWRYKGZpcnN0UmVjdC5sZWZ0KSB8fCAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChhcGkuYW5ub3RhdGVEZWNvcmF0b3IpIHtcbiAgICAgICAgICAgIGFwaS5hbm5vdGF0ZURlY29yYXRvcihkZWNvcmF0b3IpO1xuICAgICAgICB9XG5cblxuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVuc3VyZURlY29yYXRvclBlckNvbCgpIHtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBncmlkLnZpZXdQb3J0LmNvbHM7IGMrKykge1xuICAgICAgICAgICAgaWYgKCFhcGkuX2RlY29yYXRvcnNbY10pIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVjb3JhdG9yID0gbWFrZURlY29yYXRvcihjKTtcbiAgICAgICAgICAgICAgICBhcGkuX2RlY29yYXRvcnNbY10gPSBkZWNvcmF0b3I7XG4gICAgICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC12aWV3cG9ydC1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVuc3VyZURlY29yYXRvclBlckNvbCgpO1xuICAgIH0pO1xuICAgIGVuc3VyZURlY29yYXRvclBlckNvbCgpO1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwiLypcbiBBIHNpbXBsZSBwYWNrYWdlIGZvciBjcmVhdGluZyBhIGxpc3Qgb2YgbGlzdGVuZXJzIHRoYXQgY2FuIGJlIGFkZGVkIHRvIGFuZCBub3RpZmllZFxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsaXN0ZW5lcnMgPSBbXTtcbiAgICByZXR1cm4ge1xuICAgICAgICAvL3JldHVybnMgYSByZW1vdmFsIGZ1bmN0aW9uIHRvIHVuYmluZCB0aGUgbGlzdGVuZXJcbiAgICAgICAgYWRkTGlzdGVuZXI6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnB1c2goZm4pO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGxpc3RlbmVycy5pbmRleE9mKGZuKSwgMSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcihlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn07IiwidmFyIEVWRU5UX05BTUVTID0gWydtb3VzZXdoZWVsJywgJ3doZWVsJywgJ0RPTU1vdXNlU2Nyb2xsJ107XG5cbnZhciBhcGkgPSB7XG4gICAgZ2V0RGVsdGE6IGZ1bmN0aW9uIChldmVudCwgeGF4aXMpIHtcbiAgICAgICAgaWYgKGV2ZW50LndoZWVsRGVsdGEpIHsgLy9mb3IgZXZlcnl0aGluZyBidXQgZmlyZWZveFxuICAgICAgICAgICAgdmFyIGRlbHRhID0gZXZlbnQud2hlZWxEZWx0YVk7XG4gICAgICAgICAgICBpZiAoeGF4aXMpIHtcbiAgICAgICAgICAgICAgICBkZWx0YSA9IGV2ZW50LndoZWVsRGVsdGFYO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlbHRhO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQuZGV0YWlsKSB7IC8vZm9yIGZpcmVmb3ggcHJlIHZlcnNpb24gMTdcbiAgICAgICAgICAgIGlmIChldmVudC5heGlzICYmICgoZXZlbnQuYXhpcyA9PT0gMSAmJiB4YXhpcykgfHwgKGV2ZW50LmF4aXMgPT09IDIgJiYgIXhheGlzKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTEgKiBldmVudC5kZXRhaWwgKiAxMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChldmVudC5kZWx0YVggfHwgZXZlbnQuZGVsdGFZKSB7XG4gICAgICAgICAgICBpZiAoeGF4aXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTEgKiBldmVudC5kZWx0YVg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMSAqIGV2ZW50LmRlbHRhWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LFxuXG4gICAgLy9iaW5kcyBhIGNyb3NzIGJyb3dzZXIgbm9ybWFsaXplZCBtb3VzZXdoZWVsIGV2ZW50LCBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCB1bmJpbmQgdGhlIGxpc3RlbmVyO1xuICAgIGJpbmQ6IGZ1bmN0aW9uIChlbGVtLCBsaXN0ZW5lcikge1xuICAgICAgICB2YXIgbm9ybWFsaXplZExpc3RlbmVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyKG5vcm1hbGl6ZVdoZWVsRXZlbnQoZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIEVWRU5UX05BTUVTLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBub3JtYWxpemVkTGlzdGVuZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRVZFTlRfTkFNRVMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBub3JtYWxpemVkTGlzdGVuZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9LFxuICAgIG5vcm1hbGl6ZTogbm9ybWFsaXplV2hlZWxFdmVudFxufTtcblxuZnVuY3Rpb24gbm9ybWFsaXplV2hlZWxFdmVudChlKSB7XG4gICAgdmFyIGRlbHRhWCA9IGFwaS5nZXREZWx0YShlLCB0cnVlKTtcbiAgICB2YXIgZGVsdGFZID0gYXBpLmdldERlbHRhKGUpO1xuICAgIHZhciBuZXdFdmVudCA9IE9iamVjdC5jcmVhdGUoZSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGVsdGFZOiB7dmFsdWU6IGRlbHRhWX0sXG4gICAgICAgICAgICBkZWx0YVg6IHt2YWx1ZTogZGVsdGFYfSxcbiAgICAgICAgICAgIHR5cGU6IHt2YWx1ZTogJ21vdXNld2hlZWwnfVxuICAgICAgICB9KTtcblxuICAgIG5ld0V2ZW50LnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBuZXdFdmVudC5kZWZhdWx0UHJldmVudGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKGUgJiYgZS5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gbmV3RXZlbnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXBpOyIsInZhciBrZXkgPSByZXF1aXJlKCdrZXknKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xudmFyIHJhbmdlVXRpbCA9IHJlcXVpcmUoJ0BncmlkL3JhbmdlLXV0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIG1vZGVsID0ge1xuICAgICAgICBmb2N1czoge1xuICAgICAgICAgICAgcm93OiAwLFxuICAgICAgICAgICAgY29sOiAwXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGZvY3VzQ2xhc3MgPSBncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgwLCAwLCAnZm9jdXMnKTtcbiAgICBncmlkLmNlbGxDbGFzc2VzLmFkZChmb2N1c0NsYXNzKTtcblxuICAgIG1vZGVsLmZvY3VzRGVjb3JhdG9yID0gZ3JpZC5kZWNvcmF0b3JzLmNyZWF0ZSgwLCAwLCAxLCAxKTtcbiAgICBtb2RlbC5mb2N1c0RlY29yYXRvci5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkaXYgPSBkZWZhdWx0UmVuZGVyKCk7XG4gICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtZm9jdXMtZGVjb3JhdG9yJyk7XG4gICAgICAgIHJldHVybiBkaXY7XG4gICAgfTtcbiAgICBncmlkLmRlY29yYXRvcnMuYWRkKG1vZGVsLmZvY3VzRGVjb3JhdG9yKTtcblxuXG4gICAgZnVuY3Rpb24gY2xhbXBSb3dUb01pbk1heChyb3cpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAocm93LCAwLCBncmlkLnJvd01vZGVsLmxlbmd0aCgpIC0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xhbXBDb2xUb01pbk1heChjb2wpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAoY29sLCAwLCBncmlkLmNvbE1vZGVsLmxlbmd0aCgpIC0gMSk7XG4gICAgfVxuXG4gICAgbW9kZWwuc2V0Rm9jdXMgPSBmdW5jdGlvbiBzZXRGb2N1cyhyb3csIGNvbCwgb3B0aW9uYWxFdmVudCkge1xuICAgICAgICByb3cgPSBjbGFtcFJvd1RvTWluTWF4KHJvdyk7XG4gICAgICAgIGNvbCA9IGNsYW1wQ29sVG9NaW5NYXgoY29sKTtcbiAgICAgICAgbW9kZWwuZm9jdXMucm93ID0gcm93O1xuICAgICAgICBtb2RlbC5mb2N1cy5jb2wgPSBjb2w7XG4gICAgICAgIGZvY3VzQ2xhc3MudG9wID0gcm93O1xuICAgICAgICBmb2N1c0NsYXNzLmxlZnQgPSBjb2w7XG4gICAgICAgIG1vZGVsLmZvY3VzRGVjb3JhdG9yLnRvcCA9IHJvdztcbiAgICAgICAgbW9kZWwuZm9jdXNEZWNvcmF0b3IubGVmdCA9IGNvbDtcbiAgICAgICAgZ3JpZC5jZWxsU2Nyb2xsTW9kZWwuc2Nyb2xsSW50b1ZpZXcocm93LCBjb2wpO1xuICAgICAgICAvL2ZvY3VzIGNoYW5nZXMgYWx3YXlzIGNsZWFyIHRoZSBzZWxlY3Rpb25cbiAgICAgICAgY2xlYXJTZWxlY3Rpb24oKTtcbiAgICB9O1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBhcnJvdyA9IGtleS5jb2RlLmFycm93O1xuICAgICAgICBpZiAoIWtleS5pcyhhcnJvdywgZS53aGljaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvL2ZvY3VzIGxvZ2ljXG5cbiAgICAgICAgaWYgKCFlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAvL2lmIG5vdGhpbmcgY2hhbmdlcyBncmVhdCB3ZSdsbCBzdGF5IHdoZXJlIHdlIGFyZVxuICAgICAgICAgICAgdmFyIG5hdlRvUm93ID0gbW9kZWwuZm9jdXMucm93O1xuICAgICAgICAgICAgdmFyIG5hdlRvQ29sID0gbW9kZWwuZm9jdXMuY29sO1xuXG5cbiAgICAgICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xuICAgICAgICAgICAgICAgIGNhc2UgYXJyb3cuZG93bi5jb2RlOlxuICAgICAgICAgICAgICAgICAgICBuYXZUb1JvdysrO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGFycm93LnVwLmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIG5hdlRvUm93LS07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgYXJyb3cucmlnaHQuY29kZTpcbiAgICAgICAgICAgICAgICAgICAgbmF2VG9Db2wrKztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5sZWZ0LmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIG5hdlRvQ29sLS07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW9kZWwuc2V0Rm9jdXMobmF2VG9Sb3csIG5hdlRvQ29sLCBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vc2VsZWN0aW9uIGxvZ2ljXG4gICAgICAgICAgICB2YXIgbmV3U2VsZWN0aW9uO1xuICAgICAgICAgICAgLy9zdGFuZCBpbiBmb3IgaWYgaXQncyBjbGVhcmVkXG4gICAgICAgICAgICBpZiAobW9kZWwuc2VsZWN0aW9uLnRvcCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBuZXdTZWxlY3Rpb24gPSB7dG9wOiBtb2RlbC5mb2N1cy5yb3csIGxlZnQ6IG1vZGVsLmZvY3VzLmNvbCwgaGVpZ2h0OiAxLCB3aWR0aDogMX07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBtb2RlbC5zZWxlY3Rpb24udG9wLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBtb2RlbC5zZWxlY3Rpb24ubGVmdCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBtb2RlbC5zZWxlY3Rpb24uaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogbW9kZWwuc2VsZWN0aW9uLndpZHRoXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5kb3duLmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlbC5mb2N1cy5yb3cgPT09IG5ld1NlbGVjdGlvbi50b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi5oZWlnaHQrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi50b3ArKztcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi5oZWlnaHQtLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGFycm93LnVwLmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlbC5mb2N1cy5yb3cgPT09IG5ld1NlbGVjdGlvbi50b3AgKyBuZXdTZWxlY3Rpb24uaGVpZ2h0IC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLnRvcC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLmhlaWdodCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLmhlaWdodC0tO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5yaWdodC5jb2RlOlxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZWwuZm9jdXMuY29sID09PSBuZXdTZWxlY3Rpb24ubGVmdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLndpZHRoKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3Rpb24ubGVmdCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLndpZHRoLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5sZWZ0LmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlbC5mb2N1cy5jb2wgPT09IG5ld1NlbGVjdGlvbi5sZWZ0ICsgbmV3U2VsZWN0aW9uLndpZHRoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLmxlZnQtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi53aWR0aCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLndpZHRoLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3U2VsZWN0aW9uLmhlaWdodCA9PT0gMSAmJiBuZXdTZWxlY3Rpb24ud2lkdGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBjbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXRTZWxlY3Rpb24obmV3U2VsZWN0aW9uKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBvdXRzaWRlTWluTWF4KHJvdywgY29sKSB7XG4gICAgICAgIHJldHVybiByb3cgPCAwIHx8IHJvdyA+IGdyaWQucm93TW9kZWwubGVuZ3RoKCkgfHwgY29sIDwgMCB8fCBjb2wgPiBncmlkLmNvbE1vZGVsLmxlbmd0aCgpO1xuICAgIH1cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIC8vYXNzdW1lIHRoZSBldmVudCBoYXMgYmVlbiBhbm5vdGF0ZWQgYnkgdGhlIGNlbGwgbW91c2UgbW9kZWwgaW50ZXJjZXB0b3JcbiAgICAgICAgdmFyIHJvdyA9IGUucm93O1xuICAgICAgICB2YXIgY29sID0gZS5jb2w7XG4gICAgICAgIGlmIChyb3cgPCAwICYmIGNvbCA+PSAwKSB7XG4gICAgICAgICAgICBncmlkLmNvbE1vZGVsLnRvZ2dsZVNlbGVjdChjb2wpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2wgPCAwICYmIHJvdyA+PSAwKSB7XG4gICAgICAgICAgICBncmlkLnJvd01vZGVsLnRvZ2dsZVNlbGVjdChyb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJvdyA8IDAgJiYgY29sIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICBtb2RlbC5zZXRGb2N1cyhyb3csIGNvbCwgZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZXRTZWxlY3Rpb25Gcm9tUG9pbnRzKG1vZGVsLmZvY3VzLnJvdywgbW9kZWwuZm9jdXMuY29sLCByb3csIGNvbCk7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgbW9kZWwuX3Jvd1NlbGVjdGlvbkRlY29yYXRvcnMgPSBbXTtcbiAgICBtb2RlbC5fY29sU2VsZWN0aW9uRGVjb3JhdG9ycyA9IFtdO1xuICAgIC8vcm93IGNvbCBzZWxlY3Rpb25cbiAgICBmdW5jdGlvbiBoYW5kbGVSb3dDb2xTZWxlY3Rpb25DaGFuZ2Uocm93T3JDb2wpIHtcbiAgICAgICAgdmFyIGRlY29yYXRvcnNGaWVsZCA9ICgnXycgKyByb3dPckNvbCArICdTZWxlY3Rpb25EZWNvcmF0b3JzJyk7XG4gICAgICAgIG1vZGVsW2RlY29yYXRvcnNGaWVsZF0uZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0aW9uRGVjb3JhdG9yKSB7XG4gICAgICAgICAgICBncmlkLmRlY29yYXRvcnMucmVtb3ZlKHNlbGVjdGlvbkRlY29yYXRvcik7XG4gICAgICAgIH0pO1xuICAgICAgICBtb2RlbFtkZWNvcmF0b3JzRmllbGRdID0gW107XG5cbiAgICAgICAgZ3JpZFtyb3dPckNvbCArICdNb2RlbCddLmdldFNlbGVjdGVkKCkuZm9yRWFjaChmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciB2aXJ0dWFsSW5kZXggPSBncmlkW3Jvd09yQ29sICsgJ01vZGVsJ10udG9WaXJ0dWFsKGluZGV4KTtcbiAgICAgICAgICAgIHZhciB0b3AgPSByb3dPckNvbCA9PT0gJ3JvdycgPyB2aXJ0dWFsSW5kZXggOiAwO1xuICAgICAgICAgICAgdmFyIGxlZnQgPSByb3dPckNvbCA9PT0gJ2NvbCcgPyB2aXJ0dWFsSW5kZXggOiAwO1xuICAgICAgICAgICAgdmFyIGRlY29yYXRvciA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUodG9wLCBsZWZ0LCAxLCAxLCAnY2VsbCcsICd2aXJ0dWFsJyk7XG4gICAgICAgICAgICBkZWNvcmF0b3IucG9zdFJlbmRlciA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtaGVhZGVyLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgbW9kZWxbZGVjb3JhdG9yc0ZpZWxkXS5wdXNoKGRlY29yYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtcm93LXNlbGVjdGlvbi1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZVJvd0NvbFNlbGVjdGlvbkNoYW5nZSgncm93Jyk7XG4gICAgfSk7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWNvbC1zZWxlY3Rpb24tY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVSb3dDb2xTZWxlY3Rpb25DaGFuZ2UoJ2NvbCcpO1xuICAgIH0pO1xuXG4gICAgdmFyIHNlbGVjdGlvbiA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUoKTtcblxuICAgIHZhciBkZWZhdWx0UmVuZGVyID0gc2VsZWN0aW9uLnJlbmRlcjtcbiAgICBzZWxlY3Rpb24ucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGl2ID0gZGVmYXVsdFJlbmRlcigpO1xuICAgICAgICBkaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLXNlbGVjdGlvbicpO1xuICAgICAgICByZXR1cm4gZGl2O1xuICAgIH07XG5cbiAgICBncmlkLmRlY29yYXRvcnMuYWRkKHNlbGVjdGlvbik7XG5cbiAgICBtb2RlbC5zZXRTZWxlY3Rpb24gPSBmdW5jdGlvbiBzZXRTZWxlY3Rpb24obmV3U2VsZWN0aW9uKSB7XG4gICAgICAgIHNlbGVjdGlvbi50b3AgPSBuZXdTZWxlY3Rpb24udG9wO1xuICAgICAgICBzZWxlY3Rpb24ubGVmdCA9IG5ld1NlbGVjdGlvbi5sZWZ0O1xuICAgICAgICBzZWxlY3Rpb24uaGVpZ2h0ID0gbmV3U2VsZWN0aW9uLmhlaWdodDtcbiAgICAgICAgc2VsZWN0aW9uLndpZHRoID0gbmV3U2VsZWN0aW9uLndpZHRoO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjbGVhclNlbGVjdGlvbigpIHtcbiAgICAgICAgbW9kZWwuc2V0U2VsZWN0aW9uKHt0b3A6IC0xLCBsZWZ0OiAtMSwgaGVpZ2h0OiAtMSwgd2lkdGg6IC0xfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U2VsZWN0aW9uRnJvbVBvaW50cyhmcm9tUm93LCBmcm9tQ29sLCB0b1JvdywgdG9Db2wpIHtcbiAgICAgICAgdmFyIG5ld1NlbGVjdGlvbiA9IHJhbmdlVXRpbC5jcmVhdGVGcm9tUG9pbnRzKGZyb21Sb3csIGZyb21Db2wsIGNsYW1wUm93VG9NaW5NYXgodG9Sb3cpLCBjbGFtcENvbFRvTWluTWF4KHRvQ29sKSk7XG4gICAgICAgIG1vZGVsLnNldFNlbGVjdGlvbihuZXdTZWxlY3Rpb24pO1xuICAgIH1cblxuICAgIHNlbGVjdGlvbi5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAob3V0c2lkZU1pbk1heChlLnJvdywgZS5jb2wpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZyb21Sb3cgPSBtb2RlbC5mb2N1cy5yb3c7XG4gICAgICAgIHZhciBmcm9tQ29sID0gbW9kZWwuZm9jdXMuY29sO1xuICAgICAgICB2YXIgdW5iaW5kRHJhZyA9IGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtY2VsbC1kcmFnJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHNldFNlbGVjdGlvbkZyb21Qb2ludHMoZnJvbVJvdywgZnJvbUNvbCwgZS5yb3csIGUuY29sKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHVuYmluZERyYWdFbmQgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdW5iaW5kRHJhZygpO1xuICAgICAgICAgICAgdW5iaW5kRHJhZ0VuZCgpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnLXN0YXJ0Jywgc2VsZWN0aW9uLl9vbkRyYWdTdGFydCk7XG4gICAgY2xlYXJTZWxlY3Rpb24oKTtcblxuICAgIG1vZGVsLnNlbGVjdGlvbiA9IHNlbGVjdGlvbjtcblxuICAgIHJldHVybiBtb2RlbDtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy9hIG5vb3AgZnVuY3Rpb24gdG8gdXNlXG59OyIsInZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnQGdyaWQvZGVib3VuY2UnKTtcbnZhciBjYXBpdGFsaXplID0gcmVxdWlyZSgnY2FwaXRhbGl6ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG4gICAgdmFyIG1vZGVsID0ge3RvcDogMCwgbGVmdDogMH07XG4gICAgdmFyIHNjcm9sbEJhcldpZHRoID0gMTA7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXZpcnR1YWwtcGl4ZWwtY2VsbC1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY3JvbGxIZWlnaHQgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC50b3RhbEhlaWdodCgpIC0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZml4ZWRIZWlnaHQoKTtcbiAgICAgICAgdmFyIHNjcm9sbFdpZHRoID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwudG90YWxXaWR0aCgpIC0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZml4ZWRXaWR0aCgpO1xuICAgICAgICBtb2RlbC5zZXRTY3JvbGxTaXplKHNjcm9sbEhlaWdodCwgc2Nyb2xsV2lkdGgpO1xuICAgICAgICBzaXplU2Nyb2xsQmFycygpO1xuICAgIH0pO1xuXG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXZpZXdwb3J0LWNoYW5nZScsIHNpemVTY3JvbGxCYXJzKTtcbiAgICAvL2Fzc3VtZXMgYSBzdGFuZGFyZGl6ZWQgd2hlZWwgZXZlbnQgdGhhdCB3ZSBjcmVhdGUgdGhyb3VnaCB0aGUgbW91c2V3aGVlbCBwYWNrYWdlXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnbW91c2V3aGVlbCcsIGZ1bmN0aW9uIGhhbmRsZU1vdXNlV2hlZWwoZSkge1xuICAgICAgICB2YXIgZGVsdGFZID0gZS5kZWx0YVk7XG4gICAgICAgIHZhciBkZWx0YVggPSBlLmRlbHRhWDtcbiAgICAgICAgbW9kZWwuc2Nyb2xsVG8obW9kZWwudG9wIC0gZGVsdGFZLCBtb2RlbC5sZWZ0IC0gZGVsdGFYLCB0cnVlKTtcbiAgICAgICAgZGVib3VuY2VkTm90aWZ5KCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9KTtcblxuICAgIG1vZGVsLnNldFNjcm9sbFNpemUgPSBmdW5jdGlvbiAoaCwgdykge1xuICAgICAgICBtb2RlbC5oZWlnaHQgPSBoO1xuICAgICAgICBtb2RlbC53aWR0aCA9IHc7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVycygpIHtcbiAgICAgICAgLy9UT0RPOiBwb3NzaWJseSBrZWVwIHRyYWNrIG9mIGRlbHRhIHNpbmNlIGxhc3QgdXBkYXRlIGFuZCBzZW5kIGl0IGFsb25nLiBmb3Igbm93LCBub1xuICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKCdncmlkLXBpeGVsLXNjcm9sbCcpO1xuXG4gICAgICAgIC8vdXBkYXRlIHRoZSBjZWxsIHNjcm9sbFxuICAgICAgICB2YXIgc2Nyb2xsVG9wID0gbW9kZWwudG9wO1xuICAgICAgICB2YXIgcm93ID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZ2V0Um93KHNjcm9sbFRvcCk7XG5cbiAgICAgICAgdmFyIHNjcm9sbExlZnQgPSBtb2RlbC5sZWZ0O1xuICAgICAgICB2YXIgY29sID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZ2V0Q29sKHNjcm9sbExlZnQpO1xuXG4gICAgICAgIGdyaWQuY2VsbFNjcm9sbE1vZGVsLnNjcm9sbFRvKHJvdywgY29sLCB0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgZGVib3VuY2VkTm90aWZ5ID0gZGVib3VuY2Uobm90aWZ5TGlzdGVuZXJzLCAxKTtcblxuICAgIG1vZGVsLnNjcm9sbFRvID0gZnVuY3Rpb24gKHRvcCwgbGVmdCwgZG9udE5vdGlmeSkge1xuICAgICAgICBtb2RlbC50b3AgPSB1dGlsLmNsYW1wKHRvcCwgMCwgbW9kZWwuaGVpZ2h0IC0gZ2V0U2Nyb2xsYWJsZVZpZXdIZWlnaHQoKSk7XG4gICAgICAgIG1vZGVsLmxlZnQgPSB1dGlsLmNsYW1wKGxlZnQsIDAsIG1vZGVsLndpZHRoIC0gZ2V0U2Nyb2xsYWJsZVZpZXdXaWR0aCgpKTtcblxuICAgICAgICBwb3NpdGlvblNjcm9sbEJhcnMoKTtcblxuICAgICAgICBpZiAoIWRvbnROb3RpZnkpIHtcbiAgICAgICAgICAgIG5vdGlmeUxpc3RlbmVycygpO1xuICAgICAgICB9XG5cblxuICAgIH07XG5cblxuICAgIC8qIFNDUk9MTCBCQVIgTE9HSUMgKi9cbiAgICBmdW5jdGlvbiBnZXRTY3JvbGxQb3NpdGlvbkZyb21SZWFsKHNjcm9sbEJhclJlYWxDbGlja0Nvb3JkLCBoZWlnaHRXaWR0aCwgdmVydEhvcnopIHtcbiAgICAgICAgdmFyIHNjcm9sbEJhclRvcENsaWNrID0gc2Nyb2xsQmFyUmVhbENsaWNrQ29vcmQgLSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFsnZml4ZWQnICsgY2FwaXRhbGl6ZShoZWlnaHRXaWR0aCldKCk7XG4gICAgICAgIHZhciBzY3JvbGxSYXRpbyA9IHNjcm9sbEJhclRvcENsaWNrIC8gZ2V0TWF4U2Nyb2xsQmFyQ29vcmQoaGVpZ2h0V2lkdGgsIHZlcnRIb3J6KTtcbiAgICAgICAgdmFyIHNjcm9sbENvb3JkID0gc2Nyb2xsUmF0aW8gKiBnZXRNYXhTY3JvbGwoaGVpZ2h0V2lkdGgpO1xuICAgICAgICByZXR1cm4gc2Nyb2xsQ29vcmQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZVNjcm9sbEJhckRlY29yYXRvcihpc0hvcnopIHtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUoKTtcbiAgICAgICAgdmFyIHhPclkgPSBpc0hvcnogPyAnWCcgOiAnWSc7XG4gICAgICAgIHZhciBoZWlnaHRXaWR0aCA9IGlzSG9yeiA/ICd3aWR0aCcgOiAnaGVpZ2h0JztcbiAgICAgICAgdmFyIHZlcnRIb3J6ID0gaXNIb3J6ID8gJ2hvcnonIDogJ3ZlcnQnO1xuICAgICAgICB2YXIgZ3JpZENvb3JkRmllbGQgPSAnZ3JpZCcgKyB4T3JZO1xuICAgICAgICB2YXIgbGF5ZXJDb29yZEZpZWxkID0gJ2xheWVyJyArIHhPclk7XG4gICAgICAgIHZhciB2aWV3UG9ydENsYW1wRm4gPSBncmlkLnZpZXdQb3J0WydjbGFtcCcgKyB4T3JZXTtcblxuICAgICAgICBkZWNvcmF0b3IucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNjcm9sbEJhckVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHNjcm9sbEJhckVsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLXNjcm9sbC1iYXInKTtcbiAgICAgICAgICAgIGRlY29yYXRvci5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gc2Nyb2xsQmFyRWxlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBzY3JvbGxCYXJPZmZzZXQgPSBlW2xheWVyQ29vcmRGaWVsZF07XG5cbiAgICAgICAgICAgICAgICBkZWNvcmF0b3IuX3VuYmluZERyYWcgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWcnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ3JpZENvb3JkID0gdmlld1BvcnRDbGFtcEZuKGVbZ3JpZENvb3JkRmllbGRdKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjcm9sbEJhclJlYWxDbGlja0Nvb3JkID0gZ3JpZENvb3JkIC0gc2Nyb2xsQmFyT2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsQ29vcmQgPSBnZXRTY3JvbGxQb3NpdGlvbkZyb21SZWFsKHNjcm9sbEJhclJlYWxDbGlja0Nvb3JkLCBoZWlnaHRXaWR0aCwgdmVydEhvcnopO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNIb3J6KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbC5zY3JvbGxUbyhtb2RlbC50b3AsIHNjcm9sbENvb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsLnNjcm9sbFRvKHNjcm9sbENvb3JkLCBtb2RlbC5sZWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgZGVjb3JhdG9yLl91bmJpbmREcmFnRW5kID0gZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnLWVuZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5fdW5iaW5kRHJhZygpO1xuICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IuX3VuYmluZERyYWdFbmQoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctc3RhcnQnLCBzY3JvbGxCYXJFbGVtLCBkZWNvcmF0b3IuX29uRHJhZ1N0YXJ0KTtcbiAgICAgICAgICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ21vdXNlZG93bicsIHNjcm9sbEJhckVsZW0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgZ3JpZC5ldmVudExvb3Auc3RvcEJ1YmJsaW5nKGUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBzY3JvbGxCYXJFbGVtO1xuICAgICAgICB9O1xuXG4gICAgICAgIGRlY29yYXRvci51bml0cyA9ICdweCc7XG4gICAgICAgIGRlY29yYXRvci5zcGFjZSA9ICdyZWFsJztcblxuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH1cblxuICAgIG1vZGVsLnZlcnRTY3JvbGxCYXIgPSBtYWtlU2Nyb2xsQmFyRGVjb3JhdG9yKCk7XG4gICAgbW9kZWwuaG9yelNjcm9sbEJhciA9IG1ha2VTY3JvbGxCYXJEZWNvcmF0b3IodHJ1ZSk7XG4gICAgbW9kZWwudmVydFNjcm9sbEJhci53aWR0aCA9IHNjcm9sbEJhcldpZHRoO1xuICAgIG1vZGVsLmhvcnpTY3JvbGxCYXIuaGVpZ2h0ID0gc2Nyb2xsQmFyV2lkdGg7XG5cbiAgICBmdW5jdGlvbiBnZXRNYXhTY3JvbGwoaGVpZ2h0V2lkdGgpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsW2hlaWdodFdpZHRoXSAtIGdldFZpZXdTY3JvbGxIZWlnaHRPcldpZHRoKGhlaWdodFdpZHRoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTY3JvbGxSYXRpb0Zyb21WaXJ0dWFsU2Nyb2xsQ29vcmRzKHNjcm9sbCwgaGVpZ2h0V2lkdGgpIHtcbiAgICAgICAgdmFyIG1heFNjcm9sbCA9IGdldE1heFNjcm9sbChoZWlnaHRXaWR0aCk7XG4gICAgICAgIHZhciBzY3JvbGxSYXRpbyA9IHNjcm9sbCAvIG1heFNjcm9sbDtcbiAgICAgICAgcmV0dXJuIHNjcm9sbFJhdGlvO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1heFNjcm9sbEJhckNvb3JkKGhlaWdodFdpZHRoLCB2ZXJ0SG9yeikge1xuICAgICAgICByZXR1cm4gZ2V0Vmlld1Njcm9sbEhlaWdodE9yV2lkdGgoaGVpZ2h0V2lkdGgpIC0gbW9kZWxbdmVydEhvcnogKyAnU2Nyb2xsQmFyJ11baGVpZ2h0V2lkdGhdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlYWxTY3JvbGxCYXJQb3NpdGlvbihzY3JvbGwsIGhlaWdodFdpZHRoLCB2ZXJ0SG9yeikge1xuICAgICAgICB2YXIgc2Nyb2xsUmF0aW8gPSBnZXRTY3JvbGxSYXRpb0Zyb21WaXJ0dWFsU2Nyb2xsQ29vcmRzKHNjcm9sbCwgaGVpZ2h0V2lkdGgpO1xuICAgICAgICB2YXIgbWF4U2Nyb2xsQmFyU2Nyb2xsID0gZ2V0TWF4U2Nyb2xsQmFyQ29vcmQoaGVpZ2h0V2lkdGgsIHZlcnRIb3J6KTtcbiAgICAgICAgLy9pbiBzY3JvbGwgYmFyIGNvb3Jkc1xuICAgICAgICB2YXIgc2Nyb2xsQmFyQ29vcmQgPSBzY3JvbGxSYXRpbyAqIG1heFNjcm9sbEJhclNjcm9sbDtcbiAgICAgICAgLy9hZGQgdGhlIGZpeGVkIGhlaWdodCB0byB0cmFuc2xhdGUgYmFjayBpbnRvIHJlYWwgY29vcmRzXG4gICAgICAgIHJldHVybiBzY3JvbGxCYXJDb29yZCArIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsWydmaXhlZCcgKyBjYXBpdGFsaXplKGhlaWdodFdpZHRoKV0oKTtcbiAgICB9XG5cbiAgICBtb2RlbC5fZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uID0gZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uO1xuICAgIG1vZGVsLl9nZXRTY3JvbGxQb3NpdGlvbkZyb21SZWFsID0gZ2V0U2Nyb2xsUG9zaXRpb25Gcm9tUmVhbDtcblxuICAgIGZ1bmN0aW9uIGNhbGNTY3JvbGxCYXJSZWFsVG9wKCkge1xuICAgICAgICByZXR1cm4gZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uKG1vZGVsLnRvcCwgJ2hlaWdodCcsICd2ZXJ0Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY1Njcm9sbEJhclJlYWxMZWZ0KCkge1xuICAgICAgICByZXR1cm4gZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uKG1vZGVsLmxlZnQsICd3aWR0aCcsICdob3J6Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9zaXRpb25TY3JvbGxCYXJzKCkge1xuICAgICAgICBtb2RlbC52ZXJ0U2Nyb2xsQmFyLnRvcCA9IGNhbGNTY3JvbGxCYXJSZWFsVG9wKCk7XG4gICAgICAgIG1vZGVsLmhvcnpTY3JvbGxCYXIubGVmdCA9IGNhbGNTY3JvbGxCYXJSZWFsTGVmdCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFZpZXdTY3JvbGxIZWlnaHRPcldpZHRoKGhlaWdodFdpZHRoKSB7XG4gICAgICAgIHJldHVybiBncmlkLnZpZXdQb3J0W2hlaWdodFdpZHRoXSAtIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsWydmaXhlZCcgKyBjYXBpdGFsaXplKGhlaWdodFdpZHRoKV0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTY3JvbGxhYmxlVmlld1dpZHRoKCkge1xuICAgICAgICByZXR1cm4gZ2V0Vmlld1Njcm9sbEhlaWdodE9yV2lkdGgoJ3dpZHRoJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2Nyb2xsYWJsZVZpZXdIZWlnaHQoKSB7XG4gICAgICAgIHJldHVybiBnZXRWaWV3U2Nyb2xsSGVpZ2h0T3JXaWR0aCgnaGVpZ2h0Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2l6ZVNjcm9sbEJhcnMoKSB7XG4gICAgICAgIG1vZGVsLnZlcnRTY3JvbGxCYXIubGVmdCA9IGdyaWQudmlld1BvcnQud2lkdGggLSBzY3JvbGxCYXJXaWR0aDtcbiAgICAgICAgbW9kZWwuaG9yelNjcm9sbEJhci50b3AgPSBncmlkLnZpZXdQb3J0LmhlaWdodCAtIHNjcm9sbEJhcldpZHRoO1xuICAgICAgICB2YXIgc2Nyb2xsYWJsZVZpZXdIZWlnaHQgPSBnZXRTY3JvbGxhYmxlVmlld0hlaWdodCgpO1xuICAgICAgICB2YXIgc2Nyb2xsYWJsZVZpZXdXaWR0aCA9IGdldFNjcm9sbGFibGVWaWV3V2lkdGgoKTtcbiAgICAgICAgbW9kZWwudmVydFNjcm9sbEJhci5oZWlnaHQgPSBNYXRoLm1heChzY3JvbGxhYmxlVmlld0hlaWdodCAvIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLnRvdGFsSGVpZ2h0KCkgKiBzY3JvbGxhYmxlVmlld0hlaWdodCwgMjApO1xuICAgICAgICBtb2RlbC5ob3J6U2Nyb2xsQmFyLndpZHRoID0gTWF0aC5tYXgoc2Nyb2xsYWJsZVZpZXdXaWR0aCAvIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLnRvdGFsV2lkdGgoKSAqIHNjcm9sbGFibGVWaWV3V2lkdGgsIDIwKTtcbiAgICAgICAgcG9zaXRpb25TY3JvbGxCYXJzKCk7XG4gICAgfVxuXG4gICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChtb2RlbC52ZXJ0U2Nyb2xsQmFyKTtcbiAgICBncmlkLmRlY29yYXRvcnMuYWRkKG1vZGVsLmhvcnpTY3JvbGxCYXIpO1xuICAgIC8qIEVORCBTQ1JPTEwgQkFSIExPR0lDICovXG5cbiAgICByZXR1cm4gbW9kZWw7XG59OyIsInZhciBhZGREaXJ0eVByb3BzID0gcmVxdWlyZSgnQGdyaWQvYWRkLWRpcnR5LXByb3BzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChyYW5nZSwgZGlydHlDbGVhbiwgcGFyZW50RGlydHlDbGVhbikge1xuICAgIHJhbmdlID0gcmFuZ2UgfHwge307IC8vYWxsb3cgbWl4aW4gZnVuY3Rpb25hbGl0eVxuICAgIHJhbmdlLmlzRGlydHkgPSBkaXJ0eUNsZWFuLmlzRGlydHk7XG5cbiAgICB2YXIgd2F0Y2hlZFByb3BlcnRpZXMgPSBbJ3RvcCcsICdsZWZ0JywgJ2hlaWdodCcsICd3aWR0aCcsICd1bml0cycsICdzcGFjZSddO1xuICAgIHZhciBkaXJ0eUNsZWFucyA9IFtkaXJ0eUNsZWFuXTtcbiAgICBpZiAocGFyZW50RGlydHlDbGVhbikge1xuICAgICAgICBkaXJ0eUNsZWFucy5wdXNoKHBhcmVudERpcnR5Q2xlYW4pO1xuICAgIH1cblxuICAgIGFkZERpcnR5UHJvcHMocmFuZ2UsIHdhdGNoZWRQcm9wZXJ0aWVzLCBkaXJ0eUNsZWFucyk7XG4gICAgLy9kZWZhdWx0c1xuICAgIHJhbmdlLnVuaXRzID0gJ2NlbGwnO1xuICAgIHJhbmdlLnNwYWNlID0gJ2RhdGEnO1xuXG4gICAgcmV0dXJuIHJhbmdlO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL3Rha2VzIGEgcG9pbnQgYW5kIGEgbGVuZ3RoIGFzIHRoZSByYW5nZXMgaW4gYXJyYXkgZm9ybVxuICAgIGludGVyc2VjdDogZnVuY3Rpb24gKHJhbmdlMSwgcmFuZ2UyKSB7XG4gICAgICAgIHZhciByYW5nZTJTdGFydCA9IHJhbmdlMlswXTtcbiAgICAgICAgdmFyIHJhbmdlMVN0YXJ0ID0gcmFuZ2UxWzBdO1xuICAgICAgICB2YXIgcmFuZ2UxRW5kID0gcmFuZ2UxU3RhcnQgKyByYW5nZTFbMV0gLSAxO1xuICAgICAgICB2YXIgcmFuZ2UyRW5kID0gcmFuZ2UyU3RhcnQgKyByYW5nZTJbMV0gLSAxO1xuICAgICAgICBpZiAocmFuZ2UyU3RhcnQgPiByYW5nZTFFbmQgfHwgcmFuZ2UyRW5kIDwgcmFuZ2UxU3RhcnQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHRTdGFydCA9IChyYW5nZTFTdGFydCA+IHJhbmdlMlN0YXJ0ID8gcmFuZ2UxU3RhcnQgOiByYW5nZTJTdGFydCk7XG4gICAgICAgIHZhciByZXN1bHRFbmQgPSAocmFuZ2UxRW5kIDwgcmFuZ2UyRW5kID8gcmFuZ2UxRW5kIDogcmFuZ2UyRW5kKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHJlc3VsdFN0YXJ0LFxuICAgICAgICAgICAgcmVzdWx0RW5kIC0gcmVzdWx0U3RhcnQgKyAxXG4gICAgICAgIF07XG4gICAgfSxcbiAgICAvL3Rha2VzIGEgcG9pbnQgYW5kIGEgbGVuZ3RoIGFzIHRoZSByYW5nZXMgaW4gYXJyYXkgZm9ybVxuICAgIHVuaW9uOiBmdW5jdGlvbiAocmFuZ2UxLCByYW5nZTIpIHtcbiAgICAgICAgaWYgKCFyYW5nZTEpIHtcbiAgICAgICAgICAgIHJldHVybiByYW5nZTI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyYW5nZTIpIHtcbiAgICAgICAgICAgIHJldHVybiByYW5nZTE7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJhbmdlMlN0YXJ0ID0gcmFuZ2UyWzBdO1xuICAgICAgICB2YXIgcmFuZ2UyRW5kID0gcmFuZ2UyU3RhcnQgKyByYW5nZTJbMV0gLSAxO1xuICAgICAgICB2YXIgcmFuZ2UxU3RhcnQgPSByYW5nZTFbMF07XG4gICAgICAgIHZhciByYW5nZTFFbmQgPSByYW5nZTFTdGFydCArIHJhbmdlMVsxXSAtIDE7XG4gICAgICAgIHZhciByZXN1bHRTdGFydCA9IChyYW5nZTFTdGFydCA8IHJhbmdlMlN0YXJ0ID8gcmFuZ2UxU3RhcnQgOiByYW5nZTJTdGFydCk7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICByZXN1bHRTdGFydCxcbiAgICAgICAgICAgIChyYW5nZTFFbmQgPiByYW5nZTJFbmQgPyByYW5nZTFFbmQgOiByYW5nZTJFbmQpIC0gcmVzdWx0U3RhcnQgKyAxXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8vdGFrZXMgdHdvIHJvdywgY29sIHBvaW50cyBhbmQgY3JlYXRlcyBhIG5vcm1hbCBwb3NpdGlvbiByYW5nZVxuICAgIGNyZWF0ZUZyb21Qb2ludHM6IGZ1bmN0aW9uIChyMSwgYzEsIHIyLCBjMikge1xuICAgICAgICB2YXIgcmFuZ2UgPSB7fTtcbiAgICAgICAgaWYgKHIxIDwgcjIpIHtcbiAgICAgICAgICAgIHJhbmdlLnRvcCA9IHIxO1xuICAgICAgICAgICAgcmFuZ2UuaGVpZ2h0ID0gcjIgLSByMSArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByYW5nZS50b3AgPSByMjtcbiAgICAgICAgICAgIHJhbmdlLmhlaWdodCA9IHIxIC0gcjIgKyAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMxIDwgYzIpIHtcbiAgICAgICAgICAgIHJhbmdlLmxlZnQgPSBjMTtcbiAgICAgICAgICAgIHJhbmdlLndpZHRoID0gYzIgLSBjMSArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByYW5nZS5sZWZ0ID0gYzI7XG4gICAgICAgICAgICByYW5nZS53aWR0aCA9IGMxIC0gYzIgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByYW5nZTtcbiAgICB9XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgYXBpID0gcmVxdWlyZSgnQGdyaWQvYWJzdHJhY3Qtcm93LWNvbC1tb2RlbCcpKGdyaWQsICdyb3cnLCAnaGVpZ2h0JywgMzApO1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIGNlbGxEYXRhID0gW107XG4gICAgdmFyIGhlYWRlckRhdGEgPSBbXTtcbiAgICB2YXIgc29ydGVkQ29sO1xuICAgIHZhciBhc2NlbmRpbmc7XG4gICAgdmFyIGRpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpKGdyaWQpO1xuICAgIHZhciBpbnRlcm5hbFNldCA9IGZ1bmN0aW9uIChkYXRhLCByLCBjLCBkYXR1bSkge1xuICAgICAgICBpZiAoIWRhdGFbcl0pIHtcbiAgICAgICAgICAgIGRhdGFbcl0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhW3JdW2NdID0gZGF0dW07XG4gICAgICAgIGRpcnR5Q2xlYW4uc2V0RGlydHkoKTtcbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgaXNEaXJ0eTogZGlydHlDbGVhbi5pc0RpcnR5LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIChyLCBjLCBkYXR1bSkge1xuICAgICAgICAgICAgaW50ZXJuYWxTZXQoY2VsbERhdGEsIHIsIGMsIGRhdHVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0SGVhZGVyOiBmdW5jdGlvbiAociwgYywgZGF0dW0pIHtcbiAgICAgICAgICAgIGludGVybmFsU2V0KGhlYWRlckRhdGEsIHIsIGMsIGRhdHVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAociwgYykge1xuICAgICAgICAgICAgdmFyIGRhdGFSb3cgPSBjZWxsRGF0YVtncmlkLnJvd01vZGVsLnJvdyhyKS5kYXRhUm93XTtcbiAgICAgICAgICAgIHZhciBkYXR1bSA9IGRhdGFSb3cgJiYgZGF0YVJvd1tncmlkLmNvbE1vZGVsLmNvbChjKS5kYXRhQ29sXTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGRhdHVtICYmIGRhdHVtLnZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkOiB2YWx1ZSAmJiAncicgKyB2YWx1ZVswXSArICcgYycgKyB2YWx1ZVsxXSB8fCAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SGVhZGVyOiBmdW5jdGlvbiAociwgYykge1xuICAgICAgICAgICAgdmFyIGRhdGFSb3cgPSBoZWFkZXJEYXRhW2dyaWQucm93TW9kZWwuZ2V0KHIpLmRhdGFSb3ddO1xuXG4gICAgICAgICAgICB2YXIgZGF0dW0gPSBkYXRhUm93ICYmIGRhdGFSb3dbZ3JpZC5jb2xNb2RlbC5nZXQoYykuZGF0YUNvbF07XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBkYXR1bSAmJiBkYXR1bS52YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGZvcm1hdHRlZDogdmFsdWUgJiYgJ2hyJyArIHZhbHVlWzBdICsgJyBoYycgKyB2YWx1ZVsxXSB8fCAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b2dnbGVTb3J0OiBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgdmFyIHJldFZhbCA9IC0xO1xuICAgICAgICAgICAgdmFyIGNvbXBhcmVNZXRob2QgPSBmdW5jdGlvbiAodmFsMSwgdmFsMikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWwxIDwgKHZhbDIpID8gcmV0VmFsIDogLTEgKiByZXRWYWw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGMgPT09IHNvcnRlZENvbCkge1xuICAgICAgICAgICAgICAgIGlmIChhc2NlbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0VmFsID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXNjZW5kaW5nID0gIWFzY2VuZGluZztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc29ydGVkQ29sID0gYztcbiAgICAgICAgICAgICAgICBhc2NlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2VsbERhdGEuc29ydChmdW5jdGlvbiAoZGF0YVJvdzEsIGRhdGFSb3cyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhUm93MSB8fCAhZGF0YVJvdzFbY10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhUm93MiB8fCAhZGF0YVJvdzJbY10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldFZhbCAqIC0xO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcGFyZU1ldGhvZChkYXRhUm93MVtjXS52YWx1ZSwgZGF0YVJvdzJbY10udmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkaXJ0eUNsZWFuLnNldERpcnR5KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2xhbXA6IGZ1bmN0aW9uIChudW0sIG1pbiwgbWF4LCByZXR1cm5OYU4pIHtcbiAgICAgICAgaWYgKG51bSA+IG1heCkge1xuICAgICAgICAgICAgcmV0dXJuIHJldHVybk5hTiA/IE5hTiA6IG1heDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVtIDwgbWluKSB7XG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuTmFOID8gTmFOIDogbWluO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW07XG5cbiAgICB9LFxuICAgIGlzTnVtYmVyOiBmdW5jdGlvbiAobnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgbnVtYmVyID09PSAnbnVtYmVyJyAmJiAhaXNOYU4obnVtYmVyKTtcbiAgICB9LFxuICAgIGlzRWxlbWVudDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuICEhKG5vZGUgJiZcbiAgICAgICAgKG5vZGUubm9kZU5hbWUgfHwgLy8gd2UgYXJlIGEgZGlyZWN0IGVsZW1lbnRcbiAgICAgICAgKG5vZGUucHJvcCAmJiBub2RlLmF0dHIgJiYgbm9kZS5maW5kKSkpOyAgLy8gd2UgaGF2ZSBhbiBvbiBhbmQgZmluZCBtZXRob2QgcGFydCBvZiBqUXVlcnkgQVBJXG4gICAgfSxcbiAgICBpc0FycmF5OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfSxcbiAgICBwb3NpdGlvbjogZnVuY3Rpb24gKGVsZW0sIHQsIGwsIGIsIHIpIHtcbiAgICAgICAgZWxlbS5zdHlsZS50b3AgPSB0ICsgJ3B4JztcbiAgICAgICAgZWxlbS5zdHlsZS5sZWZ0ID0gbCArICdweCc7XG4gICAgICAgIGVsZW0uc3R5bGUuYm90dG9tID0gYiArICdweCc7XG4gICAgICAgIGVsZW0uc3R5bGUucmlnaHQgPSByICsgJ3B4JztcbiAgICAgICAgZWxlbS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIFxuICAgIH1cbn07IiwidmFyIGN1c3RvbUV2ZW50ID0gcmVxdWlyZSgnQGdyaWQvY3VzdG9tLWV2ZW50Jyk7XG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCdAZ3JpZC9kZWJvdW5jZScpO1xudmFyIHV0aWwgPSByZXF1aXJlKCdAZ3JpZC91dGlsJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgdmlld0xheWVyID0ge307XG5cblxuICAgIHZhciBncmlkID0gX2dyaWQ7XG4gICAgdmFyIGNvbnRhaW5lcjtcbiAgICB2YXIgcm9vdDtcbiAgICB2YXIgY2VsbENvbnRhaW5lcjtcbiAgICB2YXIgZGVjb3JhdG9yQ29udGFpbmVyO1xuICAgIHZhciBib3JkZXJXaWR0aDtcblxuICAgIHZhciBHUklEX0NFTExfQ09OVEFJTkVSX0JBU0VfQ0xBU1MgPSAnZ3JpZC1jZWxscyc7XG4gICAgdmFyIEdSSURfVklFV19ST09UX0NMQVNTID0gJ2pzLWdyaWQtdmlldy1yb290JztcbiAgICB2YXIgQ0VMTF9DTEFTUyA9ICdncmlkLWNlbGwnO1xuXG4gICAgdmFyIGNlbGxzOyAvL21hdHJpeCBvZiByZW5kZXJlZCBjZWxsIGVsZW1lbnRzO1xuICAgIHZhciByb3dzOyAvL2FycmF5IG9mIGFsbCByZW5kZXJlZCByb3dzXG4gICAgdmFyIGJ1aWx0Q29sczsgLy9tYXAgZnJvbSBjb2wgaW5kZXggdG8gYW4gYXJyYXkgb2YgYnVpbHQgZWxlbWVudHMgZm9yIHRoZSBjb2x1bW4gdG8gdXBkYXRlIG9uIHNjcm9sbFxuICAgIHZhciBidWlsdFJvd3M7IC8vbWFwIGZyb20gcm93IGluZGV4IHRvIGFuIGFycmF5IG9mIGJ1aWx0IGVsZW1lbnRzIGZvciB0aGUgcm93IHRvIHVwZGF0ZSBvbiBzY3JvbGxcblxuICAgIC8vYWRkIHRoZSBjZWxsIGNsYXNzZXMgdGhyb3VnaCB0aGUgc3RhbmRhcmQgbWV0aG9kXG4gICAgZ3JpZC5jZWxsQ2xhc3Nlcy5hZGQoZ3JpZC5jZWxsQ2xhc3Nlcy5jcmVhdGUoMCwgMCwgQ0VMTF9DTEFTUywgSW5maW5pdHksIEluZmluaXR5LCAndmlydHVhbCcpKTtcblxuICAgIHZhciByb3dIZWFkZXJDbGFzc2VzID0gZ3JpZC5jZWxsQ2xhc3Nlcy5jcmVhdGUoMCwgMCwgJ2dyaWQtaGVhZGVyIGdyaWQtcm93LWhlYWRlcicsIEluZmluaXR5LCAwLCAndmlydHVhbCcpO1xuICAgIHZhciBjb2xIZWFkZXJDbGFzc2VzID0gZ3JpZC5jZWxsQ2xhc3Nlcy5jcmVhdGUoMCwgMCwgJ2dyaWQtaGVhZGVyIGdyaWQtY29sLWhlYWRlcicsIDAsIEluZmluaXR5LCAndmlydHVhbCcpO1xuICAgIHZhciBmaXhlZENvbENsYXNzZXMgPSBncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgwLCAtMSwgJ2dyaWQtbGFzdC1maXhlZC1jb2wnLCBJbmZpbml0eSwgMSwgJ3ZpcnR1YWwnKTtcbiAgICB2YXIgZml4ZWRSb3dDbGFzc2VzID0gZ3JpZC5jZWxsQ2xhc3Nlcy5jcmVhdGUoLTEsIDAsICdncmlkLWxhc3QtZml4ZWQtcm93JywgMSwgSW5maW5pdHksICd2aXJ0dWFsJyk7XG5cbiAgICBncmlkLmNlbGxDbGFzc2VzLmFkZChyb3dIZWFkZXJDbGFzc2VzKTtcbiAgICBncmlkLmNlbGxDbGFzc2VzLmFkZChjb2xIZWFkZXJDbGFzc2VzKTtcbiAgICBncmlkLmNlbGxDbGFzc2VzLmFkZChmaXhlZFJvd0NsYXNzZXMpO1xuICAgIGdyaWQuY2VsbENsYXNzZXMuYWRkKGZpeGVkQ29sQ2xhc3Nlcyk7XG5cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtY29sLWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZml4ZWRDb2xDbGFzc2VzLmxlZnQgPSBncmlkLmNvbE1vZGVsLm51bUZpeGVkKCkgLSAxO1xuICAgICAgICByb3dIZWFkZXJDbGFzc2VzLndpZHRoID0gZ3JpZC5jb2xNb2RlbC5udW1IZWFkZXJzKCk7XG4gICAgfSk7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXJvdy1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZpeGVkUm93Q2xhc3Nlcy50b3AgPSBncmlkLnJvd01vZGVsLm51bUZpeGVkKCkgLSAxO1xuICAgICAgICBjb2xIZWFkZXJDbGFzc2VzLmhlaWdodCA9IGdyaWQucm93TW9kZWwubnVtSGVhZGVycygpO1xuICAgIH0pO1xuXG5cbiAgICB2aWV3TGF5ZXIuYnVpbGQgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBjbGVhbnVwKCk7XG5cbiAgICAgICAgY29udGFpbmVyID0gZWxlbTtcblxuICAgICAgICBjZWxsQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNlbGxDb250YWluZXIuc2V0QXR0cmlidXRlKCdkdHMnLCAnZ3JpZC1jZWxscycpO1xuICAgICAgICBjZWxsQ29udGFpbmVyLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBHUklEX0NFTExfQ09OVEFJTkVSX0JBU0VfQ0xBU1MpO1xuICAgICAgICB1dGlsLnBvc2l0aW9uKGNlbGxDb250YWluZXIsIDAsIDAsIDAsIDApO1xuICAgICAgICBjZWxsQ29udGFpbmVyLnN0eWxlLnpJbmRleCA9IDA7XG5cbiAgICAgICAgZGVjb3JhdG9yQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRlY29yYXRvckNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2R0cycsICdncmlkLWRlY29yYXRvcnMnKTtcbiAgICAgICAgdXRpbC5wb3NpdGlvbihkZWNvcmF0b3JDb250YWluZXIsIDAsIDAsIDAsIDApO1xuICAgICAgICBkZWNvcmF0b3JDb250YWluZXIuc3R5bGUuekluZGV4ID0gMDtcbiAgICAgICAgZGVjb3JhdG9yQ29udGFpbmVyLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG5cbiAgICAgICAgcm9vdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICByb290LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBHUklEX1ZJRVdfUk9PVF9DTEFTUyk7XG5cbiAgICAgICAgcm9vdC5hcHBlbmRDaGlsZChjZWxsQ29udGFpbmVyKTtcbiAgICAgICAgcm9vdC5hcHBlbmRDaGlsZChkZWNvcmF0b3JDb250YWluZXIpO1xuXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChyb290KTtcblxuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIG1lYXN1cmVCb3JkZXJXaWR0aCgpIHtcbiAgICAgICAgLy9yZWFkIHRoZSBib3JkZXIgd2lkdGgsIGZvciB0aGUgcmFyZSBjYXNlIG9mIGxhcmdlciB0aGFuIDFweCBib3JkZXJzLCBvdGhlcndpc2UgdGhlIGRyYXcgd2lsbCBkZWZhdWx0IHRvIDFcbiAgICAgICAgaWYgKGJvcmRlcldpZHRoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGpzR3JpZENlbGwgPSBjZWxsc1swXSAmJiBjZWxsc1swXVswXTtcbiAgICAgICAgaWYgKGpzR3JpZENlbGwpIHtcbiAgICAgICAgICAgIHZhciBvbGRDbGFzcyA9IGpzR3JpZENlbGwuY2xhc3NOYW1lO1xuICAgICAgICAgICAganNHcmlkQ2VsbC5jbGFzc05hbWUgPSBDRUxMX0NMQVNTO1xuICAgICAgICAgICAgdmFyIGNvbXB1dGVkU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGpzR3JpZENlbGwpO1xuICAgICAgICAgICAgdmFyIGJvcmRlcldpZHRoUHJvcCA9IGNvbXB1dGVkU3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm9yZGVyLWxlZnQtd2lkdGgnKTtcbiAgICAgICAgICAgIGJvcmRlcldpZHRoID0gcGFyc2VJbnQoYm9yZGVyV2lkdGhQcm9wKTtcbiAgICAgICAgICAgIGpzR3JpZENlbGwuY2xhc3NOYW1lID0gb2xkQ2xhc3M7XG4gICAgICAgIH1cbiAgICAgICAgYm9yZGVyV2lkdGggPSBpc05hTihib3JkZXJXaWR0aCkgfHwgIWJvcmRlcldpZHRoID8gdW5kZWZpbmVkIDogYm9yZGVyV2lkdGg7XG4gICAgICAgIHJldHVybiBib3JkZXJXaWR0aDtcbiAgICB9XG5cbiAgICAvL29ubHkgZHJhdyBvbmNlIHBlciBqcyB0dXJuLCBtYXkgbmVlZCB0byBjcmVhdGUgYSBzeW5jaHJvbm91cyB2ZXJzaW9uXG4gICAgdmlld0xheWVyLmRyYXcgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZpZXdMYXllci5fZHJhdygpO1xuICAgIH0sIDEpO1xuXG4gICAgdmlld0xheWVyLl9kcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvL3JldHVybiBpZiB3ZSBoYXZlbid0IGJ1aWx0IHlldFxuICAgICAgICBpZiAoIWNvbnRhaW5lcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlYnVpbHQgPSBncmlkLnZpZXdQb3J0LmlzRGlydHkoKTtcbiAgICAgICAgaWYgKHJlYnVpbHQpIHtcbiAgICAgICAgICAgIHZpZXdMYXllci5fYnVpbGRDZWxscyhjZWxsQ29udGFpbmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBidWlsdENvbHNEaXJ0eSA9IGdyaWQuY29sTW9kZWwuYXJlQnVpbGRlcnNEaXJ0eSgpO1xuICAgICAgICBpZiAocmVidWlsdCB8fCBidWlsdENvbHNEaXJ0eSkge1xuICAgICAgICAgICAgdmlld0xheWVyLl9idWlsZENvbHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBidWlsdFJvd3NEaXJ0eSA9IGdyaWQucm93TW9kZWwuYXJlQnVpbGRlcnNEaXJ0eSgpO1xuICAgICAgICBpZiAocmVidWlsdCB8fCBidWlsdFJvd3NEaXJ0eSkge1xuICAgICAgICAgICAgdmlld0xheWVyLl9idWlsZFJvd3MoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjZWxsc1Bvc2l0aW9uT3JTaXplQ2hhbmdlZCA9IGdyaWQuY29sTW9kZWwuaXNEaXJ0eSgpIHx8IGdyaWQucm93TW9kZWwuaXNEaXJ0eSgpIHx8IGdyaWQuY2VsbFNjcm9sbE1vZGVsLmlzRGlydHkoKTtcblxuICAgICAgICBpZiAoZ3JpZC5jZWxsQ2xhc3Nlcy5pc0RpcnR5KCkgfHwgcmVidWlsdCB8fCBjZWxsc1Bvc2l0aW9uT3JTaXplQ2hhbmdlZCkge1xuICAgICAgICAgICAgdmlld0xheWVyLl9kcmF3Q2VsbENsYXNzZXMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZWJ1aWx0IHx8IGNlbGxzUG9zaXRpb25PclNpemVDaGFuZ2VkIHx8IGJ1aWx0Q29sc0RpcnR5IHx8IGJ1aWx0Um93c0RpcnR5IHx8IGdyaWQuZGF0YU1vZGVsLmlzRGlydHkoKSkge1xuICAgICAgICAgICAgdmlld0xheWVyLl9kcmF3Q2VsbHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChncmlkLmRlY29yYXRvcnMuaXNEaXJ0eSgpIHx8IHJlYnVpbHQgfHwgY2VsbHNQb3NpdGlvbk9yU2l6ZUNoYW5nZWQpIHtcbiAgICAgICAgICAgIHZpZXdMYXllci5fZHJhd0RlY29yYXRvcnMoY2VsbHNQb3NpdGlvbk9yU2l6ZUNoYW5nZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZ3JpZC5ldmVudExvb3AuZmlyZSgnZ3JpZC1kcmF3Jyk7XG4gICAgfTtcblxuICAgIC8qIENFTEwgTE9HSUMgKi9cbiAgICBmdW5jdGlvbiBnZXRCb3JkZXJXaWR0aCgpIHtcbiAgICAgICAgcmV0dXJuIGJvcmRlcldpZHRoIHx8IDE7XG4gICAgfVxuXG4gICAgdmlld0xheWVyLl9kcmF3Q2VsbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lYXN1cmVCb3JkZXJXaWR0aCgpO1xuICAgICAgICB2YXIgYldpZHRoID0gZ2V0Qm9yZGVyV2lkdGgoKTtcbiAgICAgICAgdmFyIGhlYWRlclJvd3MgPSBncmlkLnJvd01vZGVsLm51bUhlYWRlcnMoKTtcbiAgICAgICAgdmFyIGhlYWRlckNvbHMgPSBncmlkLmNvbE1vZGVsLm51bUhlYWRlcnMoKTtcbiAgICAgICAgZ3JpZC52aWV3UG9ydC5pdGVyYXRlQ2VsbHMoZnVuY3Rpb24gZHJhd0NlbGwociwgYykge1xuICAgICAgICAgICAgdmFyIGNlbGwgPSBjZWxsc1tyXVtjXTtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IGdyaWQudmlld1BvcnQuZ2V0Q29sV2lkdGgoYyk7XG4gICAgICAgICAgICBjZWxsLnN0eWxlLndpZHRoID0gd2lkdGggKyBiV2lkdGggKyAncHgnO1xuXG4gICAgICAgICAgICB2YXIgbGVmdCA9IGdyaWQudmlld1BvcnQuZ2V0Q29sTGVmdChjKTtcbiAgICAgICAgICAgIGNlbGwuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuXG4gICAgICAgICAgICB3aGlsZSAoY2VsbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgY2VsbC5yZW1vdmVDaGlsZChjZWxsLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZpcnR1YWxSb3cgPSBncmlkLnZpZXdQb3J0LnRvVmlydHVhbFJvdyhyKTtcbiAgICAgICAgICAgIHZhciB2aXJ0dWFsQ29sID0gZ3JpZC52aWV3UG9ydC50b1ZpcnR1YWxDb2woYyk7XG4gICAgICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgICAgIGlmIChyIDwgaGVhZGVyUm93cyB8fCBjIDwgaGVhZGVyQ29scykge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBncmlkLmRhdGFNb2RlbC5nZXRIZWFkZXIodmlydHVhbFJvdywgdmlydHVhbENvbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBncmlkLmRhdGFNb2RlbC5nZXQoZ3JpZC5yb3dNb2RlbC50b0RhdGEodmlydHVhbFJvdyksIGdyaWQuY29sTW9kZWwudG9EYXRhKHZpcnR1YWxDb2wpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vYXJ0aWZpY2lhbGx5IG9ubHkgZ2V0IGJ1aWxkZXJzIGZvciByb3cgaGVhZGVycyBmb3Igbm93XG4gICAgICAgICAgICB2YXIgYnVpbGRlciA9IHZpcnR1YWxSb3cgPCBoZWFkZXJSb3dzICYmIGdyaWQucm93TW9kZWwuZ2V0KHZpcnR1YWxSb3cpLmJ1aWxkZXIgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgdmFyIGhhc1Jvd0J1aWxkZXIgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCFidWlsZGVyKSB7XG4gICAgICAgICAgICAgICAgaGFzUm93QnVpbGRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIgPSBncmlkLmNvbE1vZGVsLmdldCh2aXJ0dWFsQ29sKS5idWlsZGVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgY2VsbENoaWxkO1xuICAgICAgICAgICAgaWYgKGJ1aWxkZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYnVpbHRFbGVtO1xuICAgICAgICAgICAgICAgIGlmIChoYXNSb3dCdWlsZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1aWx0RWxlbSA9IGJ1aWx0Um93c1t2aXJ0dWFsUm93XVtjXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWlsdEVsZW0gPSBidWlsdENvbHNbdmlydHVhbENvbF1bcl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNlbGxDaGlsZCA9IGJ1aWxkZXIudXBkYXRlKGJ1aWx0RWxlbSwge1xuICAgICAgICAgICAgICAgICAgICB2aXJ0dWFsQ29sOiB2aXJ0dWFsQ29sLFxuICAgICAgICAgICAgICAgICAgICB2aXJ0dWFsUm93OiB2aXJ0dWFsUm93LFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2lmIHdlIGRpZG4ndCBnZXQgYSBjaGlsZCBmcm9tIHRoZSBidWlsZGVyIHVzZSBhIHJlZ3VsYXIgdGV4dCBub2RlXG4gICAgICAgICAgICBpZiAoIWNlbGxDaGlsZCkge1xuICAgICAgICAgICAgICAgIGNlbGxDaGlsZCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRhdGEuZm9ybWF0dGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNlbGwuYXBwZW5kQ2hpbGQoY2VsbENoaWxkKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gZHJhd1JvdyhyKSB7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gZ3JpZC52aWV3UG9ydC5nZXRSb3dIZWlnaHQocik7XG4gICAgICAgICAgICB2YXIgcm93ID0gcm93c1tyXTtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyBiV2lkdGggKyAncHgnO1xuICAgICAgICAgICAgdmFyIHRvcCA9IGdyaWQudmlld1BvcnQuZ2V0Um93VG9wKHIpO1xuICAgICAgICAgICAgcm93LnN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChncmlkLmNlbGxTY3JvbGxNb2RlbC5yb3cgJSAyKSB7XG4gICAgICAgICAgICBjZWxsQ29udGFpbmVyLmNsYXNzTmFtZSA9IEdSSURfQ0VMTF9DT05UQUlORVJfQkFTRV9DTEFTUyArICcgb2Rkcyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjZWxsQ29udGFpbmVyLmNsYXNzTmFtZSA9IEdSSURfQ0VMTF9DT05UQUlORVJfQkFTRV9DTEFTUztcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHZpZXdMYXllci5fYnVpbGRDZWxscyA9IGZ1bmN0aW9uIGJ1aWxkQ2VsbHMoY2VsbENvbnRhaW5lcikge1xuICAgICAgICB3aGlsZSAoY2VsbENvbnRhaW5lci5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBjZWxsQ29udGFpbmVyLnJlbW92ZUNoaWxkKGNlbGxDb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGNlbGxzID0gW107XG4gICAgICAgIHJvd3MgPSBbXTtcbiAgICAgICAgdmFyIHJvdztcbiAgICAgICAgZ3JpZC52aWV3UG9ydC5pdGVyYXRlQ2VsbHMoZnVuY3Rpb24gKHIsIGMpIHtcbiAgICAgICAgICAgIHZhciBjZWxsID0gYnVpbGREaXZDZWxsKCk7XG4gICAgICAgICAgICBjZWxsc1tyXVtjXSA9IGNlbGw7XG4gICAgICAgICAgICByb3cuYXBwZW5kQ2hpbGQoY2VsbCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICBjZWxsc1tyXSA9IFtdO1xuICAgICAgICAgICAgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICByb3cuc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLXJvdycpO1xuICAgICAgICAgICAgcm93LnNldEF0dHJpYnV0ZSgnZHRzJywgJ2dyaWQtcm93Jyk7XG4gICAgICAgICAgICByb3cuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgcm93LnN0eWxlLmxlZnQgPSAwO1xuICAgICAgICAgICAgcm93LnN0eWxlLnJpZ2h0ID0gMDtcbiAgICAgICAgICAgIHJvd3Nbcl0gPSByb3c7XG4gICAgICAgICAgICBjZWxsQ29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBidWlsZERpdkNlbGwoKSB7XG4gICAgICAgIHZhciBjZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNlbGwuc2V0QXR0cmlidXRlKCdkdHMnLCAnZ3JpZC1jZWxsJyk7XG4gICAgICAgIHZhciBzdHlsZSA9IGNlbGwuc3R5bGU7XG4gICAgICAgIHN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgICAgICBzdHlsZS50b3AgPSAnMHB4JztcbiAgICAgICAgc3R5bGUuYm90dG9tID0gJzBweCc7XG4gICAgICAgIHJldHVybiBjZWxsO1xuICAgIH1cblxuICAgIC8qIEVORCBDRUxMIExPR0lDICovXG5cbiAgICAvKiBDT0wgQlVJTERFUiBMT0dJQyAqL1xuICAgIHZpZXdMYXllci5fYnVpbGRDb2xzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBidWlsdENvbHMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBncmlkLmNvbE1vZGVsLmxlbmd0aCh0cnVlKTsgYysrKSB7XG4gICAgICAgICAgICB2YXIgYnVpbGRlciA9IGdyaWQuY29sTW9kZWwuZ2V0KGMpLmJ1aWxkZXI7XG4gICAgICAgICAgICBpZiAoYnVpbGRlcikge1xuICAgICAgICAgICAgICAgIGJ1aWx0Q29sc1tjXSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHJlYWxSb3cgPSAwOyByZWFsUm93IDwgZ3JpZC52aWV3UG9ydC5yb3dzOyByZWFsUm93KyspIHtcbiAgICAgICAgICAgICAgICAgICAgYnVpbHRDb2xzW2NdW3JlYWxSb3ddID0gYnVpbGRlci5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qIEVORCBDT0wgQlVJTERFUiBMT0dJQyAqL1xuXG4gICAgLyogUk9XIEJVSUxERVIgTE9HSUMgXG4gICAgICogIGZvciBub3cgd2Ugb25seSBidWlsZCBoZWFkZXJzXG4gICAgICogKi9cblxuICAgIHZpZXdMYXllci5fYnVpbGRSb3dzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBidWlsdFJvd3MgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgciA9IDA7IHIgPCBncmlkLnJvd01vZGVsLm51bUhlYWRlcnMoKTsgcisrKSB7XG4gICAgICAgICAgICB2YXIgYnVpbGRlciA9IGdyaWQucm93TW9kZWwuZ2V0KHIpLmJ1aWxkZXI7XG4gICAgICAgICAgICBpZiAoYnVpbGRlcikge1xuICAgICAgICAgICAgICAgIGJ1aWx0Um93c1tyXSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHJlYWxDb2wgPSAwOyByZWFsQ29sIDwgZ3JpZC52aWV3UG9ydC5jb2xzOyByZWFsQ29sKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYnVpbHRSb3dzW3JdW3JlYWxDb2xdID0gYnVpbGRlci5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qIEVORCBST1cgQlVJTERFUiBMT0dJQyovXG5cbiAgICAvKiBERUNPUkFUT1IgTE9HSUMgKi9cbiAgICBmdW5jdGlvbiBzZXRQb3NpdGlvbihib3VuZGluZ0JveCwgdG9wLCBsZWZ0LCBoZWlnaHQsIHdpZHRoKSB7XG4gICAgICAgIHZhciBzdHlsZSA9IGJvdW5kaW5nQm94LnN0eWxlO1xuICAgICAgICBzdHlsZS50b3AgPSB0b3AgKyAncHgnO1xuICAgICAgICBzdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG4gICAgICAgIHN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIHN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICBzdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9zaXRpb25EZWNvcmF0b3IoYm91bmRpbmcsIHQsIGwsIGgsIHcpIHtcbiAgICAgICAgc2V0UG9zaXRpb24oYm91bmRpbmcsIHQsIGwsIHV0aWwuY2xhbXAoaCwgMCwgZ3JpZC52aWV3UG9ydC5oZWlnaHQpLCB1dGlsLmNsYW1wKHcsIDAsIGdyaWQudmlld1BvcnQud2lkdGgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3NpdGlvbkNlbGxEZWNvcmF0b3JGcm9tVmlld0NlbGxSYW5nZShyZWFsQ2VsbFJhbmdlLCBib3VuZGluZ0JveCkge1xuICAgICAgICB2YXIgcmVhbFB4UmFuZ2UgPSBncmlkLnZpZXdQb3J0LnRvUHgocmVhbENlbGxSYW5nZSk7XG4gICAgICAgIHBvc2l0aW9uRGVjb3JhdG9yKGJvdW5kaW5nQm94LCByZWFsUHhSYW5nZS50b3AsIHJlYWxQeFJhbmdlLmxlZnQsIHJlYWxQeFJhbmdlLmhlaWdodCArIGdldEJvcmRlcldpZHRoKCksIHJlYWxQeFJhbmdlLndpZHRoICsgZ2V0Qm9yZGVyV2lkdGgoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlUmFuZ2VGb3JEZXNjcmlwdG9yKGRlc2NyaXB0b3IpIHtcbiAgICAgICAgdmFyIHJhbmdlID0ge1xuICAgICAgICAgICAgdG9wOiBkZXNjcmlwdG9yLnRvcCxcbiAgICAgICAgICAgIGxlZnQ6IGRlc2NyaXB0b3IubGVmdCxcbiAgICAgICAgICAgIGhlaWdodDogZGVzY3JpcHRvci5oZWlnaHQsXG4gICAgICAgICAgICB3aWR0aDogZGVzY3JpcHRvci53aWR0aFxuICAgICAgICB9O1xuICAgICAgICBpZiAoZGVzY3JpcHRvci5zcGFjZSA9PT0gJ2RhdGEnICYmIGRlc2NyaXB0b3IudW5pdHMgPT09ICdjZWxsJykge1xuICAgICAgICAgICAgcmFuZ2UudG9wICs9IGdyaWQucm93TW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICAgICAgcmFuZ2UubGVmdCArPSBncmlkLmNvbE1vZGVsLm51bUhlYWRlcnMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmFuZ2U7XG4gICAgfVxuXG4gICAgdmlld0xheWVyLl9kcmF3RGVjb3JhdG9ycyA9IGZ1bmN0aW9uIChjZWxsc1Bvc2l0aW9uT3JTaXplQ2hhbmdlZCkge1xuICAgICAgICB2YXIgYWxpdmVEZWNvcmF0b3JzID0gZ3JpZC5kZWNvcmF0b3JzLmdldEFsaXZlKCk7XG4gICAgICAgIGFsaXZlRGVjb3JhdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChkZWNvcmF0b3IpIHtcblxuICAgICAgICAgICAgdmFyIGJvdW5kaW5nQm94ID0gZGVjb3JhdG9yLmJvdW5kaW5nQm94O1xuICAgICAgICAgICAgaWYgKCFib3VuZGluZ0JveCkge1xuICAgICAgICAgICAgICAgIGJvdW5kaW5nQm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgYm91bmRpbmdCb3guc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcbiAgICAgICAgICAgICAgICBkZWNvcmF0b3IuYm91bmRpbmdCb3ggPSBib3VuZGluZ0JveDtcbiAgICAgICAgICAgICAgICB2YXIgZGVjRWxlbWVudCA9IGRlY29yYXRvci5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVjRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBib3VuZGluZ0JveC5hcHBlbmRDaGlsZChkZWNFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZGVjb3JhdG9yQ29udGFpbmVyLmFwcGVuZENoaWxkKGJvdW5kaW5nQm94KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuaXNEaXJ0eSgpIHx8IGNlbGxzUG9zaXRpb25PclNpemVDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlY29yYXRvci5zcGFjZSA9PT0gJ3JlYWwnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZGVjb3JhdG9yLnVuaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdweCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25EZWNvcmF0b3IoYm91bmRpbmdCb3gsIGRlY29yYXRvci50b3AsIGRlY29yYXRvci5sZWZ0LCBkZWNvcmF0b3IuaGVpZ2h0LCBkZWNvcmF0b3Iud2lkdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2VsbCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25DZWxsRGVjb3JhdG9yRnJvbVZpZXdDZWxsUmFuZ2UoZGVjb3JhdG9yLCBib3VuZGluZ0JveCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZGVjb3JhdG9yLnNwYWNlID09PSAndmlydHVhbCcgfHwgZGVjb3JhdG9yLnNwYWNlID09PSAnZGF0YScpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChkZWNvcmF0b3IudW5pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3B4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NlbGwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgLyoganNoaW50IC1XMDg2ICovXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByYW5nZSA9IGNyZWF0ZVJhbmdlRm9yRGVzY3JpcHRvcihkZWNvcmF0b3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWFsQ2VsbFJhbmdlID0gZ3JpZC52aWV3UG9ydC5pbnRlcnNlY3QocmFuZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWFsQ2VsbFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uQ2VsbERlY29yYXRvckZyb21WaWV3Q2VsbFJhbmdlKHJlYWxDZWxsUmFuZ2UsIGJvdW5kaW5nQm94KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkRlY29yYXRvcihib3VuZGluZ0JveCwgLTEsIC0xLCAtMSwgLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8qIGpzaGludCArVzA4NiAqL1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlbW92ZURlY29yYXRvcnMoZ3JpZC5kZWNvcmF0b3JzLnBvcEFsbERlYWQoKSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZURlY29yYXRvcnMoZGVjb3JhdG9ycykge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZnVuY3Rpb24gKGRlY29yYXRvcikge1xuICAgICAgICAgICAgdmFyIGJvdW5kaW5nQm94ID0gZGVjb3JhdG9yLmJvdW5kaW5nQm94O1xuICAgICAgICAgICAgaWYgKGJvdW5kaW5nQm94KSB7XG4gICAgICAgICAgICAgICAgLy9pZiB0aGV5IHJlbmRlcmVkIGFuIGVsZW1lbnQgcHJldmlvdXNseSB3ZSBhdHRhY2hlZCBpdCB0byB0aGUgYm91bmRpbmcgYm94IGFzIHRoZSBvbmx5IGNoaWxkXG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVkRWxlbWVudCA9IGJvdW5kaW5nQm94LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgaWYgKHJlbmRlcmVkRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAvL2NyZWF0ZSBhIGRlc3Ryb3kgZG9tIGV2ZW50IHRoYXQgYnViYmxlc1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVzdHJveUV2ZW50ID0gY3VzdG9tRXZlbnQoJ2RlY29yYXRvci1kZXN0cm95JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcmVkRWxlbWVudC5kaXNwYXRjaEV2ZW50KGRlc3Ryb3lFdmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlY29yYXRvckNvbnRhaW5lci5yZW1vdmVDaGlsZChib3VuZGluZ0JveCk7XG4gICAgICAgICAgICAgICAgZGVjb3JhdG9yLmJvdW5kaW5nQm94ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKiBFTkQgREVDT1JBVE9SIExPR0lDICovXG5cbiAgICAvKiBDRUxMIENMQVNTRVMgTE9HSUMgKi9cbiAgICB2aWV3TGF5ZXIuX2RyYXdDZWxsQ2xhc3NlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ3JpZC52aWV3UG9ydC5pdGVyYXRlQ2VsbHMoZnVuY3Rpb24gKHIsIGMpIHtcbiAgICAgICAgICAgIGNlbGxzW3JdW2NdLmNsYXNzTmFtZSA9ICcnO1xuICAgICAgICB9KTtcbiAgICAgICAgZ3JpZC5jZWxsQ2xhc3Nlcy5nZXRBbGwoKS5mb3JFYWNoKGZ1bmN0aW9uIChkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICB2YXIgcmFuZ2UgPSBjcmVhdGVSYW5nZUZvckRlc2NyaXB0b3IoZGVzY3JpcHRvcik7XG4gICAgICAgICAgICB2YXIgaW50ZXJzZWN0aW9uID0gZ3JpZC52aWV3UG9ydC5pbnRlcnNlY3QocmFuZ2UpO1xuICAgICAgICAgICAgaWYgKGludGVyc2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHJvd0xvb3A6XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHIgPSAwOyByIDwgaW50ZXJzZWN0aW9uLmhlaWdodDsgcisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGludGVyc2VjdGlvbi53aWR0aDsgYysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJvdyA9IGludGVyc2VjdGlvbi50b3AgKyByO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2wgPSBpbnRlcnNlY3Rpb24ubGVmdCArIGM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2VsbFJvdyA9IGNlbGxzW3Jvd107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjZWxsUm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIHJvd0xvb3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjZWxsID0gY2VsbFJvd1tjb2xdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbC5jbGFzc05hbWUgPSAoY2VsbC5jbGFzc05hbWUgPyBjZWxsLmNsYXNzTmFtZSArICcgJyA6ICcnKSArIGRlc2NyaXB0b3IuY2xhc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qIEVORCBDRUxMIENMQVNTRVMgTE9HSUMqL1xuXG4gICAgdmlld0xheWVyLmRlc3Ryb3kgPSBjbGVhbnVwO1xuXG4gICAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICAgICAgcmVtb3ZlRGVjb3JhdG9ycyhncmlkLmRlY29yYXRvcnMuZ2V0QWxpdmUoKS5jb25jYXQoZ3JpZC5kZWNvcmF0b3JzLnBvcEFsbERlYWQoKSkpO1xuICAgICAgICBpZiAoIWNvbnRhaW5lcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBxdWVyeVNlbGVjdG9yQWxsID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgR1JJRF9WSUVXX1JPT1RfQ0xBU1MpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXJ5U2VsZWN0b3JBbGwubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciByb290ID0gcXVlcnlTZWxlY3RvckFsbFtpXTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChyb290KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmlld0xheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHZpZXdMYXllci5kcmF3LnRpbWVvdXQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZpZXdMYXllcjtcbn07IiwidmFyIHV0aWwgPSByZXF1aXJlKCdAZ3JpZC91dGlsJyk7XG52YXIgcmFuZ2VVdGlsID0gcmVxdWlyZSgnQGdyaWQvcmFuZ2UtdXRpbCcpO1xudmFyIGNhcGl0YWxpemUgPSByZXF1aXJlKCdjYXBpdGFsaXplJyk7XG52YXIgYWRkRGlydHlQcm9wcyA9IHJlcXVpcmUoJ0BncmlkL2FkZC1kaXJ0eS1wcm9wcycpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnQGdyaWQvZGVib3VuY2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBkaXJ0eUNsZWFuID0gcmVxdWlyZSgnQGdyaWQvZGlydHktY2xlYW4nKShncmlkKTtcbiAgICB2YXIgY29udGFpbmVyO1xuXG4gICAgdmFyIHZpZXdQb3J0ID0gYWRkRGlydHlQcm9wcyh7fSwgWydyb3dzJywgJ2NvbHMnLCAnd2lkdGgnLCAnaGVpZ2h0J10sIFtkaXJ0eUNsZWFuXSk7XG4gICAgdmlld1BvcnQucm93cyA9IDA7XG4gICAgdmlld1BvcnQuY29scyA9IDA7XG4gICAgdmlld1BvcnQuaXNEaXJ0eSA9IGRpcnR5Q2xlYW4uaXNEaXJ0eTtcblxuICAgIC8vdGhlc2UgcHJvYmFibHkgdHJpZ2dlciByZWZsb3cgc28gd2UgbWF5IG5lZWQgdG8gdGhpbmsgYWJvdXQgY2FjaGluZyB0aGUgdmFsdWUgYW5kIHVwZGF0aW5nIGl0IGF0IG9uIGRyYXdzIG9yIHNvbWV0aGluZ1xuICAgIGZ1bmN0aW9uIGdldEZpcnN0Q2xpZW50UmVjdCgpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lciAmJiBjb250YWluZXIuZ2V0Q2xpZW50UmVjdHMgJiYgY29udGFpbmVyLmdldENsaWVudFJlY3RzKCkgJiYgY29udGFpbmVyLmdldENsaWVudFJlY3RzKClbMF0gfHwge307XG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHZpZXdQb3J0LCAndG9wJywge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRGaXJzdENsaWVudFJlY3QoKS50b3AgfHwgMDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHZpZXdQb3J0LCAnbGVmdCcsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0Rmlyc3RDbGllbnRSZWN0KCkubGVmdCB8fCAwO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2aWV3UG9ydC50b0dyaWRYID0gZnVuY3Rpb24gKGNsaWVudFgpIHtcbiAgICAgICAgcmV0dXJuIGNsaWVudFggLSB2aWV3UG9ydC5sZWZ0O1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC50b0dyaWRZID0gZnVuY3Rpb24gKGNsaWVudFkpIHtcbiAgICAgICAgcmV0dXJuIGNsaWVudFkgLSB2aWV3UG9ydC50b3A7XG4gICAgfTtcblxuXG4gICAgdmFyIGZpeGVkID0ge3Jvd3M6IDAsIGNvbHM6IDB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0Rml4ZWQocm93T3JDb2wpIHtcbiAgICAgICAgcmV0dXJuIGZpeGVkW3Jvd09yQ29sICsgJ3MnXTtcbiAgICB9XG5cbiAgICB2aWV3UG9ydC5zaXplVG9Db250YWluZXIgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBjb250YWluZXIgPSBlbGVtO1xuICAgICAgICB2aWV3UG9ydC53aWR0aCA9IGVsZW0ub2Zmc2V0V2lkdGg7XG4gICAgICAgIHZpZXdQb3J0LmhlaWdodCA9IGVsZW0ub2Zmc2V0SGVpZ2h0O1xuICAgICAgICB2aWV3UG9ydC5yb3dzID0gY2FsY3VsYXRlTWF4TGVuZ3Rocyh2aWV3UG9ydC5oZWlnaHQsIGdyaWQucm93TW9kZWwpO1xuICAgICAgICB2aWV3UG9ydC5jb2xzID0gY2FsY3VsYXRlTWF4TGVuZ3Rocyh2aWV3UG9ydC53aWR0aCwgZ3JpZC5jb2xNb2RlbCk7XG4gICAgICAgIGdyaWQuZXZlbnRMb29wLmZpcmUoJ2dyaWQtdmlld3BvcnQtY2hhbmdlJyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0Ll9vblJlc2l6ZSA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmlld1BvcnQuX3Jlc2l6ZSgpO1xuICAgIH0sIDIwMCk7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh2aWV3UG9ydC5fb25SZXNpemUudGltZW91dCk7XG4gICAgICAgIGNsZWFyVGltZW91dChzaG9ydERlYm91bmNlZFJlc2l6ZS50aW1lb3V0KTtcbiAgICB9KTtcblxuICAgIHZpZXdQb3J0Ll9yZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIHZpZXdQb3J0LnNpemVUb0NvbnRhaW5lcihjb250YWluZXIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBzaG9ydERlYm91bmNlZFJlc2l6ZSA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmlld1BvcnQuX3Jlc2l6ZSgpO1xuICAgIH0sIDEpO1xuXG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdyZXNpemUnLCB3aW5kb3csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy93ZSBkb24ndCBiaW5kIHRoZSBoYW5kbGVyIGRpcmVjdGx5IHNvIHRoYXQgdGVzdHMgY2FuIG1vY2sgaXQgb3V0XG4gICAgICAgIHZpZXdQb3J0Ll9vblJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1yb3ctY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBmaXhlZC5yb3dzID0gZ3JpZC5yb3dNb2RlbC5udW1GaXhlZCgpO1xuICAgICAgICBzaG9ydERlYm91bmNlZFJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1jb2wtY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBmaXhlZC5jb2xzID0gZ3JpZC5jb2xNb2RlbC5udW1GaXhlZCgpO1xuICAgICAgICBzaG9ydERlYm91bmNlZFJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY29udmVydFJlYWxUb1ZpcnR1YWwoY29vcmQsIHJvd09yQ29sLCBjb29yZElzVmlydHVhbCkge1xuICAgICAgICAvL2NvdWxkIGNhY2hlIHRoaXMgb24gY2hhbmdlcyBpLmUuIHJvdy1jaGFuZ2Ugb3IgY29sLWNoYW5nZSBldmVudHNcbiAgICAgICAgdmFyIG51bUZpeGVkID0gZ2V0Rml4ZWQocm93T3JDb2wpO1xuICAgICAgICBpZiAoY29vcmQgPCBudW1GaXhlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvb3JkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb29yZCArIChjb29yZElzVmlydHVhbCA/IC0xIDogMSkgKiBncmlkLmNlbGxTY3JvbGxNb2RlbFtyb3dPckNvbF07XG4gICAgfVxuXG4vLyBjb252ZXJ0cyBhIHZpZXdwb3J0IHJvdyBvciBjb2x1bW4gdG8gYSByZWFsIHJvdyBvciBjb2x1bW4gXG4vLyBjbGFtcHMgaXQgaWYgdGhlIGNvbHVtbiB3b3VsZCBiZSBvdXRzaWRlIHRoZSByYW5nZVxuICAgIGZ1bmN0aW9uIGdldFZpcnR1YWxSb3dDb2xVbnNhZmUocmVhbENvb3JkLCByb3dPckNvbCkge1xuICAgICAgICByZXR1cm4gY29udmVydFJlYWxUb1ZpcnR1YWwocmVhbENvb3JkLCByb3dPckNvbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VmlydHVhbFJvd0NvbENsYW1wZWQodmlld0Nvb3JkLCByb3dPckNvbCkge1xuICAgICAgICB2YXIgdmlydHVhbFJvd0NvbCA9IGdldFZpcnR1YWxSb3dDb2xVbnNhZmUodmlld0Nvb3JkLCByb3dPckNvbCk7XG4gICAgICAgIHJldHVybiBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFsnY2xhbXAnICsgY2FwaXRhbGl6ZShyb3dPckNvbCldKHZpcnR1YWxSb3dDb2wpO1xuICAgIH1cblxuICAgIHZpZXdQb3J0LnRvVmlydHVhbFJvdyA9IGZ1bmN0aW9uIChyKSB7XG4gICAgICAgIHJldHVybiBnZXRWaXJ0dWFsUm93Q29sQ2xhbXBlZChyLCAncm93Jyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LnRvVmlydHVhbENvbCA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHJldHVybiBnZXRWaXJ0dWFsUm93Q29sQ2xhbXBlZChjLCAnY29sJyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldFJlYWxSb3dDb2xDbGFtcGVkKHZpcnR1YWxDb29yZCwgcm93T3JDb2wpIHtcbiAgICAgICAgdmFyIG51bUZpeGVkID0gZ2V0Rml4ZWQocm93T3JDb2wpO1xuICAgICAgICBpZiAodmlydHVhbENvb3JkIDwgbnVtRml4ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB2aXJ0dWFsQ29vcmQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1heFZpZXdQb3J0SW5kZXggPSB2aWV3UG9ydFtyb3dPckNvbCArICdzJ10gLSAxO1xuICAgICAgICByZXR1cm4gdXRpbC5jbGFtcCh2aXJ0dWFsQ29vcmQgLSBncmlkLmNlbGxTY3JvbGxNb2RlbFtyb3dPckNvbF0sIG51bUZpeGVkLCBtYXhWaWV3UG9ydEluZGV4LCB0cnVlKTtcbiAgICB9XG5cbiAgICB2aWV3UG9ydC5yb3dJc0luVmlldyA9IGZ1bmN0aW9uICh2aXJ0dWFsUm93KSB7XG4gICAgICAgIHZhciByZWFsUm93ID0gdmlld1BvcnQudG9SZWFsUm93KHZpcnR1YWxSb3cpO1xuICAgICAgICByZXR1cm4gIWlzTmFOKHJlYWxSb3cpICYmIGdldExlbmd0aEJldHdlZW5WaWV3Q29vcmRzKDAsIHJlYWxSb3csICdyb3cnLCAnaGVpZ2h0JywgdHJ1ZSkgPCB2aWV3UG9ydC5oZWlnaHQ7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmNvbElzSW5WaWV3ID0gZnVuY3Rpb24gKHZpcnR1YWxDb2wpIHtcbiAgICAgICAgdmFyIHJlYWxDb2wgPSB2aWV3UG9ydC50b1JlYWxDb2wodmlydHVhbENvbCk7XG4gICAgICAgIHJldHVybiAhaXNOYU4ocmVhbENvbCkgJiYgZ2V0TGVuZ3RoQmV0d2VlblZpZXdDb29yZHMoMCwgcmVhbENvbCwgJ2NvbCcsICd3aWR0aCcsIHRydWUpIDwgdmlld1BvcnQud2lkdGg7XG4gICAgfTtcblxuXG4vL2RlZmF1bHQgdW5jbGFtcGVkIGNhdXNlIHRoYXQgc2VlbXMgdG8gYmUgdGhlIG1vcmUgbGlrZWx5IHVzZSBjYXNlIGNvbnZlcnRpbmcgdGhpcyBkaXJlY3Rpb25cbiAgICB2aWV3UG9ydC50b1JlYWxSb3cgPSBmdW5jdGlvbiAodmlydHVhbFJvdykge1xuICAgICAgICByZXR1cm4gZ2V0UmVhbFJvd0NvbENsYW1wZWQodmlydHVhbFJvdywgJ3JvdycpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC50b1JlYWxDb2wgPSBmdW5jdGlvbiAodmlydHVhbENvbCkge1xuICAgICAgICByZXR1cm4gZ2V0UmVhbFJvd0NvbENsYW1wZWQodmlydHVhbENvbCwgJ2NvbCcpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC5jbGFtcFJvdyA9IGZ1bmN0aW9uIChyKSB7XG4gICAgICAgIHJldHVybiB1dGlsLmNsYW1wKHIsIDAsIHZpZXdQb3J0LnJvd3MgLSAxKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuY2xhbXBDb2wgPSBmdW5jdGlvbiAoYykge1xuICAgICAgICByZXR1cm4gdXRpbC5jbGFtcChjLCAwLCB2aWV3UG9ydC5jb2xzIC0gMSk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmNsYW1wWSA9IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHJldHVybiB1dGlsLmNsYW1wKHksIDAsIHZpZXdQb3J0LmhlaWdodCk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmNsYW1wWCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiB1dGlsLmNsYW1wKHgsIDAsIHZpZXdQb3J0LndpZHRoKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0TGVuZ3RoQmV0d2VlblZpZXdDb29yZHMoc3RhcnRDb29yZCwgZW5kQ29vcmQsIHJvd09yQ29sLCBoZWlnaHRPcldpZHRoLCBpbmNsdXNpdmUpIHtcbiAgICAgICAgdmFyIHJvd09yQ29sQ2FwID0gY2FwaXRhbGl6ZShyb3dPckNvbCk7XG4gICAgICAgIHZhciB0b1ZpcnR1YWwgPSB2aWV3UG9ydFsndG9WaXJ0dWFsJyArIHJvd09yQ29sQ2FwXTtcbiAgICAgICAgdmFyIGxlbmd0aEZuID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWxbaGVpZ2h0T3JXaWR0aF07XG4gICAgICAgIHZhciBjbGFtcEZuID0gdmlld1BvcnRbJ2NsYW1wJyArIHJvd09yQ29sQ2FwXTtcbiAgICAgICAgdmFyIHBvcyA9IDA7XG4gICAgICAgIHZhciBudW1GaXhlZCA9IGdldEZpeGVkKHJvd09yQ29sKTtcbiAgICAgICAgdmFyIGlzSW5Ob25maXhlZEFyZWEgPSBlbmRDb29yZCA+PSBudW1GaXhlZDtcbiAgICAgICAgdmFyIGlzSW5GaXhlZEFyZWEgPSBzdGFydENvb3JkIDwgbnVtRml4ZWQ7XG4gICAgICAgIHZhciBleGNsdXNpdmVPZmZzZXQgPSAoaW5jbHVzaXZlID8gMCA6IDEpO1xuICAgICAgICBpZiAoaXNJbkZpeGVkQXJlYSkge1xuICAgICAgICAgICAgdmFyIGZpeGVkRW5kQ29vcmQgPSAoaXNJbk5vbmZpeGVkQXJlYSA/IG51bUZpeGVkIC0gMSA6IGVuZENvb3JkIC0gZXhjbHVzaXZlT2Zmc2V0KTtcbiAgICAgICAgICAgIHBvcyArPSBsZW5ndGhGbihzdGFydENvb3JkLCBmaXhlZEVuZENvb3JkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNJbk5vbmZpeGVkQXJlYSkge1xuICAgICAgICAgICAgcG9zICs9IGxlbmd0aEZuKChpc0luRml4ZWRBcmVhID8gdG9WaXJ0dWFsKG51bUZpeGVkKSA6IHRvVmlydHVhbChzdGFydENvb3JkKSksIHRvVmlydHVhbChjbGFtcEZuKGVuZENvb3JkKSkgLSBleGNsdXNpdmVPZmZzZXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwb3M7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VG9wT3JMZWZ0KGVuZENvb3JkLCByb3dPckNvbCwgaGVpZ2h0T3JXaWR0aCkge1xuICAgICAgICByZXR1cm4gZ2V0TGVuZ3RoQmV0d2VlblZpZXdDb29yZHMoMCwgZW5kQ29vcmQsIHJvd09yQ29sLCBoZWlnaHRPcldpZHRoKTtcbiAgICB9XG5cbiAgICB2aWV3UG9ydC5nZXRSb3dUb3AgPSBmdW5jdGlvbiAodmlld1BvcnRDb29yZCkge1xuICAgICAgICByZXR1cm4gZ2V0VG9wT3JMZWZ0KHZpZXdQb3J0Q29vcmQsICdyb3cnLCAnaGVpZ2h0Jyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmdldENvbExlZnQgPSBmdW5jdGlvbiAodmlld1BvcnRDb2wpIHtcbiAgICAgICAgcmV0dXJuIGdldFRvcE9yTGVmdCh2aWV3UG9ydENvbCwgJ2NvbCcsICd3aWR0aCcpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC50b1B4ID0gZnVuY3Rpb24gKHJlYWxDZWxsUmFuZ2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvcDogdmlld1BvcnQuZ2V0Um93VG9wKHJlYWxDZWxsUmFuZ2UudG9wKSxcbiAgICAgICAgICAgIGxlZnQ6IHZpZXdQb3J0LmdldENvbExlZnQocmVhbENlbGxSYW5nZS5sZWZ0KSxcbiAgICAgICAgICAgIGhlaWdodDogZ2V0TGVuZ3RoQmV0d2VlblZpZXdDb29yZHMocmVhbENlbGxSYW5nZS50b3AsIHJlYWxDZWxsUmFuZ2UudG9wICsgcmVhbENlbGxSYW5nZS5oZWlnaHQgLSAxLCAncm93JywgJ2hlaWdodCcsIHRydWUpLFxuICAgICAgICAgICAgd2lkdGg6IGdldExlbmd0aEJldHdlZW5WaWV3Q29vcmRzKHJlYWxDZWxsUmFuZ2UubGVmdCwgcmVhbENlbGxSYW5nZS5sZWZ0ICsgcmVhbENlbGxSYW5nZS53aWR0aCAtIDEsICdjb2wnLCAnd2lkdGgnLCB0cnVlKVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRSb3dPckNvbEZyb21Qb3NpdGlvbihwb3MsIHJvd09yQ29sLCBoZWlnaHRPcldpZHRoLCByZXR1cm5WaXJ0dWFsKSB7XG4gICAgICAgIC8vd2UgY291bGQgZG8gdGhpcyBzbGlnaGx5IGZhc3RlciB3aXRoIGJpbmFyeSBzZWFyY2ggdG8gZ2V0IGxvZyhuKSBpbnN0ZWFkIG9mIG4sIGJ1dCB3aWxsIG9ubHkgZG8gaXQgaWYgd2UgYWN0dWFsbHkgbmVlZCB0byBvcHRpbWl6ZSB0aGlzXG4gICAgICAgIHZhciByb3dPckNvbENhcCA9IGNhcGl0YWxpemUocm93T3JDb2wpO1xuICAgICAgICB2YXIgdmlld01heCA9IHZpZXdQb3J0W3Jvd09yQ29sICsgJ3MnXTtcbiAgICAgICAgdmFyIHRvVmlydHVhbCA9IHZpZXdQb3J0Wyd0b1ZpcnR1YWwnICsgcm93T3JDb2xDYXBdO1xuICAgICAgICB2YXIgbGVuZ3RoRm4gPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFtoZWlnaHRPcldpZHRoXTtcbiAgICAgICAgdmFyIHN1bW1lZExlbmd0aCA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlld01heDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmlydHVhbCA9IHRvVmlydHVhbChpKTtcbiAgICAgICAgICAgIHZhciBsZW5ndGggPSBsZW5ndGhGbih2aXJ0dWFsKTtcbiAgICAgICAgICAgIHZhciBuZXdTdW0gPSBzdW1tZWRMZW5ndGggKyBsZW5ndGg7XG4gICAgICAgICAgICBpZiAobmV3U3VtID4gcG9zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHVyblZpcnR1YWwgPyB2aXJ0dWFsIDogaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN1bW1lZExlbmd0aCA9IG5ld1N1bTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTmFOO1xuICAgIH1cblxuICAgIHZpZXdQb3J0LmdldFZpcnR1YWxSb3dCeVRvcCA9IGZ1bmN0aW9uICh0b3ApIHtcbiAgICAgICAgcmV0dXJuIGdldFJvd09yQ29sRnJvbVBvc2l0aW9uKHRvcCwgJ3JvdycsICdoZWlnaHQnLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuZ2V0VmlydHVhbENvbEJ5TGVmdCA9IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHJldHVybiBnZXRSb3dPckNvbEZyb21Qb3NpdGlvbihsZWZ0LCAnY29sJywgJ3dpZHRoJywgdHJ1ZSk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmdldFJvd0J5VG9wID0gZnVuY3Rpb24gKHRvcCkge1xuICAgICAgICByZXR1cm4gZ2V0Um93T3JDb2xGcm9tUG9zaXRpb24odG9wLCAncm93JywgJ2hlaWdodCcpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC5nZXRDb2xCeUxlZnQgPSBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICByZXR1cm4gZ2V0Um93T3JDb2xGcm9tUG9zaXRpb24obGVmdCwgJ2NvbCcsICd3aWR0aCcpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC5nZXRSb3dIZWlnaHQgPSBmdW5jdGlvbiAodmlld1BvcnRSb3cpIHtcbiAgICAgICAgcmV0dXJuIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLmhlaWdodCh2aWV3UG9ydC50b1ZpcnR1YWxSb3codmlld1BvcnQuY2xhbXBSb3codmlld1BvcnRSb3cpKSk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmdldENvbFdpZHRoID0gZnVuY3Rpb24gKHZpZXdQb3J0Q29sKSB7XG4gICAgICAgIHJldHVybiBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC53aWR0aCh2aWV3UG9ydC50b1ZpcnR1YWxDb2wodmlld1BvcnQuY2xhbXBDb2wodmlld1BvcnRDb2wpKSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGludGVyc2VjdFJvd3NPckNvbHMoaW50ZXJzZWN0aW9uLCByYW5nZSwgdG9wT3JMZWZ0LCByb3dPckNvbCwgaGVpZ2h0T3JXaWR0aCkge1xuICAgICAgICB2YXIgbnVtRml4ZWQgPSBmaXhlZFtyb3dPckNvbCArICdzJ107XG4gICAgICAgIHZhciBmaXhlZFJhbmdlID0gWzAsIG51bUZpeGVkXTtcblxuICAgICAgICB2YXIgdmlydHVhbFJhbmdlID0gW3JhbmdlW3RvcE9yTGVmdF0sIHJhbmdlW2hlaWdodE9yV2lkdGhdXTtcbiAgICAgICAgdmFyIGZpeGVkSW50ZXJzZWN0aW9uID0gcmFuZ2VVdGlsLmludGVyc2VjdChmaXhlZFJhbmdlLCB2aXJ0dWFsUmFuZ2UpO1xuICAgICAgICB2YXIgc2Nyb2xsUmFuZ2UgPSBbbnVtRml4ZWQsIHZpZXdQb3J0W3Jvd09yQ29sICsgJ3MnXSAtIG51bUZpeGVkXTtcbiAgICAgICAgdmlydHVhbFJhbmdlWzBdIC09IGdyaWQuY2VsbFNjcm9sbE1vZGVsW3Jvd09yQ29sXTtcbiAgICAgICAgdmFyIHNjcm9sbEludGVyc2VjdGlvbiA9IHJhbmdlVXRpbC5pbnRlcnNlY3Qoc2Nyb2xsUmFuZ2UsIHZpcnR1YWxSYW5nZSk7XG4gICAgICAgIHZhciByZXN1bHRSYW5nZSA9IHJhbmdlVXRpbC51bmlvbihmaXhlZEludGVyc2VjdGlvbiwgc2Nyb2xsSW50ZXJzZWN0aW9uKTtcbiAgICAgICAgaWYgKCFyZXN1bHRSYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpbnRlcnNlY3Rpb25bdG9wT3JMZWZ0XSA9IHJlc3VsdFJhbmdlWzBdO1xuICAgICAgICBpbnRlcnNlY3Rpb25baGVpZ2h0T3JXaWR0aF0gPSByZXN1bHRSYW5nZVsxXTtcbiAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcbiAgICB9XG5cbiAgICB2aWV3UG9ydC5pbnRlcnNlY3QgPSBmdW5jdGlvbiAocmFuZ2UpIHtcbiAgICAgICAgLy9hc3N1bWUgdmlydHVhbCBjZWxscyBmb3Igbm93XG4gICAgICAgIHZhciBpbnRlcnNlY3Rpb24gPSBpbnRlcnNlY3RSb3dzT3JDb2xzKHt9LCByYW5nZSwgJ3RvcCcsICdyb3cnLCAnaGVpZ2h0Jyk7XG4gICAgICAgIGlmICghaW50ZXJzZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW50ZXJzZWN0Um93c09yQ29scyhpbnRlcnNlY3Rpb24sIHJhbmdlLCAnbGVmdCcsICdjb2wnLCAnd2lkdGgnKTtcbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVNYXhMZW5ndGhzKHRvdGFsTGVuZ3RoLCBsZW5ndGhNb2RlbCkge1xuICAgICAgICB2YXIgbGVuZ3RoTWV0aG9kID0gbGVuZ3RoTW9kZWwud2lkdGggJiYgZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwud2lkdGggfHwgZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuaGVpZ2h0O1xuICAgICAgICB2YXIgbnVtRml4ZWQgPSBsZW5ndGhNb2RlbC5udW1GaXhlZCgpO1xuICAgICAgICB2YXIgd2luZG93TGVuZ3RoID0gMDtcbiAgICAgICAgdmFyIG1heFNpemUgPSAwO1xuICAgICAgICB2YXIgZml4ZWRMZW5ndGggPSAwO1xuICAgICAgICB2YXIgd2luZG93U3RhcnRJbmRleCA9IG51bUZpeGVkO1xuXG4gICAgICAgIGZvciAodmFyIGZpeGVkID0gMDsgZml4ZWQgPCBudW1GaXhlZDsgZml4ZWQrKykge1xuICAgICAgICAgICAgZml4ZWRMZW5ndGggKz0gbGVuZ3RoTWV0aG9kKGZpeGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaXQgbWlnaHQgYmUgc2FmZXIgdG8gYWN0dWFsbHkgc3VtIHRoZSBsZW5ndGhzIGluIHRoZSB2aXJ0dWFsUGl4ZWxDZWxsTW9kZWwgYnV0IGZvciBub3cgaGVyZSBpcyBva1xuICAgICAgICBmb3IgKHZhciBpbmRleCA9IG51bUZpeGVkOyBpbmRleCA8IGxlbmd0aE1vZGVsLmxlbmd0aCh0cnVlKTsgaW5kZXgrKykge1xuICAgICAgICAgICAgd2luZG93TGVuZ3RoICs9IGxlbmd0aE1ldGhvZChpbmRleCk7XG4gICAgICAgICAgICB3aGlsZSAod2luZG93TGVuZ3RoICsgZml4ZWRMZW5ndGggPiB0b3RhbExlbmd0aCAmJiB3aW5kb3dTdGFydEluZGV4IDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3dMZW5ndGggLT0gbGVuZ3RoTWV0aG9kKGluZGV4KTtcbiAgICAgICAgICAgICAgICB3aW5kb3dTdGFydEluZGV4Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgd2luZG93U2l6ZSA9IGluZGV4IC0gd2luZG93U3RhcnRJbmRleCArIDE7IC8vIGFkZCB0aGUgb25lIGJlY2F1c2Ugd2Ugd2FudCB0aGUgbGFzdCBpbmRleCB0aGF0IGRpZG4ndCBmaXRcbiAgICAgICAgICAgIGlmICh3aW5kb3dTaXplID4gbWF4U2l6ZSkge1xuICAgICAgICAgICAgICAgIG1heFNpemUgPSB3aW5kb3dTaXplO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heFNpemUgKyBudW1GaXhlZCArIDE7XG4gICAgfVxuXG5cbiAgICB2aWV3UG9ydC5pdGVyYXRlQ2VsbHMgPSBmdW5jdGlvbiAoY2VsbEZuLCBvcHRpb25hbFJvd0ZuLCBvcHRpb25hbE1heFJvdywgb3B0aW9uYWxNYXhDb2wpIHtcbiAgICAgICAgb3B0aW9uYWxNYXhSb3cgPSBvcHRpb25hbE1heFJvdyB8fCBJbmZpbml0eTtcbiAgICAgICAgb3B0aW9uYWxNYXhDb2wgPSBvcHRpb25hbE1heENvbCB8fCBJbmZpbml0eTtcbiAgICAgICAgZm9yICh2YXIgciA9IDA7IHIgPCBNYXRoLm1pbih2aWV3UG9ydC5yb3dzLCBvcHRpb25hbE1heFJvdyk7IHIrKykge1xuICAgICAgICAgICAgaWYgKG9wdGlvbmFsUm93Rm4pIHtcbiAgICAgICAgICAgICAgICBvcHRpb25hbFJvd0ZuKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNlbGxGbikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgTWF0aC5taW4odmlld1BvcnQuY29scywgb3B0aW9uYWxNYXhDb2wpOyBjKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2VsbEZuKHIsIGMpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiB2aWV3UG9ydDtcbn0iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBtb2RlbCA9IHt9O1xuXG4gICAgLy9hbGwgcGl4ZWxzIGFyZSBhc3N1bWVkIHRvIGJlIGluIHRoZSB2aXJ0dWFsIHdvcmxkLCBubyByZWFsIHdvcmxkIHBpeGVscyBhcmUgZGVhbHQgd2l0aCBoZXJlIDopXG4gICAgbW9kZWwuZ2V0Um93ID0gZnVuY3Rpb24gKHRvcFB4KSB7XG4gICAgICAgIGlmICh0b3BQeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN1bUxlbmd0aCA9IDA7XG4gICAgICAgIGZvciAodmFyIHIgPSAwOyByIDwgZ3JpZC5yb3dNb2RlbC5sZW5ndGgodHJ1ZSk7IHIrKykge1xuICAgICAgICAgICAgc3VtTGVuZ3RoICs9IGdyaWQucm93TW9kZWwuaGVpZ2h0KHIpO1xuICAgICAgICAgICAgaWYgKHRvcFB4IDwgc3VtTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICB9O1xuXG4gICAgLy95ZXMgdGhlc2UgYXJlIHZlcnkgc2ltaWxhciBidXQgdGhlcmUgd2lsbCBiZSBkaWZmZXJlbmNlc1xuICAgIG1vZGVsLmdldENvbCA9IGZ1bmN0aW9uIChsZWZ0UHgpIHtcbiAgICAgICAgaWYgKGxlZnRQeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN1bUxlbmd0aCA9IDA7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgZ3JpZC5jb2xNb2RlbC5sZW5ndGgodHJ1ZSk7IGMrKykge1xuICAgICAgICAgICAgc3VtTGVuZ3RoICs9IGdyaWQuY29sTW9kZWwud2lkdGgoYyk7XG4gICAgICAgICAgICBpZiAobGVmdFB4IDwgc3VtTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBjbGFtcFJvd09yQ29sKHZpcnR1YWxSb3dDb2wsIHJvd09yQ29sKSB7XG4gICAgICAgIHZhciBtYXhSb3dDb2wgPSBncmlkW3Jvd09yQ29sICsgJ01vZGVsJ10ubGVuZ3RoKHRydWUpIC0gMTtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAodmlydHVhbFJvd0NvbCwgMCwgbWF4Um93Q29sKTtcbiAgICB9XG5cbiAgICBtb2RlbC5jbGFtcFJvdyA9IGZ1bmN0aW9uICh2aXJ0dWFsUm93KSB7XG4gICAgICAgIHJldHVybiBjbGFtcFJvd09yQ29sKHZpcnR1YWxSb3csICdyb3cnKTtcbiAgICB9O1xuXG4gICAgbW9kZWwuY2xhbXBDb2wgPSBmdW5jdGlvbiAodmlydHVhbENvbCkge1xuICAgICAgICByZXR1cm4gY2xhbXBSb3dPckNvbCh2aXJ0dWFsQ29sLCAnY29sJyk7XG4gICAgfTtcblxuICAgIC8vZm9yIG5vdyB0aGVzZSBqdXN0IGNhbGwgdGhyb3VnaCB0byB0aGUgcm93IGFuZCBjb2x1bW4gbW9kZWwsIGJ1dCB2ZXJ5IGxpa2VseSBpdCB3aWxsIG5lZWQgdG8gaW5jbHVkZSBzb21lIG90aGVyIGNhbGN1bGF0aW9uc1xuICAgIG1vZGVsLmhlaWdodCA9IGZ1bmN0aW9uICh2aXJ0dWFsUm93U3RhcnQsIHZpcnR1YWxSb3dFbmQpIHtcbiAgICAgICAgcmV0dXJuIGhlaWdodE9yV2lkdGgodmlydHVhbFJvd1N0YXJ0LCB2aXJ0dWFsUm93RW5kLCAncm93Jyk7XG4gICAgfTtcblxuICAgIG1vZGVsLndpZHRoID0gZnVuY3Rpb24gKHZpcnR1YWxDb2xTdGFydCwgdmlydHVhbENvbEVuZCkge1xuICAgICAgICByZXR1cm4gaGVpZ2h0T3JXaWR0aCh2aXJ0dWFsQ29sU3RhcnQsIHZpcnR1YWxDb2xFbmQsICdjb2wnKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGVpZ2h0T3JXaWR0aChzdGFydCwgZW5kLCByb3dPckNvbCkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gMDtcbiAgICAgICAgaWYgKGVuZCA8IHN0YXJ0KSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBlbmQgPSB1dGlsLmlzTnVtYmVyKGVuZCkgPyBlbmQgOiBzdGFydDtcbiAgICAgICAgZW5kID0gY2xhbXBSb3dPckNvbChlbmQsIHJvd09yQ29sKTtcbiAgICAgICAgc3RhcnQgPSBjbGFtcFJvd09yQ29sKHN0YXJ0LCByb3dPckNvbCk7XG4gICAgICAgIHZhciBsZW5ndGhNb2RlbCA9IGdyaWRbcm93T3JDb2wgKyAnTW9kZWwnXTtcbiAgICAgICAgdmFyIGxlbmd0aEZuID0gbGVuZ3RoTW9kZWwud2lkdGggfHwgbGVuZ3RoTW9kZWwuaGVpZ2h0O1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHtcbiAgICAgICAgICAgIGxlbmd0aCArPSBsZW5ndGhGbihpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGVuZ3RoO1xuICAgIH1cblxuICAgIG1vZGVsLnRvdGFsSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuaGVpZ2h0KDAsIGdyaWQucm93TW9kZWwubGVuZ3RoKHRydWUpIC0gMSk7XG4gICAgfTtcblxuICAgIG1vZGVsLnRvdGFsV2lkdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBtb2RlbC53aWR0aCgwLCBncmlkLmNvbE1vZGVsLmxlbmd0aCh0cnVlKSAtIDEpO1xuICAgIH07XG5cbiAgICBtb2RlbC5maXhlZEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLmhlaWdodCgwLCBncmlkLnJvd01vZGVsLm51bUZpeGVkKCkgLSAxKTtcbiAgICB9O1xuXG4gICAgbW9kZWwuZml4ZWRXaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLndpZHRoKDAsIGdyaWQuY29sTW9kZWwubnVtRml4ZWQoKSAtIDEpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzaXplQ2hhbmdlTGlzdGVuZXIoKSB7XG4gICAgICAgIC8vZm9yIG5vdyB3ZSBkb24ndCBjYWNoZSBhbnl0aGluZyBhYm91dCB0aGlzIHNvIHdlIGp1c3Qgbm90aWZ5XG4gICAgICAgIGdyaWQuZXZlbnRMb29wLmZpcmUoJ2dyaWQtdmlydHVhbC1waXhlbC1jZWxsLWNoYW5nZScpO1xuICAgIH1cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtY29sLWNoYW5nZScsIHNpemVDaGFuZ2VMaXN0ZW5lcik7XG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1yb3ctY2hhbmdlJywgc2l6ZUNoYW5nZUxpc3RlbmVyKTtcblxuICAgIHJldHVybiBtb2RlbDtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc3Vic3RyaW5nKDEpO1xufVxuXG5tb2R1bGUuZXhwb3J0cy53b3JkcyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC8oXnxcXFcpKFxcdykvZywgZnVuY3Rpb24gKG0pIHtcbiAgICByZXR1cm4gbS50b1VwcGVyQ2FzZSgpXG4gIH0pXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBFbGVtZW50Q2xhc3Mob3B0cylcbn1cblxuZnVuY3Rpb24gRWxlbWVudENsYXNzKG9wdHMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEVsZW1lbnRDbGFzcykpIHJldHVybiBuZXcgRWxlbWVudENsYXNzKG9wdHMpXG4gIHZhciBzZWxmID0gdGhpc1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuXG4gIC8vIHNpbWlsYXIgZG9pbmcgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCBidXQgd29ya3MgaW4gSUU4XG4gIGlmIChvcHRzLm5vZGVUeXBlKSBvcHRzID0ge2VsOiBvcHRzfVxuXG4gIHRoaXMub3B0cyA9IG9wdHNcbiAgdGhpcy5lbCA9IG9wdHMuZWwgfHwgZG9jdW1lbnQuYm9keVxuICBpZiAodHlwZW9mIHRoaXMuZWwgIT09ICdvYmplY3QnKSB0aGlzLmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0aGlzLmVsKVxufVxuXG5FbGVtZW50Q2xhc3MucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICB2YXIgZWwgPSB0aGlzLmVsXG4gIGlmICghZWwpIHJldHVyblxuICBpZiAoZWwuY2xhc3NOYW1lID09PSBcIlwiKSByZXR1cm4gZWwuY2xhc3NOYW1lID0gY2xhc3NOYW1lXG4gIHZhciBjbGFzc2VzID0gZWwuY2xhc3NOYW1lLnNwbGl0KCcgJylcbiAgaWYgKGNsYXNzZXMuaW5kZXhPZihjbGFzc05hbWUpID4gLTEpIHJldHVybiBjbGFzc2VzXG4gIGNsYXNzZXMucHVzaChjbGFzc05hbWUpXG4gIGVsLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbignICcpXG4gIHJldHVybiBjbGFzc2VzXG59XG5cbkVsZW1lbnRDbGFzcy5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gIHZhciBlbCA9IHRoaXMuZWxcbiAgaWYgKCFlbCkgcmV0dXJuXG4gIGlmIChlbC5jbGFzc05hbWUgPT09IFwiXCIpIHJldHVyblxuICB2YXIgY2xhc3NlcyA9IGVsLmNsYXNzTmFtZS5zcGxpdCgnICcpXG4gIHZhciBpZHggPSBjbGFzc2VzLmluZGV4T2YoY2xhc3NOYW1lKVxuICBpZiAoaWR4ID4gLTEpIGNsYXNzZXMuc3BsaWNlKGlkeCwgMSlcbiAgZWwuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKCcgJylcbiAgcmV0dXJuIGNsYXNzZXNcbn1cblxuRWxlbWVudENsYXNzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgdmFyIGVsID0gdGhpcy5lbFxuICBpZiAoIWVsKSByZXR1cm5cbiAgdmFyIGNsYXNzZXMgPSBlbC5jbGFzc05hbWUuc3BsaXQoJyAnKVxuICByZXR1cm4gY2xhc3Nlcy5pbmRleE9mKGNsYXNzTmFtZSkgPiAtMVxufVxuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjMuM1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGFsbnVtLCByZWY7XG5cbiAgcmVmID0gcmVxdWlyZSgnLi4vcmVmJykucmVmO1xuXG4gIGFsbnVtID0ge1xuICAgICcwJzogcmVmKCcwJywgNDgpLFxuICAgICcxJzogcmVmKCcxJywgNDkpLFxuICAgICcyJzogcmVmKCcyJywgNTApLFxuICAgICczJzogcmVmKCczJywgNTEpLFxuICAgICc0JzogcmVmKCc0JywgNTIpLFxuICAgICc1JzogcmVmKCc1JywgNTMpLFxuICAgICc2JzogcmVmKCc2JywgNTQpLFxuICAgICc3JzogcmVmKCc3JywgNTUpLFxuICAgICc4JzogcmVmKCc4JywgNTYpLFxuICAgICc5JzogcmVmKCc5JywgNTcpLFxuICAgIGE6IHJlZignQScsIDY1KSxcbiAgICBiOiByZWYoJ0InLCA2NiksXG4gICAgYzogcmVmKCdDJywgNjcpLFxuICAgIGQ6IHJlZignRCcsIDY4KSxcbiAgICBlOiByZWYoJ0UnLCA2OSksXG4gICAgZjogcmVmKCdGJywgNzApLFxuICAgIGc6IHJlZignRycsIDcxKSxcbiAgICBoOiByZWYoJ0gnLCA3MiksXG4gICAgaTogcmVmKCdJJywgNzMpLFxuICAgIGo6IHJlZignSicsIDc0KSxcbiAgICBrOiByZWYoJ0snLCA3NSksXG4gICAgbDogcmVmKCdMJywgNzYpLFxuICAgIG06IHJlZignTScsIDc3KSxcbiAgICBuOiByZWYoJ04nLCA3OCksXG4gICAgbzogcmVmKCdPJywgNzkpLFxuICAgIHA6IHJlZignUCcsIDgwKSxcbiAgICBxOiByZWYoJ1EnLCA4MSksXG4gICAgcjogcmVmKCdSJywgODIpLFxuICAgIHM6IHJlZignUycsIDgzKSxcbiAgICB0OiByZWYoJ1QnLCA4NCksXG4gICAgdTogcmVmKCdVJywgODUpLFxuICAgIHY6IHJlZignVicsIDg2KSxcbiAgICB3OiByZWYoJ1cnLCA4NyksXG4gICAgeDogcmVmKCdYJywgODgpLFxuICAgIHk6IHJlZignWScsIDg5KSxcbiAgICB6OiByZWYoJ1onLCA5MClcbiAgfTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IGFsbnVtO1xuXG59KS5jYWxsKHRoaXMpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjMuM1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGFycm93LCByZWY7XG5cbiAgcmVmID0gcmVxdWlyZSgnLi4vcmVmJykucmVmO1xuXG4gIGFycm93ID0ge1xuICAgIGxlZnQ6IHJlZignTGVmdCcsIDM3KSxcbiAgICB1cDogcmVmKCdVcCcsIDM4KSxcbiAgICByaWdodDogcmVmKCdSaWdodCcsIDM5KSxcbiAgICBkb3duOiByZWYoJ0Rvd24nLCA0MClcbiAgfTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IGFycm93O1xuXG59KS5jYWxsKHRoaXMpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjMuM1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGJyYW5kLCByZWY7XG5cbiAgcmVmID0gcmVxdWlyZSgnLi4vcmVmJykucmVmO1xuXG4gIGJyYW5kID0ge1xuICAgIGFwcGxlOiByZWYoJ0FwcGxlICYjODk4NDsnLCAyMjQpLFxuICAgIHdpbmRvd3M6IHtcbiAgICAgIHN0YXJ0OiByZWYoJ1dpbmRvd3Mgc3RhcnQnLCBbOTEsIDkyXSksXG4gICAgICBtZW51OiByZWYoJ1dpbmRvd3MgbWVudScsIDkzKVxuICAgIH1cbiAgfTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IGJyYW5kO1xuXG59KS5jYWxsKHRoaXMpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjMuM1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHB1bmN0dWF0aW9uLCByZWY7XG5cbiAgcmVmID0gcmVxdWlyZSgnLi4vcmVmJykucmVmO1xuXG4gIHB1bmN0dWF0aW9uID0ge1xuICAgIGNvbG9uOiByZWYoJ0NvbG9uL1NlbWljb2xvbicsIFs1OSwgMTg2XSksXG4gICAgZXF1YWw6IHJlZignRXF1YWwvUGx1cycsIFs2MSwgMTg3XSksXG4gICAgY29tbWE6IHJlZignQ29tbWEvTGVzcyBUaGFuJywgWzQ0LCAxODhdKSxcbiAgICBoeXBoZW46IHJlZignSHlwaGVuL1VuZGVyc2NvcmUnLCBbNDUsIDEwOSwgMTg5XSksXG4gICAgcGVyaW9kOiByZWYoJ1BlcmlvZC9HcmVhdGVyIFRoYW4nLCBbNDYsIDE5MF0pLFxuICAgIHRpbGRlOiByZWYoJ1RpbGRlL0JhY2sgVGljaycsIFs5NiwgMTkyXSksXG4gICAgYXBvc3Ryb3BoZTogcmVmKCdBcG9zdHJvcGhlL1F1b3RlJywgWzM5LCAyMjJdKSxcbiAgICBzbGFzaDoge1xuICAgICAgZm9yd2FyZDogcmVmKCdGb3J3YXJkIFNsYXNoL1F1ZXN0aW9uIE1hcmsnLCBbNDcsIDE5MV0pLFxuICAgICAgYmFja3dhcmQ6IHJlZignQmFja3dhcmQgU2xhc2gvUGlwZScsIDIyMClcbiAgICB9LFxuICAgIGJyYWNlOiB7XG4gICAgICBzcXVhcmU6IHtcbiAgICAgICAgb3BlbjogcmVmKCdPcGVuIFNxdWFyZS9DdXJseSBCcmFjZScsIDIxOSksXG4gICAgICAgIGNsb3NlOiByZWYoJ0Nsb3NlIFNxdWFyZS9DdXJseSBCcmFjZScsIDIyMSlcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcHVuY3R1YXRpb24uc2VtaWNvbG9uID0gcHVuY3R1YXRpb24uY29sb247XG5cbiAgcHVuY3R1YXRpb24ucGx1cyA9IHB1bmN0dWF0aW9uLmVxdWFsO1xuXG4gIHB1bmN0dWF0aW9uLmxlc3N0aGFuID0gcHVuY3R1YXRpb24uY29tbWE7XG5cbiAgcHVuY3R1YXRpb24udW5kZXJzY29yZSA9IHB1bmN0dWF0aW9uLmh5cGhlbjtcblxuICBwdW5jdHVhdGlvbi5ncmVhdGVydGhhbiA9IHB1bmN0dWF0aW9uLnBlcmlvZDtcblxuICBwdW5jdHVhdGlvbi5xdWVzdGlvbiA9IHB1bmN0dWF0aW9uLnNsYXNoLmZvcndhcmQ7XG5cbiAgcHVuY3R1YXRpb24uYmFja3RpY2sgPSBwdW5jdHVhdGlvbi50aWxkZTtcblxuICBwdW5jdHVhdGlvbi5waXBlID0gcHVuY3R1YXRpb24uc2xhc2guYmFja3dhcmQ7XG5cbiAgcHVuY3R1YXRpb24ucXVvdGUgPSBwdW5jdHVhdGlvbi5hcG9zdHJvcGhlO1xuXG4gIHB1bmN0dWF0aW9uLmJyYWNlLmN1cmx5ID0gcHVuY3R1YXRpb24uYnJhY2Uuc3F1YXJlO1xuXG4gIG1vZHVsZS5leHBvcnRzID0gcHVuY3R1YXRpb247XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuMy4zXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgcmVmLCBzcGVjaWFsO1xuXG4gIHJlZiA9IHJlcXVpcmUoJy4uL3JlZicpLnJlZjtcblxuICBzcGVjaWFsID0ge1xuICAgIGJhY2tzcGFjZTogcmVmKCdCYWNrc3BhY2UnLCA4KSxcbiAgICB0YWI6IHJlZignVGFiJywgOSksXG4gICAgZW50ZXI6IHJlZignRW50ZXInLCAxMyksXG4gICAgc2hpZnQ6IHJlZignU2hpZnQnLCAxNiksXG4gICAgY3RybDogcmVmKCdDdHJsJywgMTcpLFxuICAgIGFsdDogcmVmKCdBbHQnLCAxOCksXG4gICAgY2FwczogcmVmKCdDYXBzIExvY2snLCAyMCksXG4gICAgZXNjOiByZWYoJ0VzY2FwZScsIDI3KSxcbiAgICBzcGFjZTogcmVmKCdTcGFjZScsIDMyKSxcbiAgICBudW06IHJlZignTnVtIExvY2snLCAxNDQpXG4gIH07XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBzcGVjaWFsO1xuXG59KS5jYWxsKHRoaXMpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjMuM1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGlzUmVmLCBpdGVyYXRvciwga2V5LFxuICAgIF90aGlzID0gdGhpcyxcbiAgICBfX2luZGV4T2YgPSBbXS5pbmRleE9mIHx8IGZ1bmN0aW9uKGl0ZW0pIHsgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykgeyBpZiAoaSBpbiB0aGlzICYmIHRoaXNbaV0gPT09IGl0ZW0pIHJldHVybiBpOyB9IHJldHVybiAtMTsgfSxcbiAgICBfX2hhc1Byb3AgPSB7fS5oYXNPd25Qcm9wZXJ0eTtcblxuICBpc1JlZiA9IHJlcXVpcmUoJy4vcmVmJykuaXNSZWY7XG5cbiAga2V5ID0ge307XG5cbiAga2V5LmNvZGUgPSB7XG4gICAgc3BlY2lhbDogcmVxdWlyZSgnLi9jb2RlL3NwZWNpYWwnKSxcbiAgICBhcnJvdzogcmVxdWlyZSgnLi9jb2RlL2Fycm93JyksXG4gICAgcHVuY3R1YXRpb246IHJlcXVpcmUoJy4vY29kZS9wdW5jdHVhdGlvbicpLFxuICAgIGFsbnVtOiByZXF1aXJlKCcuL2NvZGUvYWxudW0nKSxcbiAgICBicmFuZDogcmVxdWlyZSgnLi9jb2RlL2JyYW5kJylcbiAgfTtcblxuICBrZXkuZ2V0ID0gZnVuY3Rpb24ocHJlc3NlZCkge1xuICAgIHJldHVybiBpdGVyYXRvcihrZXkuY29kZSwgcHJlc3NlZCk7XG4gIH07XG5cbiAga2V5LmlzID0gZnVuY3Rpb24ocmVmLCBwcmVzc2VkKSB7XG4gICAgaWYgKCFpc1JlZihyZWYpKSB7XG4gICAgICByZWYgPSBpdGVyYXRvcihyZWYsIHByZXNzZWQpO1xuICAgIH1cbiAgICBpZiAoaXNSZWYocmVmKSkge1xuICAgICAgaWYgKGlzUmVmKHByZXNzZWQpKSB7XG4gICAgICAgIHJldHVybiBwcmVzc2VkID09PSByZWY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHJlc3NlZCA9PT0gcmVmLmNvZGUgfHwgX19pbmRleE9mLmNhbGwocmVmLmNvZGUsIHByZXNzZWQpID49IDA7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwcmVzc2VkID09PSByZWY7XG4gICAgfVxuICB9O1xuXG4gIGl0ZXJhdG9yID0gZnVuY3Rpb24oY29udGV4dCwgcHJlc3NlZCkge1xuICAgIHZhciBpLCBvdXQsIHJlZjtcbiAgICBmb3IgKGkgaW4gY29udGV4dCkge1xuICAgICAgaWYgKCFfX2hhc1Byb3AuY2FsbChjb250ZXh0LCBpKSkgY29udGludWU7XG4gICAgICByZWYgPSBjb250ZXh0W2ldO1xuICAgICAgaWYgKGlzUmVmKHJlZikpIHtcbiAgICAgICAgaWYgKGtleS5pcyhyZWYsIHByZXNzZWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlZjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ID0gaXRlcmF0b3IocmVmLCBwcmVzc2VkKTtcbiAgICAgICAgaWYgKGlzUmVmKG91dCkpIHtcbiAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHdpbmRvdy5rZXkgPSBrZXk7XG4gIH1cblxuICBtb2R1bGUuZXhwb3J0cyA9IGtleTtcblxufSkuY2FsbCh0aGlzKTtcbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS4zLjNcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBSZWZlcmVuY2UsIGFzc2VydFJlZiwgaXNSZWYsIHJlZjtcblxuICBSZWZlcmVuY2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICBmdW5jdGlvbiBSZWZlcmVuY2UobmFtZSwgY29kZSkge1xuICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgIHRoaXMuY29kZSA9IGNvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFJlZmVyZW5jZTtcblxuICB9KSgpO1xuXG4gIHJlZiA9IGZ1bmN0aW9uKG5hbWUsIGNvZGUpIHtcbiAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShuYW1lLCBjb2RlKTtcbiAgfTtcblxuICBpc1JlZiA9IGZ1bmN0aW9uKHJlZikge1xuICAgIHJldHVybiByZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2U7XG4gIH07XG5cbiAgYXNzZXJ0UmVmID0gZnVuY3Rpb24ocmVmKSB7XG4gICAgaWYgKCFpc1JlZihyZWYpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVmZXJlbmNlJyk7XG4gICAgfVxuICAgIHJldHVybiByZWY7XG4gIH07XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVmOiByZWYsXG4gICAgaXNSZWY6IGlzUmVmLFxuICAgIGFzc2VydFJlZjogYXNzZXJ0UmVmXG4gIH07XG5cbn0pLmNhbGwodGhpcyk7XG4iXX0=
