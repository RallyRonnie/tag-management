Ext.define('CATS.tag-management.utils.menu.bulk.Delete', {
    alias: 'widget.tagmanagementbulkdelete',
    extend: 'Rally.ui.menu.bulk.MenuItem',

    mixins: {
        messageable: 'Rally.Messageable'
    },

    config: {
        onBeforeAction: function(){
//            console.log('onbeforeaction');
        },

        /**
         * @cfg {Function} onActionComplete a function called when the specified menu item action has completed
         * @param Rally.data.wsapi.Model[] onActionComplete.successfulRecords any successfully modified records
         * @param Rally.data.wsapi.Model[] onActionComplete.unsuccessfulRecords any records which failed to be updated
         */
        onActionComplete: function(){
            //         console.log('onActionComplete');
        },
        text: 'Delete...',

       handler: function () {

         Ext.create('Rally.ui.dialog.ConfirmDialog', {
            cls: 'delete-confirm-dialog',
            confirmLabel: 'Delete',
            title: 'Permanent Delete Warning',
            width: 500,
            message: '<div>Are you sure you want to delete</div>' +
                        '<div><span class="item-display-string">' +
                        numRecords + '</span> Tags?</div>' +
                    '<div>&nbsp;</div>' +
                    '<div class="associations-will-be-removed-message">Any associations will be removed.</div>' +
                    '<div>THERE IS NO UNDO for deleting objects of this type.</div>',
            listeners: {
                confirm: function(){
                  this._deleteRecords(this.records, null);
                },
                scope: this
              }
          });

       },
       predicate: function (records) {
           return true;
       }
    },
    _deleteRecords: function(records){
      var store = Ext.create('Rally.data.wsapi.batch.Store', {
          data: records
      });

      store.removeAll();

      store.sync({
        success: function(batch){
            this.onSuccess(records, [], {}, "");
        },
        failure: function(batch){
          console.log('failure', batch);
          this.onSuccess([], records, {}, "Error updating tags to archived.");
        },
        scope: this
      });

    },
    onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage) {

        var message = successfulRecords.length + (successfulRecords.length === 1 ? ' item has ' : ' items have ');

        if(successfulRecords.length === this.records.length) {
            message = message + ' been deleted';

            this.publish('bulkActionComplete', message);
        } else {
            if (successfulRecords.length === 0){
                message = "0 items have been deleted";
            }

            this.publish('bulkActionError', message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage);
        }

        Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
    }
});
