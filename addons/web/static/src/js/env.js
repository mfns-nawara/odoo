odoo.define("web.env", function (require) {
    "use strict";

    const ajax = require('web.ajax');
    const config = require("web.config");
    const core = require("web.core");
    const rpc = require("web.rpc");
    const session = require("web.session");
    const utils = require("web.utils");

    const _t = core._t;

    const qweb = new owl.QWeb({ translateFn: _t});
    
    owl.QWeb.DIRECTIVE_NAMES['inherit'] = 1;
    owl.QWeb.DIRECTIVE_NAMES['inherit-mode'] = 1;
    
    return session.is_bound.then(() => {
        qweb.addTemplates(session.templatesString);

        function ajaxJsonRPC() {
            return ajax.jsonRPC(...arguments);
        }

        function getCookie() {
            return utils.get_cookie(...arguments);
        }

        function navigate(url, params) {
            window.location = $.param.querystring(url, params);
        }

        function blockUI(params) {
            $.blockUI(params);
        }

        function unblockUI() {
            $.unblockUI();
        }

        function performRPC(params, options) {
            const query = rpc.buildQuery(params);
            return session.rpc(query.route, query.params, options);
        }

        function reloadPage() {
            window.location.reload();
        }

        function setCookie() {
            utils.set_cookie(...arguments);
        }

        return {
            qweb,

            _t: core._t,
            _lt: core._lt,
            bus: core.bus,
            config: config,
            rpc: performRPC,
            session: session,

            services: {
                ajaxJsonRPC,
                blockUI,
                getCookie,
                navigate,
                reloadPage,
                setCookie,
                unblockUI,
            },
        };
    });
});
