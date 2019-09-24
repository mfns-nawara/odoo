odoo.define('mail.mail_utils_tests', function (require) {
"use strict";

var utils = require('mail.utils');

QUnit.module('mail', {}, function () {

QUnit.module('Mail utils');

QUnit.test('add_link utility function', function (assert) {
    assert.expect(15);

    var testInputs = {
        'http://admin:password@example.com:8/%2020': true,
        'https://admin:password@example.com/test': true,
        'www.example.com:8/test': true,
        'https://127.0.0.5:8069': true,
        'www.127.0.0.5': false,
        'should.notmatch': false,
        'fhttps://test.example.com/test': false,
        "https://www.transifex.com/odoo/odoo-11/translate/#fr/lunch?q=text%3A'La+Tartiflette'": true,
        'https://www.transifex.com/odoo/odoo-11/translate/#fr/$/119303430?q=text%3ATartiflette': true,
    };

    _.each(testInputs, function (willLinkify, content) {
        var output = utils.parseAndTransform(content, utils.addLink);
        if (willLinkify) {
            assert.strictEqual(output.indexOf('<a '), 0, "There should be a link");
            assert.strictEqual(output.indexOf('</a>'), (output.length - 4), "Link should match the whole text");
        } else {
            assert.strictEqual(output.indexOf('<a '), -1, "There should be no link");
        }
    });
});

QUnit.test('add_link: linkify inside text node (1 occurence)', function (assert) {
    assert.expect(5);

    const content = '<p>some text https://somelink.com</p>';
    const output = utils.parseAndTransform(content, utils.addLink);
    assert.ok(
        output.startsWith('<p>some text <a'),
        "linkified text should starts with non-linkified start part + '<a' tag");
    assert.ok(
        output.endsWith('</a></p>'),
        "linkified text should ends with '</a>' + non-linkified end part");
    const fragment = document.createDocumentFragment();
    const div = document.createElement('div');
    fragment.appendChild(div);
    div.innerHTML = output;
    assert.strictEqual(
        div.textContent,
        'some text https://somelink.com',
        "linkified text should have same text content as non-linkified version");
    assert.strictEqual(
        div.querySelectorAll(':scope a').length,
        1,
        "linkified text should have a link (newly introduced one)");
    assert.strictEqual(
        div.querySelector(':scope a').textContent,
        'https://somelink.com',
        "text content of link should be non-linkified link part of original text");
});

QUnit.test('add_link: linkify inside text node (2 occurences)', function (assert) {
    assert.expect(4);

    const content = '<p>some text https://somelink.com and again https://somelink2.com ...</p>';
    const output = utils.parseAndTransform(content, utils.addLink);
    const fragment = document.createDocumentFragment();
    const div = document.createElement('div');
    fragment.appendChild(div);
    div.innerHTML = output;
    assert.strictEqual(
        div.textContent,
        'some text https://somelink.com and again https://somelink2.com ...',
        "linkified text should have same text content as non-linkified version");
    assert.strictEqual(
        div.querySelectorAll(':scope a').length,
        2,
        "linkified text should have 2 links (newly introduced ones)");
    assert.strictEqual(
        div.querySelectorAll(':scope a')[0].textContent,
        'https://somelink.com',
        "text content of 1st link should be 1st non-linkified link part of original text");
    assert.strictEqual(
        div.querySelectorAll(':scope a')[1].textContent,
        'https://somelink2.com',
        "text content of 2nd link should be 2nd non-linkified link part of original text");
});

});
});
