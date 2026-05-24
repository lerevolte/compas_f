import axios from "axios";
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
                    } else {
                        common.showNotification({title: 'Ошибка', description: error.response.data.message})
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

function JSON_stringify(s, emit_unicode) {
    var json = JSON.stringify(s);
    return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
        function (c) {
            return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
        }
    );
}