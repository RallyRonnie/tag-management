Ext.define('CATS.tag-management.utils.menu.TagReplace', {
    extend: 'Rally.ui.menu.item.RecordMenuItem',
    alias: 'widget.tagreplacemenuitem',

    clickHideDelay: 1,
    mixins: {
      messageable: 'Rally.Messageable'
    },
    config: {

        record: undefined,

        handler: function () {
            Ext.create('Rally.ui.dialog.TagChooserDialog', {
                autoShow: true,
                records: [],
                title: 'Choose a Tag to Replace With',
                height: 250,
                listeners: {
                    tagselect: function(dialog,tags){
                        this._replaceTags(tags.full);
                    },
                    scope: this
                }
            });
    //      Ext.create('CATS.tag-management.utils.TagDialog', {
    //        autoShow: true,
    //        draggable: true,
    //        width: 300,
    //        title: 'Choose a Tag to Replace With',
    //        listeners: {
    //           confirm: this._replaceTags,
    //           cancel: function(){},
    //           scope: this
    //        }
    //    });


        },
        predicate: function (record) {
            return true;
        },

        text: 'Replace With...'

    },
    _getModels: function(){
        return ['Defect', 'DefectSuite', 'UserStory','TestSet','Task'].concat(this.portfolioItemTypes);
    },
    _replaceTags: function(tag){

        var newTagRefs = [],
          newTagNames = [],
          oldRecord = this.record;

      if (Ext.isArray(tag)){
        newTagRefs = _.map(tag, function(t){ return  {'_ref': t.get('_ref')}; });
        newTagNames = _.map(tag, function(t){ return t.get('Name'); });
      } else {

        newTagRefs =  [{'_ref': tag.get('_ref')}];
        newTagNames = [tag.get('Name')];
      }
      var replaceTagRef = oldRecord.get('_ref'),
          replaceTagName = oldRecord.get('Name');
      //console.log('replace', replaceTagName, 'with', newTagNames);

      Ext.create('Rally.data.wsapi.artifact.Store', {
         models: this._getModels(),
         filters: [{
            property: 'Tags',
            operator: 'contains',
            value: replaceTagRef
         }],
         context: {project: null},
         fetch: ['Tags', 'Name', 'ObjectID']
       }).load({
         callback: function(records, operation, success){

            Ext.Array.each(records, function(r){
              var tags = _.filter(r.get('Tags') && r.get('Tags')._tagsNameArray || [], function(t){
                 return t._ref !== replaceTagRef;
              });
              tags = tags.concat(newTagRefs);

              r.set('Tags', tags);
            });

            var bulkStore = Ext.create('Rally.data.wsapi.batch.Store', {
                data: records
            });

            bulkStore.sync({
               success: function(batch){
                 var msg = Ext.String.format("{0} records updated.  Tag '{1}'' replaced by '{2}'",records.length,replaceTagName,newTagNames.join(', ')) ;
                 Rally.ui.notify.Notifier.show({message: msg})
                 newTagRefs.push({'_ref': replaceTagRef});
                 this.publish('tagDataUpdated', newTagRefs);

               },
               failure: function(batch){
                 Rally.ui.notify.Notifier.showError({message: "Error updating Tags."})
               },
               scope: this
            });
         }
       });
       this._archiveTag(replaceTagRef);

    },
    _archiveTag: function(tagRef){
      var tagOid = Rally.util.Ref.getOidFromRef(tagRef);
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
                            Rally.ui.notify.Notifier.showError({message: "Error Archiving Tag '" + replaceTagName + "':  " + operation.error.errors.join(",")});
                          } else {
                            this.publish('tagArchived', tagOid);
                          }
                       },
                       scope: this
                     });
                   }
                 },
                 scope: this
               });
           },
           scope: this
       });
    },
    constructor:function (config) {
        this.initConfig(config);
        this.callParent(arguments);
         this.mixins.messageable.constructor.call(this, config);
    }
});
