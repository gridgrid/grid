import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';
export declare class ViewSpaceConverter extends AbstractSpaceConverter {
    row: AbstractDimensionalSpaceConverter<IRowDescriptor>;
    col: AbstractDimensionalSpaceConverter<IColDescriptor>;
}
