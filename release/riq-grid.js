(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"@grid/add-dirty-props":2,"@grid/dirty-clean":13,"@grid/no-op":19,"@grid/util":25}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
},{"@grid/add-dirty-props":2,"@grid/dirty-clean":13,"@grid/position-range":21}],4:[function(require,module,exports){
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
},{"@grid/custom-event":10}],5:[function(require,module,exports){
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
},{"@grid/dirty-clean":13,"@grid/util":25,"capitalize":29}],6:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;

    var api = require('@grid/abstract-row-col-model')(grid, 'col', 'width', 100);

    return api;
};
},{"@grid/abstract-row-col-model":1}],7:[function(require,module,exports){
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
},{"@grid/header-decorators":15,"@grid/util":25,"element-class":30}],8:[function(require,module,exports){
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
},{"@grid/header-decorators":15}],9:[function(require,module,exports){
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
},{"@grid/cell-classes":3,"@grid/cell-mouse-model":4,"@grid/cell-scroll-model":5,"@grid/col-model":6,"@grid/col-reorder":7,"@grid/col-resize":8,"@grid/decorators":12,"@grid/dirty-clean":13,"@grid/event-loop":14,"@grid/navigation-model":18,"@grid/pixel-scroll-model":20,"@grid/row-model":23,"@grid/simple-data-model":24,"@grid/view-layer":26,"@grid/view-port":27,"@grid/virtual-pixel-cell-model":28,"element-class":30}],10:[function(require,module,exports){
module.exports = function (name, bubbles, cancelable, detail) {
    var event = document.createEvent('CustomEvent');  // MUST be 'CustomEvent'
    event.initCustomEvent(name, bubbles, cancelable, detail);
    return event;
};
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
},{"@grid/dirty-clean":13,"@grid/position-range":21,"@grid/util":25}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{"@grid/listeners":16,"@grid/mousewheel":17,"@grid/util":25}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
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
},{}],18:[function(require,module,exports){
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
},{"@grid/range-util":22,"@grid/util":25,"key":36}],19:[function(require,module,exports){
module.exports = function () {
    //a noop function to use
};
},{}],20:[function(require,module,exports){
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
},{"@grid/debounce":11,"@grid/util":25,"capitalize":29}],21:[function(require,module,exports){
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
},{"@grid/add-dirty-props":2}],22:[function(require,module,exports){
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


},{}],23:[function(require,module,exports){
module.exports = function (_grid) {
    var grid = _grid;

    var api = require('@grid/abstract-row-col-model')(grid, 'row', 'height', 30);

    return api;
};
},{"@grid/abstract-row-col-model":1}],24:[function(require,module,exports){
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
},{"@grid/dirty-clean":13}],25:[function(require,module,exports){
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
},{}],26:[function(require,module,exports){
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
},{"@grid/custom-event":10,"@grid/debounce":11,"@grid/util":25}],27:[function(require,module,exports){
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
},{"@grid/add-dirty-props":2,"@grid/debounce":11,"@grid/dirty-clean":13,"@grid/range-util":22,"@grid/util":25,"capitalize":29}],28:[function(require,module,exports){
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
},{"@grid/util":25}],29:[function(require,module,exports){
module.exports = function (string) {
  return string.charAt(0).toUpperCase() + string.substring(1);
}

module.exports.words = function (string) {
  return string.replace(/(^|\W)(\w)/g, function (m) {
    return m.toUpperCase()
  })
}

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{"../ref":37}],32:[function(require,module,exports){
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

},{"../ref":37}],33:[function(require,module,exports){
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

},{"../ref":37}],34:[function(require,module,exports){
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

},{"../ref":37}],35:[function(require,module,exports){
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

},{"../ref":37}],36:[function(require,module,exports){
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

},{"./code/alnum":31,"./code/arrow":32,"./code/brand":33,"./code/punctuation":34,"./code/special":35,"./ref":37}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
'use strict';

angular.module('riq-grid', []).
    factory('riqGrid', function () {
        return require('@grid/core');
    })
;


},{"@grid/core":9}]},{},[38])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvYWJzdHJhY3Qtcm93LWNvbC1tb2RlbC9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9AZ3JpZC9hZGQtZGlydHktcHJvcHMvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvY2VsbC1jbGFzc2VzL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL2NlbGwtbW91c2UtbW9kZWwvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvY2VsbC1zY3JvbGwtbW9kZWwvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvY29sLW1vZGVsL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL2NvbC1yZW9yZGVyL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL2NvbC1yZXNpemUvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvY29yZS9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9AZ3JpZC9jdXN0b20tZXZlbnQvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvZGVib3VuY2UvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvZGVjb3JhdG9ycy9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9AZ3JpZC9kaXJ0eS1jbGVhbi9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9AZ3JpZC9ldmVudC1sb29wL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL2hlYWRlci1kZWNvcmF0b3JzL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL2xpc3RlbmVycy9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9AZ3JpZC9tb3VzZXdoZWVsL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL25hdmlnYXRpb24tbW9kZWwvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvbm8tb3AvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvcGl4ZWwtc2Nyb2xsLW1vZGVsL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL3Bvc2l0aW9uLXJhbmdlL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL3JhbmdlLXV0aWwvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvcm93LW1vZGVsL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL3NpbXBsZS1kYXRhLW1vZGVsL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL0BncmlkL3V0aWwvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvdmlldy1sYXllci9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9AZ3JpZC92aWV3LXBvcnQvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvQGdyaWQvdmlydHVhbC1waXhlbC1jZWxsLW1vZGVsL2luZGV4LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL2NhcGl0YWxpemUvaW5kZXguanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMvZWxlbWVudC1jbGFzcy9pbmRleC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9rZXkvbGliL2NvZGUvYWxudW0uanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMva2V5L2xpYi9jb2RlL2Fycm93LmpzIiwiL1VzZXJzL3NjYW1kZW4vcHJvamVjdHMvcmlxLWdyaWQvbm9kZV9tb2R1bGVzL2tleS9saWIvY29kZS9icmFuZC5qcyIsIi9Vc2Vycy9zY2FtZGVuL3Byb2plY3RzL3JpcS1ncmlkL25vZGVfbW9kdWxlcy9rZXkvbGliL2NvZGUvcHVuY3R1YXRpb24uanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMva2V5L2xpYi9jb2RlL3NwZWNpYWwuanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMva2V5L2xpYi9rZXkuanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9ub2RlX21vZHVsZXMva2V5L2xpYi9yZWYuanMiLCIvVXNlcnMvc2NhbWRlbi9wcm9qZWN0cy9yaXEtZ3JpZC9zcmMvbW9kdWxlcy9yaXEtZ3JpZC1lbnRyeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUEE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBhZGREaXJ0eVByb3BzID0gcmVxdWlyZSgnQGdyaWQvYWRkLWRpcnR5LXByb3BzJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcbnZhciBub29wID0gcmVxdWlyZSgnQGdyaWQvbm8tb3AnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQsIG5hbWUsIGxlbmd0aE5hbWUsIGRlZmF1bHRMZW5ndGgpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIERFRkFVTFRfTEVOR1RIID0gZGVmYXVsdExlbmd0aDtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSBbXTtcbiAgICB2YXIgbnVtRml4ZWQgPSAwO1xuICAgIHZhciBudW1IZWFkZXJzID0gMDtcbiAgICB2YXIgbWFrZURpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpO1xuICAgIHZhciBkaXJ0eUNsZWFuID0gbWFrZURpcnR5Q2xlYW4oZ3JpZCk7XG4gICAgdmFyIGJ1aWxkZXJEaXJ0eUNsZWFuID0gbWFrZURpcnR5Q2xlYW4oZ3JpZCk7XG4gICAgdmFyIHNlbGVjdGVkID0gW107XG5cbiAgICBmdW5jdGlvbiBzZXREZXNjcmlwdG9yc0RpcnR5KCkge1xuICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKCdncmlkLScgKyBuYW1lICsgJy1jaGFuZ2UnKTtcbiAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICBidWlsZGVyRGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpcmVTZWxlY3Rpb25DaGFuZ2UoKSB7XG4gICAgICAgIGdyaWQuZXZlbnRMb29wLmZpcmUoJ2dyaWQtJyArIG5hbWUgKyAnLXNlbGVjdGlvbi1jaGFuZ2UnKTtcbiAgICB9XG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBhcmVCdWlsZGVyc0RpcnR5OiBidWlsZGVyRGlydHlDbGVhbi5pc0RpcnR5LFxuICAgICAgICBpc0RpcnR5OiBkaXJ0eUNsZWFuLmlzRGlydHksXG4gICAgICAgIGFkZDogZnVuY3Rpb24gKHRvQWRkKSB7XG4gICAgICAgICAgICBpZiAoIXV0aWwuaXNBcnJheSh0b0FkZCkpIHtcbiAgICAgICAgICAgICAgICB0b0FkZCA9IFt0b0FkZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b0FkZC5mb3JFYWNoKGZ1bmN0aW9uIChkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3IuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0b3JzLnNwbGljZShudW1IZWFkZXJzLCAwLCBkZXNjcmlwdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgbnVtRml4ZWQrKztcbiAgICAgICAgICAgICAgICAgICAgbnVtSGVhZGVycysrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2lmIHRoZSBjb2x1bW4gaXMgZml4ZWQgYW5kIHRoZSBsYXN0IG9uZSBhZGRlZCBpcyBmaXhlZCAod2Ugb25seSBhbGxvdyBmaXhlZCBhdCB0aGUgYmVnaW5uaW5nIGZvciBub3cpXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yLmZpeGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRlc2NyaXB0b3JzLmxlbmd0aCB8fCBkZXNjcmlwdG9yc1tkZXNjcmlwdG9ycy5sZW5ndGggLSAxXS5maXhlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bUZpeGVkKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93ICdDYW5ub3QgYWRkIGEgZml4ZWQgY29sdW1uIGFmdGVyIGFuIHVuZml4ZWQgb25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdG9ycy5wdXNoKGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzZXREZXNjcmlwdG9yc0RpcnR5KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEhlYWRlcnM6IGZ1bmN0aW9uICh0b0FkZCkge1xuICAgICAgICAgICAgaWYgKCF1dGlsLmlzQXJyYXkodG9BZGQpKSB7XG4gICAgICAgICAgICAgICAgdG9BZGQgPSBbdG9BZGRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9BZGQuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyLmhlYWRlciA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwaS5hZGQodG9BZGQpO1xuICAgICAgICB9LFxuICAgICAgICBoZWFkZXI6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzW2luZGV4XTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBkZXNjcmlwdG9yc1tpbmRleF07XG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKGluY2x1ZGVIZWFkZXJzKSB7XG4gICAgICAgICAgICB2YXIgc3VidHJhY3QgPSBpbmNsdWRlSGVhZGVycyA/IDAgOiBudW1IZWFkZXJzO1xuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzLmxlbmd0aCAtIHN1YnRyYWN0O1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uIChkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBkZXNjcmlwdG9ycy5pbmRleE9mKGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0b3JzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3IuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bUZpeGVkLS07XG4gICAgICAgICAgICAgICAgICAgIG51bUhlYWRlcnMtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRlc2NyaXB0b3IuZml4ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtRml4ZWQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoaW5jbHVkZUhlYWRlcnMpIHtcbiAgICAgICAgICAgIGRlc2NyaXB0b3JzLnNsaWNlKDApLmZvckVhY2goZnVuY3Rpb24gKGRlc2NyaXB0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUhlYWRlcnMgfHwgIWRlc2NyaXB0b3IuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaS5yZW1vdmUoZGVzY3JpcHRvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIG1vdmU6IGZ1bmN0aW9uIChzdGFydCwgdGFyZ2V0KSB7XG4gICAgICAgICAgICBkZXNjcmlwdG9ycy5zcGxpY2UodGFyZ2V0LCAwLCBkZXNjcmlwdG9ycy5zcGxpY2Uoc3RhcnQsIDEpWzBdKTtcbiAgICAgICAgICAgIHNldERlc2NyaXB0b3JzRGlydHkoKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVtSGVhZGVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bUhlYWRlcnM7XG4gICAgICAgIH0sXG4gICAgICAgIG51bUZpeGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVtRml4ZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHRvVmlydHVhbDogZnVuY3Rpb24gKGRhdGFJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFJbmRleCArIGFwaS5udW1IZWFkZXJzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvRGF0YTogZnVuY3Rpb24gKHZpcnR1YWxJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHZpcnR1YWxJbmRleCAtIGFwaS5udW1IZWFkZXJzKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiBmdW5jdGlvbiAoaW5kZXgpIHtcblxuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBhcGlbbmFtZV0oaW5kZXgpO1xuICAgICAgICAgICAgaWYgKCFkZXNjcmlwdG9yLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRvci5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQucHVzaChpbmRleCk7XG4gICAgICAgICAgICAgICAgZmlyZVNlbGVjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZXNlbGVjdDogZnVuY3Rpb24gKGluZGV4LCBkb250Tm90aWZ5KSB7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IGFwaVtuYW1lXShpbmRleCk7XG4gICAgICAgICAgICBpZiAoZGVzY3JpcHRvci5zZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0b3Iuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZC5zcGxpY2Uoc2VsZWN0ZWQuaW5kZXhPZihpbmRleCksIDEpO1xuICAgICAgICAgICAgICAgIGlmICghZG9udE5vdGlmeSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJlU2VsZWN0aW9uQ2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0b2dnbGVTZWxlY3Q6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBhcGlbbmFtZV0oaW5kZXgpO1xuICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3Iuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBhcGkuZGVzZWxlY3QoaW5kZXgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcGkuc2VsZWN0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJTZWxlY3RlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IHNlbGVjdGVkLmxlbmd0aDtcbiAgICAgICAgICAgIHNlbGVjdGVkLnNsaWNlKDApLmZvckVhY2goZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgYXBpLmRlc2VsZWN0KGluZGV4LCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGZpcmVTZWxlY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3RlZDtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAoYnVpbGRlcikge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSB7fTtcbiAgICAgICAgICAgIHZhciBmaXhlZCA9IGZhbHNlO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRlc2NyaXB0b3IsICdmaXhlZCcsIHtcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVzY3JpcHRvci5oZWFkZXIgfHwgZml4ZWQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uIChfZml4ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZml4ZWQgPSBfZml4ZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGFkZERpcnR5UHJvcHMoZGVzY3JpcHRvciwgWydidWlsZGVyJ10sIFtidWlsZGVyRGlydHlDbGVhbl0pO1xuICAgICAgICAgICAgZGVzY3JpcHRvci5idWlsZGVyID0gYnVpbGRlcjtcblxuICAgICAgICAgICAgcmV0dXJuIGFkZERpcnR5UHJvcHMoZGVzY3JpcHRvciwgW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbGVuZ3RoTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgb25EaXJ0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZC5ldmVudExvb3AuZmlyZSgnZ3JpZC0nICsgbmFtZSArICctY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLCBbZGlydHlDbGVhbl0pO1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGVCdWlsZGVyOiBmdW5jdGlvbiAocmVuZGVyLCB1cGRhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7cmVuZGVyOiByZW5kZXIgfHwgbm9vcCwgdXBkYXRlOiB1cGRhdGUgfHwgbm9vcH07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9iYXNpY2FsbHkgaGVpZ2h0IG9yIHdpZHRoXG4gICAgYXBpW2xlbmd0aE5hbWVdID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgIGlmICghZGVzY3JpcHRvcnNbaW5kZXhdKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzW2luZGV4XSAmJiBkZXNjcmlwdG9yc1tpbmRleF1bbGVuZ3RoTmFtZV0gfHwgREVGQVVMVF9MRU5HVEg7XG4gICAgfTtcblxuICAgIC8vcm93IG9yIGNvbCBnZXRcbiAgICBhcGlbbmFtZV0gPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3JzW2luZGV4ICsgbnVtSGVhZGVyc107XG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaiwgcHJvcHMsIGRpcnR5Q2xlYW5zKSB7XG4gICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICB2YXIgdmFsO1xuICAgICAgICB2YXIgbmFtZSA9IHByb3AubmFtZSB8fCBwcm9wO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBuYW1lLCB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgICAgIH0sIHNldDogZnVuY3Rpb24gKF92YWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoX3ZhbCAhPT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpcnR5Q2xlYW5zLmZvckVhY2goZnVuY3Rpb24gKGRpcnR5Q2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5Q2xlYW4uc2V0RGlydHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wLm9uRGlydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3Aub25EaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhbCA9IF92YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59OyIsInZhciBwb3NpdGlvblJhbmdlID0gcmVxdWlyZSgnQGdyaWQvcG9zaXRpb24tcmFuZ2UnKTtcbnZhciBtYWtlRGlydHlDbGVhbiA9IHJlcXVpcmUoJ0BncmlkL2RpcnR5LWNsZWFuJyk7XG52YXIgYWRkRGlydHlQcm9wcyA9IHJlcXVpcmUoJ0BncmlkL2FkZC1kaXJ0eS1wcm9wcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgZGlydHlDbGVhbiA9IG1ha2VEaXJ0eUNsZWFuKGdyaWQpO1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IFtdO1xuXG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgYWRkOiBmdW5jdGlvbiAoZGVzY3JpcHRvcikge1xuICAgICAgICAgICAgZGVzY3JpcHRvcnMucHVzaChkZXNjcmlwdG9yKTtcbiAgICAgICAgICAgIGRpcnR5Q2xlYW4uc2V0RGlydHkoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoZGVzY3JpcHRvcikge1xuICAgICAgICAgICAgZGVzY3JpcHRvcnMuc3BsaWNlKGRlc2NyaXB0b3JzLmluZGV4T2YoZGVzY3JpcHRvciksIDEpO1xuICAgICAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkZXNjcmlwdG9ycy5zbGljZSgwKTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAodG9wLCBsZWZ0LCBjbGFzc05hbWUsIGhlaWdodCwgd2lkdGgsIHNwYWNlKSB7XG4gICAgICAgICAgICB2YXIgdGhpc0RpcnR5Q2xlYW4gPSBtYWtlRGlydHlDbGVhbihncmlkKTtcbiAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yID0ge307XG4gICAgICAgICAgICAvL21peGluc1xuICAgICAgICAgICAgcG9zaXRpb25SYW5nZShkZXNjcmlwdG9yLCB0aGlzRGlydHlDbGVhbiwgZGlydHlDbGVhbik7XG4gICAgICAgICAgICBhZGREaXJ0eVByb3BzKGRlc2NyaXB0b3IsIFsnY2xhc3MnXSwgW3RoaXNEaXJ0eUNsZWFuLCBkaXJ0eUNsZWFuXSk7XG5cbiAgICAgICAgICAgIC8vYWxsIG9mIHRoZXNlIGFyZSBvcHRpb25hbFxuICAgICAgICAgICAgZGVzY3JpcHRvci50b3AgPSB0b3A7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLmxlZnQgPSBsZWZ0O1xuICAgICAgICAgICAgLy9kZWZhdWx0IHRvIHNpbmdsZSBjZWxsIHJhbmdlc1xuICAgICAgICAgICAgZGVzY3JpcHRvci5oZWlnaHQgPSBoZWlnaHQgfHwgMTtcbiAgICAgICAgICAgIGRlc2NyaXB0b3Iud2lkdGggPSB3aWR0aCB8fCAxO1xuICAgICAgICAgICAgZGVzY3JpcHRvci5jbGFzcyA9IGNsYXNzTmFtZTtcbiAgICAgICAgICAgIGRlc2NyaXB0b3Iuc3BhY2UgPSBzcGFjZSB8fCBkZXNjcmlwdG9yLnNwYWNlO1xuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3I7XG4gICAgICAgIH0sXG4gICAgICAgIGlzRGlydHk6IGRpcnR5Q2xlYW4uaXNEaXJ0eVxuICAgIH07XG5cblxuICAgIHJldHVybiBhcGk7XG59OyIsInZhciBjdXN0b21FdmVudCA9IHJlcXVpcmUoJ0BncmlkL2N1c3RvbS1ldmVudCcpO1xuXG52YXIgUFJPUFNfVE9fQ09QWV9GUk9NX01PVVNFX0VWRU5UUyA9IFsnY2xpZW50WCcsICdjbGllbnRZJywgJ2dyaWRYJywgJ2dyaWRZJywgJ2xheWVyWCcsICdsYXllclknLCAncm93JywgJ2NvbCcsICdyZWFsUm93JywgJ3JlYWxDb2wnXTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgbW9kZWwgPSB7fTtcblxuICAgIHZhciB3YXNEcmFnZ2VkID0gZmFsc2U7XG5cbiAgICBtb2RlbC5fYW5ub3RhdGVFdmVudCA9IGZ1bmN0aW9uIGFubm90YXRlRXZlbnQoZSkge1xuICAgICAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnY2xpY2snOlxuICAgICAgICAgICAgICAgIGUud2FzRHJhZ2dlZCA9IHdhc0RyYWdnZWQ7XG4gICAgICAgICAgICAvKiBqc2hpbnQgLVcwODYgKi9cbiAgICAgICAgICAgIGNhc2UgJ21vdXNlZG93bic6XG4gICAgICAgICAgICAvKiBqc2hpbnQgK1cwODYgKi9cbiAgICAgICAgICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICAgICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgICAgICAgICAgICBtb2RlbC5fYW5ub3RhdGVFdmVudEludGVybmFsKGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbW9kZWwuX2Fubm90YXRlRXZlbnRJbnRlcm5hbCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciB5ID0gZ3JpZC52aWV3UG9ydC50b0dyaWRZKGUuY2xpZW50WSk7XG4gICAgICAgIHZhciB4ID0gZ3JpZC52aWV3UG9ydC50b0dyaWRYKGUuY2xpZW50WCk7XG4gICAgICAgIGUucmVhbFJvdyA9IGdyaWQudmlld1BvcnQuZ2V0Um93QnlUb3AoeSk7XG4gICAgICAgIGUucmVhbENvbCA9IGdyaWQudmlld1BvcnQuZ2V0Q29sQnlMZWZ0KHgpO1xuICAgICAgICBlLnZpcnR1YWxSb3cgPSBncmlkLnZpZXdQb3J0LnRvVmlydHVhbFJvdyhlLnJlYWxSb3cpO1xuICAgICAgICBlLnZpcnR1YWxDb2wgPSBncmlkLnZpZXdQb3J0LnRvVmlydHVhbENvbChlLnJlYWxDb2wpO1xuICAgICAgICBlLnJvdyA9IGUudmlydHVhbFJvdyAtIGdyaWQucm93TW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICBlLmNvbCA9IGUudmlydHVhbENvbCAtIGdyaWQuY29sTW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICBlLmdyaWRYID0geDtcbiAgICAgICAgZS5ncmlkWSA9IHk7XG4gICAgfTtcblxuICAgIGdyaWQuZXZlbnRMb29wLmFkZEludGVyY2VwdG9yKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIG1vZGVsLl9hbm5vdGF0ZUV2ZW50KGUpO1xuXG4gICAgICAgIGlmIChlLnR5cGUgPT09ICdtb3VzZWRvd24nKSB7XG4gICAgICAgICAgICBzZXR1cERyYWdFdmVudEZvck1vdXNlRG93bihlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gc2V0dXBEcmFnRXZlbnRGb3JNb3VzZURvd24oZG93bkV2ZW50KSB7XG4gICAgICAgIHdhc0RyYWdnZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGxhc3REcmFnUm93ID0gZG93bkV2ZW50LnJvdztcbiAgICAgICAgdmFyIGxhc3REcmFnQ29sID0gZG93bkV2ZW50LmNvbDtcbiAgICAgICAgdmFyIGRyYWdTdGFydGVkID0gZmFsc2U7XG4gICAgICAgIHZhciB1bmJpbmRNb3ZlID0gZ3JpZC5ldmVudExvb3AuYmluZCgnbW91c2Vtb3ZlJywgd2luZG93LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGRyYWdTdGFydGVkICYmICFlLndoaWNoKSB7XG4gICAgICAgICAgICAgICAgLy9nb3QgYSBtb3ZlIGV2ZW50IHdpdGhvdXQgbW91c2UgZG93biB3aGljaCBtZWFucyB3ZSBzb21laG93IG1pc3NlZCB0aGUgbW91c2V1cFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb3VzZW1vdmUgdW5iaW5kLCBob3cgb24gZWFydGggZG8gdGhlc2UgaGFwcGVuPycpO1xuICAgICAgICAgICAgICAgIGhhbmRsZU1vdXNlVXAoZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRyYWdTdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgd2FzRHJhZ2dlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgY3JlYXRlQW5kRmlyZURyYWdFdmVudCgnZ3JpZC1kcmFnLXN0YXJ0JywgZG93bkV2ZW50KTtcbiAgICAgICAgICAgICAgICBkcmFnU3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNyZWF0ZUFuZEZpcmVEcmFnRXZlbnQoJ2dyaWQtZHJhZycsIGUpO1xuXG4gICAgICAgICAgICBpZiAoZS5yb3cgIT09IGxhc3REcmFnUm93IHx8IGUuY29sICE9PSBsYXN0RHJhZ0NvbCkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZUFuZEZpcmVEcmFnRXZlbnQoJ2dyaWQtY2VsbC1kcmFnJywgZSk7XG5cbiAgICAgICAgICAgICAgICBsYXN0RHJhZ1JvdyA9IGUucm93O1xuICAgICAgICAgICAgICAgIGxhc3REcmFnQ29sID0gZS5jb2w7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHVuYmluZFVwID0gZ3JpZC5ldmVudExvb3AuYmluZCgnbW91c2V1cCcsIHdpbmRvdywgaGFuZGxlTW91c2VVcCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTW91c2VVcChlKSB7XG4gICAgICAgICAgICB1bmJpbmRNb3ZlKCk7XG4gICAgICAgICAgICB1bmJpbmRVcCgpO1xuXG4gICAgICAgICAgICB2YXIgZHJhZ0VuZCA9IGNyZWF0ZURyYWdFdmVudEZyb21Nb3VzZUV2ZW50KCdncmlkLWRyYWctZW5kJywgZSk7XG5cbiAgICAgICAgICAgIC8vcm93LCBjb2wsIHgsIGFuZCB5IHNob3VsZCBpbmhlcml0XG4gICAgICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKGRyYWdFbmQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlRHJhZ0V2ZW50RnJvbU1vdXNlRXZlbnQodHlwZSwgZSkge1xuICAgICAgICB2YXIgZXZlbnQgPSBjdXN0b21FdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgUFJPUFNfVE9fQ09QWV9GUk9NX01PVVNFX0VWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICBldmVudFtwcm9wXSA9IGVbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50ID0gZTtcbiAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUFuZEZpcmVEcmFnRXZlbnQodHlwZSwgZSkge1xuICAgICAgICB2YXIgZHJhZyA9IGNyZWF0ZURyYWdFdmVudEZyb21Nb3VzZUV2ZW50KHR5cGUsIGUpO1xuICAgICAgICBpZiAoZS50YXJnZXQpIHtcbiAgICAgICAgICAgIGUudGFyZ2V0LmRpc3BhdGNoRXZlbnQoZHJhZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKGRyYWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkcmFnO1xuICAgIH1cblxuICAgIHJldHVybiBtb2RlbDtcbn07IiwidmFyIHV0aWwgPSByZXF1aXJlKCdAZ3JpZC91dGlsJyk7XG52YXIgY2FwaXRhbGl6ZSA9IHJlcXVpcmUoJ2NhcGl0YWxpemUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBkaXJ0eUNsZWFuID0gcmVxdWlyZSgnQGdyaWQvZGlydHktY2xlYW4nKShncmlkKTtcblxuXG4gICAgdmFyIHJvdztcbiAgICB2YXIgbW9kZWwgPSB7Y29sOiAwfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwsICdyb3cnLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgaWYgKHIgPCAwIHx8IGlzTmFOKHIpKSB7XG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgPSByO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbW9kZWwucm93ID0gMDtcblxuICAgIG1vZGVsLmlzRGlydHkgPSBkaXJ0eUNsZWFuLmlzRGlydHk7XG5cbiAgICBtb2RlbC5zY3JvbGxUbyA9IGZ1bmN0aW9uIChyLCBjLCBkb250RmlyZSkge1xuICAgICAgICBpZiAoaXNOYU4ocikgfHwgaXNOYU4oYykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF4Um93ID0gKGdyaWQucm93TW9kZWwubGVuZ3RoKCkgfHwgMSkgLSAxO1xuICAgICAgICB2YXIgbWF4Q29sID0gKGdyaWQuY29sTW9kZWwubGVuZ3RoKCkgfHwgMSkgLSAxO1xuICAgICAgICB2YXIgbGFzdFJvdyA9IG1vZGVsLnJvdztcbiAgICAgICAgdmFyIGxhc3RDb2wgPSBtb2RlbC5jb2w7XG4gICAgICAgIG1vZGVsLnJvdyA9IHV0aWwuY2xhbXAociwgMCwgbWF4Um93KTtcbiAgICAgICAgbW9kZWwuY29sID0gdXRpbC5jbGFtcChjLCAwLCBtYXhDb2wpO1xuICAgICAgICBpZiAobGFzdFJvdyAhPT0gbW9kZWwucm93IHx8IGxhc3RDb2wgIT09IG1vZGVsLmNvbCkge1xuICAgICAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICAgICAgaWYgKCFkb250RmlyZSkge1xuICAgICAgICAgICAgICAgIHZhciB0b3AgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC5oZWlnaHQoMCwgbW9kZWwucm93IC0gMSk7XG4gICAgICAgICAgICAgICAgdmFyIGxlZnQgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC53aWR0aCgwLCBtb2RlbC5jb2wgLSAxKTtcbiAgICAgICAgICAgICAgICBncmlkLnBpeGVsU2Nyb2xsTW9kZWwuc2Nyb2xsVG8odG9wLCBsZWZ0LCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb252ZXJ0VmlydHVhbFRvU2Nyb2xsKHZpcnR1YWxDb29yZCwgcm93T3JDb2wpIHtcbiAgICAgICAgcmV0dXJuIHZpcnR1YWxDb29yZCAtIGdyaWRbcm93T3JDb2wgKyAnTW9kZWwnXS5udW1GaXhlZCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNjcm9sbFRvUm93T3JDb2wodmlydHVhbENvb3JkLCByb3dPckNvbCwgaGVpZ2h0V2lkdGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRTY3JvbGwgPSBtb2RlbFtyb3dPckNvbF07XG4gICAgICAgIHZhciBzY3JvbGxUbyA9IGN1cnJlbnRTY3JvbGw7XG4gICAgICAgIGlmIChncmlkLnZpZXdQb3J0W3Jvd09yQ29sICsgJ0lzSW5WaWV3J10odmlydHVhbENvb3JkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNjcm9sbFRvO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRhcmdldFNjcm9sbCA9IGNvbnZlcnRWaXJ0dWFsVG9TY3JvbGwodmlydHVhbENvb3JkLCByb3dPckNvbCk7XG4gICAgICAgIGlmICh0YXJnZXRTY3JvbGwgPCBjdXJyZW50U2Nyb2xsKSB7XG4gICAgICAgICAgICBzY3JvbGxUbyA9IHRhcmdldFNjcm9sbDtcbiAgICAgICAgfSBlbHNlIGlmICh0YXJnZXRTY3JvbGwgPiBjdXJyZW50U2Nyb2xsKSB7XG5cbiAgICAgICAgICAgIHZhciBsZW5ndGhUb0NlbGwgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFtoZWlnaHRXaWR0aF0oMCwgdmlydHVhbENvb3JkKTtcbiAgICAgICAgICAgIHZhciBudW1GaXhlZCA9IGdyaWRbcm93T3JDb2wgKyAnTW9kZWwnXS5udW1GaXhlZCgpO1xuICAgICAgICAgICAgc2Nyb2xsVG8gPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IG51bUZpeGVkOyBpIDwgdmlydHVhbENvb3JkOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZW5ndGhUb0NlbGwgLT0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWxbaGVpZ2h0V2lkdGhdKGkpO1xuICAgICAgICAgICAgICAgIHNjcm9sbFRvID0gaSAtIChudW1GaXhlZCAtIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsZW5ndGhUb0NlbGwgPD0gZ3JpZC52aWV3UG9ydFtoZWlnaHRXaWR0aF0pIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNjcm9sbFRvO1xuICAgIH1cblxuICAgIG1vZGVsLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24gKHZyLCB2Yykge1xuICAgICAgICB2ciA9IGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLmNsYW1wUm93KHZyKTtcbiAgICAgICAgdmMgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC5jbGFtcENvbCh2Yyk7XG4gICAgICAgIHZhciBuZXdSb3cgPSBnZXRTY3JvbGxUb1Jvd09yQ29sKHZyLCAncm93JywgJ2hlaWdodCcpO1xuICAgICAgICB2YXIgbmV3Q29sID0gZ2V0U2Nyb2xsVG9Sb3dPckNvbCh2YywgJ2NvbCcsICd3aWR0aCcpO1xuICAgICAgICBtb2RlbC5zY3JvbGxUbyhuZXdSb3csIG5ld0NvbCk7XG4gICAgfTtcblxuXG4gICAgcmV0dXJuIG1vZGVsO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgYXBpID0gcmVxdWlyZSgnQGdyaWQvYWJzdHJhY3Qtcm93LWNvbC1tb2RlbCcpKGdyaWQsICdjb2wnLCAnd2lkdGgnLCAxMDApO1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwidmFyIGVsZW1lbnRDbGFzcyA9IHJlcXVpcmUoJ2VsZW1lbnQtY2xhc3MnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKF9ncmlkKSB7XG4gICAgdmFyIGdyaWQgPSBfZ3JpZDtcblxuICAgIHZhciBhcGkgPSB7YW5ub3RhdGVEZWNvcmF0b3I6IG1ha2VSZW9yZGVyRGVjb3JhdG9yfTtcblxuICAgIGZ1bmN0aW9uIG1ha2VSZW9yZGVyRGVjb3JhdG9yKGhlYWRlckRlY29yYXRvcikge1xuICAgICAgICB2YXIgY29sID0gaGVhZGVyRGVjb3JhdG9yLmxlZnQ7XG4gICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QgPSBncmlkLmRlY29yYXRvcnMuY3JlYXRlKDAsIHVuZGVmaW5lZCwgSW5maW5pdHksIHVuZGVmaW5lZCwgJ3B4JywgJ3JlYWwnKTtcblxuICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0LnBvc3RSZW5kZXIgPSBmdW5jdGlvbiAoZGl2KSB7XG4gICAgICAgICAgICBkaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLWRyYWctcmVjdCcpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGhlYWRlckRlY29yYXRvci5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUucmVhbENvbCA8IGdyaWQuY29sTW9kZWwubnVtRml4ZWQoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBncmlkLmRlY29yYXRvcnMuYWRkKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QpO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0LndpZHRoID0gZ3JpZC52aWV3UG9ydC5nZXRDb2xXaWR0aChjb2wpO1xuICAgICAgICAgICAgdmFyIGNvbE9mZnNldCA9IGUuZ3JpZFggLSBoZWFkZXJEZWNvcmF0b3IuZ2V0RGVjb3JhdG9yTGVmdCgpO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0Ll90YXJnZXRDb2wgPSBncmlkLmRlY29yYXRvcnMuY3JlYXRlKDAsIHVuZGVmaW5lZCwgSW5maW5pdHksIDEsICdjZWxsJywgJ3JlYWwnKTtcbiAgICAgICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5wb3N0UmVuZGVyID0gZnVuY3Rpb24gKGRpdikge1xuICAgICAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtcmVvcmRlci10YXJnZXQnKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0Ll90YXJnZXRDb2wuX3JlbmRlcmVkRWxlbSA9IGRpdjtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBncmlkLmRlY29yYXRvcnMuYWRkKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbCk7XG5cbiAgICAgICAgICAgIGhlYWRlckRlY29yYXRvci5fdW5iaW5kRHJhZyA9IGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZHJhZycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl9kcmFnUmVjdC5sZWZ0ID0gdXRpbC5jbGFtcChlLmdyaWRYIC0gY29sT2Zmc2V0LCBncmlkLnZpZXdQb3J0LmdldENvbExlZnQoZ3JpZC5jb2xNb2RlbC5udW1GaXhlZCgpKSwgSW5maW5pdHkpO1xuICAgICAgICAgICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5sZWZ0ID0gdXRpbC5jbGFtcChlLnJlYWxDb2wsIGdyaWQuY29sTW9kZWwubnVtRml4ZWQoKSwgSW5maW5pdHkpO1xuICAgICAgICAgICAgICAgIGlmIChlLnJlYWxDb2wgPiBjb2wpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudENsYXNzKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5fcmVuZGVyZWRFbGVtKS5hZGQoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudENsYXNzKGhlYWRlckRlY29yYXRvci5fZHJhZ1JlY3QuX3RhcmdldENvbC5fcmVuZGVyZWRFbGVtKS5yZW1vdmUoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWdFbmQgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctZW5kJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0Q29sID0gaGVhZGVyRGVjb3JhdG9yLl9kcmFnUmVjdC5fdGFyZ2V0Q29sLmxlZnQ7XG5cbiAgICAgICAgICAgICAgICBncmlkLmNvbE1vZGVsLm1vdmUoZ3JpZC52aWV3UG9ydC50b1ZpcnR1YWxDb2woY29sKSwgZ3JpZC52aWV3UG9ydC50b1ZpcnR1YWxDb2wodGFyZ2V0Q29sKSk7XG4gICAgICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLnJlbW92ZShbaGVhZGVyRGVjb3JhdG9yLl9kcmFnUmVjdC5fdGFyZ2V0Q29sLCBoZWFkZXJEZWNvcmF0b3IuX2RyYWdSZWN0XSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl91bmJpbmREcmFnKCk7XG4gICAgICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl91bmJpbmREcmFnRW5kKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBoZWFkZXJEZWNvcmF0b3IucG9zdFJlbmRlciA9IGZ1bmN0aW9uIChkaXYpIHtcbiAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtY29sLXJlb3JkZXInKTtcbiAgICAgICAgICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZHJhZy1zdGFydCcsIGRpdiwgaGVhZGVyRGVjb3JhdG9yLl9vbkRyYWdTdGFydCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGhlYWRlckRlY29yYXRvcjtcbiAgICB9XG5cbiAgICByZXF1aXJlKCdAZ3JpZC9oZWFkZXItZGVjb3JhdG9ycycpKGdyaWQsIGFwaSk7XG5cbiAgICByZXR1cm4gYXBpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cblxuICAgIHZhciBhcGkgPSB7YW5ub3RhdGVEZWNvcmF0b3I6IGFubm90YXRlRGVjb3JhdG9yfTtcblxuICAgIGZ1bmN0aW9uIGFubm90YXRlRGVjb3JhdG9yKGhlYWRlckRlY29yYXRvcikge1xuICAgICAgICB2YXIgY29sID0gaGVhZGVyRGVjb3JhdG9yLmxlZnQ7XG4gICAgICAgIGhlYWRlckRlY29yYXRvci5fZHJhZ0xpbmUgPSBncmlkLmRlY29yYXRvcnMuY3JlYXRlKDAsIHVuZGVmaW5lZCwgSW5maW5pdHksIDEsICdweCcsICdyZWFsJyk7XG5cbiAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl9kcmFnTGluZS5wb3N0UmVuZGVyID0gZnVuY3Rpb24gKGRpdikge1xuICAgICAgICAgICAgZGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnZ3JpZC1kcmFnLWxpbmUnKTtcbiAgICAgICAgfTtcblxuICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChoZWFkZXJEZWNvcmF0b3IuX2RyYWdMaW5lKTtcblxuICAgICAgICAgICAgaGVhZGVyRGVjb3JhdG9yLl91bmJpbmREcmFnID0gZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWluWCA9IGhlYWRlckRlY29yYXRvci5nZXREZWNvcmF0b3JMZWZ0KCkgKyAxMDtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX2RyYWdMaW5lLmxlZnQgPSBNYXRoLm1heChlLmdyaWRYLCBtaW5YKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWdFbmQgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctZW5kJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBncmlkLmNvbE1vZGVsLmdldChncmlkLnZpZXdQb3J0LnRvVmlydHVhbENvbChjb2wpKS53aWR0aCA9IGhlYWRlckRlY29yYXRvci5fZHJhZ0xpbmUubGVmdCAtIGhlYWRlckRlY29yYXRvci5nZXREZWNvcmF0b3JMZWZ0KCk7XG4gICAgICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLnJlbW92ZShoZWFkZXJEZWNvcmF0b3IuX2RyYWdMaW5lKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWcoKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJEZWNvcmF0b3IuX3VuYmluZERyYWdFbmQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGhlYWRlckRlY29yYXRvci5wb3N0UmVuZGVyID0gZnVuY3Rpb24gKGRpdikge1xuICAgICAgICAgICAgZGl2LnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDUwJSknO1xuICAgICAgICAgICAgZGl2LnN0eWxlLndlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDUwJSknO1xuXG4gICAgICAgICAgICBkaXYuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2xlZnQnKTtcbiAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NvbC1yZXNpemUnKTtcblxuICAgICAgICAgICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnLXN0YXJ0JywgZGl2LCBoZWFkZXJEZWNvcmF0b3IuX29uRHJhZ1N0YXJ0KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXF1aXJlKCdAZ3JpZC9oZWFkZXItZGVjb3JhdG9ycycpKGdyaWQsIGFwaSk7XG5cbiAgICByZXR1cm4gYXBpO1xufTsiLCJ2YXIgZWxlbWVudENsYXNzID0gcmVxdWlyZSgnZWxlbWVudC1jbGFzcycpO1xudmFyIGRpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBncmlkID0ge307XG5cbiAgICAvL3RoZSBvcmRlciBoZXJlIG1hdHRlcnMgYmVjYXVzZSBzb21lIG9mIHRoZXNlIGRlcGVuZCBvbiBlYWNoIG90aGVyXG4gICAgZ3JpZC5ldmVudExvb3AgPSByZXF1aXJlKCdAZ3JpZC9ldmVudC1sb29wJykoZ3JpZCk7XG4gICAgZ3JpZC5kZWNvcmF0b3JzID0gcmVxdWlyZSgnQGdyaWQvZGVjb3JhdG9ycycpKGdyaWQpO1xuICAgIGdyaWQuY2VsbENsYXNzZXMgPSByZXF1aXJlKCdAZ3JpZC9jZWxsLWNsYXNzZXMnKShncmlkKTtcbiAgICBncmlkLnJvd01vZGVsID0gcmVxdWlyZSgnQGdyaWQvcm93LW1vZGVsJykoZ3JpZCk7XG4gICAgZ3JpZC5jb2xNb2RlbCA9IHJlcXVpcmUoJ0BncmlkL2NvbC1tb2RlbCcpKGdyaWQpO1xuICAgIGdyaWQuZGF0YU1vZGVsID0gcmVxdWlyZSgnQGdyaWQvc2ltcGxlLWRhdGEtbW9kZWwnKShncmlkKTtcbiAgICBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbCA9IHJlcXVpcmUoJ0BncmlkL3ZpcnR1YWwtcGl4ZWwtY2VsbC1tb2RlbCcpKGdyaWQpO1xuICAgIGdyaWQuY2VsbFNjcm9sbE1vZGVsID0gcmVxdWlyZSgnQGdyaWQvY2VsbC1zY3JvbGwtbW9kZWwnKShncmlkKTtcbiAgICBncmlkLmNlbGxNb3VzZU1vZGVsID0gcmVxdWlyZSgnQGdyaWQvY2VsbC1tb3VzZS1tb2RlbCcpKGdyaWQpO1xuXG4gICAgZ3JpZC52aWV3UG9ydCA9IHJlcXVpcmUoJ0BncmlkL3ZpZXctcG9ydCcpKGdyaWQpO1xuICAgIGdyaWQudmlld0xheWVyID0gcmVxdWlyZSgnQGdyaWQvdmlldy1sYXllcicpKGdyaWQpO1xuXG4gICAgLy90aGluZ3Mgd2l0aCBsb2dpYyB0aGF0IGFsc28gcmVnaXN0ZXIgZGVjb3JhdG9ycyAoc2xpZ2h0bHkgbGVzcyBjb3JlIHRoYW4gdGhlIG90aGVyIG1vZGVscylcbiAgICBncmlkLm5hdmlnYXRpb25Nb2RlbCA9IHJlcXVpcmUoJ0BncmlkL25hdmlnYXRpb24tbW9kZWwnKShncmlkKTtcbiAgICBncmlkLnBpeGVsU2Nyb2xsTW9kZWwgPSByZXF1aXJlKCdAZ3JpZC9waXhlbC1zY3JvbGwtbW9kZWwnKShncmlkKTtcbiAgICBncmlkLmNvbFJlc2l6ZSA9IHJlcXVpcmUoJ0BncmlkL2NvbC1yZXNpemUnKShncmlkKTtcbiAgICBncmlkLmNvbFJlb3JkZXIgPSByZXF1aXJlKCdAZ3JpZC9jb2wtcmVvcmRlcicpKGdyaWQpO1xuXG4gICAgLy9zb3J0IGZ1bmN0aW9uYWxpdHkgaGFzIG5vIGFwaSwgaXQganVzdCBzZXRzIHVwIGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgLy9mb3Igbm93IGRpc2FibGUgaGVhZGVyIGNsaWNrIHNvcnQgY2F1c2Ugd2UncmUgZ29ubmEgdXNlIHRoZSBjbGljayBmb3Igc2VsZWN0aW9uIGluc3RlYWRcbiAgICAvL3JlcXVpcmUoJ0BncmlkL2NvbC1zb3J0JykoZ3JpZCk7XG5cblxuICAgIHZhciBkcmF3UmVxdWVzdGVkID0gZmFsc2U7XG4gICAgZ3JpZC5yZXF1ZXN0RHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFncmlkLmV2ZW50TG9vcC5pc1J1bm5pbmcpIHtcbiAgICAgICAgICAgIGdyaWQudmlld0xheWVyLmRyYXcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyYXdSZXF1ZXN0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZHJhdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZHJhd1JlcXVlc3RlZCA9IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYWRkRXhpdExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGRyYXdSZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIGdyaWQudmlld0xheWVyLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlRm9jdXNUZXh0QXJlYShjb250YWluZXIpIHtcbiAgICAgICAgdmFyIHRleHRhcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgICAgICAgdGV4dGFyZWEuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICB0ZXh0YXJlYS5zdHlsZS5sZWZ0ID0gJy0xMDAwMDBweCc7XG4gICAgICAgIHRleHRhcmVhLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRDbGFzcyhjb250YWluZXIpLmFkZCgnZm9jdXMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGV4dGFyZWEuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Q2xhc3MoY29udGFpbmVyKS5yZW1vdmUoJ2ZvY3VzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0ZXh0YXJlYSk7XG4gICAgICAgIGlmICghY29udGFpbmVyLmdldEF0dHJpYnV0ZSgndGFiSW5kZXgnKSkge1xuICAgICAgICAgICAgY29udGFpbmVyLnRhYkluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGV4dGFyZWEpIHtcbiAgICAgICAgICAgICAgICB0ZXh0YXJlYS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGV4dGFyZWE7XG4gICAgfVxuXG4gICAgZ3JpZC5idWlsZCA9IGZ1bmN0aW9uIChjb250YWluZXIpIHtcbiAgICAgICAgY3JlYXRlRm9jdXNUZXh0QXJlYShjb250YWluZXIpO1xuICAgICAgICBncmlkLnZpZXdQb3J0LnNpemVUb0NvbnRhaW5lcihjb250YWluZXIpO1xuICAgICAgICBncmlkLnZpZXdMYXllci5idWlsZChjb250YWluZXIpO1xuICAgICAgICBncmlkLmV2ZW50TG9vcC5zZXRDb250YWluZXIoY29udGFpbmVyKTtcbiAgICB9O1xuXG4gICAgZ3JpZC5tYWtlRGlydHlDbGVhbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRpcnR5Q2xlYW4oZ3JpZCk7XG4gICAgfTtcblxuICAgIHJldHVybiBncmlkO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChuYW1lLCBidWJibGVzLCBjYW5jZWxhYmxlLCBkZXRhaWwpIHtcbiAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTsgIC8vIE1VU1QgYmUgJ0N1c3RvbUV2ZW50J1xuICAgIGV2ZW50LmluaXRDdXN0b21FdmVudChuYW1lLCBidWJibGVzLCBjYW5jZWxhYmxlLCBkZXRhaWwpO1xuICAgIHJldHVybiBldmVudDtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4sIGRlbGF5KSB7XG4gICAgdmFyIGYgPSBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgICAgIGlmIChmLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChmLnRpbWVvdXQpO1xuICAgICAgICAgICAgZi50aW1lb3V0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGYudGltZW91dCA9IHNldFRpbWVvdXQoZm4sIGRlbGF5KTtcbiAgICB9O1xuICAgIHJldHVybiBmO1xufTsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcbnZhciBtYWtlRGlydHlDbGVhbiA9IHJlcXVpcmUoJ0BncmlkL2RpcnR5LWNsZWFuJyk7XG52YXIgcG9zaXRpb25SYW5nZSA9IHJlcXVpcmUoJ0BncmlkL3Bvc2l0aW9uLXJhbmdlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKF9ncmlkKSB7XG4gICAgdmFyIGdyaWQgPSBfZ3JpZDtcblxuICAgIHZhciBkaXJ0eUNsZWFuID0gbWFrZURpcnR5Q2xlYW4oZ3JpZCk7XG5cbiAgICB2YXIgYWxpdmVEZWNvcmF0b3JzID0gW107XG4gICAgdmFyIGRlYWREZWNvcmF0b3JzID0gW107XG5cbiAgICB2YXIgZGVjb3JhdG9ycyA9IHtcbiAgICAgICAgYWRkOiBmdW5jdGlvbiAoZGVjb3JhdG9yKSB7XG4gICAgICAgICAgICBhbGl2ZURlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgZGlydHlDbGVhbi5zZXREaXJ0eSgpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uIChkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICBpZiAoIXV0aWwuaXNBcnJheShkZWNvcmF0b3JzKSkge1xuICAgICAgICAgICAgICAgIGRlY29yYXRvcnMgPSBbZGVjb3JhdG9yc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZnVuY3Rpb24gKGRlY29yYXRvcikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IGFsaXZlRGVjb3JhdG9ycy5pbmRleE9mKGRlY29yYXRvcik7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhbGl2ZURlY29yYXRvcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgZGVhZERlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgICAgICAgICBkaXJ0eUNsZWFuLnNldERpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEFsaXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYWxpdmVEZWNvcmF0b3JzLnNsaWNlKDApO1xuICAgICAgICB9LFxuICAgICAgICBwb3BBbGxEZWFkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2xkRGVhZCA9IGRlYWREZWNvcmF0b3JzO1xuICAgICAgICAgICAgZGVhZERlY29yYXRvcnMgPSBbXTtcbiAgICAgICAgICAgIHJldHVybiBvbGREZWFkO1xuICAgICAgICB9LFxuICAgICAgICBpc0RpcnR5OiBkaXJ0eUNsZWFuLmlzRGlydHksXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKHQsIGwsIGgsIHcsIHUsIHMpIHtcbiAgICAgICAgICAgIHZhciBkZWNvcmF0b3IgPSB7fTtcbiAgICAgICAgICAgIHZhciB0aGlzRGlydHlDbGVhbiA9IG1ha2VEaXJ0eUNsZWFuKGdyaWQpO1xuXG4gICAgICAgICAgICAvL21peGluIHRoZSBwb3NpdGlvbiByYW5nZSBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICBwb3NpdGlvblJhbmdlKGRlY29yYXRvciwgdGhpc0RpcnR5Q2xlYW4sIGRpcnR5Q2xlYW4pO1xuICAgICAgICAgICAgZGVjb3JhdG9yLnRvcCA9IHQ7XG4gICAgICAgICAgICBkZWNvcmF0b3IubGVmdCA9IGw7XG4gICAgICAgICAgICBkZWNvcmF0b3IuaGVpZ2h0ID0gaDtcbiAgICAgICAgICAgIGRlY29yYXRvci53aWR0aCA9IHc7XG4gICAgICAgICAgICBkZWNvcmF0b3IudW5pdHMgPSB1IHx8IGRlY29yYXRvci51bml0cztcbiAgICAgICAgICAgIGRlY29yYXRvci5zcGFjZSA9IHMgfHwgZGVjb3JhdG9yLnNwYWNlO1xuXG4gICAgICAgICAgICAvL3RoZXkgY2FuIG92ZXJyaWRlIGJ1dCB3ZSBzaG91bGQgaGF2ZSBhbiBlbXB0eSBkZWZhdWx0IHRvIHByZXZlbnQgbnBlc1xuICAgICAgICAgICAgZGVjb3JhdG9yLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgZGl2LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgICAgICBkaXYuc3R5bGUudG9wID0gJzBweCc7XG4gICAgICAgICAgICAgICAgZGl2LnN0eWxlLmxlZnQgPSAnMHB4JztcbiAgICAgICAgICAgICAgICBkaXYuc3R5bGUuYm90dG9tID0gJzBweCc7XG4gICAgICAgICAgICAgICAgZGl2LnN0eWxlLnJpZ2h0ID0gJzBweCc7XG4gICAgICAgICAgICAgICAgaWYgKGRlY29yYXRvci5wb3N0UmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5wb3N0UmVuZGVyKGRpdik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkaXY7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBkaXJ0eSA9IHRydWU7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYXcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFwaS5zZXRDbGVhbigpO1xuICAgIH0pO1xuXG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBpc0RpcnR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZGlydHk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzQ2xlYW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhZGlydHk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldERpcnR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAvL3doZW4gdGhpbmdzIGFyZSBpbml0YWxpemluZyBzb21ldGltZXMgdGhpcyBkb2Vzbid0IGV4aXN0IHlldFxuICAgICAgICAgICAgLy93ZSBoYXZlIHRvIGhvcGUgdGhhdCBhdCB0aGUgZW5kIG9mIGluaXRpYWxpemF0aW9uIHRoZSBncmlkIHdpbGwgY2FsbCByZXF1ZXN0IGRyYXcgaXRzZWxmXG4gICAgICAgICAgICBpZiAoZ3JpZC5yZXF1ZXN0RHJhdykge1xuICAgICAgICAgICAgICAgIGdyaWQucmVxdWVzdERyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0Q2xlYW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRpcnR5ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBhcGk7XG59OyIsInZhciBtb3VzZXdoZWVsID0gcmVxdWlyZSgnQGdyaWQvbW91c2V3aGVlbCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCdAZ3JpZC91dGlsJyk7XG52YXIgbGlzdGVuZXJzID0gcmVxdWlyZSgnQGdyaWQvbGlzdGVuZXJzJyk7XG5cbnZhciBFVkVOVFMgPSBbJ2NsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJywgJ21vdXNlbW92ZScsICdkYmxjbGljaycsICdrZXlkb3duJywgJ2tleXByZXNzJywgJ2tleXVwJ107XG5cbnZhciBHUklEX0VWRU5UUyA9IFsnZ3JpZC1kcmFnLXN0YXJ0JywgJ2dyaWQtZHJhZycsICdncmlkLWNlbGwtZHJhZycsICdncmlkLWRyYWctZW5kJ107XG5cbnZhciBldmVudExvb3AgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuICAgIHZhciBlbG9vcCA9IHtcbiAgICAgICAgaXNSdW5uaW5nOiBmYWxzZVxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlcnNCeU5hbWUgPSB7fTtcbiAgICB2YXIgZG9tVW5iaW5kRm5zID0gW107XG5cbiAgICB2YXIgdW5iaW5kQWxsO1xuXG4gICAgZWxvb3Auc2V0Q29udGFpbmVyID0gZnVuY3Rpb24gKGNvbnRhaW5lcikge1xuICAgICAgICB2YXIgdW5iaW5kTW91c2VXaGVlbEZuID0gbW91c2V3aGVlbC5iaW5kKGNvbnRhaW5lciwgbWFpbkxvb3ApO1xuXG4gICAgICAgIEVWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBiaW5kVG9Eb21FbGVtZW50KGNvbnRhaW5lciwgbmFtZSwgbWFpbkxvb3ApO1xuICAgICAgICB9KTtcblxuICAgICAgICBHUklEX0VWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBiaW5kVG9Eb21FbGVtZW50KHdpbmRvdywgbmFtZSwgbWFpbkxvb3ApO1xuICAgICAgICB9KTtcblxuICAgICAgICB1bmJpbmRBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB1bmJpbmRNb3VzZVdoZWVsRm4oKTtcblxuICAgICAgICAgICAgLy9oYXZlIHRvIGNvcHkgdGhlIGFycmF5IHNpbmNlIHRoZSB1bmJpbmQgd2lsbCBhY3R1YWxseSByZW1vdmUgaXRzZWxmIGZyb20gdGhlIGFycmF5IHdoaWNoIG1vZGlmaWVzIGl0IG1pZCBpdGVyYXRpb25cbiAgICAgICAgICAgIGRvbVVuYmluZEZucy5zbGljZSgwKS5mb3JFYWNoKGZ1bmN0aW9uICh1bmJpbmQpIHtcbiAgICAgICAgICAgICAgICB1bmJpbmQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRIYW5kbGVycyhuYW1lKSB7XG4gICAgICAgIHZhciBoYW5kbGVycyA9IGhhbmRsZXJzQnlOYW1lW25hbWVdO1xuICAgICAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICAgICAgICBoYW5kbGVycyA9IGhhbmRsZXJzQnlOYW1lW25hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJpbmRUb0RvbUVsZW1lbnQoZWxlbSwgbmFtZSwgbGlzdGVuZXIpIHtcbiAgICAgICAgZWxlbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgdmFyIHVuYmluZEZuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZWxlbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgIGRvbVVuYmluZEZucy5zcGxpY2UoZG9tVW5iaW5kRm5zLmluZGV4T2YodW5iaW5kRm4pLCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgZG9tVW5iaW5kRm5zLnB1c2godW5iaW5kRm4pO1xuICAgICAgICByZXR1cm4gdW5iaW5kRm47XG4gICAgfVxuXG4gICAgZWxvb3AuYmluZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICB2YXIgbmFtZSA9IGFyZ3MuZmlsdGVyKGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbiAgICAgICAgfSlbMF07XG5cbiAgICAgICAgdmFyIGhhbmRsZXIgPSBhcmdzLmZpbHRlcihmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgICAgfSlbMF07XG5cbiAgICAgICAgaWYgKCFoYW5kbGVyIHx8ICFuYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyAnY2Fubm90IGJpbmQgd2l0aG91dCBhdCBsZWFzdCBuYW1lIGFuZCBmdW5jdGlvbic7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBlbGVtID0gYXJncy5maWx0ZXIoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIHV0aWwuaXNFbGVtZW50KGFyZykgfHwgYXJnID09PSB3aW5kb3cgfHwgYXJnID09PSBkb2N1bWVudDtcbiAgICAgICAgfSlbMF07XG5cbiAgICAgICAgaWYgKCFlbGVtKSB7XG4gICAgICAgICAgICBnZXRIYW5kbGVycyhuYW1lKS5wdXNoKGhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFuZGxlcnMgPSBnZXRIYW5kbGVycyhuYW1lKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKSwgMSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gbG9vcFdpdGgoaGFuZGxlcik7XG4gICAgICAgICAgICAvL21ha2Ugc3VyZSB0aGUgZWxlbSBjYW4gcmVjZWl2ZSBldmVudHNcbiAgICAgICAgICAgIGlmIChlbGVtLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ2FsbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYmluZFRvRG9tRWxlbWVudChlbGVtLCBuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZWxvb3AuZmlyZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBldmVudCA9IHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycgPyB7dHlwZTogZXZlbnR9IDogZXZlbnQ7XG4gICAgICAgIG1haW5Mb29wKGV2ZW50KTtcbiAgICB9O1xuXG4gICAgdmFyIGludGVyY2VwdG9ycyA9IGxpc3RlbmVycygpO1xuICAgIHZhciBleGl0TGlzdGVuZXJzID0gbGlzdGVuZXJzKCk7XG5cbiAgICBlbG9vcC5hZGRJbnRlcmNlcHRvciA9IGludGVyY2VwdG9ycy5hZGRMaXN0ZW5lcjtcbiAgICBlbG9vcC5hZGRFeGl0TGlzdGVuZXIgPSBleGl0TGlzdGVuZXJzLmFkZExpc3RlbmVyO1xuXG4gICAgZnVuY3Rpb24gbG9vcFdpdGgoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsb29wKGUsIGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgbWFpbkxvb3AgPSBsb29wV2l0aChmdW5jdGlvbiAoZSkge1xuICAgICAgICAvL2hhdmUgdG8gY29weSB0aGUgYXJyYXkgYmVjYXVzZSBoYW5kbGVycyBjYW4gdW5iaW5kIHRoZW1zZWx2ZXMgd2hpY2ggbW9kaWZpZXMgdGhlIGFycmF5XG4gICAgICAgIC8vd2UgdXNlIHNvbWUgc28gdGhhdCB3ZSBjYW4gYnJlYWsgb3V0IG9mIHRoZSBsb29wIGlmIG5lZWQgYmVcbiAgICAgICAgZ2V0SGFuZGxlcnMoZS50eXBlKS5zbGljZSgwKS5zb21lKGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICBoYW5kbGVyKGUpO1xuICAgICAgICAgICAgaWYgKGUuZ3JpZFN0b3BCdWJibGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGxvb3AoZSwgYm9keUZuKSB7XG4gICAgICAgIHZhciBpc091dGVyTG9vcFJ1bm5pbmcgPSBlbG9vcC5pc1J1bm5pbmc7XG4gICAgICAgIGVsb29wLmlzUnVubmluZyA9IHRydWU7XG4gICAgICAgIGludGVyY2VwdG9ycy5ub3RpZnkoZSk7XG4gICAgICAgIGlmICghZS5ncmlkU3RvcEJ1YmJsaW5nKSB7XG4gICAgICAgICAgICBib2R5Rm4oZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzT3V0ZXJMb29wUnVubmluZykge1xuICAgICAgICAgICAgZWxvb3AuaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBleGl0TGlzdGVuZXJzLm5vdGlmeShlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsb29wLmJpbmQoJ2dyaWQtZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdW5iaW5kQWxsKCk7XG4gICAgICAgIGVsb29wLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBlbG9vcC5zdG9wQnViYmxpbmcgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLmdyaWRTdG9wQnViYmxpbmcgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGVsb29wO1xufTtcblxuXG5ldmVudExvb3AuRVZFTlRTID0gRVZFTlRTO1xuZXZlbnRMb29wLkdSSURfRVZFTlRTID0gR1JJRF9FVkVOVFM7XG5tb2R1bGUuZXhwb3J0cyA9IGV2ZW50TG9vcDsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCwgbW9kZWwpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIGFwaSA9IG1vZGVsIHx8IHt9O1xuICAgIGFwaS5fZGVjb3JhdG9ycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gbWFrZURlY29yYXRvcihjb2wpIHtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUoMCwgY29sLCAxLCAxLCAnY2VsbCcsICdyZWFsJyk7XG5cblxuICAgICAgICBkZWNvcmF0b3IuZ2V0RGVjb3JhdG9yTGVmdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBmaXJzdFJlY3QgPSBkZWNvcmF0b3IuYm91bmRpbmdCb3ggJiYgZGVjb3JhdG9yLmJvdW5kaW5nQm94LmdldENsaWVudFJlY3RzKCkgJiYgZGVjb3JhdG9yLmJvdW5kaW5nQm94LmdldENsaWVudFJlY3RzKClbMF0gfHwge307XG4gICAgICAgICAgICByZXR1cm4gZ3JpZC52aWV3UG9ydC50b0dyaWRYKGZpcnN0UmVjdC5sZWZ0KSB8fCAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChhcGkuYW5ub3RhdGVEZWNvcmF0b3IpIHtcbiAgICAgICAgICAgIGFwaS5hbm5vdGF0ZURlY29yYXRvcihkZWNvcmF0b3IpO1xuICAgICAgICB9XG5cblxuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVuc3VyZURlY29yYXRvclBlckNvbCgpIHtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBncmlkLnZpZXdQb3J0LmNvbHM7IGMrKykge1xuICAgICAgICAgICAgaWYgKCFhcGkuX2RlY29yYXRvcnNbY10pIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVjb3JhdG9yID0gbWFrZURlY29yYXRvcihjKTtcbiAgICAgICAgICAgICAgICBhcGkuX2RlY29yYXRvcnNbY10gPSBkZWNvcmF0b3I7XG4gICAgICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC12aWV3cG9ydC1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVuc3VyZURlY29yYXRvclBlckNvbCgpO1xuICAgIH0pO1xuICAgIGVuc3VyZURlY29yYXRvclBlckNvbCgpO1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwiLypcbiBBIHNpbXBsZSBwYWNrYWdlIGZvciBjcmVhdGluZyBhIGxpc3Qgb2YgbGlzdGVuZXJzIHRoYXQgY2FuIGJlIGFkZGVkIHRvIGFuZCBub3RpZmllZFxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsaXN0ZW5lcnMgPSBbXTtcbiAgICByZXR1cm4ge1xuICAgICAgICAvL3JldHVybnMgYSByZW1vdmFsIGZ1bmN0aW9uIHRvIHVuYmluZCB0aGUgbGlzdGVuZXJcbiAgICAgICAgYWRkTGlzdGVuZXI6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnB1c2goZm4pO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGxpc3RlbmVycy5pbmRleE9mKGZuKSwgMSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcihlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn07IiwidmFyIEVWRU5UX05BTUVTID0gWydtb3VzZXdoZWVsJywgJ3doZWVsJywgJ0RPTU1vdXNlU2Nyb2xsJ107XG5cbnZhciBhcGkgPSB7XG4gICAgZ2V0RGVsdGE6IGZ1bmN0aW9uIChldmVudCwgeGF4aXMpIHtcbiAgICAgICAgaWYgKGV2ZW50LndoZWVsRGVsdGEpIHsgLy9mb3IgZXZlcnl0aGluZyBidXQgZmlyZWZveFxuICAgICAgICAgICAgdmFyIGRlbHRhID0gZXZlbnQud2hlZWxEZWx0YVk7XG4gICAgICAgICAgICBpZiAoeGF4aXMpIHtcbiAgICAgICAgICAgICAgICBkZWx0YSA9IGV2ZW50LndoZWVsRGVsdGFYO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlbHRhO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQuZGV0YWlsKSB7IC8vZm9yIGZpcmVmb3ggcHJlIHZlcnNpb24gMTdcbiAgICAgICAgICAgIGlmIChldmVudC5heGlzICYmICgoZXZlbnQuYXhpcyA9PT0gMSAmJiB4YXhpcykgfHwgKGV2ZW50LmF4aXMgPT09IDIgJiYgIXhheGlzKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTEgKiBldmVudC5kZXRhaWwgKiAxMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChldmVudC5kZWx0YVggfHwgZXZlbnQuZGVsdGFZKSB7XG4gICAgICAgICAgICBpZiAoeGF4aXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTEgKiBldmVudC5kZWx0YVg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMSAqIGV2ZW50LmRlbHRhWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LFxuXG4gICAgLy9iaW5kcyBhIGNyb3NzIGJyb3dzZXIgbm9ybWFsaXplZCBtb3VzZXdoZWVsIGV2ZW50LCBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCB1bmJpbmQgdGhlIGxpc3RlbmVyO1xuICAgIGJpbmQ6IGZ1bmN0aW9uIChlbGVtLCBsaXN0ZW5lcikge1xuICAgICAgICB2YXIgbm9ybWFsaXplZExpc3RlbmVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyKG5vcm1hbGl6ZVdoZWVsRXZlbnQoZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIEVWRU5UX05BTUVTLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBub3JtYWxpemVkTGlzdGVuZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRVZFTlRfTkFNRVMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBub3JtYWxpemVkTGlzdGVuZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9LFxuICAgIG5vcm1hbGl6ZTogbm9ybWFsaXplV2hlZWxFdmVudFxufTtcblxuZnVuY3Rpb24gbm9ybWFsaXplV2hlZWxFdmVudChlKSB7XG4gICAgdmFyIGRlbHRhWCA9IGFwaS5nZXREZWx0YShlLCB0cnVlKTtcbiAgICB2YXIgZGVsdGFZID0gYXBpLmdldERlbHRhKGUpO1xuICAgIHZhciBuZXdFdmVudCA9IE9iamVjdC5jcmVhdGUoZSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGVsdGFZOiB7dmFsdWU6IGRlbHRhWX0sXG4gICAgICAgICAgICBkZWx0YVg6IHt2YWx1ZTogZGVsdGFYfSxcbiAgICAgICAgICAgIHR5cGU6IHt2YWx1ZTogJ21vdXNld2hlZWwnfVxuICAgICAgICB9KTtcblxuICAgIG5ld0V2ZW50LnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBuZXdFdmVudC5kZWZhdWx0UHJldmVudGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKGUgJiYgZS5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gbmV3RXZlbnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXBpOyIsInZhciBrZXkgPSByZXF1aXJlKCdrZXknKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xudmFyIHJhbmdlVXRpbCA9IHJlcXVpcmUoJ0BncmlkL3JhbmdlLXV0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIG1vZGVsID0ge1xuICAgICAgICBmb2N1czoge1xuICAgICAgICAgICAgcm93OiAwLFxuICAgICAgICAgICAgY29sOiAwXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGZvY3VzQ2xhc3MgPSBncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgwLCAwLCAnZm9jdXMnKTtcbiAgICBncmlkLmNlbGxDbGFzc2VzLmFkZChmb2N1c0NsYXNzKTtcblxuICAgIG1vZGVsLmZvY3VzRGVjb3JhdG9yID0gZ3JpZC5kZWNvcmF0b3JzLmNyZWF0ZSgwLCAwLCAxLCAxKTtcbiAgICBtb2RlbC5mb2N1c0RlY29yYXRvci5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkaXYgPSBkZWZhdWx0UmVuZGVyKCk7XG4gICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtZm9jdXMtZGVjb3JhdG9yJyk7XG4gICAgICAgIHJldHVybiBkaXY7XG4gICAgfTtcbiAgICBncmlkLmRlY29yYXRvcnMuYWRkKG1vZGVsLmZvY3VzRGVjb3JhdG9yKTtcblxuXG4gICAgZnVuY3Rpb24gY2xhbXBSb3dUb01pbk1heChyb3cpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAocm93LCAwLCBncmlkLnJvd01vZGVsLmxlbmd0aCgpIC0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xhbXBDb2xUb01pbk1heChjb2wpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAoY29sLCAwLCBncmlkLmNvbE1vZGVsLmxlbmd0aCgpIC0gMSk7XG4gICAgfVxuXG4gICAgbW9kZWwuc2V0Rm9jdXMgPSBmdW5jdGlvbiBzZXRGb2N1cyhyb3csIGNvbCwgb3B0aW9uYWxFdmVudCkge1xuICAgICAgICByb3cgPSBjbGFtcFJvd1RvTWluTWF4KHJvdyk7XG4gICAgICAgIGNvbCA9IGNsYW1wQ29sVG9NaW5NYXgoY29sKTtcbiAgICAgICAgbW9kZWwuZm9jdXMucm93ID0gcm93O1xuICAgICAgICBtb2RlbC5mb2N1cy5jb2wgPSBjb2w7XG4gICAgICAgIGZvY3VzQ2xhc3MudG9wID0gcm93O1xuICAgICAgICBmb2N1c0NsYXNzLmxlZnQgPSBjb2w7XG4gICAgICAgIG1vZGVsLmZvY3VzRGVjb3JhdG9yLnRvcCA9IHJvdztcbiAgICAgICAgbW9kZWwuZm9jdXNEZWNvcmF0b3IubGVmdCA9IGNvbDtcbiAgICAgICAgZ3JpZC5jZWxsU2Nyb2xsTW9kZWwuc2Nyb2xsSW50b1ZpZXcocm93LCBjb2wpO1xuICAgICAgICAvL2ZvY3VzIGNoYW5nZXMgYWx3YXlzIGNsZWFyIHRoZSBzZWxlY3Rpb25cbiAgICAgICAgY2xlYXJTZWxlY3Rpb24oKTtcbiAgICB9O1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBhcnJvdyA9IGtleS5jb2RlLmFycm93O1xuICAgICAgICBpZiAoIWtleS5pcyhhcnJvdywgZS53aGljaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvL2ZvY3VzIGxvZ2ljXG5cbiAgICAgICAgaWYgKCFlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAvL2lmIG5vdGhpbmcgY2hhbmdlcyBncmVhdCB3ZSdsbCBzdGF5IHdoZXJlIHdlIGFyZVxuICAgICAgICAgICAgdmFyIG5hdlRvUm93ID0gbW9kZWwuZm9jdXMucm93O1xuICAgICAgICAgICAgdmFyIG5hdlRvQ29sID0gbW9kZWwuZm9jdXMuY29sO1xuXG5cbiAgICAgICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xuICAgICAgICAgICAgICAgIGNhc2UgYXJyb3cuZG93bi5jb2RlOlxuICAgICAgICAgICAgICAgICAgICBuYXZUb1JvdysrO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGFycm93LnVwLmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIG5hdlRvUm93LS07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgYXJyb3cucmlnaHQuY29kZTpcbiAgICAgICAgICAgICAgICAgICAgbmF2VG9Db2wrKztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5sZWZ0LmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIG5hdlRvQ29sLS07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW9kZWwuc2V0Rm9jdXMobmF2VG9Sb3csIG5hdlRvQ29sLCBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vc2VsZWN0aW9uIGxvZ2ljXG4gICAgICAgICAgICB2YXIgbmV3U2VsZWN0aW9uO1xuICAgICAgICAgICAgLy9zdGFuZCBpbiBmb3IgaWYgaXQncyBjbGVhcmVkXG4gICAgICAgICAgICBpZiAobW9kZWwuc2VsZWN0aW9uLnRvcCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBuZXdTZWxlY3Rpb24gPSB7dG9wOiBtb2RlbC5mb2N1cy5yb3csIGxlZnQ6IG1vZGVsLmZvY3VzLmNvbCwgaGVpZ2h0OiAxLCB3aWR0aDogMX07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBtb2RlbC5zZWxlY3Rpb24udG9wLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBtb2RlbC5zZWxlY3Rpb24ubGVmdCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBtb2RlbC5zZWxlY3Rpb24uaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogbW9kZWwuc2VsZWN0aW9uLndpZHRoXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5kb3duLmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlbC5mb2N1cy5yb3cgPT09IG5ld1NlbGVjdGlvbi50b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi5oZWlnaHQrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi50b3ArKztcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi5oZWlnaHQtLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGFycm93LnVwLmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlbC5mb2N1cy5yb3cgPT09IG5ld1NlbGVjdGlvbi50b3AgKyBuZXdTZWxlY3Rpb24uaGVpZ2h0IC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLnRvcC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLmhlaWdodCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLmhlaWdodC0tO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5yaWdodC5jb2RlOlxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZWwuZm9jdXMuY29sID09PSBuZXdTZWxlY3Rpb24ubGVmdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLndpZHRoKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3Rpb24ubGVmdCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLndpZHRoLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBhcnJvdy5sZWZ0LmNvZGU6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlbC5mb2N1cy5jb2wgPT09IG5ld1NlbGVjdGlvbi5sZWZ0ICsgbmV3U2VsZWN0aW9uLndpZHRoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLmxlZnQtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGlvbi53aWR0aCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLndpZHRoLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmV3U2VsZWN0aW9uLmhlaWdodCA9PT0gMSAmJiBuZXdTZWxlY3Rpb24ud2lkdGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBjbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXRTZWxlY3Rpb24obmV3U2VsZWN0aW9uKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBvdXRzaWRlTWluTWF4KHJvdywgY29sKSB7XG4gICAgICAgIHJldHVybiByb3cgPCAwIHx8IHJvdyA+IGdyaWQucm93TW9kZWwubGVuZ3RoKCkgfHwgY29sIDwgMCB8fCBjb2wgPiBncmlkLmNvbE1vZGVsLmxlbmd0aCgpO1xuICAgIH1cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIC8vYXNzdW1lIHRoZSBldmVudCBoYXMgYmVlbiBhbm5vdGF0ZWQgYnkgdGhlIGNlbGwgbW91c2UgbW9kZWwgaW50ZXJjZXB0b3JcbiAgICAgICAgdmFyIHJvdyA9IGUucm93O1xuICAgICAgICB2YXIgY29sID0gZS5jb2w7XG4gICAgICAgIGlmIChyb3cgPCAwICYmIGNvbCA+PSAwKSB7XG4gICAgICAgICAgICBncmlkLmNvbE1vZGVsLnRvZ2dsZVNlbGVjdChjb2wpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2wgPCAwICYmIHJvdyA+PSAwKSB7XG4gICAgICAgICAgICBncmlkLnJvd01vZGVsLnRvZ2dsZVNlbGVjdChyb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJvdyA8IDAgJiYgY29sIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICBtb2RlbC5zZXRGb2N1cyhyb3csIGNvbCwgZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZXRTZWxlY3Rpb25Gcm9tUG9pbnRzKG1vZGVsLmZvY3VzLnJvdywgbW9kZWwuZm9jdXMuY29sLCByb3csIGNvbCk7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgbW9kZWwuX3Jvd1NlbGVjdGlvbkRlY29yYXRvcnMgPSBbXTtcbiAgICBtb2RlbC5fY29sU2VsZWN0aW9uRGVjb3JhdG9ycyA9IFtdO1xuICAgIC8vcm93IGNvbCBzZWxlY3Rpb25cbiAgICBmdW5jdGlvbiBoYW5kbGVSb3dDb2xTZWxlY3Rpb25DaGFuZ2Uocm93T3JDb2wpIHtcbiAgICAgICAgdmFyIGRlY29yYXRvcnNGaWVsZCA9ICgnXycgKyByb3dPckNvbCArICdTZWxlY3Rpb25EZWNvcmF0b3JzJyk7XG4gICAgICAgIG1vZGVsW2RlY29yYXRvcnNGaWVsZF0uZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0aW9uRGVjb3JhdG9yKSB7XG4gICAgICAgICAgICBncmlkLmRlY29yYXRvcnMucmVtb3ZlKHNlbGVjdGlvbkRlY29yYXRvcik7XG4gICAgICAgIH0pO1xuICAgICAgICBtb2RlbFtkZWNvcmF0b3JzRmllbGRdID0gW107XG5cbiAgICAgICAgZ3JpZFtyb3dPckNvbCArICdNb2RlbCddLmdldFNlbGVjdGVkKCkuZm9yRWFjaChmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciB2aXJ0dWFsSW5kZXggPSBncmlkW3Jvd09yQ29sICsgJ01vZGVsJ10udG9WaXJ0dWFsKGluZGV4KTtcbiAgICAgICAgICAgIHZhciB0b3AgPSByb3dPckNvbCA9PT0gJ3JvdycgPyB2aXJ0dWFsSW5kZXggOiAwO1xuICAgICAgICAgICAgdmFyIGxlZnQgPSByb3dPckNvbCA9PT0gJ2NvbCcgPyB2aXJ0dWFsSW5kZXggOiAwO1xuICAgICAgICAgICAgdmFyIGRlY29yYXRvciA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUodG9wLCBsZWZ0LCAxLCAxLCAnY2VsbCcsICd2aXJ0dWFsJyk7XG4gICAgICAgICAgICBkZWNvcmF0b3IucG9zdFJlbmRlciA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtaGVhZGVyLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgbW9kZWxbZGVjb3JhdG9yc0ZpZWxkXS5wdXNoKGRlY29yYXRvcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtcm93LXNlbGVjdGlvbi1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZVJvd0NvbFNlbGVjdGlvbkNoYW5nZSgncm93Jyk7XG4gICAgfSk7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWNvbC1zZWxlY3Rpb24tY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVSb3dDb2xTZWxlY3Rpb25DaGFuZ2UoJ2NvbCcpO1xuICAgIH0pO1xuXG4gICAgdmFyIHNlbGVjdGlvbiA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUoKTtcblxuICAgIHZhciBkZWZhdWx0UmVuZGVyID0gc2VsZWN0aW9uLnJlbmRlcjtcbiAgICBzZWxlY3Rpb24ucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGl2ID0gZGVmYXVsdFJlbmRlcigpO1xuICAgICAgICBkaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLXNlbGVjdGlvbicpO1xuICAgICAgICByZXR1cm4gZGl2O1xuICAgIH07XG5cbiAgICBncmlkLmRlY29yYXRvcnMuYWRkKHNlbGVjdGlvbik7XG5cbiAgICBtb2RlbC5zZXRTZWxlY3Rpb24gPSBmdW5jdGlvbiBzZXRTZWxlY3Rpb24obmV3U2VsZWN0aW9uKSB7XG4gICAgICAgIHNlbGVjdGlvbi50b3AgPSBuZXdTZWxlY3Rpb24udG9wO1xuICAgICAgICBzZWxlY3Rpb24ubGVmdCA9IG5ld1NlbGVjdGlvbi5sZWZ0O1xuICAgICAgICBzZWxlY3Rpb24uaGVpZ2h0ID0gbmV3U2VsZWN0aW9uLmhlaWdodDtcbiAgICAgICAgc2VsZWN0aW9uLndpZHRoID0gbmV3U2VsZWN0aW9uLndpZHRoO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjbGVhclNlbGVjdGlvbigpIHtcbiAgICAgICAgbW9kZWwuc2V0U2VsZWN0aW9uKHt0b3A6IC0xLCBsZWZ0OiAtMSwgaGVpZ2h0OiAtMSwgd2lkdGg6IC0xfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U2VsZWN0aW9uRnJvbVBvaW50cyhmcm9tUm93LCBmcm9tQ29sLCB0b1JvdywgdG9Db2wpIHtcbiAgICAgICAgdmFyIG5ld1NlbGVjdGlvbiA9IHJhbmdlVXRpbC5jcmVhdGVGcm9tUG9pbnRzKGZyb21Sb3csIGZyb21Db2wsIGNsYW1wUm93VG9NaW5NYXgodG9Sb3cpLCBjbGFtcENvbFRvTWluTWF4KHRvQ29sKSk7XG4gICAgICAgIG1vZGVsLnNldFNlbGVjdGlvbihuZXdTZWxlY3Rpb24pO1xuICAgIH1cblxuICAgIHNlbGVjdGlvbi5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAob3V0c2lkZU1pbk1heChlLnJvdywgZS5jb2wpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZyb21Sb3cgPSBtb2RlbC5mb2N1cy5yb3c7XG4gICAgICAgIHZhciBmcm9tQ29sID0gbW9kZWwuZm9jdXMuY29sO1xuICAgICAgICB2YXIgdW5iaW5kRHJhZyA9IGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtY2VsbC1kcmFnJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHNldFNlbGVjdGlvbkZyb21Qb2ludHMoZnJvbVJvdywgZnJvbUNvbCwgZS5yb3csIGUuY29sKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHVuYmluZERyYWdFbmQgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdW5iaW5kRHJhZygpO1xuICAgICAgICAgICAgdW5iaW5kRHJhZ0VuZCgpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnLXN0YXJ0Jywgc2VsZWN0aW9uLl9vbkRyYWdTdGFydCk7XG4gICAgY2xlYXJTZWxlY3Rpb24oKTtcblxuICAgIG1vZGVsLnNlbGVjdGlvbiA9IHNlbGVjdGlvbjtcblxuICAgIHJldHVybiBtb2RlbDtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy9hIG5vb3AgZnVuY3Rpb24gdG8gdXNlXG59OyIsInZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnQGdyaWQvZGVib3VuY2UnKTtcbnZhciBjYXBpdGFsaXplID0gcmVxdWlyZSgnY2FwaXRhbGl6ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG4gICAgdmFyIG1vZGVsID0ge3RvcDogMCwgbGVmdDogMH07XG4gICAgdmFyIHNjcm9sbEJhcldpZHRoID0gMTA7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXZpcnR1YWwtcGl4ZWwtY2VsbC1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY3JvbGxIZWlnaHQgPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC50b3RhbEhlaWdodCgpIC0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZml4ZWRIZWlnaHQoKTtcbiAgICAgICAgdmFyIHNjcm9sbFdpZHRoID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwudG90YWxXaWR0aCgpIC0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZml4ZWRXaWR0aCgpO1xuICAgICAgICBtb2RlbC5zZXRTY3JvbGxTaXplKHNjcm9sbEhlaWdodCwgc2Nyb2xsV2lkdGgpO1xuICAgICAgICBzaXplU2Nyb2xsQmFycygpO1xuICAgIH0pO1xuXG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXZpZXdwb3J0LWNoYW5nZScsIHNpemVTY3JvbGxCYXJzKTtcbiAgICAvL2Fzc3VtZXMgYSBzdGFuZGFyZGl6ZWQgd2hlZWwgZXZlbnQgdGhhdCB3ZSBjcmVhdGUgdGhyb3VnaCB0aGUgbW91c2V3aGVlbCBwYWNrYWdlXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnbW91c2V3aGVlbCcsIGZ1bmN0aW9uIGhhbmRsZU1vdXNlV2hlZWwoZSkge1xuICAgICAgICB2YXIgZGVsdGFZID0gZS5kZWx0YVk7XG4gICAgICAgIHZhciBkZWx0YVggPSBlLmRlbHRhWDtcbiAgICAgICAgbW9kZWwuc2Nyb2xsVG8obW9kZWwudG9wIC0gZGVsdGFZLCBtb2RlbC5sZWZ0IC0gZGVsdGFYLCB0cnVlKTtcbiAgICAgICAgZGVib3VuY2VkTm90aWZ5KCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9KTtcblxuICAgIG1vZGVsLnNldFNjcm9sbFNpemUgPSBmdW5jdGlvbiAoaCwgdykge1xuICAgICAgICBtb2RlbC5oZWlnaHQgPSBoO1xuICAgICAgICBtb2RlbC53aWR0aCA9IHc7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVycygpIHtcbiAgICAgICAgLy9UT0RPOiBwb3NzaWJseSBrZWVwIHRyYWNrIG9mIGRlbHRhIHNpbmNlIGxhc3QgdXBkYXRlIGFuZCBzZW5kIGl0IGFsb25nLiBmb3Igbm93LCBub1xuICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKCdncmlkLXBpeGVsLXNjcm9sbCcpO1xuXG4gICAgICAgIC8vdXBkYXRlIHRoZSBjZWxsIHNjcm9sbFxuICAgICAgICB2YXIgc2Nyb2xsVG9wID0gbW9kZWwudG9wO1xuICAgICAgICB2YXIgcm93ID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZ2V0Um93KHNjcm9sbFRvcCk7XG5cbiAgICAgICAgdmFyIHNjcm9sbExlZnQgPSBtb2RlbC5sZWZ0O1xuICAgICAgICB2YXIgY29sID0gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuZ2V0Q29sKHNjcm9sbExlZnQpO1xuXG4gICAgICAgIGdyaWQuY2VsbFNjcm9sbE1vZGVsLnNjcm9sbFRvKHJvdywgY29sLCB0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgZGVib3VuY2VkTm90aWZ5ID0gZGVib3VuY2Uobm90aWZ5TGlzdGVuZXJzLCAxKTtcblxuICAgIG1vZGVsLnNjcm9sbFRvID0gZnVuY3Rpb24gKHRvcCwgbGVmdCwgZG9udE5vdGlmeSkge1xuICAgICAgICBtb2RlbC50b3AgPSB1dGlsLmNsYW1wKHRvcCwgMCwgbW9kZWwuaGVpZ2h0IC0gZ2V0U2Nyb2xsYWJsZVZpZXdIZWlnaHQoKSk7XG4gICAgICAgIG1vZGVsLmxlZnQgPSB1dGlsLmNsYW1wKGxlZnQsIDAsIG1vZGVsLndpZHRoIC0gZ2V0U2Nyb2xsYWJsZVZpZXdXaWR0aCgpKTtcblxuICAgICAgICBwb3NpdGlvblNjcm9sbEJhcnMoKTtcblxuICAgICAgICBpZiAoIWRvbnROb3RpZnkpIHtcbiAgICAgICAgICAgIG5vdGlmeUxpc3RlbmVycygpO1xuICAgICAgICB9XG5cblxuICAgIH07XG5cblxuICAgIC8qIFNDUk9MTCBCQVIgTE9HSUMgKi9cbiAgICBmdW5jdGlvbiBnZXRTY3JvbGxQb3NpdGlvbkZyb21SZWFsKHNjcm9sbEJhclJlYWxDbGlja0Nvb3JkLCBoZWlnaHRXaWR0aCwgdmVydEhvcnopIHtcbiAgICAgICAgdmFyIHNjcm9sbEJhclRvcENsaWNrID0gc2Nyb2xsQmFyUmVhbENsaWNrQ29vcmQgLSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFsnZml4ZWQnICsgY2FwaXRhbGl6ZShoZWlnaHRXaWR0aCldKCk7XG4gICAgICAgIHZhciBzY3JvbGxSYXRpbyA9IHNjcm9sbEJhclRvcENsaWNrIC8gZ2V0TWF4U2Nyb2xsQmFyQ29vcmQoaGVpZ2h0V2lkdGgsIHZlcnRIb3J6KTtcbiAgICAgICAgdmFyIHNjcm9sbENvb3JkID0gc2Nyb2xsUmF0aW8gKiBnZXRNYXhTY3JvbGwoaGVpZ2h0V2lkdGgpO1xuICAgICAgICByZXR1cm4gc2Nyb2xsQ29vcmQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZVNjcm9sbEJhckRlY29yYXRvcihpc0hvcnopIHtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGdyaWQuZGVjb3JhdG9ycy5jcmVhdGUoKTtcbiAgICAgICAgdmFyIHhPclkgPSBpc0hvcnogPyAnWCcgOiAnWSc7XG4gICAgICAgIHZhciBoZWlnaHRXaWR0aCA9IGlzSG9yeiA/ICd3aWR0aCcgOiAnaGVpZ2h0JztcbiAgICAgICAgdmFyIHZlcnRIb3J6ID0gaXNIb3J6ID8gJ2hvcnonIDogJ3ZlcnQnO1xuICAgICAgICB2YXIgZ3JpZENvb3JkRmllbGQgPSAnZ3JpZCcgKyB4T3JZO1xuICAgICAgICB2YXIgbGF5ZXJDb29yZEZpZWxkID0gJ2xheWVyJyArIHhPclk7XG4gICAgICAgIHZhciB2aWV3UG9ydENsYW1wRm4gPSBncmlkLnZpZXdQb3J0WydjbGFtcCcgKyB4T3JZXTtcblxuICAgICAgICBkZWNvcmF0b3IucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNjcm9sbEJhckVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHNjcm9sbEJhckVsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdncmlkLXNjcm9sbC1iYXInKTtcbiAgICAgICAgICAgIGRlY29yYXRvci5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gc2Nyb2xsQmFyRWxlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBzY3JvbGxCYXJPZmZzZXQgPSBlW2xheWVyQ29vcmRGaWVsZF07XG5cbiAgICAgICAgICAgICAgICBkZWNvcmF0b3IuX3VuYmluZERyYWcgPSBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWcnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ3JpZENvb3JkID0gdmlld1BvcnRDbGFtcEZuKGVbZ3JpZENvb3JkRmllbGRdKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjcm9sbEJhclJlYWxDbGlja0Nvb3JkID0gZ3JpZENvb3JkIC0gc2Nyb2xsQmFyT2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsQ29vcmQgPSBnZXRTY3JvbGxQb3NpdGlvbkZyb21SZWFsKHNjcm9sbEJhclJlYWxDbGlja0Nvb3JkLCBoZWlnaHRXaWR0aCwgdmVydEhvcnopO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNIb3J6KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbC5zY3JvbGxUbyhtb2RlbC50b3AsIHNjcm9sbENvb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsLnNjcm9sbFRvKHNjcm9sbENvb3JkLCBtb2RlbC5sZWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgZGVjb3JhdG9yLl91bmJpbmREcmFnRW5kID0gZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kcmFnLWVuZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5fdW5iaW5kRHJhZygpO1xuICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IuX3VuYmluZERyYWdFbmQoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWRyYWctc3RhcnQnLCBzY3JvbGxCYXJFbGVtLCBkZWNvcmF0b3IuX29uRHJhZ1N0YXJ0KTtcbiAgICAgICAgICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ21vdXNlZG93bicsIHNjcm9sbEJhckVsZW0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgZ3JpZC5ldmVudExvb3Auc3RvcEJ1YmJsaW5nKGUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBzY3JvbGxCYXJFbGVtO1xuICAgICAgICB9O1xuXG4gICAgICAgIGRlY29yYXRvci51bml0cyA9ICdweCc7XG4gICAgICAgIGRlY29yYXRvci5zcGFjZSA9ICdyZWFsJztcblxuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH1cblxuICAgIG1vZGVsLnZlcnRTY3JvbGxCYXIgPSBtYWtlU2Nyb2xsQmFyRGVjb3JhdG9yKCk7XG4gICAgbW9kZWwuaG9yelNjcm9sbEJhciA9IG1ha2VTY3JvbGxCYXJEZWNvcmF0b3IodHJ1ZSk7XG4gICAgbW9kZWwudmVydFNjcm9sbEJhci53aWR0aCA9IHNjcm9sbEJhcldpZHRoO1xuICAgIG1vZGVsLmhvcnpTY3JvbGxCYXIuaGVpZ2h0ID0gc2Nyb2xsQmFyV2lkdGg7XG5cbiAgICBmdW5jdGlvbiBnZXRNYXhTY3JvbGwoaGVpZ2h0V2lkdGgpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsW2hlaWdodFdpZHRoXSAtIGdldFZpZXdTY3JvbGxIZWlnaHRPcldpZHRoKGhlaWdodFdpZHRoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTY3JvbGxSYXRpb0Zyb21WaXJ0dWFsU2Nyb2xsQ29vcmRzKHNjcm9sbCwgaGVpZ2h0V2lkdGgpIHtcbiAgICAgICAgdmFyIG1heFNjcm9sbCA9IGdldE1heFNjcm9sbChoZWlnaHRXaWR0aCk7XG4gICAgICAgIHZhciBzY3JvbGxSYXRpbyA9IHNjcm9sbCAvIG1heFNjcm9sbDtcbiAgICAgICAgcmV0dXJuIHNjcm9sbFJhdGlvO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1heFNjcm9sbEJhckNvb3JkKGhlaWdodFdpZHRoLCB2ZXJ0SG9yeikge1xuICAgICAgICByZXR1cm4gZ2V0Vmlld1Njcm9sbEhlaWdodE9yV2lkdGgoaGVpZ2h0V2lkdGgpIC0gbW9kZWxbdmVydEhvcnogKyAnU2Nyb2xsQmFyJ11baGVpZ2h0V2lkdGhdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlYWxTY3JvbGxCYXJQb3NpdGlvbihzY3JvbGwsIGhlaWdodFdpZHRoLCB2ZXJ0SG9yeikge1xuICAgICAgICB2YXIgc2Nyb2xsUmF0aW8gPSBnZXRTY3JvbGxSYXRpb0Zyb21WaXJ0dWFsU2Nyb2xsQ29vcmRzKHNjcm9sbCwgaGVpZ2h0V2lkdGgpO1xuICAgICAgICB2YXIgbWF4U2Nyb2xsQmFyU2Nyb2xsID0gZ2V0TWF4U2Nyb2xsQmFyQ29vcmQoaGVpZ2h0V2lkdGgsIHZlcnRIb3J6KTtcbiAgICAgICAgLy9pbiBzY3JvbGwgYmFyIGNvb3Jkc1xuICAgICAgICB2YXIgc2Nyb2xsQmFyQ29vcmQgPSBzY3JvbGxSYXRpbyAqIG1heFNjcm9sbEJhclNjcm9sbDtcbiAgICAgICAgLy9hZGQgdGhlIGZpeGVkIGhlaWdodCB0byB0cmFuc2xhdGUgYmFjayBpbnRvIHJlYWwgY29vcmRzXG4gICAgICAgIHJldHVybiBzY3JvbGxCYXJDb29yZCArIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsWydmaXhlZCcgKyBjYXBpdGFsaXplKGhlaWdodFdpZHRoKV0oKTtcbiAgICB9XG5cbiAgICBtb2RlbC5fZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uID0gZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uO1xuICAgIG1vZGVsLl9nZXRTY3JvbGxQb3NpdGlvbkZyb21SZWFsID0gZ2V0U2Nyb2xsUG9zaXRpb25Gcm9tUmVhbDtcblxuICAgIGZ1bmN0aW9uIGNhbGNTY3JvbGxCYXJSZWFsVG9wKCkge1xuICAgICAgICByZXR1cm4gZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uKG1vZGVsLnRvcCwgJ2hlaWdodCcsICd2ZXJ0Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY1Njcm9sbEJhclJlYWxMZWZ0KCkge1xuICAgICAgICByZXR1cm4gZ2V0UmVhbFNjcm9sbEJhclBvc2l0aW9uKG1vZGVsLmxlZnQsICd3aWR0aCcsICdob3J6Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9zaXRpb25TY3JvbGxCYXJzKCkge1xuICAgICAgICBtb2RlbC52ZXJ0U2Nyb2xsQmFyLnRvcCA9IGNhbGNTY3JvbGxCYXJSZWFsVG9wKCk7XG4gICAgICAgIG1vZGVsLmhvcnpTY3JvbGxCYXIubGVmdCA9IGNhbGNTY3JvbGxCYXJSZWFsTGVmdCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFZpZXdTY3JvbGxIZWlnaHRPcldpZHRoKGhlaWdodFdpZHRoKSB7XG4gICAgICAgIHJldHVybiBncmlkLnZpZXdQb3J0W2hlaWdodFdpZHRoXSAtIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsWydmaXhlZCcgKyBjYXBpdGFsaXplKGhlaWdodFdpZHRoKV0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTY3JvbGxhYmxlVmlld1dpZHRoKCkge1xuICAgICAgICByZXR1cm4gZ2V0Vmlld1Njcm9sbEhlaWdodE9yV2lkdGgoJ3dpZHRoJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2Nyb2xsYWJsZVZpZXdIZWlnaHQoKSB7XG4gICAgICAgIHJldHVybiBnZXRWaWV3U2Nyb2xsSGVpZ2h0T3JXaWR0aCgnaGVpZ2h0Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2l6ZVNjcm9sbEJhcnMoKSB7XG4gICAgICAgIG1vZGVsLnZlcnRTY3JvbGxCYXIubGVmdCA9IGdyaWQudmlld1BvcnQud2lkdGggLSBzY3JvbGxCYXJXaWR0aDtcbiAgICAgICAgbW9kZWwuaG9yelNjcm9sbEJhci50b3AgPSBncmlkLnZpZXdQb3J0LmhlaWdodCAtIHNjcm9sbEJhcldpZHRoO1xuICAgICAgICB2YXIgc2Nyb2xsYWJsZVZpZXdIZWlnaHQgPSBnZXRTY3JvbGxhYmxlVmlld0hlaWdodCgpO1xuICAgICAgICB2YXIgc2Nyb2xsYWJsZVZpZXdXaWR0aCA9IGdldFNjcm9sbGFibGVWaWV3V2lkdGgoKTtcbiAgICAgICAgbW9kZWwudmVydFNjcm9sbEJhci5oZWlnaHQgPSBNYXRoLm1heChzY3JvbGxhYmxlVmlld0hlaWdodCAvIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLnRvdGFsSGVpZ2h0KCkgKiBzY3JvbGxhYmxlVmlld0hlaWdodCwgMjApO1xuICAgICAgICBtb2RlbC5ob3J6U2Nyb2xsQmFyLndpZHRoID0gTWF0aC5tYXgoc2Nyb2xsYWJsZVZpZXdXaWR0aCAvIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLnRvdGFsV2lkdGgoKSAqIHNjcm9sbGFibGVWaWV3V2lkdGgsIDIwKTtcbiAgICAgICAgcG9zaXRpb25TY3JvbGxCYXJzKCk7XG4gICAgfVxuXG4gICAgZ3JpZC5kZWNvcmF0b3JzLmFkZChtb2RlbC52ZXJ0U2Nyb2xsQmFyKTtcbiAgICBncmlkLmRlY29yYXRvcnMuYWRkKG1vZGVsLmhvcnpTY3JvbGxCYXIpO1xuICAgIC8qIEVORCBTQ1JPTEwgQkFSIExPR0lDICovXG5cbiAgICByZXR1cm4gbW9kZWw7XG59OyIsInZhciBhZGREaXJ0eVByb3BzID0gcmVxdWlyZSgnQGdyaWQvYWRkLWRpcnR5LXByb3BzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChyYW5nZSwgZGlydHlDbGVhbiwgcGFyZW50RGlydHlDbGVhbikge1xuICAgIHJhbmdlID0gcmFuZ2UgfHwge307IC8vYWxsb3cgbWl4aW4gZnVuY3Rpb25hbGl0eVxuICAgIHJhbmdlLmlzRGlydHkgPSBkaXJ0eUNsZWFuLmlzRGlydHk7XG5cbiAgICB2YXIgd2F0Y2hlZFByb3BlcnRpZXMgPSBbJ3RvcCcsICdsZWZ0JywgJ2hlaWdodCcsICd3aWR0aCcsICd1bml0cycsICdzcGFjZSddO1xuICAgIHZhciBkaXJ0eUNsZWFucyA9IFtkaXJ0eUNsZWFuXTtcbiAgICBpZiAocGFyZW50RGlydHlDbGVhbikge1xuICAgICAgICBkaXJ0eUNsZWFucy5wdXNoKHBhcmVudERpcnR5Q2xlYW4pO1xuICAgIH1cblxuICAgIGFkZERpcnR5UHJvcHMocmFuZ2UsIHdhdGNoZWRQcm9wZXJ0aWVzLCBkaXJ0eUNsZWFucyk7XG4gICAgLy9kZWZhdWx0c1xuICAgIHJhbmdlLnVuaXRzID0gJ2NlbGwnO1xuICAgIHJhbmdlLnNwYWNlID0gJ2RhdGEnO1xuXG4gICAgcmV0dXJuIHJhbmdlO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL3Rha2VzIGEgcG9pbnQgYW5kIGEgbGVuZ3RoIGFzIHRoZSByYW5nZXMgaW4gYXJyYXkgZm9ybVxuICAgIGludGVyc2VjdDogZnVuY3Rpb24gKHJhbmdlMSwgcmFuZ2UyKSB7XG4gICAgICAgIHZhciByYW5nZTJTdGFydCA9IHJhbmdlMlswXTtcbiAgICAgICAgdmFyIHJhbmdlMVN0YXJ0ID0gcmFuZ2UxWzBdO1xuICAgICAgICB2YXIgcmFuZ2UxRW5kID0gcmFuZ2UxU3RhcnQgKyByYW5nZTFbMV0gLSAxO1xuICAgICAgICB2YXIgcmFuZ2UyRW5kID0gcmFuZ2UyU3RhcnQgKyByYW5nZTJbMV0gLSAxO1xuICAgICAgICBpZiAocmFuZ2UyU3RhcnQgPiByYW5nZTFFbmQgfHwgcmFuZ2UyRW5kIDwgcmFuZ2UxU3RhcnQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHRTdGFydCA9IChyYW5nZTFTdGFydCA+IHJhbmdlMlN0YXJ0ID8gcmFuZ2UxU3RhcnQgOiByYW5nZTJTdGFydCk7XG4gICAgICAgIHZhciByZXN1bHRFbmQgPSAocmFuZ2UxRW5kIDwgcmFuZ2UyRW5kID8gcmFuZ2UxRW5kIDogcmFuZ2UyRW5kKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHJlc3VsdFN0YXJ0LFxuICAgICAgICAgICAgcmVzdWx0RW5kIC0gcmVzdWx0U3RhcnQgKyAxXG4gICAgICAgIF07XG4gICAgfSxcbiAgICAvL3Rha2VzIGEgcG9pbnQgYW5kIGEgbGVuZ3RoIGFzIHRoZSByYW5nZXMgaW4gYXJyYXkgZm9ybVxuICAgIHVuaW9uOiBmdW5jdGlvbiAocmFuZ2UxLCByYW5nZTIpIHtcbiAgICAgICAgaWYgKCFyYW5nZTEpIHtcbiAgICAgICAgICAgIHJldHVybiByYW5nZTI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyYW5nZTIpIHtcbiAgICAgICAgICAgIHJldHVybiByYW5nZTE7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJhbmdlMlN0YXJ0ID0gcmFuZ2UyWzBdO1xuICAgICAgICB2YXIgcmFuZ2UyRW5kID0gcmFuZ2UyU3RhcnQgKyByYW5nZTJbMV0gLSAxO1xuICAgICAgICB2YXIgcmFuZ2UxU3RhcnQgPSByYW5nZTFbMF07XG4gICAgICAgIHZhciByYW5nZTFFbmQgPSByYW5nZTFTdGFydCArIHJhbmdlMVsxXSAtIDE7XG4gICAgICAgIHZhciByZXN1bHRTdGFydCA9IChyYW5nZTFTdGFydCA8IHJhbmdlMlN0YXJ0ID8gcmFuZ2UxU3RhcnQgOiByYW5nZTJTdGFydCk7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICByZXN1bHRTdGFydCxcbiAgICAgICAgICAgIChyYW5nZTFFbmQgPiByYW5nZTJFbmQgPyByYW5nZTFFbmQgOiByYW5nZTJFbmQpIC0gcmVzdWx0U3RhcnQgKyAxXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8vdGFrZXMgdHdvIHJvdywgY29sIHBvaW50cyBhbmQgY3JlYXRlcyBhIG5vcm1hbCBwb3NpdGlvbiByYW5nZVxuICAgIGNyZWF0ZUZyb21Qb2ludHM6IGZ1bmN0aW9uIChyMSwgYzEsIHIyLCBjMikge1xuICAgICAgICB2YXIgcmFuZ2UgPSB7fTtcbiAgICAgICAgaWYgKHIxIDwgcjIpIHtcbiAgICAgICAgICAgIHJhbmdlLnRvcCA9IHIxO1xuICAgICAgICAgICAgcmFuZ2UuaGVpZ2h0ID0gcjIgLSByMSArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByYW5nZS50b3AgPSByMjtcbiAgICAgICAgICAgIHJhbmdlLmhlaWdodCA9IHIxIC0gcjIgKyAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMxIDwgYzIpIHtcbiAgICAgICAgICAgIHJhbmdlLmxlZnQgPSBjMTtcbiAgICAgICAgICAgIHJhbmdlLndpZHRoID0gYzIgLSBjMSArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByYW5nZS5sZWZ0ID0gYzI7XG4gICAgICAgICAgICByYW5nZS53aWR0aCA9IGMxIC0gYzIgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByYW5nZTtcbiAgICB9XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG5cbiAgICB2YXIgYXBpID0gcmVxdWlyZSgnQGdyaWQvYWJzdHJhY3Qtcm93LWNvbC1tb2RlbCcpKGdyaWQsICdyb3cnLCAnaGVpZ2h0JywgMzApO1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoX2dyaWQpIHtcbiAgICB2YXIgZ3JpZCA9IF9ncmlkO1xuXG4gICAgdmFyIGNlbGxEYXRhID0gW107XG4gICAgdmFyIGhlYWRlckRhdGEgPSBbXTtcbiAgICB2YXIgc29ydGVkQ29sO1xuICAgIHZhciBhc2NlbmRpbmc7XG4gICAgdmFyIGRpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpKGdyaWQpO1xuICAgIHZhciBpbnRlcm5hbFNldCA9IGZ1bmN0aW9uIChkYXRhLCByLCBjLCBkYXR1bSkge1xuICAgICAgICBpZiAoIWRhdGFbcl0pIHtcbiAgICAgICAgICAgIGRhdGFbcl0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhW3JdW2NdID0gZGF0dW07XG4gICAgICAgIGRpcnR5Q2xlYW4uc2V0RGlydHkoKTtcbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgaXNEaXJ0eTogZGlydHlDbGVhbi5pc0RpcnR5LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIChyLCBjLCBkYXR1bSkge1xuICAgICAgICAgICAgaW50ZXJuYWxTZXQoY2VsbERhdGEsIHIsIGMsIGRhdHVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0SGVhZGVyOiBmdW5jdGlvbiAociwgYywgZGF0dW0pIHtcbiAgICAgICAgICAgIGludGVybmFsU2V0KGhlYWRlckRhdGEsIHIsIGMsIGRhdHVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAociwgYykge1xuICAgICAgICAgICAgdmFyIGRhdGFSb3cgPSBjZWxsRGF0YVtncmlkLnJvd01vZGVsLnJvdyhyKS5kYXRhUm93XTtcbiAgICAgICAgICAgIHZhciBkYXR1bSA9IGRhdGFSb3cgJiYgZGF0YVJvd1tncmlkLmNvbE1vZGVsLmNvbChjKS5kYXRhQ29sXTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGRhdHVtICYmIGRhdHVtLnZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkOiB2YWx1ZSAmJiAncicgKyB2YWx1ZVswXSArICcgYycgKyB2YWx1ZVsxXSB8fCAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SGVhZGVyOiBmdW5jdGlvbiAociwgYykge1xuICAgICAgICAgICAgdmFyIGRhdGFSb3cgPSBoZWFkZXJEYXRhW2dyaWQucm93TW9kZWwuZ2V0KHIpLmRhdGFSb3ddO1xuXG4gICAgICAgICAgICB2YXIgZGF0dW0gPSBkYXRhUm93ICYmIGRhdGFSb3dbZ3JpZC5jb2xNb2RlbC5nZXQoYykuZGF0YUNvbF07XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBkYXR1bSAmJiBkYXR1bS52YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGZvcm1hdHRlZDogdmFsdWUgJiYgJ2hyJyArIHZhbHVlWzBdICsgJyBoYycgKyB2YWx1ZVsxXSB8fCAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b2dnbGVTb3J0OiBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgdmFyIHJldFZhbCA9IC0xO1xuICAgICAgICAgICAgdmFyIGNvbXBhcmVNZXRob2QgPSBmdW5jdGlvbiAodmFsMSwgdmFsMikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWwxIDwgKHZhbDIpID8gcmV0VmFsIDogLTEgKiByZXRWYWw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGMgPT09IHNvcnRlZENvbCkge1xuICAgICAgICAgICAgICAgIGlmIChhc2NlbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0VmFsID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXNjZW5kaW5nID0gIWFzY2VuZGluZztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc29ydGVkQ29sID0gYztcbiAgICAgICAgICAgICAgICBhc2NlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2VsbERhdGEuc29ydChmdW5jdGlvbiAoZGF0YVJvdzEsIGRhdGFSb3cyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhUm93MSB8fCAhZGF0YVJvdzFbY10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhUm93MiB8fCAhZGF0YVJvdzJbY10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldFZhbCAqIC0xO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcGFyZU1ldGhvZChkYXRhUm93MVtjXS52YWx1ZSwgZGF0YVJvdzJbY10udmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkaXJ0eUNsZWFuLnNldERpcnR5KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2xhbXA6IGZ1bmN0aW9uIChudW0sIG1pbiwgbWF4LCByZXR1cm5OYU4pIHtcbiAgICAgICAgaWYgKG51bSA+IG1heCkge1xuICAgICAgICAgICAgcmV0dXJuIHJldHVybk5hTiA/IE5hTiA6IG1heDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVtIDwgbWluKSB7XG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuTmFOID8gTmFOIDogbWluO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW07XG4gICAgfSxcbiAgICBpc051bWJlcjogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG51bWJlciA9PT0gJ251bWJlcicgJiYgIWlzTmFOKG51bWJlcik7XG4gICAgfSxcbiAgICBpc0VsZW1lbnQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiAhIShub2RlICYmXG4gICAgICAgIChub2RlLm5vZGVOYW1lIHx8IC8vIHdlIGFyZSBhIGRpcmVjdCBlbGVtZW50XG4gICAgICAgIChub2RlLnByb3AgJiYgbm9kZS5hdHRyICYmIG5vZGUuZmluZCkpKTsgIC8vIHdlIGhhdmUgYW4gb24gYW5kIGZpbmQgbWV0aG9kIHBhcnQgb2YgalF1ZXJ5IEFQSVxuICAgIH0sXG4gICAgaXNBcnJheTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH0sXG4gICAgcG9zaXRpb246IGZ1bmN0aW9uIChlbGVtLCB0LCBsLCBiLCByKSB7XG4gICAgICAgIGVsZW0uc3R5bGUudG9wID0gdCArICdweCc7XG4gICAgICAgIGVsZW0uc3R5bGUubGVmdCA9IGwgKyAncHgnO1xuICAgICAgICBlbGVtLnN0eWxlLmJvdHRvbSA9IGIgKyAncHgnO1xuICAgICAgICBlbGVtLnN0eWxlLnJpZ2h0ID0gciArICdweCc7XG4gICAgICAgIGVsZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXG4gICAgfVxufTsiLCJ2YXIgY3VzdG9tRXZlbnQgPSByZXF1aXJlKCdAZ3JpZC9jdXN0b20tZXZlbnQnKTtcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJ0BncmlkL2RlYm91bmNlJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciB2aWV3TGF5ZXIgPSB7fTtcblxuXG4gICAgdmFyIGdyaWQgPSBfZ3JpZDtcbiAgICB2YXIgY29udGFpbmVyO1xuICAgIHZhciByb290O1xuICAgIHZhciBjZWxsQ29udGFpbmVyO1xuICAgIHZhciBkZWNvcmF0b3JDb250YWluZXI7XG4gICAgdmFyIGJvcmRlcldpZHRoO1xuXG4gICAgdmFyIEdSSURfQ0VMTF9DT05UQUlORVJfQkFTRV9DTEFTUyA9ICdncmlkLWNlbGxzJztcbiAgICB2YXIgR1JJRF9WSUVXX1JPT1RfQ0xBU1MgPSAnanMtZ3JpZC12aWV3LXJvb3QnO1xuICAgIHZhciBDRUxMX0NMQVNTID0gJ2dyaWQtY2VsbCc7XG5cbiAgICB2YXIgY2VsbHM7IC8vbWF0cml4IG9mIHJlbmRlcmVkIGNlbGwgZWxlbWVudHM7XG4gICAgdmFyIHJvd3M7IC8vYXJyYXkgb2YgYWxsIHJlbmRlcmVkIHJvd3NcbiAgICB2YXIgYnVpbHRDb2xzOyAvL21hcCBmcm9tIGNvbCBpbmRleCB0byBhbiBhcnJheSBvZiBidWlsdCBlbGVtZW50cyBmb3IgdGhlIGNvbHVtbiB0byB1cGRhdGUgb24gc2Nyb2xsXG4gICAgdmFyIGJ1aWx0Um93czsgLy9tYXAgZnJvbSByb3cgaW5kZXggdG8gYW4gYXJyYXkgb2YgYnVpbHQgZWxlbWVudHMgZm9yIHRoZSByb3cgdG8gdXBkYXRlIG9uIHNjcm9sbFxuXG4gICAgLy9hZGQgdGhlIGNlbGwgY2xhc3NlcyB0aHJvdWdoIHRoZSBzdGFuZGFyZCBtZXRob2RcbiAgICBncmlkLmNlbGxDbGFzc2VzLmFkZChncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgwLCAwLCBDRUxMX0NMQVNTLCBJbmZpbml0eSwgSW5maW5pdHksICd2aXJ0dWFsJykpO1xuXG4gICAgdmFyIHJvd0hlYWRlckNsYXNzZXMgPSBncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgwLCAwLCAnZ3JpZC1oZWFkZXIgZ3JpZC1yb3ctaGVhZGVyJywgSW5maW5pdHksIDAsICd2aXJ0dWFsJyk7XG4gICAgdmFyIGNvbEhlYWRlckNsYXNzZXMgPSBncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgwLCAwLCAnZ3JpZC1oZWFkZXIgZ3JpZC1jb2wtaGVhZGVyJywgMCwgSW5maW5pdHksICd2aXJ0dWFsJyk7XG4gICAgdmFyIGZpeGVkQ29sQ2xhc3NlcyA9IGdyaWQuY2VsbENsYXNzZXMuY3JlYXRlKDAsIC0xLCAnZ3JpZC1sYXN0LWZpeGVkLWNvbCcsIEluZmluaXR5LCAxLCAndmlydHVhbCcpO1xuICAgIHZhciBmaXhlZFJvd0NsYXNzZXMgPSBncmlkLmNlbGxDbGFzc2VzLmNyZWF0ZSgtMSwgMCwgJ2dyaWQtbGFzdC1maXhlZC1yb3cnLCAxLCBJbmZpbml0eSwgJ3ZpcnR1YWwnKTtcblxuICAgIGdyaWQuY2VsbENsYXNzZXMuYWRkKHJvd0hlYWRlckNsYXNzZXMpO1xuICAgIGdyaWQuY2VsbENsYXNzZXMuYWRkKGNvbEhlYWRlckNsYXNzZXMpO1xuICAgIGdyaWQuY2VsbENsYXNzZXMuYWRkKGZpeGVkUm93Q2xhc3Nlcyk7XG4gICAgZ3JpZC5jZWxsQ2xhc3Nlcy5hZGQoZml4ZWRDb2xDbGFzc2VzKTtcblxuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1jb2wtY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBmaXhlZENvbENsYXNzZXMubGVmdCA9IGdyaWQuY29sTW9kZWwubnVtRml4ZWQoKSAtIDE7XG4gICAgICAgIHJvd0hlYWRlckNsYXNzZXMud2lkdGggPSBncmlkLmNvbE1vZGVsLm51bUhlYWRlcnMoKTtcbiAgICB9KTtcblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtcm93LWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZml4ZWRSb3dDbGFzc2VzLnRvcCA9IGdyaWQucm93TW9kZWwubnVtRml4ZWQoKSAtIDE7XG4gICAgICAgIGNvbEhlYWRlckNsYXNzZXMuaGVpZ2h0ID0gZ3JpZC5yb3dNb2RlbC5udW1IZWFkZXJzKCk7XG4gICAgfSk7XG5cblxuICAgIHZpZXdMYXllci5idWlsZCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGNsZWFudXAoKTtcblxuICAgICAgICBjb250YWluZXIgPSBlbGVtO1xuXG4gICAgICAgIGNlbGxDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgY2VsbENvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2R0cycsICdncmlkLWNlbGxzJyk7XG4gICAgICAgIGNlbGxDb250YWluZXIuc2V0QXR0cmlidXRlKCdjbGFzcycsIEdSSURfQ0VMTF9DT05UQUlORVJfQkFTRV9DTEFTUyk7XG4gICAgICAgIHV0aWwucG9zaXRpb24oY2VsbENvbnRhaW5lciwgMCwgMCwgMCwgMCk7XG4gICAgICAgIGNlbGxDb250YWluZXIuc3R5bGUuekluZGV4ID0gMDtcblxuICAgICAgICBkZWNvcmF0b3JDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGVjb3JhdG9yQ29udGFpbmVyLnNldEF0dHJpYnV0ZSgnZHRzJywgJ2dyaWQtZGVjb3JhdG9ycycpO1xuICAgICAgICB1dGlsLnBvc2l0aW9uKGRlY29yYXRvckNvbnRhaW5lciwgMCwgMCwgMCwgMCk7XG4gICAgICAgIGRlY29yYXRvckNvbnRhaW5lci5zdHlsZS56SW5kZXggPSAwO1xuICAgICAgICBkZWNvcmF0b3JDb250YWluZXIuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcblxuICAgICAgICByb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHJvb3Quc2V0QXR0cmlidXRlKCdjbGFzcycsIEdSSURfVklFV19ST09UX0NMQVNTKTtcblxuICAgICAgICByb290LmFwcGVuZENoaWxkKGNlbGxDb250YWluZXIpO1xuICAgICAgICByb290LmFwcGVuZENoaWxkKGRlY29yYXRvckNvbnRhaW5lcik7XG5cbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJvb3QpO1xuXG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gbWVhc3VyZUJvcmRlcldpZHRoKCkge1xuICAgICAgICAvL3JlYWQgdGhlIGJvcmRlciB3aWR0aCwgZm9yIHRoZSByYXJlIGNhc2Ugb2YgbGFyZ2VyIHRoYW4gMXB4IGJvcmRlcnMsIG90aGVyd2lzZSB0aGUgZHJhdyB3aWxsIGRlZmF1bHQgdG8gMVxuICAgICAgICBpZiAoYm9yZGVyV2lkdGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIganNHcmlkQ2VsbCA9IGNlbGxzWzBdICYmIGNlbGxzWzBdWzBdO1xuICAgICAgICBpZiAoanNHcmlkQ2VsbCkge1xuICAgICAgICAgICAgdmFyIG9sZENsYXNzID0ganNHcmlkQ2VsbC5jbGFzc05hbWU7XG4gICAgICAgICAgICBqc0dyaWRDZWxsLmNsYXNzTmFtZSA9IENFTExfQ0xBU1M7XG4gICAgICAgICAgICB2YXIgY29tcHV0ZWRTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoanNHcmlkQ2VsbCk7XG4gICAgICAgICAgICB2YXIgYm9yZGVyV2lkdGhQcm9wID0gY29tcHV0ZWRTdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3JkZXItbGVmdC13aWR0aCcpO1xuICAgICAgICAgICAgYm9yZGVyV2lkdGggPSBwYXJzZUludChib3JkZXJXaWR0aFByb3ApO1xuICAgICAgICAgICAganNHcmlkQ2VsbC5jbGFzc05hbWUgPSBvbGRDbGFzcztcbiAgICAgICAgfVxuICAgICAgICBib3JkZXJXaWR0aCA9IGlzTmFOKGJvcmRlcldpZHRoKSB8fCAhYm9yZGVyV2lkdGggPyB1bmRlZmluZWQgOiBib3JkZXJXaWR0aDtcbiAgICAgICAgcmV0dXJuIGJvcmRlcldpZHRoO1xuICAgIH1cblxuICAgIC8vb25seSBkcmF3IG9uY2UgcGVyIGpzIHR1cm4sIG1heSBuZWVkIHRvIGNyZWF0ZSBhIHN5bmNocm9ub3VzIHZlcnNpb25cbiAgICB2aWV3TGF5ZXIuZHJhdyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmlld0xheWVyLl9kcmF3KCk7XG4gICAgfSwgMSk7XG5cbiAgICB2aWV3TGF5ZXIuX2RyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vcmV0dXJuIGlmIHdlIGhhdmVuJ3QgYnVpbHQgeWV0XG4gICAgICAgIGlmICghY29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVidWlsdCA9IGdyaWQudmlld1BvcnQuaXNEaXJ0eSgpO1xuICAgICAgICBpZiAocmVidWlsdCkge1xuICAgICAgICAgICAgdmlld0xheWVyLl9idWlsZENlbGxzKGNlbGxDb250YWluZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGJ1aWx0Q29sc0RpcnR5ID0gZ3JpZC5jb2xNb2RlbC5hcmVCdWlsZGVyc0RpcnR5KCk7XG4gICAgICAgIGlmIChyZWJ1aWx0IHx8IGJ1aWx0Q29sc0RpcnR5KSB7XG4gICAgICAgICAgICB2aWV3TGF5ZXIuX2J1aWxkQ29scygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGJ1aWx0Um93c0RpcnR5ID0gZ3JpZC5yb3dNb2RlbC5hcmVCdWlsZGVyc0RpcnR5KCk7XG4gICAgICAgIGlmIChyZWJ1aWx0IHx8IGJ1aWx0Um93c0RpcnR5KSB7XG4gICAgICAgICAgICB2aWV3TGF5ZXIuX2J1aWxkUm93cygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNlbGxzUG9zaXRpb25PclNpemVDaGFuZ2VkID0gZ3JpZC5jb2xNb2RlbC5pc0RpcnR5KCkgfHwgZ3JpZC5yb3dNb2RlbC5pc0RpcnR5KCkgfHwgZ3JpZC5jZWxsU2Nyb2xsTW9kZWwuaXNEaXJ0eSgpO1xuXG4gICAgICAgIGlmIChncmlkLmNlbGxDbGFzc2VzLmlzRGlydHkoKSB8fCByZWJ1aWx0IHx8IGNlbGxzUG9zaXRpb25PclNpemVDaGFuZ2VkKSB7XG4gICAgICAgICAgICB2aWV3TGF5ZXIuX2RyYXdDZWxsQ2xhc3NlcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlYnVpbHQgfHwgY2VsbHNQb3NpdGlvbk9yU2l6ZUNoYW5nZWQgfHwgYnVpbHRDb2xzRGlydHkgfHwgYnVpbHRSb3dzRGlydHkgfHwgZ3JpZC5kYXRhTW9kZWwuaXNEaXJ0eSgpKSB7XG4gICAgICAgICAgICB2aWV3TGF5ZXIuX2RyYXdDZWxscygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGdyaWQuZGVjb3JhdG9ycy5pc0RpcnR5KCkgfHwgcmVidWlsdCB8fCBjZWxsc1Bvc2l0aW9uT3JTaXplQ2hhbmdlZCkge1xuICAgICAgICAgICAgdmlld0xheWVyLl9kcmF3RGVjb3JhdG9ycyhjZWxsc1Bvc2l0aW9uT3JTaXplQ2hhbmdlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBncmlkLmV2ZW50TG9vcC5maXJlKCdncmlkLWRyYXcnKTtcbiAgICB9O1xuXG4gICAgLyogQ0VMTCBMT0dJQyAqL1xuICAgIGZ1bmN0aW9uIGdldEJvcmRlcldpZHRoKCkge1xuICAgICAgICByZXR1cm4gYm9yZGVyV2lkdGggfHwgMTtcbiAgICB9XG5cbiAgICB2aWV3TGF5ZXIuX2RyYXdDZWxscyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWVhc3VyZUJvcmRlcldpZHRoKCk7XG4gICAgICAgIHZhciBiV2lkdGggPSBnZXRCb3JkZXJXaWR0aCgpO1xuICAgICAgICB2YXIgaGVhZGVyUm93cyA9IGdyaWQucm93TW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICB2YXIgaGVhZGVyQ29scyA9IGdyaWQuY29sTW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICBncmlkLnZpZXdQb3J0Lml0ZXJhdGVDZWxscyhmdW5jdGlvbiBkcmF3Q2VsbChyLCBjKSB7XG4gICAgICAgICAgICB2YXIgY2VsbCA9IGNlbGxzW3JdW2NdO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gZ3JpZC52aWV3UG9ydC5nZXRDb2xXaWR0aChjKTtcbiAgICAgICAgICAgIGNlbGwuc3R5bGUud2lkdGggPSB3aWR0aCArIGJXaWR0aCArICdweCc7XG5cbiAgICAgICAgICAgIHZhciBsZWZ0ID0gZ3JpZC52aWV3UG9ydC5nZXRDb2xMZWZ0KGMpO1xuICAgICAgICAgICAgY2VsbC5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XG5cbiAgICAgICAgICAgIHdoaWxlIChjZWxsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjZWxsLnJlbW92ZUNoaWxkKGNlbGwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmlydHVhbFJvdyA9IGdyaWQudmlld1BvcnQudG9WaXJ0dWFsUm93KHIpO1xuICAgICAgICAgICAgdmFyIHZpcnR1YWxDb2wgPSBncmlkLnZpZXdQb3J0LnRvVmlydHVhbENvbChjKTtcbiAgICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgICAgaWYgKHIgPCBoZWFkZXJSb3dzIHx8IGMgPCBoZWFkZXJDb2xzKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGdyaWQuZGF0YU1vZGVsLmdldEhlYWRlcih2aXJ0dWFsUm93LCB2aXJ0dWFsQ29sKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGdyaWQuZGF0YU1vZGVsLmdldChncmlkLnJvd01vZGVsLnRvRGF0YSh2aXJ0dWFsUm93KSwgZ3JpZC5jb2xNb2RlbC50b0RhdGEodmlydHVhbENvbCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9hcnRpZmljaWFsbHkgb25seSBnZXQgYnVpbGRlcnMgZm9yIHJvdyBoZWFkZXJzIGZvciBub3dcbiAgICAgICAgICAgIHZhciBidWlsZGVyID0gdmlydHVhbFJvdyA8IGhlYWRlclJvd3MgJiYgZ3JpZC5yb3dNb2RlbC5nZXQodmlydHVhbFJvdykuYnVpbGRlciB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICB2YXIgaGFzUm93QnVpbGRlciA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIWJ1aWxkZXIpIHtcbiAgICAgICAgICAgICAgICBoYXNSb3dCdWlsZGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnVpbGRlciA9IGdyaWQuY29sTW9kZWwuZ2V0KHZpcnR1YWxDb2wpLmJ1aWxkZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjZWxsQ2hpbGQ7XG4gICAgICAgICAgICBpZiAoYnVpbGRlcikge1xuICAgICAgICAgICAgICAgIHZhciBidWlsdEVsZW07XG4gICAgICAgICAgICAgICAgaWYgKGhhc1Jvd0J1aWxkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnVpbHRFbGVtID0gYnVpbHRSb3dzW3ZpcnR1YWxSb3ddW2NdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1aWx0RWxlbSA9IGJ1aWx0Q29sc1t2aXJ0dWFsQ29sXVtyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2VsbENoaWxkID0gYnVpbGRlci51cGRhdGUoYnVpbHRFbGVtLCB7XG4gICAgICAgICAgICAgICAgICAgIHZpcnR1YWxDb2w6IHZpcnR1YWxDb2wsXG4gICAgICAgICAgICAgICAgICAgIHZpcnR1YWxSb3c6IHZpcnR1YWxSb3csXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vaWYgd2UgZGlkbid0IGdldCBhIGNoaWxkIGZyb20gdGhlIGJ1aWxkZXIgdXNlIGEgcmVndWxhciB0ZXh0IG5vZGVcbiAgICAgICAgICAgIGlmICghY2VsbENoaWxkKSB7XG4gICAgICAgICAgICAgICAgY2VsbENoaWxkID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YS5mb3JtYXR0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2VsbC5hcHBlbmRDaGlsZChjZWxsQ2hpbGQpO1xuICAgICAgICB9LCBmdW5jdGlvbiBkcmF3Um93KHIpIHtcbiAgICAgICAgICAgIHZhciBoZWlnaHQgPSBncmlkLnZpZXdQb3J0LmdldFJvd0hlaWdodChyKTtcbiAgICAgICAgICAgIHZhciByb3cgPSByb3dzW3JdO1xuICAgICAgICAgICAgcm93LnN0eWxlLmhlaWdodCA9IGhlaWdodCArIGJXaWR0aCArICdweCc7XG4gICAgICAgICAgICB2YXIgdG9wID0gZ3JpZC52aWV3UG9ydC5nZXRSb3dUb3Aocik7XG4gICAgICAgICAgICByb3cuc3R5bGUudG9wID0gdG9wICsgJ3B4JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGdyaWQuY2VsbFNjcm9sbE1vZGVsLnJvdyAlIDIpIHtcbiAgICAgICAgICAgIGNlbGxDb250YWluZXIuY2xhc3NOYW1lID0gR1JJRF9DRUxMX0NPTlRBSU5FUl9CQVNFX0NMQVNTICsgJyBvZGRzJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNlbGxDb250YWluZXIuY2xhc3NOYW1lID0gR1JJRF9DRUxMX0NPTlRBSU5FUl9CQVNFX0NMQVNTO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgdmlld0xheWVyLl9idWlsZENlbGxzID0gZnVuY3Rpb24gYnVpbGRDZWxscyhjZWxsQ29udGFpbmVyKSB7XG4gICAgICAgIHdoaWxlIChjZWxsQ29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGNlbGxDb250YWluZXIucmVtb3ZlQ2hpbGQoY2VsbENvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgY2VsbHMgPSBbXTtcbiAgICAgICAgcm93cyA9IFtdO1xuICAgICAgICB2YXIgcm93O1xuICAgICAgICBncmlkLnZpZXdQb3J0Lml0ZXJhdGVDZWxscyhmdW5jdGlvbiAociwgYykge1xuICAgICAgICAgICAgdmFyIGNlbGwgPSBidWlsZERpdkNlbGwoKTtcbiAgICAgICAgICAgIGNlbGxzW3JdW2NdID0gY2VsbDtcbiAgICAgICAgICAgIHJvdy5hcHBlbmRDaGlsZChjZWxsKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgIGNlbGxzW3JdID0gW107XG4gICAgICAgICAgICByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHJvdy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2dyaWQtcm93Jyk7XG4gICAgICAgICAgICByb3cuc2V0QXR0cmlidXRlKCdkdHMnLCAnZ3JpZC1yb3cnKTtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgICAgICByb3cuc3R5bGUubGVmdCA9IDA7XG4gICAgICAgICAgICByb3cuc3R5bGUucmlnaHQgPSAwO1xuICAgICAgICAgICAgcm93c1tyXSA9IHJvdztcbiAgICAgICAgICAgIGNlbGxDb250YWluZXIuYXBwZW5kQ2hpbGQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGJ1aWxkRGl2Q2VsbCgpIHtcbiAgICAgICAgdmFyIGNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgY2VsbC5zZXRBdHRyaWJ1dGUoJ2R0cycsICdncmlkLWNlbGwnKTtcbiAgICAgICAgdmFyIHN0eWxlID0gY2VsbC5zdHlsZTtcbiAgICAgICAgc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBzdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgIHN0eWxlLnRvcCA9ICcwcHgnO1xuICAgICAgICBzdHlsZS5ib3R0b20gPSAnMHB4JztcbiAgICAgICAgcmV0dXJuIGNlbGw7XG4gICAgfVxuXG4gICAgLyogRU5EIENFTEwgTE9HSUMgKi9cblxuICAgIC8qIENPTCBCVUlMREVSIExPR0lDICovXG4gICAgdmlld0xheWVyLl9idWlsZENvbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGJ1aWx0Q29scyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGdyaWQuY29sTW9kZWwubGVuZ3RoKHRydWUpOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBidWlsZGVyID0gZ3JpZC5jb2xNb2RlbC5nZXQoYykuYnVpbGRlcjtcbiAgICAgICAgICAgIGlmIChidWlsZGVyKSB7XG4gICAgICAgICAgICAgICAgYnVpbHRDb2xzW2NdID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcmVhbFJvdyA9IDA7IHJlYWxSb3cgPCBncmlkLnZpZXdQb3J0LnJvd3M7IHJlYWxSb3crKykge1xuICAgICAgICAgICAgICAgICAgICBidWlsdENvbHNbY11bcmVhbFJvd10gPSBidWlsZGVyLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLyogRU5EIENPTCBCVUlMREVSIExPR0lDICovXG5cbiAgICAvKiBST1cgQlVJTERFUiBMT0dJQyBcbiAgICAgKiAgZm9yIG5vdyB3ZSBvbmx5IGJ1aWxkIGhlYWRlcnNcbiAgICAgKiAqL1xuXG4gICAgdmlld0xheWVyLl9idWlsZFJvd3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGJ1aWx0Um93cyA9IHt9O1xuICAgICAgICBmb3IgKHZhciByID0gMDsgciA8IGdyaWQucm93TW9kZWwubnVtSGVhZGVycygpOyByKyspIHtcbiAgICAgICAgICAgIHZhciBidWlsZGVyID0gZ3JpZC5yb3dNb2RlbC5nZXQocikuYnVpbGRlcjtcbiAgICAgICAgICAgIGlmIChidWlsZGVyKSB7XG4gICAgICAgICAgICAgICAgYnVpbHRSb3dzW3JdID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcmVhbENvbCA9IDA7IHJlYWxDb2wgPCBncmlkLnZpZXdQb3J0LmNvbHM7IHJlYWxDb2wrKykge1xuICAgICAgICAgICAgICAgICAgICBidWlsdFJvd3Nbcl1bcmVhbENvbF0gPSBidWlsZGVyLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLyogRU5EIFJPVyBCVUlMREVSIExPR0lDKi9cblxuICAgIC8qIERFQ09SQVRPUiBMT0dJQyAqL1xuICAgIGZ1bmN0aW9uIHNldFBvc2l0aW9uKGJvdW5kaW5nQm94LCB0b3AsIGxlZnQsIGhlaWdodCwgd2lkdGgpIHtcbiAgICAgICAgdmFyIHN0eWxlID0gYm91bmRpbmdCb3guc3R5bGU7XG4gICAgICAgIHN0eWxlLnRvcCA9IHRvcCArICdweCc7XG4gICAgICAgIHN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4JztcbiAgICAgICAgc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIHN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3NpdGlvbkRlY29yYXRvcihib3VuZGluZywgdCwgbCwgaCwgdykge1xuICAgICAgICBzZXRQb3NpdGlvbihib3VuZGluZywgdCwgbCwgdXRpbC5jbGFtcChoLCAwLCBncmlkLnZpZXdQb3J0LmhlaWdodCksIHV0aWwuY2xhbXAodywgMCwgZ3JpZC52aWV3UG9ydC53aWR0aCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc2l0aW9uQ2VsbERlY29yYXRvckZyb21WaWV3Q2VsbFJhbmdlKHJlYWxDZWxsUmFuZ2UsIGJvdW5kaW5nQm94KSB7XG4gICAgICAgIHZhciByZWFsUHhSYW5nZSA9IGdyaWQudmlld1BvcnQudG9QeChyZWFsQ2VsbFJhbmdlKTtcbiAgICAgICAgcG9zaXRpb25EZWNvcmF0b3IoYm91bmRpbmdCb3gsIHJlYWxQeFJhbmdlLnRvcCwgcmVhbFB4UmFuZ2UubGVmdCwgcmVhbFB4UmFuZ2UuaGVpZ2h0ICsgZ2V0Qm9yZGVyV2lkdGgoKSwgcmVhbFB4UmFuZ2Uud2lkdGggKyBnZXRCb3JkZXJXaWR0aCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVSYW5nZUZvckRlc2NyaXB0b3IoZGVzY3JpcHRvcikge1xuICAgICAgICB2YXIgcmFuZ2UgPSB7XG4gICAgICAgICAgICB0b3A6IGRlc2NyaXB0b3IudG9wLFxuICAgICAgICAgICAgbGVmdDogZGVzY3JpcHRvci5sZWZ0LFxuICAgICAgICAgICAgaGVpZ2h0OiBkZXNjcmlwdG9yLmhlaWdodCxcbiAgICAgICAgICAgIHdpZHRoOiBkZXNjcmlwdG9yLndpZHRoXG4gICAgICAgIH07XG4gICAgICAgIGlmIChkZXNjcmlwdG9yLnNwYWNlID09PSAnZGF0YScgJiYgZGVzY3JpcHRvci51bml0cyA9PT0gJ2NlbGwnKSB7XG4gICAgICAgICAgICByYW5nZS50b3AgKz0gZ3JpZC5yb3dNb2RlbC5udW1IZWFkZXJzKCk7XG4gICAgICAgICAgICByYW5nZS5sZWZ0ICs9IGdyaWQuY29sTW9kZWwubnVtSGVhZGVycygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByYW5nZTtcbiAgICB9XG5cbiAgICB2aWV3TGF5ZXIuX2RyYXdEZWNvcmF0b3JzID0gZnVuY3Rpb24gKGNlbGxzUG9zaXRpb25PclNpemVDaGFuZ2VkKSB7XG4gICAgICAgIHZhciBhbGl2ZURlY29yYXRvcnMgPSBncmlkLmRlY29yYXRvcnMuZ2V0QWxpdmUoKTtcbiAgICAgICAgYWxpdmVEZWNvcmF0b3JzLmZvckVhY2goZnVuY3Rpb24gKGRlY29yYXRvcikge1xuXG4gICAgICAgICAgICB2YXIgYm91bmRpbmdCb3ggPSBkZWNvcmF0b3IuYm91bmRpbmdCb3g7XG4gICAgICAgICAgICBpZiAoIWJvdW5kaW5nQm94KSB7XG4gICAgICAgICAgICAgICAgYm91bmRpbmdCb3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBib3VuZGluZ0JveC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGRlY29yYXRvci5ib3VuZGluZ0JveCA9IGJvdW5kaW5nQm94O1xuICAgICAgICAgICAgICAgIHZhciBkZWNFbGVtZW50ID0gZGVjb3JhdG9yLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIGlmIChkZWNFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGJvdW5kaW5nQm94LmFwcGVuZENoaWxkKGRlY0VsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3JDb250YWluZXIuYXBwZW5kQ2hpbGQoYm91bmRpbmdCb3gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5pc0RpcnR5KCkgfHwgY2VsbHNQb3NpdGlvbk9yU2l6ZUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9yLnNwYWNlID09PSAncmVhbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChkZWNvcmF0b3IudW5pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3B4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkRlY29yYXRvcihib3VuZGluZ0JveCwgZGVjb3JhdG9yLnRvcCwgZGVjb3JhdG9yLmxlZnQsIGRlY29yYXRvci5oZWlnaHQsIGRlY29yYXRvci53aWR0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdjZWxsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkNlbGxEZWNvcmF0b3JGcm9tVmlld0NlbGxSYW5nZShkZWNvcmF0b3IsIGJvdW5kaW5nQm94KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChkZWNvcmF0b3Iuc3BhY2UgPT09ICd2aXJ0dWFsJyB8fCBkZWNvcmF0b3Iuc3BhY2UgPT09ICdkYXRhJykge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGRlY29yYXRvci51bml0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncHgnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2VsbCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBqc2hpbnQgLVcwODYgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gY3JlYXRlUmFuZ2VGb3JEZXNjcmlwdG9yKGRlY29yYXRvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWxDZWxsUmFuZ2UgPSBncmlkLnZpZXdQb3J0LmludGVyc2VjdChyYW5nZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWxDZWxsUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25DZWxsRGVjb3JhdG9yRnJvbVZpZXdDZWxsUmFuZ2UocmVhbENlbGxSYW5nZSwgYm91bmRpbmdCb3gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uRGVjb3JhdG9yKGJvdW5kaW5nQm94LCAtMSwgLTEsIC0xLCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgLyoganNoaW50ICtXMDg2ICovXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVtb3ZlRGVjb3JhdG9ycyhncmlkLmRlY29yYXRvcnMucG9wQWxsRGVhZCgpKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcmVtb3ZlRGVjb3JhdG9ycyhkZWNvcmF0b3JzKSB7XG4gICAgICAgIGRlY29yYXRvcnMuZm9yRWFjaChmdW5jdGlvbiAoZGVjb3JhdG9yKSB7XG4gICAgICAgICAgICB2YXIgYm91bmRpbmdCb3ggPSBkZWNvcmF0b3IuYm91bmRpbmdCb3g7XG4gICAgICAgICAgICBpZiAoYm91bmRpbmdCb3gpIHtcbiAgICAgICAgICAgICAgICAvL2lmIHRoZXkgcmVuZGVyZWQgYW4gZWxlbWVudCBwcmV2aW91c2x5IHdlIGF0dGFjaGVkIGl0IHRvIHRoZSBib3VuZGluZyBib3ggYXMgdGhlIG9ubHkgY2hpbGRcbiAgICAgICAgICAgICAgICB2YXIgcmVuZGVyZWRFbGVtZW50ID0gYm91bmRpbmdCb3guZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICBpZiAocmVuZGVyZWRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY3JlYXRlIGEgZGVzdHJveSBkb20gZXZlbnQgdGhhdCBidWJibGVzXG4gICAgICAgICAgICAgICAgICAgIHZhciBkZXN0cm95RXZlbnQgPSBjdXN0b21FdmVudCgnZGVjb3JhdG9yLWRlc3Ryb3knLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWRFbGVtZW50LmRpc3BhdGNoRXZlbnQoZGVzdHJveUV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVjb3JhdG9yQ29udGFpbmVyLnJlbW92ZUNoaWxkKGJvdW5kaW5nQm94KTtcbiAgICAgICAgICAgICAgICBkZWNvcmF0b3IuYm91bmRpbmdCb3ggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qIEVORCBERUNPUkFUT1IgTE9HSUMgKi9cblxuICAgIC8qIENFTEwgQ0xBU1NFUyBMT0dJQyAqL1xuICAgIHZpZXdMYXllci5fZHJhd0NlbGxDbGFzc2VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBncmlkLnZpZXdQb3J0Lml0ZXJhdGVDZWxscyhmdW5jdGlvbiAociwgYykge1xuICAgICAgICAgICAgY2VsbHNbcl1bY10uY2xhc3NOYW1lID0gJyc7XG4gICAgICAgIH0pO1xuICAgICAgICBncmlkLmNlbGxDbGFzc2VzLmdldEFsbCgpLmZvckVhY2goZnVuY3Rpb24gKGRlc2NyaXB0b3IpIHtcbiAgICAgICAgICAgIHZhciByYW5nZSA9IGNyZWF0ZVJhbmdlRm9yRGVzY3JpcHRvcihkZXNjcmlwdG9yKTtcbiAgICAgICAgICAgIHZhciBpbnRlcnNlY3Rpb24gPSBncmlkLnZpZXdQb3J0LmludGVyc2VjdChyYW5nZSk7XG4gICAgICAgICAgICBpZiAoaW50ZXJzZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcm93TG9vcDpcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgciA9IDA7IHIgPCBpbnRlcnNlY3Rpb24uaGVpZ2h0OyByKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgaW50ZXJzZWN0aW9uLndpZHRoOyBjKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcm93ID0gaW50ZXJzZWN0aW9uLnRvcCArIHI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbCA9IGludGVyc2VjdGlvbi5sZWZ0ICsgYztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjZWxsUm93ID0gY2VsbHNbcm93XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNlbGxSb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgcm93TG9vcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNlbGwgPSBjZWxsUm93W2NvbF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjZWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZWxsLmNsYXNzTmFtZSA9IChjZWxsLmNsYXNzTmFtZSA/IGNlbGwuY2xhc3NOYW1lICsgJyAnIDogJycpICsgZGVzY3JpcHRvci5jbGFzcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyogRU5EIENFTEwgQ0xBU1NFUyBMT0dJQyovXG5cbiAgICB2aWV3TGF5ZXIuZGVzdHJveSA9IGNsZWFudXA7XG5cbiAgICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgICAgICByZW1vdmVEZWNvcmF0b3JzKGdyaWQuZGVjb3JhdG9ycy5nZXRBbGl2ZSgpLmNvbmNhdChncmlkLmRlY29yYXRvcnMucG9wQWxsRGVhZCgpKSk7XG4gICAgICAgIGlmICghY29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHF1ZXJ5U2VsZWN0b3JBbGwgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyBHUklEX1ZJRVdfUk9PVF9DTEFTUyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcXVlcnlTZWxlY3RvckFsbC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIHJvb3QgPSBxdWVyeVNlbGVjdG9yQWxsW2ldO1xuICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKHJvb3QpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1kZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2aWV3TGF5ZXIuZGVzdHJveSgpO1xuICAgICAgICBjbGVhclRpbWVvdXQodmlld0xheWVyLmRyYXcudGltZW91dCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdmlld0xheWVyO1xufTsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJ0BncmlkL3V0aWwnKTtcbnZhciByYW5nZVV0aWwgPSByZXF1aXJlKCdAZ3JpZC9yYW5nZS11dGlsJyk7XG52YXIgY2FwaXRhbGl6ZSA9IHJlcXVpcmUoJ2NhcGl0YWxpemUnKTtcbnZhciBhZGREaXJ0eVByb3BzID0gcmVxdWlyZSgnQGdyaWQvYWRkLWRpcnR5LXByb3BzJyk7XG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCdAZ3JpZC9kZWJvdW5jZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG4gICAgdmFyIGRpcnR5Q2xlYW4gPSByZXF1aXJlKCdAZ3JpZC9kaXJ0eS1jbGVhbicpKGdyaWQpO1xuICAgIHZhciBjb250YWluZXI7XG5cbiAgICB2YXIgdmlld1BvcnQgPSBhZGREaXJ0eVByb3BzKHt9LCBbJ3Jvd3MnLCAnY29scycsICd3aWR0aCcsICdoZWlnaHQnXSwgW2RpcnR5Q2xlYW5dKTtcbiAgICB2aWV3UG9ydC5yb3dzID0gMDtcbiAgICB2aWV3UG9ydC5jb2xzID0gMDtcbiAgICB2aWV3UG9ydC5pc0RpcnR5ID0gZGlydHlDbGVhbi5pc0RpcnR5O1xuXG4gICAgLy90aGVzZSBwcm9iYWJseSB0cmlnZ2VyIHJlZmxvdyBzbyB3ZSBtYXkgbmVlZCB0byB0aGluayBhYm91dCBjYWNoaW5nIHRoZSB2YWx1ZSBhbmQgdXBkYXRpbmcgaXQgYXQgb24gZHJhd3Mgb3Igc29tZXRoaW5nXG4gICAgZnVuY3Rpb24gZ2V0Rmlyc3RDbGllbnRSZWN0KCkge1xuICAgICAgICByZXR1cm4gY29udGFpbmVyICYmIGNvbnRhaW5lci5nZXRDbGllbnRSZWN0cyAmJiBjb250YWluZXIuZ2V0Q2xpZW50UmVjdHMoKSAmJiBjb250YWluZXIuZ2V0Q2xpZW50UmVjdHMoKVswXSB8fCB7fTtcbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodmlld1BvcnQsICd0b3AnLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldEZpcnN0Q2xpZW50UmVjdCgpLnRvcCB8fCAwO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodmlld1BvcnQsICdsZWZ0Jywge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRGaXJzdENsaWVudFJlY3QoKS5sZWZ0IHx8IDA7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZpZXdQb3J0LnRvR3JpZFggPSBmdW5jdGlvbiAoY2xpZW50WCkge1xuICAgICAgICByZXR1cm4gY2xpZW50WCAtIHZpZXdQb3J0LmxlZnQ7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LnRvR3JpZFkgPSBmdW5jdGlvbiAoY2xpZW50WSkge1xuICAgICAgICByZXR1cm4gY2xpZW50WSAtIHZpZXdQb3J0LnRvcDtcbiAgICB9O1xuXG5cbiAgICB2YXIgZml4ZWQgPSB7cm93czogMCwgY29sczogMH07XG5cbiAgICBmdW5jdGlvbiBnZXRGaXhlZChyb3dPckNvbCkge1xuICAgICAgICByZXR1cm4gZml4ZWRbcm93T3JDb2wgKyAncyddO1xuICAgIH1cblxuICAgIHZpZXdQb3J0LnNpemVUb0NvbnRhaW5lciA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGNvbnRhaW5lciA9IGVsZW07XG4gICAgICAgIHZpZXdQb3J0LndpZHRoID0gZWxlbS5vZmZzZXRXaWR0aDtcbiAgICAgICAgdmlld1BvcnQuaGVpZ2h0ID0gZWxlbS5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIHZpZXdQb3J0LnJvd3MgPSBjYWxjdWxhdGVNYXhMZW5ndGhzKHZpZXdQb3J0LmhlaWdodCwgZ3JpZC5yb3dNb2RlbCk7XG4gICAgICAgIHZpZXdQb3J0LmNvbHMgPSBjYWxjdWxhdGVNYXhMZW5ndGhzKHZpZXdQb3J0LndpZHRoLCBncmlkLmNvbE1vZGVsKTtcbiAgICAgICAgZ3JpZC5ldmVudExvb3AuZmlyZSgnZ3JpZC12aWV3cG9ydC1jaGFuZ2UnKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuX29uUmVzaXplID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICB2aWV3UG9ydC5fcmVzaXplKCk7XG4gICAgfSwgMjAwKTtcblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ2dyaWQtZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHZpZXdQb3J0Ll9vblJlc2l6ZS50aW1lb3V0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHNob3J0RGVib3VuY2VkUmVzaXplLnRpbWVvdXQpO1xuICAgIH0pO1xuXG4gICAgdmlld1BvcnQuX3Jlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdmlld1BvcnQuc2l6ZVRvQ29udGFpbmVyKGNvbnRhaW5lcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHNob3J0RGVib3VuY2VkUmVzaXplID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICB2aWV3UG9ydC5fcmVzaXplKCk7XG4gICAgfSwgMSk7XG5cblxuICAgIGdyaWQuZXZlbnRMb29wLmJpbmQoJ3Jlc2l6ZScsIHdpbmRvdywgZnVuY3Rpb24gKCkge1xuICAgICAgICAvL3dlIGRvbid0IGJpbmQgdGhlIGhhbmRsZXIgZGlyZWN0bHkgc28gdGhhdCB0ZXN0cyBjYW4gbW9jayBpdCBvdXRcbiAgICAgICAgdmlld1BvcnQuX29uUmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXJvdy1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZpeGVkLnJvd3MgPSBncmlkLnJvd01vZGVsLm51bUZpeGVkKCk7XG4gICAgICAgIHNob3J0RGVib3VuY2VkUmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLWNvbC1jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZpeGVkLmNvbHMgPSBncmlkLmNvbE1vZGVsLm51bUZpeGVkKCk7XG4gICAgICAgIHNob3J0RGVib3VuY2VkUmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjb252ZXJ0UmVhbFRvVmlydHVhbChjb29yZCwgcm93T3JDb2wsIGNvb3JkSXNWaXJ0dWFsKSB7XG4gICAgICAgIC8vY291bGQgY2FjaGUgdGhpcyBvbiBjaGFuZ2VzIGkuZS4gcm93LWNoYW5nZSBvciBjb2wtY2hhbmdlIGV2ZW50c1xuICAgICAgICB2YXIgbnVtRml4ZWQgPSBnZXRGaXhlZChyb3dPckNvbCk7XG4gICAgICAgIGlmIChjb29yZCA8IG51bUZpeGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY29vcmQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvb3JkICsgKGNvb3JkSXNWaXJ0dWFsID8gLTEgOiAxKSAqIGdyaWQuY2VsbFNjcm9sbE1vZGVsW3Jvd09yQ29sXTtcbiAgICB9XG5cbi8vIGNvbnZlcnRzIGEgdmlld3BvcnQgcm93IG9yIGNvbHVtbiB0byBhIHJlYWwgcm93IG9yIGNvbHVtbiBcbi8vIGNsYW1wcyBpdCBpZiB0aGUgY29sdW1uIHdvdWxkIGJlIG91dHNpZGUgdGhlIHJhbmdlXG4gICAgZnVuY3Rpb24gZ2V0VmlydHVhbFJvd0NvbFVuc2FmZShyZWFsQ29vcmQsIHJvd09yQ29sKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0UmVhbFRvVmlydHVhbChyZWFsQ29vcmQsIHJvd09yQ29sKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRWaXJ0dWFsUm93Q29sQ2xhbXBlZCh2aWV3Q29vcmQsIHJvd09yQ29sKSB7XG4gICAgICAgIHZhciB2aXJ0dWFsUm93Q29sID0gZ2V0VmlydHVhbFJvd0NvbFVuc2FmZSh2aWV3Q29vcmQsIHJvd09yQ29sKTtcbiAgICAgICAgcmV0dXJuIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsWydjbGFtcCcgKyBjYXBpdGFsaXplKHJvd09yQ29sKV0odmlydHVhbFJvd0NvbCk7XG4gICAgfVxuXG4gICAgdmlld1BvcnQudG9WaXJ0dWFsUm93ID0gZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgcmV0dXJuIGdldFZpcnR1YWxSb3dDb2xDbGFtcGVkKHIsICdyb3cnKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQudG9WaXJ0dWFsQ29sID0gZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgcmV0dXJuIGdldFZpcnR1YWxSb3dDb2xDbGFtcGVkKGMsICdjb2wnKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0UmVhbFJvd0NvbENsYW1wZWQodmlydHVhbENvb3JkLCByb3dPckNvbCkge1xuICAgICAgICB2YXIgbnVtRml4ZWQgPSBnZXRGaXhlZChyb3dPckNvbCk7XG4gICAgICAgIGlmICh2aXJ0dWFsQ29vcmQgPCBudW1GaXhlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHZpcnR1YWxDb29yZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF4Vmlld1BvcnRJbmRleCA9IHZpZXdQb3J0W3Jvd09yQ29sICsgJ3MnXSAtIDE7XG4gICAgICAgIHJldHVybiB1dGlsLmNsYW1wKHZpcnR1YWxDb29yZCAtIGdyaWQuY2VsbFNjcm9sbE1vZGVsW3Jvd09yQ29sXSwgbnVtRml4ZWQsIG1heFZpZXdQb3J0SW5kZXgsIHRydWUpO1xuICAgIH1cblxuICAgIHZpZXdQb3J0LnJvd0lzSW5WaWV3ID0gZnVuY3Rpb24gKHZpcnR1YWxSb3cpIHtcbiAgICAgICAgdmFyIHJlYWxSb3cgPSB2aWV3UG9ydC50b1JlYWxSb3codmlydHVhbFJvdyk7XG4gICAgICAgIHJldHVybiAhaXNOYU4ocmVhbFJvdykgJiYgZ2V0TGVuZ3RoQmV0d2VlblZpZXdDb29yZHMoMCwgcmVhbFJvdywgJ3JvdycsICdoZWlnaHQnLCB0cnVlKSA8IHZpZXdQb3J0LmhlaWdodDtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuY29sSXNJblZpZXcgPSBmdW5jdGlvbiAodmlydHVhbENvbCkge1xuICAgICAgICB2YXIgcmVhbENvbCA9IHZpZXdQb3J0LnRvUmVhbENvbCh2aXJ0dWFsQ29sKTtcbiAgICAgICAgcmV0dXJuICFpc05hTihyZWFsQ29sKSAmJiBnZXRMZW5ndGhCZXR3ZWVuVmlld0Nvb3JkcygwLCByZWFsQ29sLCAnY29sJywgJ3dpZHRoJywgdHJ1ZSkgPCB2aWV3UG9ydC53aWR0aDtcbiAgICB9O1xuXG5cbi8vZGVmYXVsdCB1bmNsYW1wZWQgY2F1c2UgdGhhdCBzZWVtcyB0byBiZSB0aGUgbW9yZSBsaWtlbHkgdXNlIGNhc2UgY29udmVydGluZyB0aGlzIGRpcmVjdGlvblxuICAgIHZpZXdQb3J0LnRvUmVhbFJvdyA9IGZ1bmN0aW9uICh2aXJ0dWFsUm93KSB7XG4gICAgICAgIHJldHVybiBnZXRSZWFsUm93Q29sQ2xhbXBlZCh2aXJ0dWFsUm93LCAncm93Jyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LnRvUmVhbENvbCA9IGZ1bmN0aW9uICh2aXJ0dWFsQ29sKSB7XG4gICAgICAgIHJldHVybiBnZXRSZWFsUm93Q29sQ2xhbXBlZCh2aXJ0dWFsQ29sLCAnY29sJyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmNsYW1wUm93ID0gZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAociwgMCwgdmlld1BvcnQucm93cyAtIDEpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC5jbGFtcENvbCA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHJldHVybiB1dGlsLmNsYW1wKGMsIDAsIHZpZXdQb3J0LmNvbHMgLSAxKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuY2xhbXBZID0gZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAoeSwgMCwgdmlld1BvcnQuaGVpZ2h0KTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuY2xhbXBYID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuY2xhbXAoeCwgMCwgdmlld1BvcnQud2lkdGgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRMZW5ndGhCZXR3ZWVuVmlld0Nvb3JkcyhzdGFydENvb3JkLCBlbmRDb29yZCwgcm93T3JDb2wsIGhlaWdodE9yV2lkdGgsIGluY2x1c2l2ZSkge1xuICAgICAgICB2YXIgcm93T3JDb2xDYXAgPSBjYXBpdGFsaXplKHJvd09yQ29sKTtcbiAgICAgICAgdmFyIHRvVmlydHVhbCA9IHZpZXdQb3J0Wyd0b1ZpcnR1YWwnICsgcm93T3JDb2xDYXBdO1xuICAgICAgICB2YXIgbGVuZ3RoRm4gPSBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbFtoZWlnaHRPcldpZHRoXTtcbiAgICAgICAgdmFyIGNsYW1wRm4gPSB2aWV3UG9ydFsnY2xhbXAnICsgcm93T3JDb2xDYXBdO1xuICAgICAgICB2YXIgcG9zID0gMDtcbiAgICAgICAgdmFyIG51bUZpeGVkID0gZ2V0Rml4ZWQocm93T3JDb2wpO1xuICAgICAgICB2YXIgaXNJbk5vbmZpeGVkQXJlYSA9IGVuZENvb3JkID49IG51bUZpeGVkO1xuICAgICAgICB2YXIgaXNJbkZpeGVkQXJlYSA9IHN0YXJ0Q29vcmQgPCBudW1GaXhlZDtcbiAgICAgICAgdmFyIGV4Y2x1c2l2ZU9mZnNldCA9IChpbmNsdXNpdmUgPyAwIDogMSk7XG4gICAgICAgIGlmIChpc0luRml4ZWRBcmVhKSB7XG4gICAgICAgICAgICB2YXIgZml4ZWRFbmRDb29yZCA9IChpc0luTm9uZml4ZWRBcmVhID8gbnVtRml4ZWQgLSAxIDogZW5kQ29vcmQgLSBleGNsdXNpdmVPZmZzZXQpO1xuICAgICAgICAgICAgcG9zICs9IGxlbmd0aEZuKHN0YXJ0Q29vcmQsIGZpeGVkRW5kQ29vcmQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0luTm9uZml4ZWRBcmVhKSB7XG4gICAgICAgICAgICBwb3MgKz0gbGVuZ3RoRm4oKGlzSW5GaXhlZEFyZWEgPyB0b1ZpcnR1YWwobnVtRml4ZWQpIDogdG9WaXJ0dWFsKHN0YXJ0Q29vcmQpKSwgdG9WaXJ0dWFsKGNsYW1wRm4oZW5kQ29vcmQpKSAtIGV4Y2x1c2l2ZU9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBvcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUb3BPckxlZnQoZW5kQ29vcmQsIHJvd09yQ29sLCBoZWlnaHRPcldpZHRoKSB7XG4gICAgICAgIHJldHVybiBnZXRMZW5ndGhCZXR3ZWVuVmlld0Nvb3JkcygwLCBlbmRDb29yZCwgcm93T3JDb2wsIGhlaWdodE9yV2lkdGgpO1xuICAgIH1cblxuICAgIHZpZXdQb3J0LmdldFJvd1RvcCA9IGZ1bmN0aW9uICh2aWV3UG9ydENvb3JkKSB7XG4gICAgICAgIHJldHVybiBnZXRUb3BPckxlZnQodmlld1BvcnRDb29yZCwgJ3JvdycsICdoZWlnaHQnKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuZ2V0Q29sTGVmdCA9IGZ1bmN0aW9uICh2aWV3UG9ydENvbCkge1xuICAgICAgICByZXR1cm4gZ2V0VG9wT3JMZWZ0KHZpZXdQb3J0Q29sLCAnY29sJywgJ3dpZHRoJyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LnRvUHggPSBmdW5jdGlvbiAocmVhbENlbGxSYW5nZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG9wOiB2aWV3UG9ydC5nZXRSb3dUb3AocmVhbENlbGxSYW5nZS50b3ApLFxuICAgICAgICAgICAgbGVmdDogdmlld1BvcnQuZ2V0Q29sTGVmdChyZWFsQ2VsbFJhbmdlLmxlZnQpLFxuICAgICAgICAgICAgaGVpZ2h0OiBnZXRMZW5ndGhCZXR3ZWVuVmlld0Nvb3JkcyhyZWFsQ2VsbFJhbmdlLnRvcCwgcmVhbENlbGxSYW5nZS50b3AgKyByZWFsQ2VsbFJhbmdlLmhlaWdodCAtIDEsICdyb3cnLCAnaGVpZ2h0JywgdHJ1ZSksXG4gICAgICAgICAgICB3aWR0aDogZ2V0TGVuZ3RoQmV0d2VlblZpZXdDb29yZHMocmVhbENlbGxSYW5nZS5sZWZ0LCByZWFsQ2VsbFJhbmdlLmxlZnQgKyByZWFsQ2VsbFJhbmdlLndpZHRoIC0gMSwgJ2NvbCcsICd3aWR0aCcsIHRydWUpXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldFJvd09yQ29sRnJvbVBvc2l0aW9uKHBvcywgcm93T3JDb2wsIGhlaWdodE9yV2lkdGgsIHJldHVyblZpcnR1YWwpIHtcbiAgICAgICAgLy93ZSBjb3VsZCBkbyB0aGlzIHNsaWdobHkgZmFzdGVyIHdpdGggYmluYXJ5IHNlYXJjaCB0byBnZXQgbG9nKG4pIGluc3RlYWQgb2YgbiwgYnV0IHdpbGwgb25seSBkbyBpdCBpZiB3ZSBhY3R1YWxseSBuZWVkIHRvIG9wdGltaXplIHRoaXNcbiAgICAgICAgdmFyIHJvd09yQ29sQ2FwID0gY2FwaXRhbGl6ZShyb3dPckNvbCk7XG4gICAgICAgIHZhciB2aWV3TWF4ID0gdmlld1BvcnRbcm93T3JDb2wgKyAncyddO1xuICAgICAgICB2YXIgdG9WaXJ0dWFsID0gdmlld1BvcnRbJ3RvVmlydHVhbCcgKyByb3dPckNvbENhcF07XG4gICAgICAgIHZhciBsZW5ndGhGbiA9IGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsW2hlaWdodE9yV2lkdGhdO1xuICAgICAgICB2YXIgc3VtbWVkTGVuZ3RoID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3TWF4OyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2aXJ0dWFsID0gdG9WaXJ0dWFsKGkpO1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IGxlbmd0aEZuKHZpcnR1YWwpO1xuICAgICAgICAgICAgdmFyIG5ld1N1bSA9IHN1bW1lZExlbmd0aCArIGxlbmd0aDtcbiAgICAgICAgICAgIGlmIChuZXdTdW0gPiBwb3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dXJuVmlydHVhbCA/IHZpcnR1YWwgOiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VtbWVkTGVuZ3RoID0gbmV3U3VtO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBOYU47XG4gICAgfVxuXG4gICAgdmlld1BvcnQuZ2V0VmlydHVhbFJvd0J5VG9wID0gZnVuY3Rpb24gKHRvcCkge1xuICAgICAgICByZXR1cm4gZ2V0Um93T3JDb2xGcm9tUG9zaXRpb24odG9wLCAncm93JywgJ2hlaWdodCcsIHRydWUpO1xuICAgIH07XG5cbiAgICB2aWV3UG9ydC5nZXRWaXJ0dWFsQ29sQnlMZWZ0ID0gZnVuY3Rpb24gKGxlZnQpIHtcbiAgICAgICAgcmV0dXJuIGdldFJvd09yQ29sRnJvbVBvc2l0aW9uKGxlZnQsICdjb2wnLCAnd2lkdGgnLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuZ2V0Um93QnlUb3AgPSBmdW5jdGlvbiAodG9wKSB7XG4gICAgICAgIHJldHVybiBnZXRSb3dPckNvbEZyb21Qb3NpdGlvbih0b3AsICdyb3cnLCAnaGVpZ2h0Jyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmdldENvbEJ5TGVmdCA9IGZ1bmN0aW9uIChsZWZ0KSB7XG4gICAgICAgIHJldHVybiBnZXRSb3dPckNvbEZyb21Qb3NpdGlvbihsZWZ0LCAnY29sJywgJ3dpZHRoJyk7XG4gICAgfTtcblxuICAgIHZpZXdQb3J0LmdldFJvd0hlaWdodCA9IGZ1bmN0aW9uICh2aWV3UG9ydFJvdykge1xuICAgICAgICByZXR1cm4gZ3JpZC52aXJ0dWFsUGl4ZWxDZWxsTW9kZWwuaGVpZ2h0KHZpZXdQb3J0LnRvVmlydHVhbFJvdyh2aWV3UG9ydC5jbGFtcFJvdyh2aWV3UG9ydFJvdykpKTtcbiAgICB9O1xuXG4gICAgdmlld1BvcnQuZ2V0Q29sV2lkdGggPSBmdW5jdGlvbiAodmlld1BvcnRDb2wpIHtcbiAgICAgICAgcmV0dXJuIGdyaWQudmlydHVhbFBpeGVsQ2VsbE1vZGVsLndpZHRoKHZpZXdQb3J0LnRvVmlydHVhbENvbCh2aWV3UG9ydC5jbGFtcENvbCh2aWV3UG9ydENvbCkpKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW50ZXJzZWN0Um93c09yQ29scyhpbnRlcnNlY3Rpb24sIHJhbmdlLCB0b3BPckxlZnQsIHJvd09yQ29sLCBoZWlnaHRPcldpZHRoKSB7XG4gICAgICAgIHZhciBudW1GaXhlZCA9IGZpeGVkW3Jvd09yQ29sICsgJ3MnXTtcbiAgICAgICAgdmFyIGZpeGVkUmFuZ2UgPSBbMCwgbnVtRml4ZWRdO1xuXG4gICAgICAgIHZhciB2aXJ0dWFsUmFuZ2UgPSBbcmFuZ2VbdG9wT3JMZWZ0XSwgcmFuZ2VbaGVpZ2h0T3JXaWR0aF1dO1xuICAgICAgICB2YXIgZml4ZWRJbnRlcnNlY3Rpb24gPSByYW5nZVV0aWwuaW50ZXJzZWN0KGZpeGVkUmFuZ2UsIHZpcnR1YWxSYW5nZSk7XG4gICAgICAgIHZhciBzY3JvbGxSYW5nZSA9IFtudW1GaXhlZCwgdmlld1BvcnRbcm93T3JDb2wgKyAncyddIC0gbnVtRml4ZWRdO1xuICAgICAgICB2aXJ0dWFsUmFuZ2VbMF0gLT0gZ3JpZC5jZWxsU2Nyb2xsTW9kZWxbcm93T3JDb2xdO1xuICAgICAgICB2YXIgc2Nyb2xsSW50ZXJzZWN0aW9uID0gcmFuZ2VVdGlsLmludGVyc2VjdChzY3JvbGxSYW5nZSwgdmlydHVhbFJhbmdlKTtcbiAgICAgICAgdmFyIHJlc3VsdFJhbmdlID0gcmFuZ2VVdGlsLnVuaW9uKGZpeGVkSW50ZXJzZWN0aW9uLCBzY3JvbGxJbnRlcnNlY3Rpb24pO1xuICAgICAgICBpZiAoIXJlc3VsdFJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGludGVyc2VjdGlvblt0b3BPckxlZnRdID0gcmVzdWx0UmFuZ2VbMF07XG4gICAgICAgIGludGVyc2VjdGlvbltoZWlnaHRPcldpZHRoXSA9IHJlc3VsdFJhbmdlWzFdO1xuICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xuICAgIH1cblxuICAgIHZpZXdQb3J0LmludGVyc2VjdCA9IGZ1bmN0aW9uIChyYW5nZSkge1xuICAgICAgICAvL2Fzc3VtZSB2aXJ0dWFsIGNlbGxzIGZvciBub3dcbiAgICAgICAgdmFyIGludGVyc2VjdGlvbiA9IGludGVyc2VjdFJvd3NPckNvbHMoe30sIHJhbmdlLCAndG9wJywgJ3JvdycsICdoZWlnaHQnKTtcbiAgICAgICAgaWYgKCFpbnRlcnNlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnRlcnNlY3RSb3dzT3JDb2xzKGludGVyc2VjdGlvbiwgcmFuZ2UsICdsZWZ0JywgJ2NvbCcsICd3aWR0aCcpO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZU1heExlbmd0aHModG90YWxMZW5ndGgsIGxlbmd0aE1vZGVsKSB7XG4gICAgICAgIHZhciBsZW5ndGhNZXRob2QgPSBsZW5ndGhNb2RlbC53aWR0aCAmJiBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC53aWR0aCB8fCBncmlkLnZpcnR1YWxQaXhlbENlbGxNb2RlbC5oZWlnaHQ7XG4gICAgICAgIHZhciBudW1GaXhlZCA9IGxlbmd0aE1vZGVsLm51bUZpeGVkKCk7XG4gICAgICAgIHZhciB3aW5kb3dMZW5ndGggPSAwO1xuICAgICAgICB2YXIgbWF4U2l6ZSA9IDA7XG4gICAgICAgIHZhciBmaXhlZExlbmd0aCA9IDA7XG4gICAgICAgIHZhciB3aW5kb3dTdGFydEluZGV4ID0gbnVtRml4ZWQ7XG5cbiAgICAgICAgZm9yICh2YXIgZml4ZWQgPSAwOyBmaXhlZCA8IG51bUZpeGVkOyBmaXhlZCsrKSB7XG4gICAgICAgICAgICBmaXhlZExlbmd0aCArPSBsZW5ndGhNZXRob2QoZml4ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9pdCBtaWdodCBiZSBzYWZlciB0byBhY3R1YWxseSBzdW0gdGhlIGxlbmd0aHMgaW4gdGhlIHZpcnR1YWxQaXhlbENlbGxNb2RlbCBidXQgZm9yIG5vdyBoZXJlIGlzIG9rXG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gbnVtRml4ZWQ7IGluZGV4IDwgbGVuZ3RoTW9kZWwubGVuZ3RoKHRydWUpOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB3aW5kb3dMZW5ndGggKz0gbGVuZ3RoTWV0aG9kKGluZGV4KTtcbiAgICAgICAgICAgIHdoaWxlICh3aW5kb3dMZW5ndGggKyBmaXhlZExlbmd0aCA+IHRvdGFsTGVuZ3RoICYmIHdpbmRvd1N0YXJ0SW5kZXggPCBpbmRleCkge1xuICAgICAgICAgICAgICAgIHdpbmRvd0xlbmd0aCAtPSBsZW5ndGhNZXRob2QoaW5kZXgpO1xuICAgICAgICAgICAgICAgIHdpbmRvd1N0YXJ0SW5kZXgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB3aW5kb3dTaXplID0gaW5kZXggLSB3aW5kb3dTdGFydEluZGV4ICsgMTsgLy8gYWRkIHRoZSBvbmUgYmVjYXVzZSB3ZSB3YW50IHRoZSBsYXN0IGluZGV4IHRoYXQgZGlkbid0IGZpdFxuICAgICAgICAgICAgaWYgKHdpbmRvd1NpemUgPiBtYXhTaXplKSB7XG4gICAgICAgICAgICAgICAgbWF4U2l6ZSA9IHdpbmRvd1NpemU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF4U2l6ZSArIG51bUZpeGVkICsgMTtcbiAgICB9XG5cblxuICAgIHZpZXdQb3J0Lml0ZXJhdGVDZWxscyA9IGZ1bmN0aW9uIChjZWxsRm4sIG9wdGlvbmFsUm93Rm4sIG9wdGlvbmFsTWF4Um93LCBvcHRpb25hbE1heENvbCkge1xuICAgICAgICBvcHRpb25hbE1heFJvdyA9IG9wdGlvbmFsTWF4Um93IHx8IEluZmluaXR5O1xuICAgICAgICBvcHRpb25hbE1heENvbCA9IG9wdGlvbmFsTWF4Q29sIHx8IEluZmluaXR5O1xuICAgICAgICBmb3IgKHZhciByID0gMDsgciA8IE1hdGgubWluKHZpZXdQb3J0LnJvd3MsIG9wdGlvbmFsTWF4Um93KTsgcisrKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9uYWxSb3dGbikge1xuICAgICAgICAgICAgICAgIG9wdGlvbmFsUm93Rm4ocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2VsbEZuKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBNYXRoLm1pbih2aWV3UG9ydC5jb2xzLCBvcHRpb25hbE1heENvbCk7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICBjZWxsRm4ociwgYyk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHZpZXdQb3J0O1xufSIsInZhciB1dGlsID0gcmVxdWlyZSgnQGdyaWQvdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfZ3JpZCkge1xuICAgIHZhciBncmlkID0gX2dyaWQ7XG4gICAgdmFyIG1vZGVsID0ge307XG5cbiAgICAvL2FsbCBwaXhlbHMgYXJlIGFzc3VtZWQgdG8gYmUgaW4gdGhlIHZpcnR1YWwgd29ybGQsIG5vIHJlYWwgd29ybGQgcGl4ZWxzIGFyZSBkZWFsdCB3aXRoIGhlcmUgOilcbiAgICBtb2RlbC5nZXRSb3cgPSBmdW5jdGlvbiAodG9wUHgpIHtcbiAgICAgICAgaWYgKHRvcFB4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3VtTGVuZ3RoID0gMDtcbiAgICAgICAgZm9yICh2YXIgciA9IDA7IHIgPCBncmlkLnJvd01vZGVsLmxlbmd0aCh0cnVlKTsgcisrKSB7XG4gICAgICAgICAgICBzdW1MZW5ndGggKz0gZ3JpZC5yb3dNb2RlbC5oZWlnaHQocik7XG4gICAgICAgICAgICBpZiAodG9wUHggPCBzdW1MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTmFOO1xuICAgIH07XG5cbiAgICAvL3llcyB0aGVzZSBhcmUgdmVyeSBzaW1pbGFyIGJ1dCB0aGVyZSB3aWxsIGJlIGRpZmZlcmVuY2VzXG4gICAgbW9kZWwuZ2V0Q29sID0gZnVuY3Rpb24gKGxlZnRQeCkge1xuICAgICAgICBpZiAobGVmdFB4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3VtTGVuZ3RoID0gMDtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBncmlkLmNvbE1vZGVsLmxlbmd0aCh0cnVlKTsgYysrKSB7XG4gICAgICAgICAgICBzdW1MZW5ndGggKz0gZ3JpZC5jb2xNb2RlbC53aWR0aChjKTtcbiAgICAgICAgICAgIGlmIChsZWZ0UHggPCBzdW1MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTmFOO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGNsYW1wUm93T3JDb2wodmlydHVhbFJvd0NvbCwgcm93T3JDb2wpIHtcbiAgICAgICAgdmFyIG1heFJvd0NvbCA9IGdyaWRbcm93T3JDb2wgKyAnTW9kZWwnXS5sZW5ndGgodHJ1ZSkgLSAxO1xuICAgICAgICByZXR1cm4gdXRpbC5jbGFtcCh2aXJ0dWFsUm93Q29sLCAwLCBtYXhSb3dDb2wpO1xuICAgIH1cblxuICAgIG1vZGVsLmNsYW1wUm93ID0gZnVuY3Rpb24gKHZpcnR1YWxSb3cpIHtcbiAgICAgICAgcmV0dXJuIGNsYW1wUm93T3JDb2wodmlydHVhbFJvdywgJ3JvdycpO1xuICAgIH07XG5cbiAgICBtb2RlbC5jbGFtcENvbCA9IGZ1bmN0aW9uICh2aXJ0dWFsQ29sKSB7XG4gICAgICAgIHJldHVybiBjbGFtcFJvd09yQ29sKHZpcnR1YWxDb2wsICdjb2wnKTtcbiAgICB9O1xuXG4gICAgLy9mb3Igbm93IHRoZXNlIGp1c3QgY2FsbCB0aHJvdWdoIHRvIHRoZSByb3cgYW5kIGNvbHVtbiBtb2RlbCwgYnV0IHZlcnkgbGlrZWx5IGl0IHdpbGwgbmVlZCB0byBpbmNsdWRlIHNvbWUgb3RoZXIgY2FsY3VsYXRpb25zXG4gICAgbW9kZWwuaGVpZ2h0ID0gZnVuY3Rpb24gKHZpcnR1YWxSb3dTdGFydCwgdmlydHVhbFJvd0VuZCkge1xuICAgICAgICByZXR1cm4gaGVpZ2h0T3JXaWR0aCh2aXJ0dWFsUm93U3RhcnQsIHZpcnR1YWxSb3dFbmQsICdyb3cnKTtcbiAgICB9O1xuXG4gICAgbW9kZWwud2lkdGggPSBmdW5jdGlvbiAodmlydHVhbENvbFN0YXJ0LCB2aXJ0dWFsQ29sRW5kKSB7XG4gICAgICAgIHJldHVybiBoZWlnaHRPcldpZHRoKHZpcnR1YWxDb2xTdGFydCwgdmlydHVhbENvbEVuZCwgJ2NvbCcpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoZWlnaHRPcldpZHRoKHN0YXJ0LCBlbmQsIHJvd09yQ29sKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSAwO1xuICAgICAgICBpZiAoZW5kIDwgc3RhcnQpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIGVuZCA9IHV0aWwuaXNOdW1iZXIoZW5kKSA/IGVuZCA6IHN0YXJ0O1xuICAgICAgICBlbmQgPSBjbGFtcFJvd09yQ29sKGVuZCwgcm93T3JDb2wpO1xuICAgICAgICBzdGFydCA9IGNsYW1wUm93T3JDb2woc3RhcnQsIHJvd09yQ29sKTtcbiAgICAgICAgdmFyIGxlbmd0aE1vZGVsID0gZ3JpZFtyb3dPckNvbCArICdNb2RlbCddO1xuICAgICAgICB2YXIgbGVuZ3RoRm4gPSBsZW5ndGhNb2RlbC53aWR0aCB8fCBsZW5ndGhNb2RlbC5oZWlnaHQ7XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykge1xuICAgICAgICAgICAgbGVuZ3RoICs9IGxlbmd0aEZuKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsZW5ndGg7XG4gICAgfVxuXG4gICAgbW9kZWwudG90YWxIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBtb2RlbC5oZWlnaHQoMCwgZ3JpZC5yb3dNb2RlbC5sZW5ndGgodHJ1ZSkgLSAxKTtcbiAgICB9O1xuXG4gICAgbW9kZWwudG90YWxXaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLndpZHRoKDAsIGdyaWQuY29sTW9kZWwubGVuZ3RoKHRydWUpIC0gMSk7XG4gICAgfTtcblxuICAgIG1vZGVsLmZpeGVkSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuaGVpZ2h0KDAsIGdyaWQucm93TW9kZWwubnVtRml4ZWQoKSAtIDEpO1xuICAgIH07XG5cbiAgICBtb2RlbC5maXhlZFdpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbW9kZWwud2lkdGgoMCwgZ3JpZC5jb2xNb2RlbC5udW1GaXhlZCgpIC0gMSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNpemVDaGFuZ2VMaXN0ZW5lcigpIHtcbiAgICAgICAgLy9mb3Igbm93IHdlIGRvbid0IGNhY2hlIGFueXRoaW5nIGFib3V0IHRoaXMgc28gd2UganVzdCBub3RpZnlcbiAgICAgICAgZ3JpZC5ldmVudExvb3AuZmlyZSgnZ3JpZC12aXJ0dWFsLXBpeGVsLWNlbGwtY2hhbmdlJyk7XG4gICAgfVxuXG4gICAgZ3JpZC5ldmVudExvb3AuYmluZCgnZ3JpZC1jb2wtY2hhbmdlJywgc2l6ZUNoYW5nZUxpc3RlbmVyKTtcbiAgICBncmlkLmV2ZW50TG9vcC5iaW5kKCdncmlkLXJvdy1jaGFuZ2UnLCBzaXplQ2hhbmdlTGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIG1vZGVsO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0cmluZy5zdWJzdHJpbmcoMSk7XG59XG5cbm1vZHVsZS5leHBvcnRzLndvcmRzID0gZnVuY3Rpb24gKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoLyhefFxcVykoXFx3KS9nLCBmdW5jdGlvbiAobSkge1xuICAgIHJldHVybiBtLnRvVXBwZXJDYXNlKClcbiAgfSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xuICByZXR1cm4gbmV3IEVsZW1lbnRDbGFzcyhvcHRzKVxufVxuXG5mdW5jdGlvbiBFbGVtZW50Q2xhc3Mob3B0cykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRWxlbWVudENsYXNzKSkgcmV0dXJuIG5ldyBFbGVtZW50Q2xhc3Mob3B0cylcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIGlmICghb3B0cykgb3B0cyA9IHt9XG5cbiAgLy8gc2ltaWxhciBkb2luZyBpbnN0YW5jZW9mIEhUTUxFbGVtZW50IGJ1dCB3b3JrcyBpbiBJRThcbiAgaWYgKG9wdHMubm9kZVR5cGUpIG9wdHMgPSB7ZWw6IG9wdHN9XG5cbiAgdGhpcy5vcHRzID0gb3B0c1xuICB0aGlzLmVsID0gb3B0cy5lbCB8fCBkb2N1bWVudC5ib2R5XG4gIGlmICh0eXBlb2YgdGhpcy5lbCAhPT0gJ29iamVjdCcpIHRoaXMuZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRoaXMuZWwpXG59XG5cbkVsZW1lbnRDbGFzcy5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gIHZhciBlbCA9IHRoaXMuZWxcbiAgaWYgKCFlbCkgcmV0dXJuXG4gIGlmIChlbC5jbGFzc05hbWUgPT09IFwiXCIpIHJldHVybiBlbC5jbGFzc05hbWUgPSBjbGFzc05hbWVcbiAgdmFyIGNsYXNzZXMgPSBlbC5jbGFzc05hbWUuc3BsaXQoJyAnKVxuICBpZiAoY2xhc3Nlcy5pbmRleE9mKGNsYXNzTmFtZSkgPiAtMSkgcmV0dXJuIGNsYXNzZXNcbiAgY2xhc3Nlcy5wdXNoKGNsYXNzTmFtZSlcbiAgZWwuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKCcgJylcbiAgcmV0dXJuIGNsYXNzZXNcbn1cblxuRWxlbWVudENsYXNzLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgdmFyIGVsID0gdGhpcy5lbFxuICBpZiAoIWVsKSByZXR1cm5cbiAgaWYgKGVsLmNsYXNzTmFtZSA9PT0gXCJcIikgcmV0dXJuXG4gIHZhciBjbGFzc2VzID0gZWwuY2xhc3NOYW1lLnNwbGl0KCcgJylcbiAgdmFyIGlkeCA9IGNsYXNzZXMuaW5kZXhPZihjbGFzc05hbWUpXG4gIGlmIChpZHggPiAtMSkgY2xhc3Nlcy5zcGxpY2UoaWR4LCAxKVxuICBlbC5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKVxuICByZXR1cm4gY2xhc3Nlc1xufVxuXG5FbGVtZW50Q2xhc3MucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICB2YXIgZWwgPSB0aGlzLmVsXG4gIGlmICghZWwpIHJldHVyblxuICB2YXIgY2xhc3NlcyA9IGVsLmNsYXNzTmFtZS5zcGxpdCgnICcpXG4gIHJldHVybiBjbGFzc2VzLmluZGV4T2YoY2xhc3NOYW1lKSA+IC0xXG59XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuMy4zXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgYWxudW0sIHJlZjtcblxuICByZWYgPSByZXF1aXJlKCcuLi9yZWYnKS5yZWY7XG5cbiAgYWxudW0gPSB7XG4gICAgJzAnOiByZWYoJzAnLCA0OCksXG4gICAgJzEnOiByZWYoJzEnLCA0OSksXG4gICAgJzInOiByZWYoJzInLCA1MCksXG4gICAgJzMnOiByZWYoJzMnLCA1MSksXG4gICAgJzQnOiByZWYoJzQnLCA1MiksXG4gICAgJzUnOiByZWYoJzUnLCA1MyksXG4gICAgJzYnOiByZWYoJzYnLCA1NCksXG4gICAgJzcnOiByZWYoJzcnLCA1NSksXG4gICAgJzgnOiByZWYoJzgnLCA1NiksXG4gICAgJzknOiByZWYoJzknLCA1NyksXG4gICAgYTogcmVmKCdBJywgNjUpLFxuICAgIGI6IHJlZignQicsIDY2KSxcbiAgICBjOiByZWYoJ0MnLCA2NyksXG4gICAgZDogcmVmKCdEJywgNjgpLFxuICAgIGU6IHJlZignRScsIDY5KSxcbiAgICBmOiByZWYoJ0YnLCA3MCksXG4gICAgZzogcmVmKCdHJywgNzEpLFxuICAgIGg6IHJlZignSCcsIDcyKSxcbiAgICBpOiByZWYoJ0knLCA3MyksXG4gICAgajogcmVmKCdKJywgNzQpLFxuICAgIGs6IHJlZignSycsIDc1KSxcbiAgICBsOiByZWYoJ0wnLCA3NiksXG4gICAgbTogcmVmKCdNJywgNzcpLFxuICAgIG46IHJlZignTicsIDc4KSxcbiAgICBvOiByZWYoJ08nLCA3OSksXG4gICAgcDogcmVmKCdQJywgODApLFxuICAgIHE6IHJlZignUScsIDgxKSxcbiAgICByOiByZWYoJ1InLCA4MiksXG4gICAgczogcmVmKCdTJywgODMpLFxuICAgIHQ6IHJlZignVCcsIDg0KSxcbiAgICB1OiByZWYoJ1UnLCA4NSksXG4gICAgdjogcmVmKCdWJywgODYpLFxuICAgIHc6IHJlZignVycsIDg3KSxcbiAgICB4OiByZWYoJ1gnLCA4OCksXG4gICAgeTogcmVmKCdZJywgODkpLFxuICAgIHo6IHJlZignWicsIDkwKVxuICB9O1xuXG4gIG1vZHVsZS5leHBvcnRzID0gYWxudW07XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuMy4zXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgYXJyb3csIHJlZjtcblxuICByZWYgPSByZXF1aXJlKCcuLi9yZWYnKS5yZWY7XG5cbiAgYXJyb3cgPSB7XG4gICAgbGVmdDogcmVmKCdMZWZ0JywgMzcpLFxuICAgIHVwOiByZWYoJ1VwJywgMzgpLFxuICAgIHJpZ2h0OiByZWYoJ1JpZ2h0JywgMzkpLFxuICAgIGRvd246IHJlZignRG93bicsIDQwKVxuICB9O1xuXG4gIG1vZHVsZS5leHBvcnRzID0gYXJyb3c7XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuMy4zXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgYnJhbmQsIHJlZjtcblxuICByZWYgPSByZXF1aXJlKCcuLi9yZWYnKS5yZWY7XG5cbiAgYnJhbmQgPSB7XG4gICAgYXBwbGU6IHJlZignQXBwbGUgJiM4OTg0OycsIDIyNCksXG4gICAgd2luZG93czoge1xuICAgICAgc3RhcnQ6IHJlZignV2luZG93cyBzdGFydCcsIFs5MSwgOTJdKSxcbiAgICAgIG1lbnU6IHJlZignV2luZG93cyBtZW51JywgOTMpXG4gICAgfVxuICB9O1xuXG4gIG1vZHVsZS5leHBvcnRzID0gYnJhbmQ7XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuMy4zXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgcHVuY3R1YXRpb24sIHJlZjtcblxuICByZWYgPSByZXF1aXJlKCcuLi9yZWYnKS5yZWY7XG5cbiAgcHVuY3R1YXRpb24gPSB7XG4gICAgY29sb246IHJlZignQ29sb24vU2VtaWNvbG9uJywgWzU5LCAxODZdKSxcbiAgICBlcXVhbDogcmVmKCdFcXVhbC9QbHVzJywgWzYxLCAxODddKSxcbiAgICBjb21tYTogcmVmKCdDb21tYS9MZXNzIFRoYW4nLCBbNDQsIDE4OF0pLFxuICAgIGh5cGhlbjogcmVmKCdIeXBoZW4vVW5kZXJzY29yZScsIFs0NSwgMTA5LCAxODldKSxcbiAgICBwZXJpb2Q6IHJlZignUGVyaW9kL0dyZWF0ZXIgVGhhbicsIFs0NiwgMTkwXSksXG4gICAgdGlsZGU6IHJlZignVGlsZGUvQmFjayBUaWNrJywgWzk2LCAxOTJdKSxcbiAgICBhcG9zdHJvcGhlOiByZWYoJ0Fwb3N0cm9waGUvUXVvdGUnLCBbMzksIDIyMl0pLFxuICAgIHNsYXNoOiB7XG4gICAgICBmb3J3YXJkOiByZWYoJ0ZvcndhcmQgU2xhc2gvUXVlc3Rpb24gTWFyaycsIFs0NywgMTkxXSksXG4gICAgICBiYWNrd2FyZDogcmVmKCdCYWNrd2FyZCBTbGFzaC9QaXBlJywgMjIwKVxuICAgIH0sXG4gICAgYnJhY2U6IHtcbiAgICAgIHNxdWFyZToge1xuICAgICAgICBvcGVuOiByZWYoJ09wZW4gU3F1YXJlL0N1cmx5IEJyYWNlJywgMjE5KSxcbiAgICAgICAgY2xvc2U6IHJlZignQ2xvc2UgU3F1YXJlL0N1cmx5IEJyYWNlJywgMjIxKVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBwdW5jdHVhdGlvbi5zZW1pY29sb24gPSBwdW5jdHVhdGlvbi5jb2xvbjtcblxuICBwdW5jdHVhdGlvbi5wbHVzID0gcHVuY3R1YXRpb24uZXF1YWw7XG5cbiAgcHVuY3R1YXRpb24ubGVzc3RoYW4gPSBwdW5jdHVhdGlvbi5jb21tYTtcblxuICBwdW5jdHVhdGlvbi51bmRlcnNjb3JlID0gcHVuY3R1YXRpb24uaHlwaGVuO1xuXG4gIHB1bmN0dWF0aW9uLmdyZWF0ZXJ0aGFuID0gcHVuY3R1YXRpb24ucGVyaW9kO1xuXG4gIHB1bmN0dWF0aW9uLnF1ZXN0aW9uID0gcHVuY3R1YXRpb24uc2xhc2guZm9yd2FyZDtcblxuICBwdW5jdHVhdGlvbi5iYWNrdGljayA9IHB1bmN0dWF0aW9uLnRpbGRlO1xuXG4gIHB1bmN0dWF0aW9uLnBpcGUgPSBwdW5jdHVhdGlvbi5zbGFzaC5iYWNrd2FyZDtcblxuICBwdW5jdHVhdGlvbi5xdW90ZSA9IHB1bmN0dWF0aW9uLmFwb3N0cm9waGU7XG5cbiAgcHVuY3R1YXRpb24uYnJhY2UuY3VybHkgPSBwdW5jdHVhdGlvbi5icmFjZS5zcXVhcmU7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBwdW5jdHVhdGlvbjtcblxufSkuY2FsbCh0aGlzKTtcbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS4zLjNcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciByZWYsIHNwZWNpYWw7XG5cbiAgcmVmID0gcmVxdWlyZSgnLi4vcmVmJykucmVmO1xuXG4gIHNwZWNpYWwgPSB7XG4gICAgYmFja3NwYWNlOiByZWYoJ0JhY2tzcGFjZScsIDgpLFxuICAgIHRhYjogcmVmKCdUYWInLCA5KSxcbiAgICBlbnRlcjogcmVmKCdFbnRlcicsIDEzKSxcbiAgICBzaGlmdDogcmVmKCdTaGlmdCcsIDE2KSxcbiAgICBjdHJsOiByZWYoJ0N0cmwnLCAxNyksXG4gICAgYWx0OiByZWYoJ0FsdCcsIDE4KSxcbiAgICBjYXBzOiByZWYoJ0NhcHMgTG9jaycsIDIwKSxcbiAgICBlc2M6IHJlZignRXNjYXBlJywgMjcpLFxuICAgIHNwYWNlOiByZWYoJ1NwYWNlJywgMzIpLFxuICAgIG51bTogcmVmKCdOdW0gTG9jaycsIDE0NClcbiAgfTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHNwZWNpYWw7XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuMy4zXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgaXNSZWYsIGl0ZXJhdG9yLCBrZXksXG4gICAgX3RoaXMgPSB0aGlzLFxuICAgIF9faW5kZXhPZiA9IFtdLmluZGV4T2YgfHwgZnVuY3Rpb24oaXRlbSkgeyBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7IGlmIChpIGluIHRoaXMgJiYgdGhpc1tpXSA9PT0gaXRlbSkgcmV0dXJuIGk7IH0gcmV0dXJuIC0xOyB9LFxuICAgIF9faGFzUHJvcCA9IHt9Lmhhc093blByb3BlcnR5O1xuXG4gIGlzUmVmID0gcmVxdWlyZSgnLi9yZWYnKS5pc1JlZjtcblxuICBrZXkgPSB7fTtcblxuICBrZXkuY29kZSA9IHtcbiAgICBzcGVjaWFsOiByZXF1aXJlKCcuL2NvZGUvc3BlY2lhbCcpLFxuICAgIGFycm93OiByZXF1aXJlKCcuL2NvZGUvYXJyb3cnKSxcbiAgICBwdW5jdHVhdGlvbjogcmVxdWlyZSgnLi9jb2RlL3B1bmN0dWF0aW9uJyksXG4gICAgYWxudW06IHJlcXVpcmUoJy4vY29kZS9hbG51bScpLFxuICAgIGJyYW5kOiByZXF1aXJlKCcuL2NvZGUvYnJhbmQnKVxuICB9O1xuXG4gIGtleS5nZXQgPSBmdW5jdGlvbihwcmVzc2VkKSB7XG4gICAgcmV0dXJuIGl0ZXJhdG9yKGtleS5jb2RlLCBwcmVzc2VkKTtcbiAgfTtcblxuICBrZXkuaXMgPSBmdW5jdGlvbihyZWYsIHByZXNzZWQpIHtcbiAgICBpZiAoIWlzUmVmKHJlZikpIHtcbiAgICAgIHJlZiA9IGl0ZXJhdG9yKHJlZiwgcHJlc3NlZCk7XG4gICAgfVxuICAgIGlmIChpc1JlZihyZWYpKSB7XG4gICAgICBpZiAoaXNSZWYocHJlc3NlZCkpIHtcbiAgICAgICAgcmV0dXJuIHByZXNzZWQgPT09IHJlZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmVzc2VkID09PSByZWYuY29kZSB8fCBfX2luZGV4T2YuY2FsbChyZWYuY29kZSwgcHJlc3NlZCkgPj0gMDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByZXNzZWQgPT09IHJlZjtcbiAgICB9XG4gIH07XG5cbiAgaXRlcmF0b3IgPSBmdW5jdGlvbihjb250ZXh0LCBwcmVzc2VkKSB7XG4gICAgdmFyIGksIG91dCwgcmVmO1xuICAgIGZvciAoaSBpbiBjb250ZXh0KSB7XG4gICAgICBpZiAoIV9faGFzUHJvcC5jYWxsKGNvbnRleHQsIGkpKSBjb250aW51ZTtcbiAgICAgIHJlZiA9IGNvbnRleHRbaV07XG4gICAgICBpZiAoaXNSZWYocmVmKSkge1xuICAgICAgICBpZiAoa2V5LmlzKHJlZiwgcHJlc3NlZCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVmO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgPSBpdGVyYXRvcihyZWYsIHByZXNzZWQpO1xuICAgICAgICBpZiAoaXNSZWYob3V0KSkge1xuICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgd2luZG93LmtleSA9IGtleTtcbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzID0ga2V5O1xuXG59KS5jYWxsKHRoaXMpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjMuM1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIFJlZmVyZW5jZSwgYXNzZXJ0UmVmLCBpc1JlZiwgcmVmO1xuXG4gIFJlZmVyZW5jZSA9IChmdW5jdGlvbigpIHtcblxuICAgIGZ1bmN0aW9uIFJlZmVyZW5jZShuYW1lLCBjb2RlKSB7XG4gICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgdGhpcy5jb2RlID0gY29kZTtcbiAgICB9XG5cbiAgICByZXR1cm4gUmVmZXJlbmNlO1xuXG4gIH0pKCk7XG5cbiAgcmVmID0gZnVuY3Rpb24obmFtZSwgY29kZSkge1xuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKG5hbWUsIGNvZGUpO1xuICB9O1xuXG4gIGlzUmVmID0gZnVuY3Rpb24ocmVmKSB7XG4gICAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZTtcbiAgfTtcblxuICBhc3NlcnRSZWYgPSBmdW5jdGlvbihyZWYpIHtcbiAgICBpZiAoIWlzUmVmKHJlZikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWZlcmVuY2UnKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZjtcbiAgfTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZWY6IHJlZixcbiAgICBpc1JlZjogaXNSZWYsXG4gICAgYXNzZXJ0UmVmOiBhc3NlcnRSZWZcbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3JpcS1ncmlkJywgW10pLlxuICAgIGZhY3RvcnkoJ3JpcUdyaWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiByZXF1aXJlKCdAZ3JpZC9jb3JlJyk7XG4gICAgfSlcbjtcblxuIl19
