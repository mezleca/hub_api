import { pictures } from "./upload";
import { create, login } from "./auth";

export const routes: any = {
    "/upload/picture": { method: "POST", callback: pictures },
    "/auth/create": { method: "POST", callback: create },
    "/auth/login": { method: "POST", callback: login }
};