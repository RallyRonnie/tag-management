Ext.define('CATS.tag-management.utils.menu.TagReplace', {
    extend: 'Rally.ui.menu.item.RecordMenuItem',
    alias: 'widget.tagreplacemenuitem',

    clickHideDelay: 1,
    mixins: {
      messageable: 'Rally.Messageable'
    },
    config: {

        /**
         * @cfg {Rally.data.wsapi.Model}
         * The record of the menu
         */
        record: undefined,

        /**
         * @cfg {Function}
         * This is called when a menu item is clicked
         */
        handler: function () {

          Ext.create('CATS.tag-management.utils.TagDialog', {
           autoShow: true,
           draggable: true,
           width: 300,
           title: 'Choose a Tag to Replace With',
           listeners: {
              confirm: this._replaceTags,
              cancel: function(){},
              scope: this
           }
       });


        },

        /**
         * @cfg {Function}
         *
         * A function that should return true if this menu item should show.
         * @param record {Rally.data.wsapi.Model}
         * @return {Boolean}
         */
        predicate: function (record) {
            return true;
        },

        /**
         * @cfg {String}
         * The display string
         */
        text: 'Replace With...'

    },
    _getModels: function(){
        return ['Defect', 'DefectSuite', 'UserStory','TestSet','Task'].concat(this.portfolioItemTypes);
    },
    _replaceTags: function(tag){

      var newTagRefs = [],
          newTagNames = [];

      if (Ext.isArray(tag)){
        newTagRefs = _.map(tag, function(t){ return  {'_ref': t.get('_ref')}; });
        newTagNames = _.map(tag, function(t){ return t.get('Name'); });
      } else {
        newTagRefs =  [{'_ref': t.get('_ref')}];
        newTagNames = [t.get('Name')];
      }
      var replaceTagRef = this.record.get('_ref'),
          replaceTagName = this.record.get('Name');

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

            var bulkStore = Ext.create('Rally.data.wsapi.batch.Store', {
                data: records
            });

            Ext.Array.each(records, function(r){
              var tags = _.filter(r.get('Tags') && r.get('Tags')._tagsNameArray || [], function(t){
                 return t._ref !== replaceTagRef;
              });
              tags = tags.concat(newTagRefs);

              r.set('Tags', tags);
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
    },
    constructor:function (config) {
        this.initConfig(config);
        this.callParent(arguments);
         this.mixins.messageable.constructor.call(this, config);
    }
});
