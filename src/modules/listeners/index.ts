/*
 A simple package for creating a list of listeners that can be added to and notified
 */

type Listener = (e: any) => void;

export function create() {
    const listeners: Listener[] = [];
    return {
        // returns a removal function to unbind the listener
        addListener(fn: Listener) {
            listeners.push(fn);
            return () => {
                listeners.splice(listeners.indexOf(fn), 1);
            };
        },
        notify(e: any) {
            listeners.forEach((listener) => {
                listener(e);
            });
        }
    };
}

export default create;