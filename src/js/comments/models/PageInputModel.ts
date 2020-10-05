/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export interface PageInputModel {
    id: string;
    name: string;
    githubOrEmail?: string | null;
    homepage?: string | null;
    content: string;
    a: number;
    b: number;
    operation: string;
    answer: number;
    inReplyTo?: string | null;
}