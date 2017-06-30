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
