import { OpenAPI } from "./comments/core/OpenAPI";
import { CommentsService } from "./comments/index";
const comments = async () => {
    OpenAPI.BASE = "https://localhost:5001";
    try {
        const captcha = await CommentsService.getCommentsService();

        const question = document.getElementsByClassName("comment-form__inputs-question");
        if (question.length > 0) {
            question[0].innerHTML = captcha.text;
        }

        var inputA = document.getElementsByClassName("comment-form__inputs-a");
        if (inputA.length > 0) {
            (<HTMLInputElement>inputA[0]).value = captcha.a.toString();
        }

        var inputB = document.getElementsByClassName("comment-form__inputs-b");
        if (inputB.length > 0) {
            (<HTMLInputElement>inputB[0]).value = captcha.b.toString();
        }
    }
    catch (error) {
        console.error(error);
    }
}
export { comments };