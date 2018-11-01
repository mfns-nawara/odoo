odoo.define('web.domain_selector_tests', function (require) {
"use strict";

var DomainSelector = require("web.DomainSelector");
var testUtils = require("web.test_utils");

QUnit.module('widgets', {}, function () {

QUnit.module('DomainSelector', {
    beforeEach: function () {
        this.data = {
            partner: {
                fields: {
                    foo: {string: "Foo", type: "char", searchable: true},
                    bar: {string: "Bar", type: "boolean", searchable: true},
                    nice_datetime: {string: "Datetime", type: "datetime", searchable: true},
                    product_id: {string: "Product", type: "many2one", relation: "product", searchable: true},
                },
                records: [{
                    id: 1,
                    foo: "yop",
                    bar: true,
                    product_id: 37,
                }, {
                    id: 2,
                    foo: "blip",
                    bar: true,
                    product_id: false,
                }, {
                    id: 4,
                    foo: "abc",
                    bar: false,
                    product_id: 41,
                }],
                onchanges: {},
            },
            product: {
                fields: {
                    name: {string: "Product Name", type: "char", searchable: true}
                },
                records: [{
                    id: 37,
                    display_name: "xphone",
                }, {
                    id: 41,
                    display_name: "xpad",
                }]
            },
            user: {
                fields: {
                    firstname: { string: "First Name", type: "char", searchable: true, is_business_field: true },
                    lastname: { string: "Last Name", type: "char", searchable: true },
                    mobile: { string: "Mobile", type: "integer", searchable: true, is_business_field: true },
                    phone: { string: "Phone", type: "integer", searchable: true },
                },
                records: [{
                    id: 37,
                    display_name: "Chagan",
                }]
            },
        };
    },
}, function () {

    QUnit.test("creating a domain from scratch", function (assert) {
        assert.expect(13);

        var $target = $("#qunit-fixture");

        // Create the domain selector and its mock environment
        var domainSelector = new DomainSelector(null, "partner", [], {
            readonly: false,
            debugMode: true,
        });
        testUtils.mock.addMockEnvironment(domainSelector, {data: this.data});
        domainSelector.appendTo($target);

        // As we gave an empty domain, there should be a visible button to add
        // the first domain part
        var $domainAddFirstNodeButton = domainSelector.$(".o_domain_add_first_node_button:visible");
        assert.strictEqual($domainAddFirstNodeButton.length, 1,
            "there should be a button to create first domain element");

        // Clicking on the button should add a visible field selector in the
        // widget so that the user can change the field chain
        testUtils.dom.click($domainAddFirstNodeButton);
        var $fieldSelector = domainSelector.$(".o_field_selector:visible");
        assert.strictEqual($fieldSelector.length, 1,
            "there should be a field selector");

        // Focusing the field selector input should open a field selector popover
        $fieldSelector.trigger('focusin');
        var $fieldSelectorPopover = $fieldSelector.find(".o_field_selector_popover:visible");
        assert.strictEqual($fieldSelectorPopover.length, 1,
            "field selector popover should be visible");

        // The field selector popover should contain the list of "partner"
        // fields. "Bar" should be among them.
        var $lis = $fieldSelectorPopover.find("li");
        var $barLi = $();
        $lis.each(function () {
            var $li = $(this);
            if ($li.html().indexOf("Bar") >= 0) {
                $barLi = $li;
            }
        });
        assert.strictEqual($barLi.length, 1,
            "field selector popover should contain the 'Bar' field");

        // Clicking the "Bar" field should change the internal domain and this
        // should be displayed in the debug input
        testUtils.dom.click($barLi);
        assert.strictEqual(
            domainSelector.$(".o_domain_debug_input").val(),
            '[["bar","=",True]]',
            "the domain input should contain a domain with 'bar'"
        );

        // There should be a "+" button to add a domain part; clicking on it
        // should add the default "['id', '=', 1]" domain
        var $plus = domainSelector.$(".fa-plus-circle");
        assert.strictEqual($plus.length, 1, "there should be a '+' button");
        testUtils.dom.click($plus);
        assert.strictEqual(
            domainSelector.$(".o_domain_debug_input").val(),
            '["&",["bar","=",True],["id","=",1]]',
            "the domain input should contain a domain with 'bar' and 'id'");

        // There should be two "..." buttons to add a domain group; clicking on
        // the first one, should add this group with defaults "['id', '=', 1]"
        // domains and the "|" operator
        var $dots = domainSelector.$(".fa-ellipsis-h");
        assert.strictEqual($dots.length, 2, "there should be two '...' buttons");
        testUtils.dom.click($dots.first());
        assert.strictEqual(
            domainSelector.$(".o_domain_debug_input").val(),
            '["&","&",["bar","=",True],"|",["id","=",1],["id","=",1],["id","=",1]]',
            "the domain input should contain a domain with 'bar', 'id' and a subgroup"
        );

        // Changing the domain input to update the subgroup to use the "foo"
        // field instead of "id" should rerender the widget and adapt the
        // widget suggestions
        domainSelector.$(".o_domain_debug_input").val('["&","&",["bar","=",True],"|",["foo","=","hello"],["id","=",1],["id","=",1]]').change();
        assert.strictEqual(domainSelector.$(".o_field_selector").eq(1).find("input").val(), "foo",
            "the second field selector should now contain the 'foo' value");
        assert.ok(domainSelector.$(".o_domain_leaf_operator_select").eq(1).html().indexOf("contains") >= 0,
            "the second operator selector should now contain the 'contains' operator");

        // There should be five "-" buttons to remove domain part; clicking on
        // the two last ones, should leave a domain with only the "bar" and
        // "foo" fields, with the initial "&" operator
        var $minus = domainSelector.$(".o_domain_delete_node_button");
        assert.strictEqual($minus.length, 5, "there should be five 'x' buttons");
        testUtils.dom.click($minus.last());
        testUtils.dom.click(domainSelector.$(".o_domain_delete_node_button").last());
        assert.strictEqual(
            domainSelector.$(".o_domain_debug_input").val(),
            '["&",["bar","=",True],["foo","=","hello"]]',
            "the domain input should contain a domain with 'bar' and 'foo'"
        );
        domainSelector.destroy();
    });

    QUnit.test("building a domain with a datetime", function (assert) {
        assert.expect(2);

        var $target = $("#qunit-fixture");

        // Create the domain selector and its mock environment
        var domainSelector = new DomainSelector(null, "partner", [["nice_datetime", "=", "2017-03-27 15:42:00"]], {
            readonly: false,
        });
        testUtils.mock.addMockEnvironment(domainSelector, {data: this.data});
        domainSelector.appendTo($target);

        // Check that there is a datepicker to choose the date
        var $datepicker = domainSelector.$(".o_datepicker:visible");
        assert.strictEqual($datepicker.length, 1,
            "there should be a datepicker");

        var val = $datepicker.find('input').val();
        testUtils.dom.openDatepicker($datepicker);
        testUtils.dom.clickFirst($('.bootstrap-datetimepicker-widget :not(.today)[data-action="selectDay"]'));
        assert.notEqual(domainSelector.$(".o_datepicker:visible input").val(), val,
            "datepicker value should have changed");

        domainSelector.destroy();
    });

    QUnit.test("building a domain with a m2o without following the relation", function (assert) {
        assert.expect(1);

        var $target = $("#qunit-fixture");

        // Create the domain selector and its mock environment
        var domainSelector = new DomainSelector(null, "partner", [["product_id", "ilike", 1]], {
            debugMode: true,
            readonly: false,
        });
        testUtils.mock.addMockEnvironment(domainSelector, {data: this.data});
        domainSelector.appendTo($target);

        testUtils.fields.editAndTrigger(domainSelector.$('.o_domain_leaf_value_input'), 'pad', ['input', 'change']);
        assert.strictEqual(domainSelector.$('.o_domain_debug_input').val(), '[["product_id","ilike","pad"]]',
            "string should have been allowed as m2o value");

        domainSelector.destroy();
    });

    QUnit.test("editing a domain with `parent` key", function (assert) {
        assert.expect(1);

        var $target = $("#qunit-fixture");

        // Create the domain selector and its mock environment
        var domainSelector = new DomainSelector(null, "product", "[['name','=',parent.foo]]", {
            debugMode: true,
            readonly: false,
        });
        testUtils.mock.addMockEnvironment(domainSelector, {data: this.data});
        domainSelector.appendTo($target);

        assert.strictEqual(domainSelector.$el.text(), "This domain is not supported.",
            "an error message should be displayed because of the `parent` key");

        domainSelector.destroy();
    });

    QUnit.test("creating a domain with a default option", function (assert) {
        assert.expect(1);

        var $target = $("#qunit-fixture");

        // Create the domain selector and its mock environment
        var domainSelector = new DomainSelector(null, "partner", [], {
            readonly: false,
            debugMode: true,
            default: [["foo","=","kikou"]],
        });
        testUtils.mock.addMockEnvironment(domainSelector, {data: this.data});
        domainSelector.appendTo($target);

        // Clicking on the button should add a visible field selector in the
        // widget so that the user can change the field chain
        testUtils.dom.click(domainSelector.$(".o_domain_add_first_node_button:visible"));

        assert.strictEqual(
            domainSelector.$(".o_domain_debug_input").val(),
            '[["foo","=","kikou"]]',
            "the domain input should contain the default domain");

        domainSelector.destroy();
    });

    QUnit.test("business and non-business field test", function (assert) {
        assert.expect(6);
        var $target = $("#qunit-fixture");
         // Create the domain selector and its mock environment
        var domainSelector = new DomainSelector(null, "user", [], {
            debugMode: true,
            readonly: false,
            showSearchInput: true,
        });
        testUtils.addMockEnvironment(domainSelector, { data: this.data });
        domainSelector.appendTo($target);
        domainSelector.$(".o_domain_add_first_node_button").click();
        assert.strictEqual(domainSelector.$('.o_field_selector_page li.o_field_selector_select_button').length, 2,
            "2 business field should be visible");
        assert.strictEqual(domainSelector.$('.o_field_selector_page li.load_more').length, 1,
            "load more button should be visible");
        domainSelector.$('.o_field_selector_search input').val('last');
        domainSelector.$('.o_field_selector_search input').trigger('keyup');
        assert.strictEqual(domainSelector.$('.o_field_selector_page li.load_more').length, 0,
                "load more button should not be visible in search mode");
        domainSelector.$('.o_field_selector_search input').val('');
        domainSelector.$('.o_field_selector_search input').trigger('keyup');
        assert.strictEqual(domainSelector.$('.o_field_selector_page li.load_more').length, 1,
                "load more button should be visible after search reset");
        domainSelector.$('.load_more').click();
        assert.strictEqual(domainSelector.$('.o_field_selector_page li.o_field_selector_select_button').not('.o_hidden').length, 4,
            "4 field should be visible after click load more button");
        assert.strictEqual(domainSelector.$('.o_field_selector_page li.load_more').length, 0,
            "load more button should not visible after all field load");
        domainSelector.destroy();
    });
});
});
});
