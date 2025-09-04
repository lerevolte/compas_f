export default {
    domain: 'https://opt6.compas.pro',
    auth: {
        login: '/user/login'
    },
    user: {
        me: '/profile',
        roles: '/roles'
    },
    menu: {
        get: '/sidebar/get',
        update: '/sidebar/set',
        reset: '/sidebar/reset',
        create_group: '/sidebar/set/group',
        update_group: '/sidebar/set/group',
        delete_group: '/sidebar/set/all'
    },
    settings: {
        get_account: '/settings/account'
    }
}