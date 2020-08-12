declare const api: {
    getDelta(event: any, xaxis?: boolean | undefined): any;
    bind(elem: HTMLElement, listener: (e: any) => any): () => void;
    normalize: typeof normalizeWheelEvent;
};
declare function normalizeWheelEvent(e: any): MouseWheelEvent;
export default api;
