import { IDirtyClean } from '../dirty-clean';
export interface IHasPreDirty {
    preDirty(): void;
}
export interface IHasOnDirty {
    onDirty<T>(newVal: T, oldVal: T): void;
}
export interface IDirtyProp extends Partial<IHasPreDirty>, Partial<IHasOnDirty> {
    name: string;
}
export declare type DirtyProp = string | IDirtyProp;
export declare function add<T>(obj: T, props: DirtyProp[], dirtyCleans: IDirtyClean[]): T;
export default add;
