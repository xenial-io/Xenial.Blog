/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CaptchaModel } from '../models/CaptchaModel';
import type { Page } from '../models/Page';
import type { PageInputModel } from '../models/PageInputModel';
import { request as __request } from '../core/request';

export class CommentsService {

    /**
     * @param requestBody 
     * @result Page Success
     * @throws ApiError
     */
    public static async postCommentsService(
requestBody?: PageInputModel,
): Promise<Page> {
        const result = await __request({
            method: 'POST',
            path: `/Comments`,
            body: requestBody,
            errors: {
                400: `Bad Request`,
            },
        });
        return result.body;
    }

    /**
     * @param requestBody 
     * @result Page Success
     * @throws ApiError
     */
    public static async postCommentsService1(
requestBody?: PageInputModel,
): Promise<Page> {
        const result = await __request({
            method: 'POST',
            path: `/Comments/preview`,
            body: requestBody,
        });
        return result.body;
    }

    /**
     * @result CaptchaModel Success
     * @throws ApiError
     */
    public static async getCommentsService(): Promise<CaptchaModel> {
        const result = await __request({
            method: 'GET',
            path: `/Comments/captcha`,
        });
        return result.body;
    }

}