// Ext.override(Rally.ui.menu.DefaultRecordMenu, {
//     //Override the getMenuItems function to return only the menu items that we are interested in.
//     _getMenuItems: function() {
//         var record = this.getRecord(),
//             items = [],
//             popoverPlacement = this.popoverPlacement || Rally.ui.popover.Popover.DEFAULT_PLACEMENT;
//
//         items.push({
//             xtype: 'tagreplacemenuitem',
//             view: this.view,
//             record: record
//         });
//
//         return items;
//     }
// });
//
// Ext.override(Rally.ui.menu.bulk.RecordMenu,{
//
// });

Ext.override(Rally.ui.grid.CheckboxModel, {
    _recordIsSelectable: function(record) {
        return record.get('_type') === "tag";
    }
});

// need to override because grid is failing to refresh on refreshAfterBulkAction function which
// is called after the bulk action does its thing
Ext.override(Rally.ui.grid.Grid,{
    refreshAfterBulkAction: function() {
        return Ext.create('Deft.Deferred').promise;
    }
});

// override the chooser dialog so that the text doesn't say
// "Apply the following tags for the 0 selected items"

Ext.override(Rally.ui.dialog.TagChooserDialog,{
    _createChooser: function() {
        chooser = this.buildChooser();
        if (chooser) {
            this.mon(chooser, 'ready', function() {
                this.fireEvent('ready', this);
            }, this);
        } else {
            this.fireEvent('ready', this);
        }

        this.add({
            xtype: 'container',
            items: [chooser]
        });

        return chooser;
    }
});
