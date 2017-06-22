Ext.define('CATS.tag-management.utils.TagMetrics',{
    logger: new Rally.technicalservices.Logger(),
    tagHash: {},
    mixins: {
           observable: 'Ext.util.Observable'
       },

    constructor: function(config){
       this.getExtendedTagModel();
       this._initializeTagData(config.tags);
       this.mixins.observable.constructor.call(this, config);
    },

    _initializeTagData: function(tagRecords){
      this.logger.log('_initializeTagData');
      tagHash = this.tagHash;

      for (var i=0; i<tagRecords.length; i++){
        var tagData = tagRecords[i].getData();
        tagData.count = 0;
        tagHash[tagData.ObjectID] = tagData;
      }
      this.tagHash = tagHash;
    },

    addCurrentSnapshots: function(snapshots){
      var tagHash = this.tagHash;
      this.reset();

      for (var i=0; i<snapshots.length; i++){
        var tags = snapshots[i].raw.Tags || [];
           for (var j=0; j<tags.length; j++){
             if (!tagHash[tags[j]]){
               tagHash[tags[j]] = { count: 0 };
             }
             tagHash[tags[j]].count++;
           }
      }
      this.fireEvent('update', this);
      this.tagHash = tagHash;
    },

    addCurrentWsapiRecords: function(wsapiRecords){
      this.logger.log('addWsapiRecords', wsapiRecords.length);
      this.reset();
      tagHash = this.tagHash;

      for (var i=0; i<wsapiRecords.length; i++){

        var tags = wsapiRecords[i].get('Tags') && wsapiRecords[i].get('Tags')._tagsNameArray;

        if (tags.length > 0){
          _.each(tags, function(t){
            var oid = Rally.util.Ref.getOidFromRef(t._ref);
            tagHash[oid].count++;
          });
        }
      }
      this.fireEvent('update', this);
      this.tagHash = tagHash;
    },

    addHistoricalSnapshots: function(snapshots){
      var tagHash = this.tagHash;

      for (var i=0; i<snapshots.length; i++){
        var tags = snapshots[i].raw.Tags || [],
            tagDate = Rally.util.DateTime.fromIsoString(snapshots[i].raw._ValidFrom);
           for (var j=0; j<tags.length; j++){
             if (!tagHash[tags[j]]){
               tagHash[tags[j]] = {
                 Name: 'DELETED [' + tags[j] + ']',
                 count: 1
               };
             }

             if (!tagHash[tags[j]].lastUsed || tagHash[tags[j]].lastUsed < tagDate){
               tagHash[tags[j]].lastUsed = tagDate;
             }
           }
      }
      this.fireEvent('update', this);
      this.tagHash = tagHash;
    },

    reset: function(){
      Ext.Object.each(this.tagHash, function(key,obj){
        obj.count = 0;
        obj.lastUsed = null;
      });
    },

    getData: function(showDups, usageLessThan, monthsSinceUsed, showArchived, showUnused){
      this.logger.log('getData', showDups, usageLessThan, monthsSinceUsed, showArchived, showUnused);


      var data = Ext.Object.getValues(this.tagHash);

      var beforeDate = null;
      if (monthsSinceUsed){
        beforeDate = Rally.util.DateTime.add(new Date(), "month", -monthsSinceUsed);
      }

      if (usageLessThan || monthsSinceUsed || !showArchived || !showUnused){
        data = Ext.Array.filter(data, function(d){
          var show = true;

          if (usageLessThan && (d.count >= usageLessThan)){
            return false;
          }

          if (beforeDate && beforeDate < d.lastUsed){
             return false;
          }

          if (!showArchived && d.Archived){
            return false;
          }
          if (!showUnused && d.count === 0){
            return false;
          }

          return true;
        });
      }

      if (showDups){
        data = this._findDups(data);
      }

      return {
         data: data,
         model: this.tagModel,
         pageSize: data.length
      };

    },
    _findDups: function(tags){
      var dups = [];

          for (var i = 0; i < tags.length; i++) {
            for (var j = i + 1 ; j < tags.length; j++) {
              if (tags[i].Name.toLowerCase().trim() == tags[j].Name.toLowerCase().trim()) {
                 dups.push(tags[i].ObjectID);
                 dups.push(tags[j].ObjectID);
              }
            }
          }
          dups = _.uniq(dups);

          return _.map(dups, function(d){ return this.tagHash[d]; }, this);

    },
      getExtendedTagModel: function(){
        return Rally.data.ModelFactory.getModel({
              type: 'tag'
          }).then({
              success: function(model) {
                  var fields = [{
                    name: 'count'
                  },{
                    name: 'lastUsed'
                  }];
                  this.tagModel = Ext.define('TagMetricsModel', {
                      extend: model,
                      fields: fields
                  });
                  this.fireEvent('ready', this);
              },
              scope: this
          });
      }

});
