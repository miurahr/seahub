(function(app, Backbone){
    "use strict";

    app.collections = {};

    app.collections.LibDirents = Backbone.Collection.extend({
        model: app.models.LibDirent,
        url: function () {
            return app.utils.getUrl({name:'get_lib_dirents', repo_id: this.repo_id});
        },
        parse: function (data) {
            this.repo_name = data.repo_name;
            this.user_perm = data.user_perm;
            this.encrypted = data.encrypted;
            this.is_repo_owner = data.is_repo_owner;
            this.is_virtual = data.is_virtual;

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
