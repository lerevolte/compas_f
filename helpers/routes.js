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
    file: {
        upload: '/files/store'
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
    },
    detail: {
        get: '/objects/${slug}/${id}/compose',
        update_title: '/objects/${slug}/batch',
        update_tabs: '/entities/${slug}/menu',
        settings_tabs: '/tabs/${slug}/permissions',
        reset_tabs: '/entities/${slug}/menu/reset',
        history: '/history/${slug}/${id}',
        create_section: '/field_sections',
        hidden_fields: '/field/hide_batch',
        delete_section: '/field_sections/${id}',
        show_field: '/field/${id}',
        module: '/objects/${slug}/${id}/${tab}/compose',
        create_field: '/field',
        edit_fields: '/objects/${slug}/batch',
        update_field: '/field/${id}',
    }
}