function testHeaderDecorators(ctx) {
  describe("header-decorators", function () {
    var tools = require("../grid-spec-helper/helper-matchers");
    require("../grid-spec-helper")();
    var grid;
    beforeEach(function () {
      var self = this;
      grid = (ctx && this.grid) || this.buildSimpleGrid();
      tools.lazyLoad(this, "headerDecorators", function () {
        return (
          (ctx && ctx.headerDecorators) ||
          require("../header-decorators")(grid, self.headerDecoratorModel)
        );
      });
    });

    describe("decorator", function () {
      var ctx = {};
      var viewCol = 1;
      beforeEach(function () {
        ctx.decorator = this.headerDecorators._decorators[viewCol];
      });

      describe("should satisfy", function () {
        require("../decorators/decorator-test-body")(ctx);
      });

      it("should have the right range", function () {
        expect(ctx.decorator).topToBe(0);
        expect(ctx.decorator).heightToBe(1);
        expect(ctx.decorator).widthToBe(1);
        expect(ctx.decorator).unitsToBe("cell");
        expect(ctx.decorator).spaceToBe("real");
      });
    });

    function expectCorrectDecorators() {
      for (var c = 0; c < grid.viewPort.cols; c++) {
        var decorator = this.headerDecorators._decorators[c];
        expect(decorator).toBeDefined();
        expect(decorator.left).toBe(c);
        expect(grid.decorators.getAlive()).toContain(decorator);
      }
    }

    it("should make viewport cols decorators", function () {
      expectCorrectDecorators.call(this);
    });

    it("should still have the right number of decorators after viewport changes", function () {
      grid.viewPort.sizeToContainer({
        offsetWidth: 200,
        offsetHeight: 300,
      });
      expectCorrectDecorators.call(this);
    });

    it("should call an optional annotate function", function () {
      var spy = jasmine.createSpy();
      this.headerDecorators.annotateDecorator = spy;
      grid.viewPort.cols = grid.viewPort.cols + 1;
      grid.eventLoop.fire("grid-viewport-change");
      expect(spy).toHaveBeenCalled();
    });

    it("should call makeDecorator on the api so it can be overridden if need be", function () {
      var spy = spyOn(this.headerDecorators, "makeDecorator").and.callThrough();
      grid.viewPort.cols = grid.viewPort.cols + 1;
      grid.eventLoop.fire("grid-viewport-change");
      expect(spy).toHaveBeenCalled();
    });

    it("should call an optional isNeeded", function () {
      this.headerDecoratorModel = {};
      this.headerDecoratorModel.isNeeded = function (c) {
        if (c === 0) {
          return false;
        }
        return true;
      };
      expect(this.headerDecorators._decorators[0]).toBeUndefined();
      expect(this.headerDecorators._decorators[1]).toBeDefined();
    });
  });
}
module.exports = testHeaderDecorators;

