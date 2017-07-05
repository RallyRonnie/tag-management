Ext.define("tag-management", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "tag-management"
    },

    config: {
      defaultSettings: {
        useLookback: false
      }
    },

    launch: function() {

      this.tagMetrics = Ext.create('CATS.tag-management.utils.TagMetrics',{});
      //this.tagMetrics.on('refreshcount', this._updateTagData, this);
      this.subscribe('tagDataUpdated', this._updateTagData, this);
      this.subscribe('tagArchived', this._updateArchivedTagData, this);
      this.subscribe('tagDeleted', this._updateDeletedTagData, this);
      this.subscribe('tagsDeleted', this._updateDeletedTagData, this);

      this._fetchPortfolioItemTypes().then({
        success: this._initializeApp,
        failure: this._showErrorNotification,
        scope: this
      });
      this._fetchTags();
      this._fetchCurrentTagUsageData();

      // this._fetchTags().then({
      //   success: this._buildTagMetrics,
      //   failure: this._showErrorNotification,
      //   scope: this
      // }).always(function(){
      //   this.setLoading(false);
      // },this);

    },
    _showErrorNotification: function(msg){
      Rally.ui.notify.Notifier.showError({message: msg});
    },

    _updateArchivedTagData: function(tags){
      this.logger.log('updateArchivedTagData');
        this.tagMetrics.archiveTags(tags);
        this._updateView();
    },
    _updateDeletedTagData: function(tags){
       this.tagMetrics.deleteTags(tags);
       var msg = "1 Tag Deleted.";
       if (Ext.isArray(tags)){
          msg = tags.length + ' Tags Deleted.';
       }
       Rally.ui.notify.Notifier.show({message: msg});
       this._updateView();
    },
    _updateTagData: function(tags){
       this.logger.log('_updateTagData', tags);
       this.setLoading('Updating Tag Usage...');
       this._fetchSpecificTagArtifacts(tags).then({
          success: this._updateView,
          failure: this._showErrorNotification,
          scope: this
       }).always(function(){
         this.setLoading(false);
       },this);
    },
    _updateView: function(bt){
      this.logger.log('_updateView', bt);
      this.setLoading(false);
      this.tagMetrics.un('update');
    //  this.unsubscribe('tagDataLoaded');

      this.down('#gridBox').removeAll();

      var data = this.tagMetrics.getData(this.getShowDups(), this.getUsageLessThan(), this.getMonthsSinceUsed(), this.getShowArchived(), this.getShowUnused(), this.getNameContains()),
          msg = "No Tags found that meet the selected filters.";

      if (this.getShowDups()){
        msg = "No duplicate Tags found."
      }

      this.store = Ext.create('Rally.data.custom.Store', data);

      var grid = this.down('#gridBox').add({
        xtype: 'rallygrid',
        store: this.store,
        columnCfgs: this._getColumnCfgs(),
        showPagingToolbar: false,
        enableBulkEdit: true,
        enableEditing: false,
        scroll: 'vertical',
        viewConfig: {
           emptyText: '<div class="grid-view-empty">' + msg +'</div>'
        },
        bulkEditConfig: {
          items: [{
              xtype: 'tagmanagementbulkarchive'
          },{
              xtype: 'tagmanagementbulkdelete'
          }]
        },
        showRowActionsColumn: false,
        showPagingToolbar: false
       });
       var height = Math.max(this.getHeight() - this.down('#selectorBox').getHeight() - this.down('#toggleBox').getHeight(), 100);
       grid.setHeight(height);

    },

    _getColumnCfgs: function(){
      var portfolioItemTypes = this.portfolioItemTypes,
        cols = [{
        xtype: 'rallyrowactioncolumn',
        rowActionsFn: function (record) {
            return [
                {
                    xtype: 'tagreplacemenuitem',
                    record: record,
                    portfolioItemTypes: portfolioItemTypes
                },{
                    xtype: 'tagarchivemenuitem',
                    record: record
                },{
                    xtype: 'tagdeletemenuitem',
                    record: record
                }
            ];
        }
      },{
        dataIndex: 'Name',
        text: 'Name'
      }];

      if (this.getShowArchived()){
        cols.push({
          dataIndex: 'Archived',
          text: 'Archived'
        });
      }

      if (this.getShowHistory()){
        cols.push({
          dataIndex: 'lastUsed',
          text: 'Last Used'
        });
      }

      cols.push({
        dataIndex: 'count',
        text: 'Uses',
        renderer: function(v){
          return v || "--";
        }
      });

      cols.push({
        dataIndex: 'CreationDate',
        text: 'Date Created'
      });
      return cols;
    },
    _initializeApp: function(portfolioItemTypes){
       this.portfolioItemTypes = _.map(portfolioItemTypes, function(p){ return p.get('TypePath'); });
       this.logger.log('_initializeApp', this.portfolioItemTypes);
       this.removeAll();
       var toggleBox = this.add({
         xtype: 'container',
         itemId: 'toggleBox',
         layout: 'hbox'
       });
       var selectorBox = this.add({
         xtype: 'container',
         itemId: 'selectorBox',
         layout: 'hbox'
       });

       var gridBox = this.add({
         xtype: 'container',
         itemId: 'gridBox'
       });

       this._addToggleButton('btDuplicates', 'icon-copy','Show Duplicate Tags', this._toggleButton);
       this._addToggleButton('btHistory', 'icon-history','Show Last Used Date', this._fetchHistory);
       this._addToggleButton('btArchived', 'icon-archive','Show Archived Tags', this._toggleButton);
       this._addToggleButton('btUnused', 'icon-none','Show Unused Tags', this._toggleButton);

       var name = selectorBox.add({
         xtype: 'rallytextfield',
         fieldLabel: 'Name contains',
         labelAlign: 'right',
         itemId: 'nameContains',
         margin: 5,
         labelWidth: 100,
         height: 22,
         width: 200
       });


       var usage = selectorBox.add({
         xtype: 'rallynumberfield',
         fieldLabel: 'Usage Less Than',
         labelAlign: 'right',
         itemId: 'usedFewerThan',
         margin: 5,
         labelWidth: 100,
         width: 150,
         minValue: 1,
         maxValue: 1000
       });
      // usage.on('change', this._updateView, this);

       var usedSince = selectorBox.add({
         xtype: 'rallynumberfield',
         fieldLabel: 'Months Since Last Usage',
         labelAlign: 'right',
         itemId: 'monthsSinceUsed',
         margin: 5,
         labelWidth: 150,
         width: 200,
         minValue: 0,
         maxValue: 120
       });
    //   usedSince.on('change', this._updateView, this);


      this._toggleButton();

       var bt = toggleBox.add({
         xtype: 'rallybutton',
         text: 'Update',
         margin: 5
       });
       bt.on('click',this._updateRequested, this);


      //  if (this.getUseLookback()){
      //    this.setLoading('Loading Tag Usage Data from the Lookback API');
      //    this.logger.log('back BEGIN');
      //    this.back().then({
      //      success: function(snapshots){
      //        this.logger.log('snapshot count', snapshots.length);
       //
      //        this.tagMetrics.addCurrentSnapshots(snapshots)
      //      },
      //      failure: this._showErrorNotification,
      //      scope: this
      //    }).always(function(){
      //      this.logger.log('back END');
      //      this.setLoading(false);
      //    },this );
       //
      //  } else {
      //    this.setLoading('Loading Tag Usage Data from WSAPI');
      //    this.logger.log('_fetchCurrentTagDataFromWsapi BEGIN');
      //    this._fetchCurrentTagDataFromWsapi().then({
      //      success: function(results){
      //        var records = _.flatten(results);
      //        this.logger.log('record count', records.length);
      //        this.tagMetrics.addCurrentWsapiRecords(records);
      //      },
      //      failure: this._showErrorNotification,
      //      scope: this
      //    }).always(function(){
      //      this.logger.log('_fetchCurrentTagDataFromWsapi END');
      //      this.setLoading(false);
      //    },this );
      //  }


    },
    _addToggleButton: function(itemId, iconCls, toolTip, fn){
      var bt = this.down('#toggleBox').add({
        xtype: 'rallybutton',
        iconCls: iconCls,
        cls: 'secondary rly-small',
        enableToggle: true,
        itemId: itemId,
        toolTipText: toolTip,
        margin: 5
      });
      bt.on('toggle', fn, this);
    },
    _updateRequested: function(){
       this.logger.log('_updateRequested');
      // this.subscribe('tagDataLoaded', this._updateView, this);
       if (this.tagMetrics._isLoaded(this.getShowHistory())){
         this._updateView();
       } else {
         this.tagMetrics.on('update', this._updateView, this);
         this.setLoading(true);
       }

      //  var me = this;
      //  Ext.defer(function(){
      //    me.publish('requestDataStatus', me.getShowHistory());
      //  },1000, this);

    },
    // _buildTagMetrics: function(tagRecords){
    //   this.tagMetrics = Ext.create('CATS.tag-management.utils.TagMetrics',{
    //     tags: tagRecords,
    //     listeners: {
    //       ready: this._initializeApp,
    //       update: this._updateView,
    //       scope: this
    //     }
    //   });
    // },
    getShowHistory: function(){
      return this.down('#btHistory').pressed;
    },
    getShowDups: function(){
      return this.down('#btDuplicates').pressed;
    },
    getMonthsSinceUsed: function(){
      return this.down('#monthsSinceUsed').getValue() || 0;
    },
    getNameContains: function(){
      return this.down('#nameContains').getValue() || null;
    },
    getUsageLessThan: function(){
      return this.down('#usedFewerThan').getValue() || 0;
    },
    getShowArchived: function(){
      return this.down('#btArchived').pressed;
    },
    getShowUnused: function(){
      return this.down('#btUnused').pressed;
    },
    getUseLookback: function(){
      if ((this.getSetting('useLookback') === "true") || (this.getSetting('useLookback') === true)){
        return true;
      };
      return false;
    },
    _getModels: function(){
      return ['Defect', 'DefectSuite', 'UserStory','TestSet','Task'].concat(this.portfolioItemTypes);

    },
    _fetchSpecificTagArtifacts: function(tags){
        var deferred = Ext.create('Deft.Deferred');

        var filters = _.map(tags, function(t){
          return {
            property: 'Tags',
            operator: 'contains',
            value: t._ref
          };
        });

        if (filters.length > 1){
          filters = Rally.data.wsapi.Filter.or(filters);
        }
        var tagMetrics = this.tagMetrics;
        Ext.create('Rally.data.wsapi.artifact.Store',{
          models: this._getModels(),
          fetch: ['Tags','Name'],
          filters: filters,
          context: {project: null}
        }).load({
          callback: function(records, operation){
             if (operation.wasSuccessful()){
               Ext.Array.each(tags, function(t){
                 tagMetrics.updateTagUsage(t, records);
               });
               deferred.resolve();
             } else {
                deferred.reject("Error updating Tag counts:  " + operation.error.errors.join(','));
             }
          }
        });

        return deferred.promise;
    },
    _fetchHistory: function(bt, pressed){
      this.logger.log('_fetchHistory', pressed);
      if (pressed) {

        this._toggleButton(bt, pressed, true)
        this._fetchHistoricalTagData().then({
          success: function(snapshots){
            this.tagMetrics.addHistoricalSnapshots(snapshots);
          },
          failure: this._showErrorNotification,
          scope: this
        });

      } else {
        this._toggleButton(bt, pressed);
      }

    },
    _toggleButton: function(bt, pressed, noAction){
      if (bt){
        if (pressed){
            bt.removeCls('secondary');
            bt.addCls('primary');
        } else {
          bt.removeCls('primary');
          bt.addCls('secondary');
        }
      }

      if (this.getShowDups()){
        this.down('#monthsSinceUsed').hide();
        this.down('#usedFewerThan').hide();
      } else {
        this.down('#usedFewerThan').show();
        if (this.getShowHistory()){
          this.down('#monthsSinceUsed').show();
        } else {
          this.down('#monthsSinceUsed').hide();
        }
      }

      // if (noAction) { return; }
      // this._updateView();

    },

    _fetchCurrentTagDataFromWsapi: function(){
        this.logger.log('_fetchCurrentTagDataFromWsapi');
        return Deft.Promise.all([
            // this._fetchCurrentTagDataForModelFromWsapi("PortfolioItem/Feature"),
            // this._fetchCurrentTagDataForModelFromWsapi("PortfolioItem/Initiative"),
            this._fetchCurrentTagDataForModelFromWsapi("PortfolioItem"),
//            this._fetchCurrentTagDataForModelFromWsapi("SchedulableArtifact"),
            this._fetchCurrentTagDataForModelFromWsapi("HierarchicalRequirement"),
            this._fetchCurrentTagDataForModelFromWsapi("Defect"),
            this._fetchCurrentTagDataForModelFromWsapi("TestSet"),
            this._fetchCurrentTagDataForModelFromWsapi("DefectSuite"),
            this._fetchCurrentTagDataForModelFromWsapi("TestCase")
        ]).then({
          success: function(results){
            this.logger.log('_fetchCurrentTagDataFromWsapi Success');
            var records = _.flatten(results);
            this.tagMetrics.addCurrentWsapiRecords(records);
          },
          failure: this._showErrorNotification,
          scope: this
        });
    },

    _fetchCurrentTagDataForModelFromWsapi: function(modelName){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
           model: modelName,
           fetch: ['Tags','ObjectID','Name','LastUpdateDate'],
           filters: this.getArtifactFilters(),
           pageSize: 2000,
           context: { project: null },
           limit: "Infinity"
        }).load({
          callback: function(records,operation,success){
            if (operation.wasSuccessful()){
                deferred.resolve(records);
            } else {
                deferred.reject(operation.error.errors.join(","));
            }
          }
        });
        return deferred.promise;
    },
    _fetchPortfolioItemTypes: function(){
      return this._fetchWsapiRecords({
        model: 'TypeDefinition',
        fetch: ['Name','TypePath','Ordinal'],
        filters: [{
          property: 'TypePath',
          operator: 'contains',
          value: 'PortfolioItem/'
        }],
        sorters: [{
          property: 'Ordinal',
          direction: 'ASC'
        }]
      });
    },
    _fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;

        if (!config.limit){ config.limit = "Infinity"; }
        if (!config.pageSize){ config.pageSize = 2000; }

        this.logger.log("Starting load:",config);

        Ext.create('Rally.data.wsapi.Store', config).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem fetching: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    getTagFilters: function(){
      var nameValue = this.down('#txtName') && this.down('#txtName').getValue();
        if (nameValue){
          return [{
            property: 'Name',
            operator: 'contains',
            value: nameValue
          }];
        }
        return [];
    },
    getArtifactFilters: function(){
        var nameValue = this.down('#txtName') && this.down('#txtName').getValue();
        if (nameValue){
          return [{
            property: 'Tags.Name',
            operator: 'contains',
            value: nameValue
          }];
        }

        return [{
          property: 'Tags.ObjectID',
          operator: '>',
          value: 0
        }];
    },
    _fetchTags: function(){
      var deferred = Ext.create('Deft.Deferred');

      Ext.create('Rally.data.wsapi.Store',{
         model: 'Tag',
         fetch: ['ObjectID','Name','Archived','CreationDate'],
         pageSize: 2000,
         //filters: this.getTagFilters(),
         limit: "Infinity"
      }).load({
        callback: function(records,operation,success){
          if (operation.wasSuccessful()){
            this.logger.log('_fetchTags success', records.length);
              this.tagMetrics.addTagRecords(records);
              deferred.resolve(records);
          } else {
             var msg = operation && operation.error && operation.error.errors && operation.error.errors.join(',');
             this._showErrorNotification(msg);
             deferred.reject(msg);
          }
        },
        scope: this
      });
      return deferred.promise;
    },
    _fetchHistoricalTagData: function(){
      var deferred = Ext.create('Deft.Deferred');

      Ext.create('Rally.data.lookback.SnapshotStore',{
         fetch: ['Tags','_ValidFrom','_ValidTo',"_PreviousValues.Tags"],
         find: {
            "Tags": this.getLookbackTagFilterValue(),
            "_PreviousValues.Tags": {$exists: true}
         },
         removeUnauthorizedSnapshots: true,
         limit: "Infinity",
         useHttpPost: true
      }).load({
        callback: function(records,operation,success){
          if (operation.wasSuccessful()){
              this.logger.log('_fetchHistoricalTagData success', records.length);
              this.tagMetrics.addHistoricalSnapshots(records);
              deferred.resolve(records);
          } else {
            var msg = operation && operation.error && operation.error.errors && operation.error.errors.join(',');
            this._showErrorNotification(msg);
            deferred.reject(msg);
          }
        },
        scope: this
      });
      return deferred.promise;
    },
    getLookbackTagFilterValue: function(){
        var nameValue = this.down('#txtName') && this.down('#txtName').getValue();
        if (nameValue){
           //todo return array of tag oids that match.
        }

        return {$exists: true};
    },
    _fetchCurrentTagUsageData: function(){
        if (this.getUseLookback()){
            this._fetchCurrentTagDataFromLookback();
        } else {
            this._fetchCurrentTagDataFromWsapi();
        }
    },
    _fetchCurrentTagDataFromLookback: function(){
      var deferred = Ext.create('Deft.Deferred');
      this.logger.log('_fetchCurrentTagDataFromLookback');
      Ext.create('Rally.data.lookback.SnapshotStore',{

         fetch: ['Tags','_ValidFrom','_ValidTo','_TypeHierarchy'],
         find: {
            "Tags": this.getLookbackTagFilterValue(),
            "__At": "current"
          },
          removeUnauthorizedSnapshots: true,
         limit: Infinity,
         useHttpPost: true
      }).load({
        callback: function(records,operation,success){
          if (operation.wasSuccessful()){
            this.logger.log('_fetchCurrentTagDataFromLookback', records.length, operation);
              this.tagMetrics.addCurrentSnapshots(records);
              deferred.resolve(records);
          } else {
            var msg = operation && operation.error && operation.error.errors && operation.error.errors.join(',') || "Error loading current tag data from Lookback.";
            this._showErrorNotification(msg);
            deferred.reject(msg);
          }
        },
        scope: this
      });
      return deferred.promise;
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    getSettingsFields: function(){
      return [{
        name: 'useLookback',
        xtype: 'rallycheckboxfield',
        fieldLabel: 'Enable Lookback Usage',
        labelAlign: 'right'
      }];
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
