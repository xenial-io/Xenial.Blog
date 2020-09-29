import "../css/main.scss";
import * as basicLightbox from 'basiclightbox';

import { xenial } from "@xenial-io/xenial-template";

xenial();

document.querySelectorAll("article .postcontent img").forEach(el => {
    const img = <HTMLImageElement>el;
    img.onclick = ()  =>
    {
        basicLightbox.create(`<img src="${img.src}" />`).show();
    };
});