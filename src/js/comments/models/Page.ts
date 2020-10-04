/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Comment } from './Comment';

export interface Page {
    id?: string | null;
    readonly comments?: Array<Comment> | null;
}