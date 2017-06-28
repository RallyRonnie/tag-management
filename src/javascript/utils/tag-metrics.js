Ext.define('CATS.tag-management.utils.TagMetrics',{
    logger: new Rally.technicalservices.Logger(),
    tagHash: {},
    mixins: {
           observable: 'Ext.util.Observable',
           messageable: 'Rally.Messageable'

      //  },{
      //    messageable: 'Rally.Messageable'
       },

    tagsLoaded: false,
    tagUsageLoaded: false,
    tagHistoryLoaded: false,

    constructor: function(config){
       this.getExtendedTagModel();
       this.mixins.observable.constructor.call(this, config);
       this.mixins.messageable.constructor.call(this, config);

       this.subscribe(this, 'requestDataStatus', this._onStatusRequested, this);
    },

    addTagRecords: function(tagRecords){
       this._initializeTagData(tagRecords);
       this.tagsLoaded = true;
    },
    updateTagUsage: function(tag, records){

       var tagOid = Rally.util.Ref.getOidFromRef(tag._ref);
       this.tagHash[tagOid].count = 0;
       //this.tagHash[tagOid].lastUsed = null;
       for (var i=0; i< records.length; i++){
         var tags = records[i].get('Tags') && records[i].get('Tags')._tagsNameArray;
         for (var j=0; j<tags.length; j++){
           var oid = Rally.util.Ref.getOidFromRef(tags[j]._ref);
           if (oid === tagOid){
             this.tagHash[tagOid].count++;
           }
         }
       }
    },
    _initializeTagData: function(tagRecords){
      this.logger.log('_initializeTagData');
      this.tagHash = {};

      for (var i=0; i<tagRecords.length; i++){
        var tagData = tagRecords[i].getData();
        tagData.count = 0;
        this.tagHash[tagData.ObjectID] = tagData;
      }
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
      this.tagUsageLoaded = true;
      this.publish('tagDataLoaded', this);
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
      this.tagUsageLoaded = true;
      this.tagHash = tagHash;
      this.publish('tagDataLoaded', this);

    },
    _onStatusRequested: function(showHistory){
      if (this._isLoaded(showHistory)){
        this.publish('tagDataLoaded', this);
      }
    },
    _isLoaded: function(showHistory){
        return this.tagUsageLoaded && this.tagsLoaded && ((showHistory && this.tagHistoryLoaded) || !showHistory);
    },
    addHistoricalSnapshots: function(snapshots){
      var tagHash = this.tagHash;

      for (var i=0; i<snapshots.length; i++){
        var tags = snapshots[i].raw.Tags || [],
            previousTags = snapshots[i].raw._PreviousValues && snapshots[i].raw._PreviousValues.Tags || [];
            tagDate = Rally.util.DateTime.fromIsoString(snapshots[i].raw._ValidFrom);

           var changedTags = _.difference(tags, previousTags);
           for (var j=0; j<changedTags.length; j++){

             if (tagHash[tags[j]] && (!tagHash[tags[j]].lastUsed || tagHash[tags[j]].lastUsed < tagDate)){
               tagHash[tags[j]].lastUsed = tagDate;
             }
           }
      }
      this.fireEvent('update', this);
      this.tagHistoryLoaded = true;
      this.tagHash = tagHash;

      this.publish('tagDataLoaded', this);

    },

    reset: function(){
      Ext.Object.each(this.tagHash, function(key,obj){
        obj.count = 0;
        obj.lastUsed = null;
      });
      this.tagUsageLoaded = false;
      this.tagHistoryLoaded = false;
    },

    getData: function(showDups, usageLessThan, monthsSinceUsed, showArchived, showUnused, nameContains){
      this.logger.log('getData', showDups, usageLessThan, monthsSinceUsed, showArchived, showUnused, nameContains);


      var data = Ext.Object.getValues(this.tagHash);

      var beforeDate = null;
      if (monthsSinceUsed){
        beforeDate = Rally.util.DateTime.add(new Date(), "month", -monthsSinceUsed);
      }
      var nameRegexp = null;
      if (nameContains){
         nameRegexp = new RegExp(nameContains, "gi");
      }

      if (usageLessThan || monthsSinceUsed || !showArchived || !showUnused || nameRegexp){
        data = Ext.Array.filter(data, function(d){
          var show = true;

          if (!nameRegexp.test(d.Name)){
              return false;
          }

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
