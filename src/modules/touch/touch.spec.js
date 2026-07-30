describe('touch', function () {
    require('../grid-spec-helper')();
    var grid;
    var touch;
    var container;

    beforeEach(function () {
        grid = this.buildSimpleGrid();
        container = this.container;
        grid.container = container;
        touch = grid.touch;
        touch.bindTo(container);
    });

    // --- DOM event helpers -------------------------------------------------
    // TouchEvent.timeStamp is read-only (the browser stamps it at dispatch), so
    // these tests don't assert on synthesized velocity; the velocity window is
    // covered directly against _computeReleaseVelocity below.
    function mkTouch(x, y, id) {
        return new Touch({ identifier: id || 1, target: container, clientX: x, clientY: y });
    }
    function dispatch(type, touches) {
        var e = new TouchEvent(type, {
            cancelable: true,
            bubbles: true,
            touches: touches,
            changedTouches: touches
        });
        container.dispatchEvent(e);
        return e;
    }
    function start(x, y) { return dispatch('touchstart', [mkTouch(x, y)]); }
    function move(x, y) { return dispatch('touchmove', [mkTouch(x, y)]); }

    it('should be registered by default', function () {
        expect(touch).toBeDefined();
    });

    it('should not register when touchScroll is false', function () {
        var g = this.buildSimpleGrid(100, 10, undefined, undefined, undefined, undefined, undefined, undefined, { touchScroll: false });
        expect(g.touch).toBeUndefined();
    });

    describe('single finger drag', function () {
        it('scrolls the pixel model by the finger delta (past the slop)', function () {
            var scrollTo = spyOn(grid.pixelScrollModel, 'scrollTo').and.callThrough();
            start(100, 100);
            move(80, 70); // dx -20, dy -30: crosses slop, drags content up/left
            expect(scrollTo).toHaveBeenCalled();
            expect(grid.pixelScrollModel.top).toBe(30);
            expect(grid.pixelScrollModel.left).toBe(20);
        });

        it('claims the gesture (preventDefault) once it is a scroll', function () {
            start(100, 100);
            var e = move(100, 80); // drag up 20px: grid can scroll down from 0
            expect(e.defaultPrevented).toBe(true);
        });
    });

    describe('multi touch', function () {
        it('does not scroll (leaves pinch-zoom to the browser)', function () {
            var scrollTo = spyOn(grid.pixelScrollModel, 'scrollTo');
            dispatch('touchstart', [mkTouch(100, 100, 1), mkTouch(200, 200, 2)]);
            dispatch('touchmove', [mkTouch(120, 120, 1), mkTouch(220, 220, 2)]);
            expect(scrollTo).not.toHaveBeenCalled();
        });
    });

    describe('gesture arbitration (slop)', function () {
        it('passes an under-slop move through as a tap: no scroll, no preventDefault', function () {
            start(100, 100);
            var e = move(104, 103); // 4px, 3px: under the 8px slop
            expect(grid.pixelScrollModel.top).toBe(0);
            expect(grid.pixelScrollModel.left).toBe(0);
            expect(e.defaultPrevented).toBe(false);
        });

        it('claims and suppresses the tap once movement exceeds the slop', function () {
            start(100, 100);
            var e = move(100, 80);
            expect(e.defaultPrevented).toBe(true);
            expect(grid.pixelScrollModel.top).toBe(20);
        });
    });

    describe('edge handoff', function () {
        it('does not preventDefault when already at the max scroll for the drag axis', function () {
            grid.eventLoop.fire('grid-virtual-pixel-cell-change'); // cache maxScroll
            grid.pixelScrollModel.scrollTo(1e9, 0); // pin to the bottom edge
            var maxTop = grid.pixelScrollModel.top;
            expect(maxTop).toBeGreaterThan(0);
            start(100, 100);
            var e = move(100, 70); // drag further down into the edge: no room
            expect(e.defaultPrevented).toBe(false); // page may scroll
            expect(grid.pixelScrollModel.top).toBe(maxTop); // grid didn't move
        });

        it('hands off a near-vertical drag at the vertical edge even with horizontal room', function () {
            // The reported bug: a slightly-diagonal drag used to claim on the
            // incidental horizontal motion instead of handing off.
            grid.eventLoop.fire('grid-virtual-pixel-cell-change');
            grid.pixelScrollModel.scrollTo(1e9, 200); // at Y max, but X has room both ways
            var maxTop = grid.pixelScrollModel.top;
            start(100, 100);
            var e = move(105, 70); // mostly up, 5px of drift: within 30deg of vertical
            expect(e.defaultPrevented).toBe(false); // released to the page
            expect(grid.pixelScrollModel.top).toBe(maxTop); // no vertical room
            expect(grid.pixelScrollModel.left).toBe(200); // and the drift did NOT scroll X
        });

        it('claims a genuinely diagonal drag at the vertical edge (horizontal room)', function () {
            grid.eventLoop.fire('grid-virtual-pixel-cell-change');
            grid.pixelScrollModel.scrollTo(1e9, 200);
            start(100, 100);
            var e = move(130, 70); // 30px x, 30px y: a true 45deg diagonal
            expect(e.defaultPrevented).toBe(true); // claimed
            expect(grid.pixelScrollModel.left).toBeLessThan(200); // scrolled horizontally
        });
    });

    describe('_lockToIntention', function () {
        it('zeroes the incidental axis of a near-axis vector, keeps a diagonal', function () {
            expect(touch._lockToIntention(3, -40)).toEqual({ x: 0, y: -40 }); // near-vertical
            expect(touch._lockToIntention(-40, 3)).toEqual({ x: -40, y: 0 }); // near-horizontal
            var diag = touch._lockToIntention(30, 30); // 45deg
            expect(diag.x).toBe(30);
            expect(diag.y).toBe(30);
        });
    });

    describe('_computeReleaseVelocity', function () {
        it('averages over the trailing window using event timestamps', function () {
            var v = touch._computeReleaseVelocity([
                { x: 0, y: 0, t: 0 },     // outside the 100ms window, excluded
                { x: 100, y: 50, t: 200 },
                { x: 110, y: 55, t: 250 },
                { x: 120, y: 60, t: 300 }
            ]);
            expect(v.vx).toBeCloseTo(0.2, 5); // (120-100)/(300-200)
            expect(v.vy).toBeCloseTo(0.1, 5); // (60-50)/(300-200)
        });

        it('still flicks when only the last move slowed down', function () {
            // Fast strokes then a tiny slow final move; the window catches the speed.
            var v = touch._computeReleaseVelocity([
                { x: 0, y: 0, t: 0 },
                { x: 40, y: 0, t: 20 },
                { x: 80, y: 0, t: 40 },
                { x: 120, y: 0, t: 60 },
                { x: 160, y: 0, t: 80 },
                { x: 162, y: 0, t: 95 } // slow last move: (162-160)/15 ~ 0.13
            ]);
            expect(Math.abs(v.vx)).toBeGreaterThan(1); // window sees ~1.7 px/ms
        });

        it('yields no flick after a pre-lift pause', function () {
            var v = touch._computeReleaseVelocity([
                { x: 0, y: 0, t: 0 },
                { x: 40, y: 0, t: 20 },
                { x: 80, y: 0, t: 40 },
                { x: 80, y: 0, t: 320 } // paused, then lifted: big gap, no motion
            ]);
            expect(v.vx).toBe(0);
            expect(v.vy).toBe(0);
        });
    });

    describe('flick loop (_makeFlick)', function () {
        beforeEach(function () {
            // Seat the grid in the middle so a flick has room to run before an edge.
            grid.eventLoop.fire('grid-virtual-pixel-cell-change');
            grid.pixelScrollModel.scrollTo(500, 500);
        });

        it('advances on frame 0 even when ts <= seed (dt clamp)', function () {
            var flick = touch._makeFlick(1, 0, 1000); // vx>0 => left decreases from 500
            var before = grid.pixelScrollModel.left;
            var alive = flick.step(1000); // ts === seed: raw dt is 0, clamped to 1
            expect(grid.pixelScrollModel.left).not.toBe(before); // it moved
            expect(alive).toBe(true); // not killed by a phantom edge
        });

        it('decays to a stop', function () {
            var flick = touch._makeFlick(1, 0, 0);
            var ts = 0;
            var frames = 0;
            while (flick.step((ts += 16)) && frames < 1000) {
                frames++;
            }
            expect(frames).toBeGreaterThan(0); // it ran for a while
            expect(frames).toBeLessThan(1000); // then stopped on its own
        });

        it('kills an axis that hits an edge', function () {
            grid.pixelScrollModel.scrollTo(0, 0); // back to the top-left corner
            // vx,vy>0 drag content further up/left off the corner: no room on either axis.
            var flick = touch._makeFlick(1, 1, 0);
            var alive = flick.step(16); // scrollBy tries to go below 0 on both axes
            expect(alive).toBe(false);
            expect(flick.vx).toBe(0);
            expect(flick.vy).toBe(0);
        });
    });

    it('unbinds its listeners on grid-destroy', function () {
        var remove = spyOn(container, 'removeEventListener').and.callThrough();
        grid.eventLoop.fire('grid-destroy');
        expect(remove).toHaveBeenCalled();
        var types = remove.calls.allArgs().map(function (a) { return a[0]; });
        expect(types).toContain('touchstart');
        expect(types).toContain('touchmove');
        expect(types).toContain('touchend');
        expect(types).toContain('touchcancel');
    });
});
