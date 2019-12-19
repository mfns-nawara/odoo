odoo.define('website_slides.slide.archive', function (require) {
'use strict';

var publicWidget = require('web.public.widget');
var Dialog = require('web.Dialog');
var core = require('web.core');
var _t = core._t;

var SlideArchiveDialog = Dialog.extend({
    template: 'slides.slide.archive',

    /**
     * @override
     */
    init: function (parent, options) {
        options = _.defaults(options || {}, {
            title: _t('Archive Slide'),
            size: 'medium',
            buttons: [{
                text: _t('Archive'),
                classes: 'btn-primary',
                click: this._onClickArchive.bind(this)
            }, {
                text: _t('Cancel'),
                close: true
            }]
        });

        this.$slideTarget = options.slideTarget;
        this.slideId = this.$slideTarget.data('slideId');
        this._super(parent, options);
    },
    _displayCategoryEmptyFlag: function (){
        // var categorySlideList = $($($(this.$slideTarget.parent()).parent()).parent());
        var categorySlideList = $(this.$slideTarget.parents('li'));
        // I don't see how I can manage to do it without using global selectors.
        // In master, there is a task that will introduce the concept of a content management widget, which will handle all of that stuff with events.
        var categoryId = categorySlideList.data('categoryId');
        var slideList = $('.o_wslides_slide_list[data-category-id='+ categoryId +']').find('.o_wslides_js_list_item');
        if (slideList.length === 0){
            $('.o_wslides_slide_list_category_header[data-category-id="'+ categoryId +'"] > div:first-child').append('<small class="ml-1 text-muted">Empty</small>');
        }
    },
    //---------
    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Calls 'archive' on slide controller and then visually removes the slide dom element
     */
    _onClickArchive: function () {
        var self = this;

        this._rpc({
            route: '/slides/slide/archive',
            params: {
                slide_id: this.slideId
            },
        }).then(function (data) {
            if (data){
                self.$slideTarget.closest('.o_wslides_slides_list_slide').remove();
                self._displayCategoryEmptyFlag(data.category_id);
            }
            self.close();
        });
    }
});

publicWidget.registry.websiteSlidesSlideArchive = publicWidget.Widget.extend({
    selector: '.o_wslides_js_slide_archive',
    xmlDependencies: ['/website_slides/static/src/xml/slide_management.xml'],
    events: {
        'click': '_onArchiveSlideClick',
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _openDialog: function ($slideTarget) {
        new SlideArchiveDialog(this, {slideTarget: $slideTarget}).open();
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     */
    _onArchiveSlideClick: function (ev) {
        ev.preventDefault();
        var $slideTarget = $(ev.currentTarget);
        this._openDialog($slideTarget);
    },
});

return {
    slideArchiveDialog: SlideArchiveDialog,
    websiteSlidesSlideArchive: publicWidget.registry.websiteSlidesSlideArchive
};

});
