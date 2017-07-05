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




         var numRecords = this.records.length;


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

      var promises = _.map(records, function(r){
         return this._deleteTag(r);
      }, this);

      Deft.Promise.all(promises).then({
        success: function(tags){
          var successes = [],
            failures = [];

          Ext.Array.each(tags, function(t){
             if (/ERROR DELETING/.test(t)){
               failures.push(t);
             } else {
               successes.push(t);
             }
          });

          var errorMsg = "";
          if (failures.length > 0){
            errorMsg = failures.join('<br/>');
          }
          this.onSuccess(successes, failures, {}, errorMsg);
        },
        scope: this
      });

    },
    _deleteTag: function(tagRecord){
      var deferred = Ext.create('Deft.Deferred'),
          ref = tagRecord.get('_ref'),
          tagOid = Rally.util.Ref.getOidFromRef(ref),
          me = this;

          //https://rally1.rallydev.com/slm/sbt/tag.sp?oid=130972737712
          Ext.Ajax.request({
            url: '/slm/sbt/tag.sp?oid=' + tagOid,
            method: 'DELETE',
            success: function(response){
                deferred.resolve(tagOid);
            },
            failure: function(){
                var text = response.responseText;
                deferred.resolve("ERROR DELETING " + tagOid + " " + text);
            }
        });
        return deferred.promise;
    },
    onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage) {

        var message = successfulRecords.length + (successfulRecords.length === 1 ? ' item has ' : ' items have ');

        if(successfulRecords.length === this.records.length) {
            message = message + ' been deleted';
            var oids = Ext.Array.map(successfulRecords, function(record){
                return record;
            });

            this.publish('tagsDeleted', oids);
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
