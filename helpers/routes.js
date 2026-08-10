export default {
    // domain: 'https://compas.pro',
    domain: typeof window !== 'undefined' 
        ? (window.location.hostname === 'localhost' ? 'https://test3.compas.pro' : window.location.origin) 
        : '',
    tenant: typeof window !== 'undefined' 
        ? (window.location.hostname === 'localhost' ? 'test3.compas.pro' : window.location.host) 
        : '',
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
    status: {
        create: '/field/status'
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
        get_account: '/settings/account',
        user: '/settings/user'
    },
    table: {
        get: '/objects/${slug}/compose',
        get_path: '${path}',
        reset: '/tables/${slug}/reset',
        save_settings: '/tables/${slug}',
        set_per_page: '/tables/${slug}/per_page',
        save: '/objects/${slug}/batch',
        save_path: '${path}',
        download: '/objects/${slug}/export',
        open: '/objects/${slug}/${row_id}/compose',
        copy: '/objects/${slug}/${row_id}/compose?is_copy=1',
        delete: '/objects/${slug}',
        restore: '/objects/${slug}/restore',
        update_products: '/tables/order_products',
        reset_products: '/tables/order_products/reset',
        set_products: '/${parent_slug}/${page_id}/set_products'
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
        events_visibility: '/tabs/${slug}/events-visibility',
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
        external: '/external/${token}',
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
    product_categories: {
        get: '/products/categories',
        create: '/products/categories',
        update: '/products/categories/${id}',
        delete: '/products/categories/${id}'
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
        getFilterFields: '/routes/${id}/task_filter',
        getSections: '/logistic/sections',
        updateSection: '/logistic/sections/${id}',
        createRoute: '/objects/routes/batch',
        changeRouteTasks: '/objects/routes/batch',
        getModalCompanies: '/objects/search?field_id=1888&carrier_only=1&q=',
        getModalCars: '/objects/search?field_id=2064&q=',
        getModalEmployees: '/objects/search?field_id=1887&q=',
        getStatistics: '/analytics/logistics-all',
        tasksViewFields: '/route-tasks-view/fields'
    },
    chart: {
        get: '/analytics',
        update: '/analytics/settings',
        getChart: '/analytics/${slug}'
    },
    external_link: {
        create: '/external-links',
        delete: '/external-links/${token}',
        table: '/external/${token}/table/${slug}',
        module: '/external/${token}/module/${tab}',
        route_tasks: '/external/${token}/route-tasks',
        route_map: '/external/${token}/route-map',
        save: '/external/${token}/batch'
    },
    productStats: {
        products: '/product-stats/products',
        tasks: '/product-stats/tasks'
    },
    bitrix24: {
        deal_stages: '/bitrix24/deal-stages',
        change_stage: '/bitrix24/deals/${id}/stage'
    }
}