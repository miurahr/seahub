(function(window, app, Backbone, jQuery, _){ 
    "use strict";

    app.Router = Backbone.Router.extend({
        initialize: function () {
            this.libdirents = new app.collections.LibDirents(); 
            this.libview = new app.views.LibView({collection: this.libdirents});

            app.libdirents = this.libdirents;
            app.libview = this.libview;
        },
        routes: {
            'lib/:repo_id/dir/(*path)': 'get_dirents',
            'home/my/lib/:repo_id/dir/(*path)': 'myhome_lib',
            'home/my/': 'back_home'
        },
        get_dirents: function(repo_id, path) {
            if (!path) {
                path = '/';
            } else {
                path = '/' + path.substr(0, path.length - 1);
            }
            var libdirents = this.libdirents; 
            var libview = this.libview; 
            libdirents.path = path;

            var loading_tip = $('#repo-file-list .loading-tip');
            loading_tip.show();

            libdirents.repo_id = repo_id;
            libdirents.fetch({
                data: {'p': path},
                success: function (collection, response, opts) {
                    libview.renderPath();
                    libview.renderLibop();
                    libdirents.last_start = 0; // for 'more'
                    if (response.dirent_list.length == 0) { // the dir is empty
                        loading_tip.hide();
                    }
                }
            });
        },
        myhome_lib: function (repo_id, path) {
            $('#tabs').hide();
            $('#repo-file-list').show();
            this.get_dirents(repo_id, path);
        },
        back_home: function () {
            $('#tabs').show();
            $('#repo-file-list').hide();
        }
    });

    app.router = new app.Router();

    Backbone.history.start({
        pushState: true,
        root: app.config.siteRoot
    });

}(window, app, Backbone, jQuery, _));
