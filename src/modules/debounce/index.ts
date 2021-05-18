export interface IDebounceFunction {
    (): void;
    timeout?: number;
    canceled?: boolean;
    cancel(): void;
}

// up here to avoid creating a new object just for assignment every time
const debouncedFnProps = { cancel: () => { /* noop */ } };

export function debounce(fn: (...args: any[]) => void, delay: number) {
    // tslint:disable-next-line:prefer-object-spread
    const f: IDebounceFunction = Object.assign(function debounced() {
        if (f.timeout) {
            clearTimeout(f.timeout);
            f.timeout = undefined;
        }
        if (!f.canceled) {
            f.timeout = window.setTimeout(fn, delay);
        }
        f.cancel = () => {
            if (f.timeout != undefined) {
                clearTimeout(f.timeout);
            }
            f.timeout = undefined;
            f.canceled = true;
        };
    }, debouncedFnProps);
    return f;
}

export default debounce;