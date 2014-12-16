ddescribe('grid-core', function () {
    require('../grid-spec-helper')();
    var $ = require('jquery');
    var grid;
    beforeEach(function () {
        grid = this.buildSimpleGrid();
    });

    it('should have the right models', function () {
        expect(grid).toHaveField('eventLoop');
        expect(grid).toHaveField('decorators');
        expect(grid).toHaveField('cellClasses');
        expect(grid).toHaveField('rowModel');
        expect(grid).toHaveField('colModel');
        expect(grid).toHaveField('dataModel');
        expect(grid).toHaveField('virtualPixelCellModel');
        expect(grid).toHaveField('cellScrollModel');
        expect(grid).toHaveField('cellMouseModel');
        expect(grid).toHaveField('navigationModel');
        expect(grid).toHaveField('viewPort');
        expect(grid).toHaveField('viewLayer');
        expect(grid).toHaveField('pixelScrollModel');
        expect(grid).toHaveField('colResize');
        expect(grid).toHaveField('colReorder');
        expect(grid).toHaveField('showHiddenCols');
    });

    it('should have a main build function', function () {
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

    it('should let me request a redraw', function () {
        var draw = spyOn(grid.viewLayer, 'draw');
        grid.requestDraw();
        expect(draw).toHaveBeenCalled();
    });

    it('should not draw on request if in event loop but should draw after', function () {
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
        return $(this.container).find('textarea');
    }

    it('should have a focusable text area on build', function () {
        grid.build(this.container);
        expect(findTextArea()).toBeAnElement();
    });

    it('should add a class to the container on focus', function () {
        grid.build(this.container);
        $(this.container).find('textarea').focus();
        expect(this.container).toHaveClass('focus');
    });

    it('should not change the containers tabindex if it already has a value', function () {
        this.container.tabIndex = 1;
        grid.build(this.container);
        expect(this.container.tabIndex).toBe(1);
    });

    it('should give the container a tabindex if it doesnt already have one', function () {
        grid.build(this.container);
        expect(this.container.tabIndex).toBe(-1);
    });

    it('should focus the text area if the grid is focused', function () {
        grid.build(this.container);
        $(this.container).focus();
        expect(document.activeElement).toEqual(findTextArea.call(this)[0]);
    });

    it('should select all text in the paste area when focused', function () {
        grid.build(this.container);
        var textarea = findTextArea.call(this)[0];
        var select = spyOn(textarea, 'select');
        textarea.focus();
        expect(select).toHaveBeenCalled();
    });

    it('should let me create a dirty clean', function () {
        var dirtyClean = grid.makeDirtyClean();
        expect(dirtyClean).toBeDirty();
        this.resetAllDirties();
        expect(dirtyClean).not.toBeDirty();
    });

});