import { OpenAPI } from "./comments/core/OpenAPI";
import { CommentsService } from "./comments/index";

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

    const previewButton = <HTMLButtonElement>document.getElementById(`comments-preview`);
    if (previewButton) {
        previewButton.onclick = () => {

        }
    }

    const submitButton = <HTMLButtonElement>document.getElementById(`comments-submit`);

    if (submitButton) {
        submitButton.onclick = async () => {
            try {
                disableItems(true);

                const result = await CommentsService.postCommentsService({
                    id: (<HTMLInputElement>document.getElementById(`comments-page-id`)).value,
                    name: (<HTMLInputElement>document.getElementById(`comments-name`)).value,
                    operation: (<HTMLInputElement>document.getElementById(`comments-operation`)).value,
                    githubOrEmail: (<HTMLInputElement>document.getElementById(`comments-githubOrEmail`)).value,
                    answer: parseInt((<HTMLInputElement>document.getElementById(`comments-answer`)).value),
                    homepage: getValidUrl((<HTMLInputElement>document.getElementById(`comments-homepage`)).value),
                    a: parseInt((<HTMLInputElement>document.getElementById(`comments-a`)).value),
                    b: parseInt((<HTMLInputElement>document.getElementById(`comments-b`)).value),
                    content: (<HTMLTextAreaElement>document.getElementById(`comments-content`)).value,
                });
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