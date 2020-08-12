export interface IDebounceFunction {
    (): void;
    timeout?: number;
    canceled?: boolean;
    cancel(): void;
}
export declare function debounce(fn: (...args: any[]) => void, delay: number): IDebounceFunction;
export default debounce;
