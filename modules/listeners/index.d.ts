declare type Listener = (e: any) => void;
export declare function create(): {
    addListener(fn: Listener): () => void;
    notify(e: any): void;
};
export default create;
