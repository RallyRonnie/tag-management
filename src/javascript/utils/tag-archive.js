Ext.define('CATS.tag-management.utils.menu.bulk.Archive', {
    alias: 'widget.tagmanagementbulkarchive',
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
        text: 'Archive...',

       handler: function () {
           this._archiveRecords(this.records, null);
       },
       predicate: function (records) {
           return true;
       }
    },
    _archiveRecords: function(records){
        // var promises= [],
        //     successfulRecords = [],
        //     unsuccessfulRecords = [];
        //
        // _.each(records, function(r){
        //     promises.push(function() {
        //         return this._cancelRecord(r);
        //     });
        // }, this);
        //
        // Deft.Chain.sequence(promises, this).then({
        //     success: function(results){
        //         var errorMessage = '';
        //         _.each(results, function(r){
        //             if (r.errorMessage){
        //                 errorMessage = r.errorMessage;
        //                 unsuccessfulRecords.push(r.record);
        //             } else {
        //                 successfulRecords.push(r.record);
        //             }
        //         });
        //
        //         this.onSuccess(successfulRecords, unsuccessfulRecords, {}, errorMessage);
        //     },
        //     failure: function(msg){
        //
        //         this.onSuccess([], [], {}, msg);
        //     },
        //     scope: this
        // });

    },
    onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage) {

        var message = successfulRecords.length + (successfulRecords.length === 1 ? ' item has ' : ' items have ');

        if(successfulRecords.length === this.records.length) {
            message = message + ' been archived';

            this.publish('bulkActionComplete', message);
            //Rally.ui.notify.Notifier.show({
            //    message: message
            //});
        } else {
            if (successfulRecords.length === 0){
                message = "0 items have been archived";
            }

            this.publish('bulkActionError', message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage);
            //Rally.ui.notify.Notifier.showError({
            //    message: message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage,
            //    saveDelay: 500
            //});
        }

        Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
    }
});
