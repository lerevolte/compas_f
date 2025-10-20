export default {
    domain: 'https://opt6.compas.pro',
    auth: {
        login: '/auth',
        reset_password: '/password/reset',
        forgot: '/password/forgot'
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
    },
    table: {
        get: '/objects/${slug}/compose',
        reset: '/tables/${slug}/reset',
        save_settings: '/tables/${slug}',
        save: '/objects/${slug}/batch',
        download: '/objects/${slug}/export',
        open: '/objects/${slug}/${row_id}/compose',
        copy: '/objects/${slug}/${row_id}/compose?is_copy=1',
        delete: '/objects/${slug}'
    },
    filter: {
        move: '/filters/${slug}/change-sort',
        create: '/filters/${slug}',
        edit: '/filters/${slug}',
        delete: '/filters/${slug}'
    }
}