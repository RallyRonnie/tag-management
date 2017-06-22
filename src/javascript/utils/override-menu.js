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
