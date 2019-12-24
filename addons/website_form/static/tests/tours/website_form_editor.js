odoo.define('website_form_editor.tour', function (require) {
    'use strict';

    const rpc = require('web.rpc');
    const tour = require("web_tour.tour");

    const selectButtonByText = function (text) {
        return [{
            content: "Open the select",
            trigger: `we-select:has(we-button:contains("${text}")) we-toggler`,
        },
        {
            content: "Click on the option",
            trigger: `we-select we-button:contains("${text}")`,
        }];
    };
    const selectButtonByData = function (data) {
        return [{
            content: "Open the select",
            trigger: `we-select:has(we-button[${data}]) we-toggler`,
        }, {
            content: "Click on the option",
            trigger: `we-select we-button[${data}]`,
        }];
    };
    const addField = function (data, name, type, label, required, hidden) {
        const ret = [{
            content: "Select form",
            extra_trigger: '.form-field',
            trigger: 'section.s_website_form',
        }, {
            content: "Add field",
            trigger: 'we-button[data-add-field]',
        },
        ...selectButtonByData(data),
        {
            content: "Wait for field to load",
            trigger: `.form-field[data-type="${name}"], .form-field label[for="${name}"]`, //custom or existing field
            run: function () {},
        }];
        if (label) {
            ret.push({
                content: "Change the label text",
                trigger: 'we-input[data-set-name] input',
                run: `text ${label}`,
            });
        }
        let testText = '.form-field';
        if (required) {
            testText += '.o_website_form_required_custom';
            ret.push({
                content: "Mark the field as required",
                trigger: 'we-button[data-name="required_opt"]',
            });
        }
        if (hidden) {
            testText += '.o_website_form_field_hidden';
            ret.push({
                content: "Mark the field as hidden",
                trigger: 'we-button[data-name="hidden_opt"]',
            });
        }
        if (label) {
            testText += `:has(label:contains("${label}"))`;
            ret.push({
                content: "Change the label text",
                trigger: 'we-input[data-set-name] input',
                run: `text ${label}`,
            });
        }
        if (type !== 'checkbox' && type !== 'radio' && type !== 'select') {
            let inputType = type;
            if (type !== 'textarea') {
                inputType = `input[type="${type}"]`;
            }
            testText += `:has(${inputType}[name="${name}"]${required ? '[required]' : ''})`;
        }
        ret.push({
            content: "Check the resulting field",
            trigger: testText,
            run: function () {},
        });
        return ret;
    };
    const addCustomField = function (name, type, label, required, hidden) {
        return addField(`data-custom-field="${name}"`, name, type, label, required, hidden);
    };
    const addExistingField = function (name, type, label, required, hidden) {
        return addField(`data-existing-field="${name}"`, name, type, label, required, hidden);
    };

    tour.register("website_form_editor_tour", {
        test: true,
    }, [
        // Drop a form builder snippet and configure it
        {
            content: "Enter edit mode",
            trigger: 'a[data-action=edit]',
        }, {
            content: "Drop the form snippet",
            trigger: '#oe_snippets .oe_snippet:has(.s_website_form) .oe_snippet_thumbnail',
            run: 'drag_and_drop #wrap',
        }, {
            content: "Check dropped snippet and select it",
            extra_trigger: '.form-field',
            trigger: 'section.s_website_form',
        },
        ...selectButtonByText('Send an E-mail'),
        {
            content: "Form has a model name",
            trigger: 'section.s_website_form form[data-model_name="mail.mail"]',
        }, {
            content: "Complete Recipient E-mail",
            trigger: '[data-field-name="email_to"] input',
            run: 'text_focus_out test@test.test',
        },
        ...addExistingField('date', 'text', 'Test Date', true),

        ...addExistingField('record_name', 'text', 'Awesome Label', false, true),

        ...addExistingField('body_html', 'textarea', 'Your Message', true),

        ...addExistingField('recipient_ids', 'checkbox', 'Products'),

        ...addCustomField('one2many', 'checkbox', 'Products', true),
        {
            content: "Change Option 1 label",
            trigger: 'we-list table input:eq(0)',
            run: 'text Iphone',
        }, {
            content: "Change Option 2 label",
            trigger: 'we-list table input:eq(1)',
            run: 'text Galaxy S',
        }, {
            content: "Change first Option 3 label",
            trigger: 'we-list table input:eq(2)',
            run: 'text Xperia',
        }, {
            content: "Click on Add new Checkbox",
            trigger: 'we-list we-button.o_we_list_add_optional',
        }, {
            content: "Change added Option label",
            trigger: 'we-list table input:eq(3)',
            run: 'text Wiko Stairway',
        }, {
            content: "Check the resulting field",
            trigger: ".form-field.o_website_form_custom.o_website_form_required_custom" +
                        ":has(.o_website_form_flex[data-display='horizontal'])" +
                        ":has(.checkbox label:contains('Iphone'):has(input[type='checkbox'][required]))" +
                        ":has(.checkbox label:contains('Galaxy S'):has(input[type='checkbox'][required]))" +
                        ":has(.checkbox label:contains('Xperia'):has(input[type='checkbox'][required]))" +
                        ":has(.checkbox label:contains('Wiko Stairway'):has(input[type='checkbox'][required]))",
            run: function () {},
        },
        ...selectButtonByData('data-multi-checkbox-display="vertical"'),
        {
            content: "Check the resulting field",
            trigger: ".form-field.o_website_form_custom.o_website_form_required_custom" +
                        ":has(.o_website_form_flex.o_website_form_flex_fw[data-display='vertical'])" +
                        ":has(.checkbox label:contains('Iphone'):has(input[type='checkbox'][required]))" +
                        ":has(.checkbox label:contains('Galaxy S'):has(input[type='checkbox'][required]))" +
                        ":has(.checkbox label:contains('Xperia'):has(input[type='checkbox'][required]))" +
                        ":has(.checkbox label:contains('Wiko Stairway'):has(input[type='checkbox'][required]))",
            run: function () {},
        },

        ...addCustomField('selection', 'radio', 'Service', true),
        {
            content: "Change Option 1 label",
            trigger: 'we-list table input:eq(0)',
            run: 'text After-sales Service',
        }, {
            content: "Change Option 2 label",
            trigger: 'we-list table input:eq(1)',
            run: 'text Invoicing Service',
        }, {
            content: "Change first Option 3 label",
            trigger: 'we-list table input:eq(2)',
            run: 'text Development Service',
        }, {
            content: "Click on Add new Checkbox",
            trigger: 'we-list we-button.o_we_list_add_optional',
        }, {
            content: "Change last Option label",
            trigger: 'we-list table input:eq(3)',
            run: 'text Management Service',
        }, {
            content: "Mark the field as not required",
            trigger: 'we-button[data-name="required_opt"]',
        }, {
            content: "Check the resulting field",
            trigger: ".form-field.o_website_form_custom:not(.o_website_form_required_custom)" +
                            ":has(.radio label:contains('After-sales Service'):has(input[type='radio']:not([required])))" +
                            ":has(.radio label:contains('Invoicing Service'):has(input[type='radio']:not([required])))" +
                            ":has(.radio label:contains('Development Service'):has(input[type='radio']:not([required])))" +
                            ":has(.radio label:contains('Management Service'):has(input[type='radio']:not([required])))",
            run: function () {},
        },

        ...addCustomField('many2one', 'select', 'State', true),

        // Customize custom selection field
        {
            content:  "Change Option 1 Label",
            trigger: 'we-list table input:eq(0)',
            run: 'text Germany',
        }, {
            content:  "Change Option 2 Label",
            trigger: 'we-list table input:eq(1)',
            run: 'text Belgium',
        }, {
            content: "Change first Option 3 label",
            trigger: 'we-list table input:eq(2)',
            run: 'text France',
        }, {
            content: "Click on Add new Checkbox",
            trigger: 'we-list we-button.o_we_list_add_optional',
        }, {
            content:  "Change last Option label",
            trigger: 'we-list table input:eq(3)',
            run: 'text Canada',
        }, {
            content:  "Remove Germany Option",
            trigger:  ".o_we_select_remove_option:eq(0)",
        }, {
            content:  "Check the resulting snippet",
            trigger:  ".form-field.o_website_form_custom.o_website_form_required_custom" +
                            ":has(label:contains('State'))" +
                            ":has(select[required]:hidden)" +
                            ":has(.o_website_form_select_item:contains('Belgium'))" +
                            ":has(.o_website_form_select_item:contains('France'))" +
                            ":has(.o_website_form_select_item:contains('Canada'))" +
                            ":not(:has(.o_website_form_select_item:contains('Germany')))",
            run: function () {},
        },

        ...addExistingField('attachment_ids', 'file', 'Invoice Scan'),

        // Save the page
        {
            trigger: 'body',
            run: function () {
                $('body').append('<div id="completlyloaded"></div>');
            },
        },
        {
            content:  "Save the page",
            trigger:  "button[data-action=save]",
        },
        {
            content:  "Wait reloading...",
            trigger:  "html:not(:has(#completlyloaded)) div",
        }
    ]);

    tour.register("website_form_editor_tour_submit", {
        test: true,
    },[
        {
            content:  "Try to send empty form",
            extra_trigger:  "form[data-model_name='mail.mail']" +
                            "[data-success_page='/contactus-thank-you']" +
                            ":has(.form-field:has(label:contains('Your Name')):has(input[type='text'][name='Your Name'][required]))" +
                            ":has(.form-field:has(label:contains('Email')):has(input[type='email'][name='email_from'][required]))" +
                            ":has(.form-field:has(label:contains('Your Question')):has(textarea[name='Your Question'][required]))" +
                            ":has(.form-field:has(label:contains('Subject')):has(input[type='text'][name='subject'][required]))" +
                            ":has(.form-field:has(label:contains('Test Date')):has(input[type='text'][name='date'][required]))" +
                            ":has(.form-field:has(label:contains('Awesome Label')):hidden)" +
                            ":has(.form-field:has(label:contains('Your Message')):has(textarea[name='body_html'][required]))" +
                            ":has(.form-field:has(label:contains('Products')):has(input[type='checkbox'][name='Products'][value='Iphone'][required]))" +
                            ":has(.form-field:has(label:contains('Products')):has(input[type='checkbox'][name='Products'][value='Galaxy S'][required]))" +
                            ":has(.form-field:has(label:contains('Products')):has(input[type='checkbox'][name='Products'][value='Xperia'][required]))" +
                            ":has(.form-field:has(label:contains('Products')):has(input[type='checkbox'][name='Products'][value='Wiko Stairway'][required]))" +
                            ":has(.form-field:has(label:contains('Service')):has(input[type='radio'][name='Service'][value='After-sales Service']:not([required])))" +
                            ":has(.form-field:has(label:contains('Service')):has(input[type='radio'][name='Service'][value='Invoicing Service']:not([required])))" +
                            ":has(.form-field:has(label:contains('Service')):has(input[type='radio'][name='Service'][value='Development Service']:not([required])))" +
                            ":has(.form-field:has(label:contains('Service')):has(input[type='radio'][name='Service'][value='Management Service']:not([required])))" +
                            ":has(.form-field:has(label:contains('State')):has(select[name='State'][required]:has(option[value='Belgium'])))" +
                            ":has(.form-field.o_website_form_required_custom:has(label:contains('State')):has(select[name='State'][required]:has(option[value='France'])))" +
                            ":has(.form-field:has(label:contains('State')):has(select[name='State'][required]:has(option[value='Canada'])))" +
                            ":has(.form-field:has(label:contains('Invoice Scan')))" +
                            ":has(.form-field:has(input[name='email_to'][value='test@test.test']))",
            trigger:  ".o_website_form_send"
        },
        {
            content:  "Check if required fields were detected and complete the Subject field",
            extra_trigger:  "form:has(#o_website_form_result.text-danger)" +
                            ":has(.form-field:has(label:contains('Your Name')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Email')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Your Question')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Subject')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Test Date')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Your Message')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Products')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Service')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('State')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('Invoice Scan')):not(.o_has_error))",
            trigger:  "input[name=subject]",
            run:      "text Jane Smith"
        },
        {
            content:  "Update required field status by trying to Send again",
            trigger:  ".o_website_form_send"
        },
        {
            content:  "Check if required fields were detected and complete the Message field",
            extra_trigger:  "form:has(#o_website_form_result.text-danger)" +
                            ":has(.form-field:has(label:contains('Your Name')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Email')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Your Question')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Subject')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('Test Date')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Your Message')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Products')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Service')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('State')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('Invoice Scan')):not(.o_has_error))",
            trigger:  "textarea[name=body_html]",
            run:      "text A useless message"
        },
        {
            content:  "Update required field status by trying to Send again",
            trigger:  ".o_website_form_send"
        },
        {
            content:  "Check if required fields was detected and check a product. If this fails, you probably broke the cleanForSave.",
            extra_trigger:  "form:has(#o_website_form_result.text-danger)" +
                            ":has(.form-field:has(label:contains('Your Name')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Email')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Your Question')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Subject')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('Test Date')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Your Message')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('Products')).o_has_error)" +
                            ":has(.form-field:has(label:contains('Service')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('State')):not(.o_has_error))" +
                            ":has(.form-field:has(label:contains('Invoice Scan')):not(.o_has_error))",
            trigger:  "input[name=Products][value='Wiko Stairway']"
        },
        {
            content:  "Complete Date field",
            trigger:  ".o_website_form_datetime [data-toggle='datetimepicker']",
        },
        {
            content:  "Check another product",
            trigger:  "input[name='Products'][value='Xperia']"
        },
        {
            content:  "Check a service",
            trigger:  "input[name='Service'][value='Development Service']"
        },
        {
            content:  "Complete Your Name field",
            trigger:  "input[name='Your Name']",
            run:      "text chhagan"
        },
        {
            content:  "Complete Email field",
            trigger:  "input[name=email_from]",
            run:      "text test@mail.com"
        },
        {
            content:  "Complete Your Question field",
            trigger:  "textarea[name='Your Question']",
            run:      "text magan"
        },
        {
            content:  "Send the form",
            trigger:  ".o_website_form_send"
        },
        {
            content:  "Check form is submitted without errors",
            trigger:  ".alert-success:contains('Your message has been sent successfully.')"
        }
    ]);

    tour.register("website_form_editor_tour_results", {
        test: true,
    }, [
        {
            content: "Check mail.mail records have been created",
            trigger: "body",
            run: function () {
                var mailDef = rpc.query({
                        model: 'mail.mail',
                        method: 'search_count',
                        args: [[
                            ['email_to', '=', 'test@test.test'],
                            ['body_html', 'like', 'A useless message'],
                            ['body_html', 'like', 'Service : Development Service'],
                            ['body_html', 'like', 'State : Belgium'],
                            ['body_html', 'like', 'Products : Xperia,Wiko Stairway']
                        ]],
                    });
                var success = function(model, count) {
                    if (count > 0) {
                        $('body').append('<div id="website_form_editor_success_test_tour_'+model+'"></div>');
                    }
                };
                mailDef.then(_.bind(success, this, 'mail_mail'));
            }
        },
        {
            content:  "Check mail.mail records have been created",
            trigger:  "#website_form_editor_success_test_tour_mail_mail"
        }
    ]);

    return {};
});
