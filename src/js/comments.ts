import { OpenAPI } from "./comments/core/OpenAPI";
import { CommentsService, Page } from "./comments/index";
import { store, Prism } from "@xenial-io/xenial-template";
import { CaptchaModel } from "./comments/models/CaptchaModel";
import { PageInputModel } from "./comments/models/PageInputModel";
import { ApiError } from "./comments/core/ApiError";

const getValidUrl = (url = "") => {
    let newUrl = window.decodeURIComponent(url);
    newUrl = newUrl.trim().replace(/\s/g, "");

    if (url === "") return "";

    if (/^(:\/\/)/.test(newUrl)) {
        return `http${newUrl}`;
    }
    if (!/^(f|ht)tps?:\/\//i.test(newUrl)) {
        return `http://${newUrl}`;
    }

    return newUrl;
};

function disableItems(root: Element, enable: boolean) {
    const inputs = [...root.querySelectorAll("input"), ...root.querySelectorAll("textarea"), ...root.querySelectorAll("button")];
    for (const input of inputs) {
        input.disabled = enable;
    }
}

function assignOnDataElement<TElement extends Element>(el: Element, fieldName: string, action: (e: TElement) => void): void {
    const element = el.querySelector(`input[data-field="${fieldName}"]`);
    if (element) {
        const inputElement = <TElement>element;
        action(inputElement);
    }
}

function assignOnNameElement<TElement extends Element>(el: Element, fieldName: string, action: (e: TElement) => void): void {
    const element = el.querySelector(`*[name="${fieldName}"]`);
    if (element) {
        const inputElement = <TElement>element;
        action(inputElement);
    }
}

function getFieldValue(el: Element, fieldName: string): string {
    const element = el.querySelector(`*[data-field="${fieldName}"]`);
    if (element) {
        const inputElement = <HTMLInputElement>element;
        return inputElement.value;
    }
    return "";
}

const mapFields = (el: Element): PageInputModel => {
    return {
        id: getFieldValue(el, "id"),
        operation: getFieldValue(el, "operation"),
        name: getFieldValue(el, "name"),
        githubOrEmail: getFieldValue(el, "githubOrEmail"),
        content: getFieldValue(el, "content"),
        homepage: getFieldValue(el, "homepage"),
        inReplyTo: getFieldValue(el, "inReplyTo"),
        a: parseInt(getFieldValue(el, "a")),
        b: parseInt(getFieldValue(el, "b")),
        answer: parseInt(getFieldValue(el, "answer"))
    }
}

const showPreview = (el: Element, inReplyTo: string, result: Page) => {
    if (result.comments.length > 0) {
        const comment = result.comments[0];

        const avatarFragment = comment.avatarUrl
            ? `<img src="${comment.avatarUrl}" />`
            : `<i class="fas fa-user"></i>`;

        const nameFragment = comment.homepage
            ? `<a href="${comment.homepage}">${comment.name}</a>`
            : comment.name;

        const contentFragment = comment.content;

        //{{ comment.date  | date: "%e %b %Y %H:%M" }}
        const dateObject = new Date(comment.date);
        const dateFragment = `${dateObject.toLocaleDateString("en-US", { day: "numeric" })} ${dateObject.toLocaleDateString("en-US", { month: "short" })} ${dateObject.toLocaleDateString("en-US", { year: "numeric" })} ${dateObject.getHours().toString().padStart(2, "0")}:${dateObject.getMinutes().toString().padStart(2, "0")}`;

        const previewContainer = document.getElementById(`comments-preview-container${inReplyTo}`);
        if (previewContainer) {
            assignOnNameElement(previewContainer, "comments-preview-avatar", (e) => e.innerHTML = comment.homepage ? `<a href="${comment.homepage}">${avatarFragment}</a>` : avatarFragment);
            assignOnNameElement(previewContainer, "comments-preview-name", (e) => e.innerHTML = nameFragment);
            assignOnNameElement(previewContainer, "comments-preview-content", (e) => e.innerHTML = contentFragment);
            assignOnNameElement(previewContainer, "comments-preview-date", (e) => e.innerHTML = dateFragment);
            previewContainer.classList.remove("hide");
        }

        Prism.highlightAll();
    }
}

const comment = (r: Element, defaults: {
    name?: string,
    homepage?: string,
    githubOrEmail?: string,
    captcha: CaptchaModel
}) => {

    const inReplyTo = r.getAttribute("data-replyTo");
    console.error(inReplyTo);

    if (defaults.name) {
        assignOnDataElement<HTMLInputElement>(r, "name", el => el.value = defaults.name);
    }
    if (defaults.homepage) {
        assignOnDataElement<HTMLInputElement>(r, "homepage", el => el.value = defaults.homepage);
    }
    if (defaults.githubOrEmail) {
        assignOnDataElement<HTMLInputElement>(r, "githubOrEmail", el => el.value = defaults.githubOrEmail);
    }

    const captchaLabel = r.querySelector(`.comments-question`);
    if (captchaLabel) {
        const captchaLabelElement = <HTMLLabelElement>captchaLabel;
        captchaLabelElement.innerHTML = defaults.captcha.text;
    }

    if (defaults.captcha.a) {
        assignOnDataElement<HTMLInputElement>(r, "a", el => el.value = defaults.captcha.a.toString());
    }
    if (defaults.captcha.b) {
        assignOnDataElement<HTMLInputElement>(r, "b", el => el.value = defaults.captcha.b.toString());
    }
    if (defaults.captcha.operation) {
        assignOnDataElement<HTMLInputElement>(r, "operation", el => el.value = defaults.captcha.operation);
    }

    const previewButton = <HTMLButtonElement>r.querySelector(`button[name="preview"]`);
    if (previewButton) {
        previewButton.onclick = async () => {
            try {
                disableItems(r, true);
                const values = mapFields(r);
                console.warn("Making request");
                console.warn(values);
                const result = await CommentsService.postCommentsService1(values);
                console.warn("Made request");
                console.warn(result);

                showPreview(r, inReplyTo, result);
            }
            catch (e) {
                if (e instanceof ApiError) {
                    console.error("Error on API");
                    const apiError = JSON.parse(e.body);
                    console.error(apiError);
                    if (apiError.errors) {
                        console.table(apiError.errors);
                    }
                } else {
                    console.error(e);
                }
            }
            finally {
                disableItems(r, false);
            }
        }
    }
    const submitButton = <HTMLButtonElement>r.querySelector(`button[name="submit"]`);
    if (submitButton) {
        submitButton.onclick = async () => {
            try {
                disableItems(r, true);
                const values = mapFields(r);
                console.warn("Making request");
                console.warn(values);
                const result = await CommentsService.postCommentsService(values);
                console.warn("Made request");
                console.warn(result);
                store("comments-name", values.name);
                store("comments-githubOrEmail", values.githubOrEmail);
                store("comments-homepage", values.homepage);

                showPreview(r, inReplyTo, result);

                const inputs = r.querySelector(`*[name="comments-inputs"]`);
                if (inputs) {
                    inputs.classList.add("hide");
                }

                const thanks = r.querySelector(`*[name="comments-thanks"]`);
                if (thanks) {
                    thanks.classList.remove("hide");
                }

            }
            catch (e) {
                if (e instanceof ApiError) {
                    console.error("Error on API");
                    const apiError = JSON.parse(e.body);
                    console.error(apiError);
                    if (apiError.errors) {
                        console.table(apiError.errors);
                    }
                } else {
                    console.error(e);
                }
            }
            finally {
                disableItems(r, false);
            }
        }
    }
}

const comments = async () => {
    OpenAPI.BASE = "https://localhost:5001";
    const rootClassName = 'comment-form';

    const name = store("comments-name");
    const homepage = store("comments-homepage");
    const githubOrEmail = store("comments-githubOrEmail");

    try {
        const captcha = await CommentsService.getCommentsService();
        for (const root of document.getElementsByClassName(rootClassName)) {
            comment(root, { name, homepage, githubOrEmail, captcha });
        }
    }
    catch (error) {
        console.error(error);
        for (const root of document.getElementsByClassName(rootClassName)) {
            disableItems(root, true);
        }
    }

    // const submitButton = <HTMLButtonElement>document.getElementById(`comments-submit`);

    // if (submitButton) {
    //     submitButton.onclick = async () => {
    //         try {
    //             disableItems(true);
    //             const fields = mapFields();
    //             const result = await CommentsService.postCommentsService(fields);

    //             store("comments-name", fields.name);
    //             store("comments-githubOrEmail", fields.githubOrEmail);
    //             store("comments-homepage", fields.homepage);

    //             const inputs = document.getElementById("comments-inputs");
    //             if (inputs) {
    //                 inputs.classList.add("hide");
    //             }
    //             const thanks = document.getElementById("comments-thanks");
    //             if (thanks) {
    //                 thanks.classList.remove("hide");
    //             }
    //             const preview = document.getElementById("comments-preview-container");
    //             if (preview) {
    //                 preview.classList.add("hide");
    //             }
    //         }
    //         finally {
    //             disableItems(false);
    //         }
    //     };
    // }
}
export { comments };