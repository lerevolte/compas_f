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
        get_path: '${path}',
        reset: '/tables/${slug}/reset',
        save_settings: '/tables/${slug}',
        save: '/objects/${slug}/batch',
        save_path: '${path}',
        download: '/objects/${slug}/export',
        open: '/objects/${slug}/${row_id}/compose',
        copy: '/objects/${slug}/${row_id}/compose?is_copy=1',
        delete: '/objects/${slug}',
        restore: '/objects/${slug}/restore',
        update_products: '/tables/order_products',
        reset_products: '/tables/order_products/reset',
        set_products: '/logistic_tasks/${page_id}/set_products'
    },
    filter: {
        move: '/filters/${slug}/change-sort',
        create: '/filters/${slug}',
        edit: '/filters/${slug}',
        delete: '/filters/${slug}'
    },
    tabs: {
        update: '/entities/${slug}/menu',
        settings: '/tabs/${slug}/permissions',
        reset: '/entities/${slug}/menu/reset',

    },
    detail: {
        get: '/objects/${slug}/${id}/compose',
        update_title: '/objects/${slug}/batch',
        history: '/history/${slug}/${id}',
        create_section: '/field_sections',
        hidden_fields: '/field/hide_batch',
        update_section: '/field_sections/${id}',
        delete_section: '/field_sections/${id}',
        change_order_section: '/field_sections/change-sort',
        change_order_field: '/field/change-sort',
        show_field: '/field/${id}',
        module: '/objects/${slug}/${id}/${tab}/compose',
        create_field: '/field',
        delete_field: '/field/${id}',
        edit_fields: '/objects/${slug}/batch',
        update_field: '/field/${id}',
    },
    trash: {
        get_tabs: '/tabs/trash',
        restore: '/objects/${slug}/restore'
    },
    roles: {
        get: '/roles',
        create: '/roles',
        update: '/roles/${id}',
        delete: '/roles/${id}'
    },
    settings: {
        common: {
            get: '/settings/account',
            save: '/settings/account'
        },
        documents: {
            save: '/settings/account'
        },
        entities: {
            get: '/entities'
        },
        modules: {
            logistics: {
                get: '/modules/logistic/settings',
                save: '/modules/logistic'
            }
        }
    },
    tariffs: {
        get_balance: '/balance',
        update_tariff: '/tariffs/${id}',
        update_balance: '/settings/account',
        get_balance_url: '/balance/payment',
        get_operations: '/balance_operations/compose'
    },
    logistic: {
        getSections: '/logistic/sections',
        updateSection: '/logistic/sections/${id}'
    }
}