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

export type DirtyProp = string | IDirtyProp;

const isDirtyPropWithPre =
    (dirtyProp: any): dirtyProp is IHasPreDirty =>
        !!(dirtyProp as IDirtyProp).preDirty;
const isDirtyPropWithOn =
    (dirtyProp: any): dirtyProp is IHasOnDirty =>
        !!(dirtyProp as IDirtyProp).onDirty;

export function add<T>(obj: T, props: DirtyProp[], dirtyCleans: IDirtyClean[]) {
    props.forEach((prop) => {
        let val: any;
        const name = (prop as IDirtyProp).name || prop as string;
        // store the value if it was already there
        const initialVal = (obj as any)[name];
        Object.defineProperty(obj, name, {
            enumerable: true,
            get() {
                return val;
            },
            set(newVal: any) {
                const oldVal = val;
                const isChanged = newVal !== oldVal;
                if (isChanged && isDirtyPropWithPre(prop)) {
                    prop.preDirty();
                }
                val = newVal;

                if (isChanged) {
                    dirtyCleans.forEach((dirtyClean) => {
                        dirtyClean.setDirty();
                    });
                    if (isDirtyPropWithOn(prop)) {
                        prop.onDirty(newVal, oldVal);
                    }
                }
            }
        });
        // reset the initial value both to keep it and to trigger the dirty logic
        (obj as any)[name] = initialVal;
    });
    return obj;
}

export default add;