import { pictures } from "./upload";
import { create, login } from "./auth";
import { get_info } from "./user";

export const routes: any = {
    "/upload/picture": { method: "POST", callback: pictures },
    "/auth/create": { method: "POST", callback: create },
    "/auth/login": { method: "POST", callback: login },
    "/user/info": { method: "GET", callback: get_info }
};