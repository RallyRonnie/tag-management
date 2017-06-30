Ext.define('CATS.tag-management.utils.menu.TagDelete', {
    extend: 'Rally.ui.menu.item.RecordMenuItem',
    alias: 'widget.tagdeletemenuitem',
    mixins: {
        messageable: 'Rally.Messageable'
    },
    clickHideDelay: 1,

    config: {

        record: undefined,

        handler: function () {
          this._deleteTag(this.record)
        },

        predicate: function (record) {
            return true;
        },
        text: 'Delete'

    },

    _deleteTag: function(tagRecord){
      var ref = tagRecord.get('_ref'),
          tagOid = Rally.util.Ref.getOidFromRef(ref);
        Rally.data.ModelFactory.getModel({
           type: 'Tag',
           success: function(model) {
               model.load(tagOid,{
                 callback: function(result, operation){
                   if (operation.wasSuccessful()){
                     result.destroy({
                       callback: function(savedResult, operation){
                          if (!operation.wasSuccessful()){
                            Rally.ui.notify.Notifier.showError({message: "Error Deleting Tag '" + tagRecord.get('Name') + "':  " + operation.error.errors.join(",")});
                          } else {
                            this.publish('tagDeleted', tagOid);
                          }
                       }
                     });
                   } else {
                     Rally.ui.notify.Notifier.showError({message: "Error Retrieving and Deleting Tag '" + tagRecord.get('Name') + "':  " + operation.error.errors.join(",")});
                   }
                 },
                 scope: this
               });
           },
           scope: this 
       });
    }
});
