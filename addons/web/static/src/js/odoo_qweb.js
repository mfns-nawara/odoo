odoo.define("web.OdooQWeb", async function() {
    "use strict";

    /**
     * Sub QWeb class specialized for Odoo needs. For now, this class only handles one
     * additional concern: not crash when encountering inherit and inherit-mode directives
    */
    class OdooQWeb extends owl.QWeb {}

    ['inherit', 'inherit-mode'].forEach(directive => {
        OdooQWeb.DIRECTIVE_NAMES[directive] = 1;
    });

    return OdooQWeb;
});
