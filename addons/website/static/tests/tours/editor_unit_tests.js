odoo.define("website.tour.editor_unit_tests", function (require) {
"use strict";

var tour = require("web_tour.tour");


tour.register("editor_unit_tests", {
    test: true,
    url: "/?debug=1",
}, [{
    content: "Click Edit to start designing your homepage.",
    trigger: "a[data-action=edit]",
    extra_trigger: ".homepage",
}, {
    content: "Click to editor 'Test' dropdown",
    trigger: "we3-editor we3-dropdown[data-plugin='Test'] we3-toggler",
}, {
    content: "Launch all available unit tests",
    trigger: "we3-editor we3-dropdown[data-plugin='Test'] we3-button[data-method='loadTest'][name='all-Test']",
}, {
    content: "Check if all tests are loaded",
    trigger: "we3-editor we3-dropdown[data-plugin='Test']:has(we3-button:last.good, we3-button:last.fail) we3-toggler",
    timeout: 160000,
}, {
    content: "Log Error",
    trigger: "we3-editor",
    run: function () {
        document.querySelectorAll("we3-editor we3-dropdown[data-plugin='Test'] we3-button.fail")
        .forEach(function (node) {
            console.log('Test fail: ' + node.textContent);
        });
    }
}, {
    content: "Check if all tests are OK",
    trigger: "we3-editor we3-dropdown[data-plugin='Test']:not(:has(we3-button.fail)) we3-toggler",
    timeout: 50,
}]);

});
