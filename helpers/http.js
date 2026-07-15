import axios from "axios";
import { showError, createError } from '#app';
import { Common } from "@/helpers/classes.js";
import { useUserStore } from '@/stores/userStore.js'

export default {
    call(type, url, params, headers) {
        const common = new Common()
        let response = null

        return new Promise(async function (resolve, reject) {
            const router = useRouter()
            const userStore = useUserStore()

            try {
                response = await axios({
                    method: type.toUpperCase(),
                    url:
                        url + (type.toLowerCase() == "get" && params.length > 0 ? "?" + params : ""),
                    data: JSON_stringify(params, false),
                    headers: Object.assign({'Content-Type': 'application/json'}, headers)
                    //withCredentials: true,
                }).catch((error) => {
                    if (error.response.status == 401) {
                        if (!window.location.pathname.startsWith('/external/')) {
                            userStore.token = null
                            window.location.href = '/auth'
                        }
                    } else if (error.response.status == 403 && isDirectForbiddenView(url, error.response?.data?.message)) {
                        showError(createError({ statusCode: 403, statusMessage: 'Forbidden', fatal: true }))
                    } else {
                        const message = error.response?.data?.message
                        const hiddenMessages = ['Entity not found', 'Object not found']
                        if (message && !hiddenMessages.includes(String(message).trim())) {
                            common.showNotification({title: 'Ошибка', description: message})
                        }
                    }

                    return error.response
                });
                
                resolve({data: response.data, status: response.status});
            } catch (e) {
                reject(e);
            }
        });
    },
};

function isDirectForbiddenView(url, message) {
    if (typeof window === 'undefined') return false
    if (String(message).trim() != 'Forbidden') return false
    const path = new URL(String(url), window.location.origin).pathname
    const match = path.match(/^\/api\/objects\/([^/]+)\/([^/]+)\/compose$/)
    if (!match) return false
    return window.location.pathname == `/objects/${match[1]}/${match[2]}`
}

function JSON_stringify(s, emit_unicode) {
    var json = JSON.stringify(s);
    return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
        function (c) {
            return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
        }
    );
}