(function(window, app, Backbone, jQuery, _){ 
    "use strict";

    app.Router = Backbone.Router.extend({
        initialize: function () {
            /*
            this.libdirents = new app.collections.LibDirents(); 
            this.libview = new app.views.LibView({collection: this.libdirents});

            app.pages.lib.dirents = this.libdirents;
            
            this.route('lib/' + app.pages.lib.config.repo_id + '/dir/(*path)', 'get_dirents', this.get_dirents);
            */
        },
        routes: {
            'lib/:repo_id/dir/(*path)': 'get_dirents'
        },
        get_dirents: function(repo_id, path) {
            this.libdirents = new app.collections.LibDirents();
            this.libview = new app.views.LibView({collection: this.libdirents});

            if (app.pages.lib) { // todo: better coding
            app.pages.lib.dirents = this.libdirents;
            }

            if (!path) {
                path = '/';
            } else {
                path = '/' + path.substr(0, path.length - 1);
            }
            var libdirents = this.libdirents; 
            var libview = this.libview; 
            libdirents.path = path;

            if (app.pages.lib) {
            libview.renderPath();
            }

            var loading_tip = $('#repo-file-list .loading-tip');
            loading_tip.show();

            libdirents.repo_id = repo_id;
            libdirents.fetch({
                data: {'p': path},
                success: function (collection, response, opts) {
                    libview.renderPath(); // for 'myhome' lib
                    libview.renderLibop();

                    // todo
                    // last_start = 0; // for 'more'
                    if (response.dirent_list.length == 0) { // the dir is empty
                        loading_tip.hide();
                    }
                }
            });
        }
    });

    app.router = new app.Router();

    Backbone.history.start({
        pushState: true,
        root: app.config.siteRoot
    });

}(window, app, Backbone, jQuery, _));
