Ext.define('CATS.tag-management.utils.menu.TagArchive', {
    extend: 'Rally.ui.menu.item.RecordMenuItem',
    alias: 'widget.tagarchivemenuitem',
    mixins: {
        messageable: 'Rally.Messageable'
    },
    clickHideDelay: 1,

    config: {

        record: undefined,

        handler: function () {
          this._archiveTag(this.record)
        },

        predicate: function (record) {
            return record.get('Archived') !== true;
        },
        text: 'Archive'

    },

    _archiveTag: function(tagRecord){
      var ref = tagRecord.get('_ref'),
          tagOid = Rally.util.Ref.getOidFromRef(ref);

       Rally.data.ModelFactory.getModel({
           type: 'Tag',
           success: function(model) {
               model.load(tagOid,{
                 callback: function(result, operation){
                   if (operation.wasSuccessful()){
                     result.set('Archived', true);
                     result.save({
                       callback: function(savedResult, operation){
                          if (!operation.wasSuccessful()){
                            Rally.ui.notify.Notifier.showError({message: "Error Archiving Tag '" + tagRecord.get('Name') + "':  " + operation.error.errors.join(",")});
                          } else {
                            this.publish('tagArchived', tagOid);
                          }
                       },
                       scope: this
                     });
                   } else {
                     Rally.ui.notify.Notifier.showError({message: "Error Retrieving and Archiving Tag '" + tagRecord.get('Name') + "':  " + operation.error.errors.join(",")});
                   }
                 },
                 scope: this 
               });
           }
       });
    }
});
