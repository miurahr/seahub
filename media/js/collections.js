(function(app, Backbone){
    "use strict";

    app.collections = {};

    app.collections.LibDirents = Backbone.Collection.extend({
        model: app.models.LibDirent,
        url: function () {
            var default_url = app.urls.get_lib_dirents;
            var url_ele = default_url.split('/');
            url_ele[3] = this.repo_id; // replace the repo id
            return url_ele.join('/');
        },
        parse: function (data) {
            this.repo_name = data.repo_name;
            this.user_perm = data.user_perm;
            this.no_quota = data.no_quota;
            this.encrypted = data.encrypted;

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
