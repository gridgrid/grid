const EVENT_NAMES = ['mousewheel', 'wheel', 'DOMMouseScroll'];

interface IOldFFWheelEvent extends MouseWheelEvent {
    axis: number;
    detail: number;
}

const api = {
    getDelta(event: any, xaxis?: boolean) {
        if (event.wheelDelta) { // for everything but firefox
            let delta = event.wheelDeltaY;
            if (xaxis) {
                delta = event.wheelDeltaX;
            }
            return delta;

        } else if (event.detail) { // for firefox pre version 17
            const oldFFWheelEvent = event as IOldFFWheelEvent;
            if (oldFFWheelEvent.axis && ((oldFFWheelEvent.axis === 1 && xaxis) || (oldFFWheelEvent.axis === 2 && !xaxis))) {
                return -1 * oldFFWheelEvent.detail * 12;
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

    // binds a cross browser normalized mousewheel event, and returns a function that will unbind the listener;
    bind(elem: HTMLElement, listener: (e: any) => any) {
        const normalizedListener = (e: any) => {
            listener(normalizeWheelEvent(e));
        };

        EVENT_NAMES.forEach((name) => {
            elem.addEventListener(name, normalizedListener);
        });

        return () => {
            EVENT_NAMES.forEach((name) => {
                elem.removeEventListener(name, normalizedListener);
            });
        };

    },
    normalize: normalizeWheelEvent
};

function normalizeWheelEvent(e: any): MouseWheelEvent {
    const deltaX = api.getDelta(e, true);
    const deltaY = api.getDelta(e);
    const newEvent = Object.create(e, {
        deltaY: {
            value: deltaY
        },
        deltaX: {
            value: deltaX
        },
        type: {
            value: 'mousewheel'
        },
        target: {
            value: e.target
        },
        currentTarget: {
            value: e.currentTarget
        },
        defaultPrevented: {
            value: false,
            writable: true
        }
    });

    newEvent.preventDefault = () => {
        newEvent.defaultPrevented = true;
        if (e && e.preventDefault) {
            e.preventDefault();
        }
    };
    return newEvent;
}

export default api;