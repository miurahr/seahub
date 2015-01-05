(function(app, Backbone){
    "use strict";

    app.collections = {};

    app.collections.LibDirents = Backbone.Collection.extend({
        model: app.models.LibDirent,
        url: app.pages.lib.config.urls.get_lib_dirents, 
        parse: function (data) {
            this.dirent_more = data.dirent_more;
            this.more_start = data.more_start;
            this.share = data.share;
            return data.dirent_list; // return the array
        },
        more: function () {
            this.fetch({
                remove: false,
                data: {
                    'p': this.path,
                    'start': this.more_start
                },
                error: function(xhr, textStatus, errorThrown) {
                    $('.loading-tip').hide(); // todo
                    ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            });
        }
    });

}(app, Backbone));
