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
    const answer = parseInt(getFieldValue(el, "answer"));
    return {
        id: getFieldValue(el, "id"),
        operation: getFieldValue(el, "operation"),
        name: getFieldValue(el, "name"),
        githubOrEmail: getFieldValue(el, "githubOrEmail"),
        content: getFieldValue(el, "content"),
        homepage: getValidUrl(getFieldValue(el, "homepage")),
        inReplyTo: getFieldValue(el, "inReplyTo"),
        a: parseInt(getFieldValue(el, "a")),
        b: parseInt(getFieldValue(el, "b")),
        answer: isNaN(answer) ? 0 : answer
    }
}

const showPreview = (el: Element, inReplyTo: string, result: Page) => {
    clearValidation(el);
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
            if (previewContainer.parentElement) {
                previewContainer.parentElement.classList.remove("hide");
            }
            setTimeout(() => previewContainer.classList.remove("hide"), 0);
        }

        Prism.highlightAll();
    }
}

type BadRequestError = {
    type: string,
    tittle: string,
    traceId: string,
    status: number,
    errors: Array<any>
};

const camelize = (str: string): string => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};


const clearValidation = (r: Element) => {
    r.querySelectorAll(`*[data-field]`).forEach(f => f.classList.remove("error"));
    r.querySelectorAll(`*[data-validtion]`).forEach(f => f.innerHTML = "");
};

const showValidation = (r: Element, error: BadRequestError) => {

    console.error(error);

    clearValidation(r);

    const keys = Object.keys(error.errors);
    for (const key of keys) {
        const fieldName = camelize(key.startsWith("$.") ? key.substr(2) : key);

        console.warn(fieldName);

        const field = r.querySelector(`*[data-field="${fieldName}"]`);
        if (field) {
            field.classList.add("error");
        }
        const msg = r.querySelector(`*[data-validtion="${fieldName}"]`);
        if (msg) {
            const errorMessages: string[] = error.errors[key];
            msg.innerHTML = errorMessages.join("<br>");
        }
    }
}

const comment = (r: Element, defaults: {
    name?: string,
    homepage?: string,
    githubOrEmail?: string,
    captcha: CaptchaModel
}) => {

    const inReplyTo = r.getAttribute("data-replyTo") ?? "";
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
                    console.error(e);
                    const apiErrorBody = JSON.parse(e.body);
                    showValidation(r, apiErrorBody);
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
                    console.error(e);
                    const apiErrorBody = JSON.parse(e.body);
                    showValidation(r, apiErrorBody);
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
}

for (const replyToButton of document.querySelectorAll(`*[name="comments-reply"]`)) {
    const btn = <HTMLButtonElement>replyToButton;

    btn.onclick = () => {
        const replyToId = replyToButton.getAttribute("data-replyTo");
        if (replyToId) {
            const id = `comment-form${replyToId}`;
            const replyToForm = document.getElementById(id);
            if (replyToForm) {
                document.querySelectorAll(`.comment-form`).forEach(e => {
                    if (e.id != "comment-form" && e.id != `comment-form${replyToId}`) {
                        e.classList.add("hide");
                    }
                });

                replyToForm.classList.toggle("hide");
            }
        }
    }
}

export { comments };