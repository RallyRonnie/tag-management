Ext.define('CATS.tag-management.utils.TagDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.rallytagdialog',

    width: 350,
    closable: true,
    autoShow: true,
    componentCls: 'rally-tag-dialog',
    layout: {
       type: 'hbox',
       pack: 'center'
    },
    /**
     * @cfg {String}
     * Title to give to the dialog
     */
    title: 'Choose a Tag',

    titleIconHtml: '<span aria-hidden="true" class="icon-tag"></span> ',

    /**
     * @cfg {String}
     * A question to ask the user
     */
    message: '',

    /**
     * @cfg {String}
     * The label for the left button
     */
    confirmLabel: 'Apply',

    /**
     * @cfg {String}
     * The label for the right button
     */
    cancelLabel: 'Cancel',

    /**
     * @cfg {String}
     * The button to give focus to by default. Valid values are 'confirm' or 'cancel'
     */
    defaultFocus: 'confirm',

    items: [
        {
            xtype: 'rallytagpicker',
            width: 250
        }
    ],

    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '10',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    cls: 'confirm primary rly-small',
                    itemId: 'confirmButton',
                    userAction: 'clicked yes in dialog'
                },
                {
                    xtype: 'rallybutton',
                    cls: 'cancel secondary rly-small',
                    itemId: 'cancelButton',
                    ui: 'link'
                }
            ]
        }
    ],

    constructor: function(config) {
        this.callParent(arguments);

        if (this.autoCenter) {
            this.scrollListener.saveScrollPosition = true;
        }
    },

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents(
            /**
             * @event
             * @param Rally.ui.dialog.ConfirmDialog
             */
            'confirm',

            /**
             * @event
             * @param Rally.ui.dialog.ConfirmDialog
             */
            'cancel'
        );

        this.down('#confirmButton').on('click', this._onConfirm, this);
        this.down('#confirmButton').setText(this.confirmLabel);

        this.down('#cancelButton').on('click', this._onCancel, this);
        this.down('#cancelButton').setText(this.cancelLabel);

    },

    show: function() {
        if (this.autoCenter) {
            this._saveScrollPosition();
        }
        this.callParent(arguments);
        var focusButton = this.down('#' + this.defaultFocus + 'Button');
        if (focusButton && focusButton.rendered) {
            focusButton.focus();
        }
    },

    close: function() {
        this._onCancel();
    },

    _onConfirm: function() {
        var tag = Ext.clone(this.down('rallytagpicker') && this.down('rallytagpicker').getValue());

        this.fireEvent('confirm', tag);
        this.destroy();
    },

    _onCancel: function() {
        this.fireEvent('cancel', this);
        this.destroy();
    },

    _saveScrollPosition: function() {
        this.savedScrollPosition = {
            xOffset: (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
            yOffset: (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop
        };
    }
});
