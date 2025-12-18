import http from './http'
import routes from './routes.js'
import { useUserStore } from '@/stores/userStore.js'

export default {
    callMethod(type, method, params = {}, headers = {Authorization: 'Bearer null'}, is_prefix = true) {
        const userStore = useUserStore()

        return new Promise(async (resolve, reject) => {
            const url = `${routes.domain}/api${method}`
            try {
                if (!method.includes('/external')) {
                    headers.Authorization = `Bearer ${userStore.token}`
                }
                let result = await http.call(type, url, params, headers)
                resolve(result)
            } catch(e) {
                reject(e)
            }
        })
    }
}
