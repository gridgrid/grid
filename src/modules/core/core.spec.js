var mockEvent = require('../custom-event');

describe('grid-core', function() {
    require('../grid-spec-helper')();
    var $ = require('jquery');
    var grid;
    beforeEach(function() {
        grid = this.buildSimpleGrid();
    });

    it('should have the right models', function() {
        expect(grid).toHaveField('eventLoop');
        expect(grid).toHaveField('decorators');
        expect(grid).toHaveField('cellClasses');
        expect(grid).toHaveField('rowModel');
        expect(grid).toHaveField('colModel');
        expect(grid).toHaveField('dataModel');
        expect(grid).toHaveField('virtualPixelCellModel');
        expect(grid).toHaveField('cellScrollModel');
        expect(grid).toHaveField('cellMouseModel');
        expect(grid).toHaveField('cellKeyboardModel');
        expect(grid).toHaveField('navigationModel');
        expect(grid).toHaveField('viewPort');
        expect(grid).toHaveField('viewLayer');
        expect(grid).toHaveField('pixelScrollModel');
        expect(grid).toHaveField('colResize');
        expect(grid).toHaveField('colReorder');
        expect(grid).toHaveField('showHiddenCols');
        expect(grid).toHaveField('copyPaste');
        expect(grid).toHaveField('fps');
    });

    it('should have a main build function', function() {
        var viewPortSize = spyOn(grid.viewPort, 'sizeToContainer');
        var viewBuild = spyOn(grid.viewLayer, 'build');
        var loopBuild = spyOn(grid.eventLoop, 'setContainer');
        grid.build(this.container);
        expect(viewPortSize).toHaveBeenCalled();
        expect(viewBuild).toHaveBeenCalled();
        expect(loopBuild).toHaveBeenCalled();
    });

    function spyOnDraw() {
        return spyOn(grid.viewLayer, 'draw');
    }

    it('should let me request a redraw', function() {
        var draw = spyOn(grid.viewLayer, 'draw');
        grid.requestDraw();
        expect(draw).toHaveBeenCalled();
    });

    it('should not draw on request if in event loop but should draw after', function() {
        var draw = spyOnDraw();
        grid.eventLoop.addInterceptor(function inLoopFn(e) {
            if (e.type === 'test-event') {
                grid.requestDraw();
                expect(draw).not.toHaveBeenCalled();
            }
        });
        grid.eventLoop.fire('test-event');

        expect(draw).toHaveBeenCalled();
    });

    function findTextArea() {
        return $(this.container).find('.grid-textarea');
    }

    it('should prevent weird browser behavior on dragging the text', function() {
        grid.build(this.container);
        expect(findTextArea.call(this).attr('ondragstart')).toEqual('return false;');
    });

    it('should add a class to the container on focus', function() {
        grid.build(this.container);
        findTextArea.call(this).focus();
        expect(this.container).toHaveClass('focus');
        expect(grid.focused).toBe(true);
    });

    it('should remove the focus class from the container on blur', function() {
        grid.build(this.container);
        findTextArea.call(this).focus();
        findTextArea.call(this).blur();
        expect(this.container).not.toHaveClass('focus');
        expect(grid.focused).toBe(false);
    });

    it('should not change the containers tabindex if it already has a value', function() {
        this.container.tabIndex = 1;
        grid.build(this.container);
        expect(this.container.tabIndex).toBe(1);
    });

    it('should give the container a tabindex if it doesnt already have one', function() {
        grid.build(this.container);
        expect(this.container.tabIndex).toBe(-1);
    });

    it('should focus the text area if the grid is focused', function() {
        grid.build(this.container);
        $(this.container).focus();
        expect(document.activeElement).toEqual(findTextArea.call(this)[0]);
    });

    it('should select all text in the paste area when focused', function() {
        grid.build(this.container);
        var textarea = findTextArea.call(this)[0];
        var select = spyOn(textarea, 'select');
        textarea.focus();
        expect(select).toHaveBeenCalled();
    });

    it('should let me create a dirty clean', function() {
        var dirtyClean = grid.makeDirtyClean();
        expect(dirtyClean).toBeDirty();
        this.resetAllDirties();
        expect(dirtyClean).not.toBeDirty();
    });

    it('should fire text area focus events', function() {
        grid.build(this.container);
        grid.textarea.blur();
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-focus', spy);
        grid.textarea.focus();
        expect(spy).toHaveBeenCalled();
    });

    it('should fire text area blur events', function() {
        grid.build(this.container);
        grid.textarea.focus();
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-blur', spy);
        grid.textarea.blur();
        expect(spy).toHaveBeenCalled();
    });

    describe('timeout/interval', function() {
        it('should set a timeout', function() {
            var spy = spyOn(window, 'setTimeout');
            var fn = function() {

            };
            grid.timeout(fn, 1);
            expect(spy).toHaveBeenCalledWith(fn, 1);
        });

        it('should set an interval', function() {
            var spy = spyOn(window, 'setInterval');
            var fn = function() {

            };
            grid.interval(fn, 1);
            expect(spy).toHaveBeenCalledWith(fn, 1);
        });

        it('should clear timeout on destroy', function() {
            var spy = spyOn(window, 'clearTimeout');
            var fn = function() {

            };
            var id = grid.timeout(fn, 1);
            grid.eventLoop.fire('grid-destroy');
            expect(spy).toHaveBeenCalledWith(id);
        });

        it('should clear interval on destroy', function() {
            var spy = spyOn(window, 'clearInterval');
            var fn = function() {

            };
            var id = grid.interval(fn, 1);
            grid.eventLoop.fire('grid-destroy');
            expect(spy).toHaveBeenCalledWith(id);
        });
    });

    describe('textarea', function() {

        it('should be created on grid creation before build', function() {
            expect(this.grid.textarea).toBeAnElement();
        });

        it('should be in the dom on build', function() {
            grid.build(this.container);
            expect(findTextArea.call(this)).toBeAnElement();
        });

        it('should be pinned to the top left and transparent', function() {
            grid.build(this.container);

            var area = findTextArea.call(this);
            expect(area).toBePositioned(0, 0, 'auto', 'auto');
            expect(area[0].style.zIndex).toBe('0');
            expect(area[0].style.background).toBe('transparent');
            expect(area[0].style.color).toBe('transparent');
            expect(area[0].style.border).toBe('none');
            expect(area[0].style.boxShadow).toBe('none');
            expect(area[0].style.cursor).toBe('default');
        });

        it('have width 0 height 0 to start', function() {
            grid.build(this.container);
            var area = this.grid.textarea;
            expect($(area).width()).toBe(0);
            expect($(area).height()).toBe(1);
        });

        it('should listen for mousedown and temporarily show the text area', function() {
            grid.build(this.container);
            var area = this.grid.textarea;
            var event = mockEvent('mousedown');
            event.button = 2;
            this.container.dispatchEvent(event);
            expect($(area).width()).toBe($(this.container).width());
            expect($(area).height()).toBe($(this.container).height());
        });

        it('should reset the width and height to 0 after mousedown', function(done) {
            grid.build(this.container);
            var area = this.grid.textarea;
            var event = mockEvent('mousedown');
            event.button = 2;
            this.container.dispatchEvent(event);
            var self = this;
            setTimeout(function() {
                expect($(area).width()).toBe(0);
                expect($(area).height()).toBe(1);
                done();
            }, 2);

        });
    });

});
