/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export interface Comment {
    id: string;
    name: string;
    githubOrEmail?: string | null;
    homepage?: string | null;
    content: string;
    date: string;
    avatarUrl?: string | null;
    readonly comments: Array<Comment>;
}