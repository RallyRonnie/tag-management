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
          tagOid = Rally.util.Ref.getOidFromRef(ref),
          me = this;


          //https://rally1.rallydev.com/slm/sbt/tag.sp?oid=130972737712
          Ext.Ajax.request({
            url: '/slm/sbt/tag.sp?oid=' + tagOid,
            method: 'DELETE',
            success: function(response){
                var text = response.responseText;
                me.publish('tagDeleted', tagOid);
            }
        });
    }
});
