odoo.define('website.s_rating_options', function (require) {
'use strict';

const ColorpickerDialog = require('web.ColorpickerDialog');
var weWidgets = require('wysiwyg.widgets');
var options = require('web_editor.snippets.options');

options.registry.Rating = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        this.faClassActiveCustomIcons = '';
        this.faClassInactiveCustomIcons = '';
        this.iconType = this.$target.attr('data-icon');
        this.activeIconColor = this._ensureCssColor(this.$target.attr('data-active-icon-color'));
        this.inactiveIconColor = this._ensureCssColor(this.$target.attr('data-inactive-icon-color'));
        if (this.iconType === 'custom') {
            const $icons = this.$target.find('.rating_icon');
            this.faClassActiveCustomIcons = $icons.filter('[data-icon-active="true"]').attr('class');
            this.faClassInactiveCustomIcons = $icons.filter('[data-icon-active="false"]').attr('class');
        }
        return this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * Display the selected icon type.
     *
     * @see this.selectClass for parameters
     */
    setIcons: function (previewMode, widgetValue, params) {
        this.iconType = widgetValue;
        this._renderIcons();
        this.$target.attr('data-icon', widgetValue);
    },

    /**
     * Allows to select a font awesome icon with media dialog.
     *
     * @see this.selectClass for parameters
     */
    customIcon: async function (previewMode, widgetValue, params) {
        return new Promise(resolve => {
            const dialog = new weWidgets.MediaDialog(
                this,
                {noImages: true, noDocuments: true, noVideos: true, mediaWidth: 1920},
                $('<i/>')
            );
            this._saving = false;
            dialog.on('save', this, function (attachments) {
                this._saving = true;
                const $icons = this.$target.find('.rating_icon');
                _.each($icons, el => {
                    if (el.dataset.iconActive === params.customActiveIcon) {
                        $(el).removeClass().addClass('rating_icon fa-fw ' + attachments.className);
                    }
                });
                this.faClassActiveCustomIcons = $icons.filter('[data-icon-active="true"]').attr('class');
                this.faClassInactiveCustomIcons = $icons.filter('[data-icon-active="false"]').attr('class');
                this.$target.attr('data-icon', 'custom');
                this.iconType = 'custom';
                resolve();
            });
            dialog.on('closed', this, function () {
                if (!this._saving) {
                    resolve();
                }
            });
            dialog.open();
        });
    },

    /**
     * Set the number of active icons.
     *
     * @see this.selectClass for parameters
     */
    activeIconsNumber: function (previewMode, widgetValue, params) {
        if (widgetValue < 0) {
            return;
        } else {
            this.$target.find('.rating_icon').attr('data-icon-active', 'false');
            this.$target.find('.rating_icon:nth-child(-n+' + widgetValue + ')').attr('data-icon-active', 'true');
            this._renderIcons();
        }
    },

    /**
     * Set the total number of icons.
     *
     * @see this.selectClass for parameters
     */
    totalIconsNumber: function (previewMode, widgetValue, params) {
        let $icons = this.$target.find('.rating_icon');
        let totalIcons = $($icons).length;
        if (widgetValue < 1) {
            return;
        } else if (widgetValue > totalIcons) {
            let i = 0;
            let count = widgetValue - totalIcons;
            for (i = 0; i < count; i++) {
                $($icons[totalIcons - 1]).clone().insertAfter($($icons[totalIcons - 1])).before(' ');
            }
        } else if (widgetValue < totalIcons) {
            this.$target.find(".rating_icon:nth-last-child(-n+" + (totalIcons - widgetValue) + ")").remove();
        }
    },

    /**
     * Set icon color.
     *
     * @see this.selectClass for parameters
     */
    setIconColor: function (previewMode, widgetValue, params) {
        this.activeIconColor = this.$target.attr('data-active-icon-color');
        this.inactiveIconColor = this.$target.attr('data-inactive-icon-color');
        this._renderIcons();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * render the icons according to whether it is active or inactive
     *
     * @private
     * 
     */
    _renderIcons: function () {
        const $icons = this.$target.find('.rating_icon');
        let $activeIcons = $icons.filter('[data-icon-active="true"]');
        let $inactiveIcons = $icons.filter('[data-icon-active="false"]');
        let faInactive = (this.iconType === 'thumbs-up') ? 'thumbs-o-up' : this.iconType + '-o';
        const faClassActiveIcons = (this.iconType === "custom") ? this.faClassActiveCustomIcons : 'rating_icon fa fa-fw fa-' + this.iconType;
        const faClassInactiveIcons = (this.iconType === "custom") ? this.faClassInactiveCustomIcons : 'rating_icon fa fa-fw fa-' + faInactive;
        $activeIcons.removeClass().addClass(faClassActiveIcons);
        $inactiveIcons.removeClass().addClass(faClassInactiveIcons);
        $($activeIcons).css('color', this.activeIconColor);
        $($inactiveIcons).css('color', this.inactiveIconColor);
    },
    /**
     * Ensures the color is an actual css color. In case of a color variable,
     * the color will be mapped to hexa.
     *
     * @private
     * @param {string} color
     * @returns {string}
     */
    _ensureCssColor: function (color) {
        if (ColorpickerDialog.isCSSColor(color)) {
            return color;
        }
        const style = window.getComputedStyle(document.documentElement);
        return style.getPropertyValue('--' + color).trim();
    },
    /**
     * @override
     */
    _computeWidgetState: function (methodName, params) {
        switch (methodName) {
            case 'setIcons': {
                return this.$target.attr('data-icon');
            }
            case 'activeIconsNumber': {
                return this.$target.find('.rating_icon').filter('[data-icon-active="true"]').length;
            }
            case 'totalIconsNumber': {
                return this.$target.find('.rating_icon').length;
            }
        }
        return this._super(...arguments);
    },
});
});
