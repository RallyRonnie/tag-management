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

      this.setLoading("Loading Tag Data...");

      this._fetchTags().then({
        success: this._buildTagMetrics,
        failure: this._showErrorNotification,
        scope: this
      }).always(function(){
        this.setLoading(false);
      },this);

    },
    _showErrorNotification: function(msg){
      Rally.ui.notify.Notifier.showError({message: msg});
    },
    _updateView: function(bt){
      this.logger.log('_updateView', bt);

      if (!this.tagMetrics){ return; }

      this.down('#gridBox').removeAll();

      var data = this.tagMetrics.getData(this.getShowDups(), this.getUsageLessThan(), this.getMonthsSinceUsed(), this.getShowArchived(), this.getShowUnused()),
          msg = "No Tags found that meet the selected filters.";

      if (this.getShowDups()){
        msg = "No duplicate Tags found."
      }

      var store = Ext.create('Rally.data.custom.Store', data);

      this.down('#gridBox').add({
        xtype: 'rallygrid',
        store: store,
        columnCfgs: this._getColumnCfgs(),
        showPagingToolbar: false,
        enableBulkEdit: true,
        enableEditing: false,
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

    },

    _getColumnCfgs: function(){
      var cols = [{
        xtype: 'rallyrowactioncolumn',
        rowActionsFn: function (record) {
            return [
                {
                    xtype: 'tagreplacemenuitem',
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
    _initializeApp: function(results){

      this.logger.log('_updateView', results);

       this.removeAll();
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

       var usage = selectorBox.add({
         xtype: 'rallynumberfield',
         fieldLabel: 'Usage Less Than',
         labelAlign: 'right',
         itemId: 'usedFewerThan',
         margin: 5,
         labelWidth: 150,
         width: 200,
         minValue: 1,
         maxValue: 1000
       });
       usage.on('change', this._updateView, this);

       selectorBox.add({
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
       usage.on('change', this._updateView, this);

       this._toggleButton(null,null,true);

       if (this.getUseLookback()){
         this.setLoading('Loading Tag Usage Data from the Lookback API');
         this.logger.log('_fetchCurrentTagDataFromLookback BEGIN');
         this._fetchCurrentTagDataFromLookback().then({
           success: function(snapshots){
             this.logger.log('snapshot count', snapshots.length);

             this.tagMetrics.addCurrentSnapshots(snapshots)
           },
           failure: this._showErrorNotification,
           scope: this
         }).always(function(){
           this.logger.log('_fetchCurrentTagDataFromLookback END');
           this.setLoading(false);
         },this );

       } else {
         this.setLoading('Loading Tag Usage Data from WSAPI');
         this.logger.log('_fetchCurrentTagDataFromWsapi BEGIN');
         this._fetchCurrentTagDataFromWsapi().then({
           success: function(results){
             var records = _.flatten(results);
             this.logger.log('record count', records.length);
             this.tagMetrics.addCurrentWsapiRecords(records);
           },
           failure: this._showErrorNotification,
           scope: this
         }).always(function(){
           this.logger.log('_fetchCurrentTagDataFromWsapi END');
           this.setLoading(false);
         },this );
       }


    },
    _addToggleButton: function(itemId, iconCls, toolTip, fn){
      var bt = this.down('#selectorBox').add({
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
    _buildTagMetrics: function(tagRecords){
      this.tagMetrics = Ext.create('CATS.tag-management.utils.TagMetrics',{
        tags: tagRecords,
        listeners: {
          ready: this._initializeApp,
          update: this._updateView,
          scope: this
        }
      });
    },
    getShowHistory: function(){
      return this.down('#btHistory').pressed;
    },
    getShowDups: function(){
      return this.down('#btDuplicates').pressed;
    },
    getMonthsSinceUsed: function(){
      return this.down('#monthsSinceUsed').getValue() || 0;
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
    _fetchHistory: function(bt, pressed){
      this.logger.log('_fetchHistory', pressed);
      if (pressed) {
        this.setLoading('Loading Historical Tag Data...')
        this._toggleButton(bt, pressed, true)
        this._fetchHistoricalTagData().then({
          success: function(snapshots){
            this.tagMetrics.addHistoricalSnapshots(snapshots);
          },
          failure: this._showErrorNotification,
          scope: this
        }).always(function(){

          this.setLoading(false);

        },this);

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

      if (noAction) { return; }
      this._updateView();

    },

    _fetchCurrentTagDataFromWsapi: function(){
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
        ]);
    },

    _fetchCurrentTagDataForModelFromWsapi: function(modelName){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
           model: modelName,
           fetch: ['Tags','ObjectID','Name','LastUpdateDate'],
           filters: [{
             property: 'Tags.ObjectID',
             operator: '>',
             value: 0
           }],
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
    _fetchTags: function(){
      var deferred = Ext.create('Deft.Deferred');

      Ext.create('Rally.data.wsapi.Store',{
         model: 'Tag',
         fetch: ['ObjectID','Name','Archived','CreationDate'],
          pageSize: 2000,
         limit: "Infinity"
      }).load({
        callback: function(records,operation,success){
          if (operation.wasSuccessful()){
              deferred.resolve(records);
          } else {
             console.log('operation', operation.error);
              deferred.reject(operation.error.errors.join(","));
          }
        }
      });
      return deferred.promise;
    },
    _fetchHistoricalTagData: function(){
      var deferred = Ext.create('Deft.Deferred');

      Ext.create('Rally.data.lookback.SnapshotStore',{

         fetch: ['Tags','_ValidFrom','_ValidTo',"_PreviousValues.Tags"],
         find: {
            "Tags": {$exists: true},
            "_PreviousValues.Tags": {$exists: true}
          },
          removeUnauthorizedSnapshots: true,
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
    _fetchCurrentTagDataFromLookback: function(){
      var deferred = Ext.create('Deft.Deferred');

      Ext.create('Rally.data.lookback.SnapshotStore',{

         fetch: ['Tags','_ValidFrom','_ValidTo','_TypeHierarchy'],
         find: {
            "Tags": {$exists: true},
            "__At": "current"
          },
          removeUnauthorizedSnapshots: true,
         limit: "Infinity"
      }).load({
        callback: function(records,operation,success){
          if (operation.wasSuccessful()){
              deferred.resolve(records);
          } else {
             console.log('operation', operation.error);
              deferred.reject(operation.error.errors.join(","));
          }
        }
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
