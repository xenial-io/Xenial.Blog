import { OpenAPI } from "./comments/core/OpenAPI";
import { CommentsService } from "./comments/index";
import { store } from "@xenial-io/xenial-template";


const getValidUrl = (url = "") => {
    let newUrl = window.decodeURIComponent(url);
    newUrl = newUrl.trim().replace(/\s/g, "");

    if (/^(:\/\/)/.test(newUrl)) {
        return `http${newUrl}`;
    }
    if (!/^(f|ht)tps?:\/\//i.test(newUrl)) {
        return `http://${newUrl}`;
    }

    return newUrl;
};

const comments = async () => {
    OpenAPI.BASE = "https://localhost:5001";

    const disableItems = (enable: boolean) => {
        const formDiv = document.getElementById(`comment-form`);
        const inputs = [...formDiv.getElementsByTagName("input"), ...formDiv.getElementsByTagName("textarea"), ...formDiv.getElementsByTagName("button")];
        for (const input of inputs) {
            input.disabled = enable;
        }
    }

    const name = store("comments-name");
    if (name) {
        const nameInput = (<HTMLInputElement>document.getElementById(`comments-name`));
        if (nameInput) {
            nameInput.value = name;
        }
    }
    const homepage = store("comments-homepage");
    if (homepage) {
        const homepageInput = (<HTMLInputElement>document.getElementById(`comments-homepage`));
        if (homepageInput) {
            homepageInput.value = homepage;
        }
    }

    const githubOrEmail = store("comments-githubOrEmail");
    if (githubOrEmail) {
        const githubOrEmailInput = (<HTMLInputElement>document.getElementById(`comments-githubOrEmail`));
        if (githubOrEmailInput) {
            githubOrEmailInput.value = githubOrEmail;
        }
    }

    try {
        const captcha = await CommentsService.getCommentsService();

        const question = document.getElementById(`comments-question`);
        if (question) {
            question.innerHTML = captcha.text;
        }
        const operation = document.getElementById(`comments-operation`);
        if (operation) {
            (<HTMLInputElement>operation).value = captcha.operation;
        }

        var inputA = document.getElementById(`comments-a`);
        if (inputA) {
            (<HTMLInputElement>inputA).value = captcha.a.toString();
        }

        var inputB = document.getElementById(`comments-b`);
        if (inputB) {
            (<HTMLInputElement>inputB).value = captcha.b.toString();
        }
    }
    catch (error) {
        console.error(error);
        disableItems(true);
    }

    const mapFields = () => {
        return {
            id: (<HTMLInputElement>document.getElementById(`comments-page-id`)).value,
            name: (<HTMLInputElement>document.getElementById(`comments-name`)).value,
            operation: (<HTMLInputElement>document.getElementById(`comments-operation`)).value,
            githubOrEmail: (<HTMLInputElement>document.getElementById(`comments-githubOrEmail`)).value,
            answer: parseInt((<HTMLInputElement>document.getElementById(`comments-answer`)).value),
            homepage: getValidUrl((<HTMLInputElement>document.getElementById(`comments-homepage`)).value),
            a: parseInt((<HTMLInputElement>document.getElementById(`comments-a`)).value),
            b: parseInt((<HTMLInputElement>document.getElementById(`comments-b`)).value),
            content: (<HTMLTextAreaElement>document.getElementById(`comments-content`)).value,
        };
    };

    const previewButton = <HTMLButtonElement>document.getElementById(`comments-preview`);
    if (previewButton) {
        previewButton.onclick = async () => {
            const result = await CommentsService.postCommentsService1(mapFields());
            if (result.comments.length > 0) {
                const comment = result.comments[0];
                console.log(comment);
                const avatar = document.getElementById("comments-preview-avatar");

                if (avatar) {
                    avatar.innerHTML = comment.avatarUrl
                        ? `<img src="${comment.avatarUrl}" />`
                        : `<i class="fas fa-user"></i>`;
                }

                const name = document.getElementById("comments-preview-name");
                if (name) {
                    name.innerHTML = comment.name;
                }

                const content = document.getElementById("comments-preview-content");

                if (content) {
                    content.innerHTML = comment.content;
                }

                //{{ comment.date  | date: "%e %B %Y %H:%M" }}
                const date = document.getElementById("comments-preview-date");
                if (date) {
                    const dateObject = new Date(comment.date);
                    date.innerHTML = `${dateObject.toLocaleDateString("en-US", { day: "numeric" })} ${dateObject.toLocaleDateString("en-US", { month: "long" })} ${dateObject.toLocaleDateString("en-US", { year: "numeric" })} ${dateObject.getHours().toString().padStart(2, "0")}:${dateObject.getMinutes().toString().padStart(2, "0")}`;
                }
                if (content) {
                    content.innerHTML = comment.content;
                }

                const preview = document.getElementById("comments-preview-container");
                if (preview) {
                    preview.classList.remove("hide");
                }
            }
        }
    }

    const submitButton = <HTMLButtonElement>document.getElementById(`comments-submit`);

    if (submitButton) {
        submitButton.onclick = async () => {
            try {
                disableItems(true);
                const fields = mapFields();
                const result = await CommentsService.postCommentsService(fields);

                store("comments-name", fields.name);
                store("comments-githubOrEmail", fields.githubOrEmail);
                store("comments-homepage", fields.homepage);

                const inputs = document.getElementById("comments-inputs");
                if (inputs) {
                    inputs.classList.add("hide");
                }
                const thanks = document.getElementById("comments-thanks");
                if (thanks) {
                    thanks.classList.remove("hide");
                }
            }
            finally {
                disableItems(false);
            }
        };
    }
}
export { comments };