(function(window, app, Backbone, jQuery, _){
    "use strict";
    
    app.views = {}; 

    app.views.DirentView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template($('#dirent-template').html() || ''),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'remove', this.remove); // for multi-dirents mv
        },
        render: function () {
            var dirents = this.collection;
            var path = dirents.path;
            if (path != '/') {
                path += '/';
            }
            this.$el.html(this.template({
                dirent: this.model.attributes,
                path: path,
                repo_id: dirents.repo_id,
                user_perm: dirents.user_perm,
                repo_encrypted: dirents.encrypted,
                media_url: app.config.mediaUrl,
                site_root: app.config.siteRoot
            }));
            $('.checkbox-orig', this.$el).unbind();
            return this;
        },
        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .select': 'select',
            'click .file-star': 'starFile',
            'click .dir-link': 'visitDir',
            'click .more-op-icon': 'togglePopup',
            'click .share': 'share',
            'click .del': 'delete',
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp',
            'click .file-update': 'updateFile'
        },
        highlight: function () {
            if (no_file_op_popup) {
                this.$el.addClass('hl').find('.repo-file-op').removeClass('vh');
            }
        },
        rmHighlight: function () {
            if (no_file_op_popup) {
                this.$el.removeClass('hl').find('.repo-file-op').addClass('vh');
            }
        },
        select: function () {
            var checkbox = this.$('.checkbox');
            checkbox.toggleClass('checkbox-checked');
            if (checkbox.hasClass('checkbox-checked')) {
                this.model.set({'selected':true}, {silent:true}); // do not trigger the 'change' event.
            } else {
                this.model.set({'selected':false}, {silent:true});
            }

            var dirents_op = $('#dirents-op');
            if ($('.checkbox-checked', $('.repo-file-list tr:gt(0)')).length > 0) {
                dirents_op.removeClass('hide');
                setDirentsOpPos();
            } else {
                dirents_op.addClass('hide');
            }
        },
        starFile: function () {
            var _this = this;
            var path = this.collection.path;
            var starred = this.model.get('starred');
            var ajax_url = starred ? app.pages.lib.config.urls.repo_unstar_file : app.pages.lib.config.urls.repo_star_file;
            ajax_url += '?file=' + e(path + this.model.get('obj_name'));
            $.ajax({
                url: ajax_url,
                dataType: 'json',
                cache: false,
                success: function () {
                    if (starred) {
                        _this.model.set({'starred':false});
                    } else {
                        _this.model.set({'starred':true});
                    }
                },
                error: ajaxErrorHandler
            });
        },
        visitDir: function () {
            // show 'loading'
            this.$('.dirent-icon img').attr({
                'src': app.config.mediaUrl + 'img/loading-icon.gif',
                'alt':''
            });
            // empty all models
            this.collection.reset();
            // update url & dirents
            var siteRoot_len = app.config.siteRoot.length,
                url_base = app.page.dir_url_base,
                dir_url = this.$('.dir-link')[0].pathname,
                url = url_base ? url_base + dir_url.substr(siteRoot_len) : dir_url.substr(siteRoot_len - 1);
            app.router.navigate(url, {trigger: true}); // offer an url fragment
            return false;
        },
        togglePopup: function () {
            var icon = this.$('.more-op-icon'),
                popup = this.$('.hidden-op');

            if (popup.hasClass('hide')) { // the popup is not shown
                if (icon.position().left + icon.width() + popup.outerWidth() < icon.parent().width()) {
                    popup.css({'left': icon.position().left + icon.width() + 5});
                    if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                        popup.css('top', 6);
                    } else {
                        popup.css('bottom', 2);
                    }
                } else {
                    popup.css({'right':0});
                    if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                        popup.css('top', icon.position().top + icon.height() + 3);
                    } else {
                        popup.css('bottom', icon.position().top + icon.height() + 3);
                    }
                }
                popup.removeClass('hide');
                no_file_op_popup = false;
                popup_tr = icon.parents('tr');
            } else {
                popup.addClass('hide');
                no_file_op_popup = true;
                popup_tr = '';
            }
        },
        share: function () {
            var op = this.$('.share'),
                name = this.model.get('obj_name');
            var cur_path = this.collection.path;
            var ajax_urls = {
                'link': app.pages.lib.config.urls.get_shared_link + '&p=' + e(cur_path + name),
                'upload-link': app.pages.lib.config.urls.get_shared_upload_link + '&p=' + e(cur_path + name)
            };
            var type = this.model.get('is_dir') ? 'd' : 'f';
            if (type == 'd') {
                ajax_urls['link'] += '&type=d';
            }
            showSharePopup(op, name, ajax_urls, type, cur_path);
            return false;
        },
        delete: function () {
            var dirent_name = this.model.get('obj_name');
            var url_main = this.model.get('is_dir') ? app.pages.lib.config.urls.delete_dir : app.pages.lib.config.urls.delete_file;
            var el = this.$el;
            var path = this.collection.path;
            $.ajax({
                url: url_main + '?parent_dir=' + e(path) + '&name=' + e(dirent_name),
                dataType: 'json',
                success: function(data) {
                    el.remove();
                    no_file_op_popup = true;// make other items can work normally when hover
                    //var msg = "{% trans "Successfully deleted %(name)s" %}"; // todo
                    //var msg = "Successfully deleted %(name)s";
                    var msg = app.pages.lib.config.msgs.successDel;
                    msg = msg.replace('%(name)s', dirent_name);
                    feedback(msg, 'success');
                },
                error: ajaxErrorHandler
            });
            return false;
        },
        rename: function () {
            var form = $('#rename-form'),
                form_id = form.attr('id');
            form.modal();
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            var is_dir = this.model.get('is_dir');
            //var hd_text = is_dir ? "{% trans "Rename Directory" %}" : "{% trans "Rename File" %}";
            var hd_text = is_dir ? "Rename Directory" : "Rename File";
            $('h3', form).html(hd_text);
            var dirent_name = this.model.get('obj_name');
            $('[name=newname]', form).val(dirent_name);
            var op_detail = $('.detail', form);
            op_detail.html(op_detail.html().replace('%(name)s', '<span class="op-target">' + dirent_name + '</span>'));

            var _this = this;
            var path = this.collection.path;
            form.submit(function() {
                var new_name = $.trim($('[name="newname"]', form).val());
                if (!new_name) {
                    //apply_form_error(form_id, "{% trans "It is required." %}");
                    apply_form_error(form_id, "It is required.");
                    return false;
                }
                if (new_name == dirent_name) {
                    //apply_form_error(form_id, "{% trans "You have not renamed it." %}");
                    apply_form_error(form_id, "You have not renamed it.");
                    return false;
                }
                var post_data = {'oldname': dirent_name, 'newname':new_name};
                var post_url = is_dir ? app.pages.lib.config.urls.rename_dir : app.pages.lib.config.urls.rename_file;
                post_url += '?parent_dir=' + e(path);
                var after_op_success = function (data) {
                    new_name = data['newname'];
                    var now = new Date().getTime()/1000;
                    $.modal.close();
                    _this.model.set({ // it will trigger 'change' event
                        'obj_name': new_name,
                        'last_modified': now,
                        //'last_update': "{% trans "Just now" %}",
                        'last_update': "Just now",
                        'sharelink': '',
                        'sharetoken': ''
                    });
                    if (is_dir) {
                        _this.model.set({
                            'p_dpath': data['p_dpath']
                        });
                    } else {
                        _this.model.set({
                            'starred': false
                        });
                    }
                };
                ajaxPost({
                    'form': form,
                    'post_url': post_url,
                    'post_data': post_data,
                    'after_op_success': after_op_success,
                    'form_id': form_id
                });
                return false;
            });
            return false;
        },
        mvcp: function() {
            var el = event.target || event.srcElement,
                op_type = $(el).hasClass('mv') ? 'mv':'cp',
                op_detail,
                dirent = this.$el,
                obj_name = this.model.get('obj_name'),
                obj_type = this.model.get('is_dir') ? 'dir':'file',
                form = $('#mv-form'), form_hd;

            form.modal({appendTo:'#main', autoResize:true, focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            if (op_type == 'mv') {
                //form_hd = obj_type == 'dir'? "{% trans "Move Directory" %}":"{% trans "Move File" %}";
                form_hd = obj_type == 'dir'? "Move Directory" : "Move File";
            } else {
                //form_hd = obj_type == 'dir'? "{% trans "Copy Directory" %}":"{% trans "Copy File" %}";
                form_hd = obj_type == 'dir'? "Copy Directory" : "Copy File";
            }

            //op_detail = op_type == 'mv' ? "{% trans "Move %(name)s to:" %}" : "{% trans "Copy %(name)s to:" %}";
            op_detail = op_type == 'mv' ? "Move %(name)s to:" : "Copy %(name)s to:";
            op_detail = op_detail.replace('%(name)s', '<span class="op-target">' + obj_name + '</span>');
            form.prepend('<h3>' + form_hd + '</h3><h4>' + op_detail + '</h4>');

            $('input[name="op"]', form).val(op_type);
            $('input[name="obj_type"]', form).val(obj_type);
            $('input[name="obj_name"]', form).val(obj_name);

            form.data('op_obj', dirent);
            render_jstree_for_cur_path();
            return false;
        },
        updateFile: function () {
            var file_name = this.model.get('obj_name');
            var form = $('#update-file-form');
            var saving_tip = $('.saving-tip', form);
            var cur_path = this.collection.path;
            var upload_success = false;
            var updated_file;
            var this_model = this.model;
            $('#update-file-dialog').modal({
                focus:false,
                containerCss: {width:600, height:$(window).height()/2},
                onClose: function() {
                    $.modal.close();
                    if (upload_success) {
                        var now = new Date().getTime()/1000;
                        this_model.set({
                            'obj_id': updated_file.id,
                            'last_modified': now,
                            //'last_update': "{% trans "Just now" %}",
                            'last_update': "Just now",
                            'file_size': filesizeformat(updated_file.size, 1)
                        });
                    }
                }
            });
            $('.simplemodal-wrap').css({'overflow':'auto'}); // for ie

            $('input[name="target_file"]', form).val(cur_path + file_name);
            var hd = $('#update-file-dialog .hd');
            hd.html(hd.html().replace('%(file_name)s', '<span class="op-target">' + file_name + '</span>'));
            $.ajax({
                url: app.pages.lib.config.urls.get_file_op_url + '?op_type=update',
                cache: false,
                dataType: 'json',
                success: function(data) {
                    // Initialize the jQuery File Upload widget:
                    form.fileupload({
                        url: data['url'], // no '?head=cmt_id'
                        // customize it for 'done'
                        getFilesFromResponse: function (data) {
                            if (data.result) {
                                return data.result;
                            }
                        },
/* todo

                        {% if max_upload_file_size %}
                        maxFileSize: {{max_upload_file_size}}, // in bytes
                        {% endif %}
*/
                        maxNumberOfFiles: 1 // only 1 file can be uploaded
                    })
                    .bind('fileuploadprogressall', function (e, data) {
                        if (data.loaded > 0 && data.loaded == data.total) {
                            saving_tip.show();
                        }
                    })
                    .bind('fileuploaddone', function(e, data) {
                        if (data.textStatus == 'success') {
                            upload_success = true;
                            updated_file = data.result[0];
                            updated_file.uploaded = true; // for tpl
                        }
                    })
                    .bind('fileuploadcompleted fileuploadfailed', function() {
                        saving_tip.hide();
                    });

                    // Enable iframe cross-domain access via redirect option:
                    form.fileupload(
                        'option',
                        'redirect',
                        window.location.href.replace(/\/repo\/[-a-z0-9]{36}\/.*/, app.config.mediaUrl + 'cors/result.html?%s') // todo
                    );
                },
                error: ajaxErrorHandler
            });
            return false;
        }
    });

    app.views.LibView = Backbone.View.extend({
        el: $('#repo-file-list'),
        path_template: _.template($('#path-template').html() || ''),
        libop_template: _.template($('#libop-template').html() || ''),
        initialize: function () {
            this.dirent_list = this.$('.repo-file-list');
            $('th .checkbox-orig').unbind();

            var dirents = this.collection;
            this.listenTo(dirents, 'add', this.addOne);
            this.listenTo(dirents, 'reset', this.reset);
        },
        renderPath: function () {
            var dirents = this.collection;
            var path = dirents.path,
                obj = {
                    path: path,
                    repo_name: dirents.repo_name
                };
            if (path != '/') {
                $.extend(obj, {
                    path_list: path.substr(1).split('/'),
                    repo_id: dirents.repo_id,
                    site_root: app.config.siteRoot
                });
            }
            $('.repo-file-list-topbar .path').html(this.path_template(obj));
        },
        renderLibop: function () {
            var dirents = this.collection;
            $('.repo-file-list-topbar .repo-op').html($.trim(this.libop_template({
                user_perm: dirents.user_perm,
                no_quota: dirents.no_quota,
                encrypted: dirents.encrypted,
                path: dirents.path,
                share: dirents.share,
                repo_id: dirents.repo_id
            })));
        },
        addOne: function (dirent) {
            var dirents = this.collection;
            var view = new app.views.DirentView({model: dirent, collection: dirents});
            this.dirent_list.append(view.render().el);
            if (dirent === _.last(dirents.models)) {
                if (!dirents.dirent_more) {
                    $('.loading-tip').hide();
                }
                var images = dirents.where({'is_img':true});
                var images_no_thumbnail = [];
                $(images).each(function (index, img) {
                    if (!img.get('thumbnail_src')) {
                        images_no_thumbnail.push(img);
                    }
                });
                if (images_no_thumbnail.length == 0) {
                    return;
                }
                var parent_dir = dirents.path;
                var get_thumbnail = function (i) {
                    var img_no_thumbnail = images_no_thumbnail[i];
                    var file_name = img_no_thumbnail.get('obj_name');
                    var path = parent_dir;
                    if (path != '/') {
                        path = path + '/';
                    }
                    $.ajax({
                        url: app.pages.lib.config.urls.thumbnail_create + '?path=' + e(path + file_name),
                        cache: false,
                        dataType: 'json',
                        success: function(data) {
                            img_no_thumbnail.set({
                                'thumbnail_src': data.thumbnail_src
                            });
                        },
                        complete: function() {
                            // current path may be changed. e.g., the user enter another directory
                            if (i < images_no_thumbnail.length - 1 && parent_dir == dirents.path) {
                                get_thumbnail(++i);
                            }
                        }
                    });
                };
                get_thumbnail(0);
            }
        },
        reset: function () {
            $('tr:gt(0)', this.dirent_list).remove();
        },
        events: {
            'click .path-link':'visitDir',
            'click #upload-file':'uploadFile',
            'click #add-new-dir':'newDir',
            'click #add-new-file':'newFile',
            'click #share-cur-dir':'share',
            'click th.select':'select',
            'click #by-name':'sortByName',
            'click #by-time':'sortByTime',
            'click #del-dirents':'delete',
            'click #mv-dirents':'mv',
            'click #cp-dirents':'cp'
        },
        visitDir: function () {
            var path_link = event.target || event.srcElement;

            var siteRoot_len = app.config.siteRoot.length,
                url_base = app.page.dir_url_base,
                dir_url = path_link.pathname, // 'pathname': relative url
                url = url_base ? url_base + dir_url.substr(siteRoot_len) : dir_url.substr(siteRoot_len - 1);

            // when cur dir is root dir, and click the link on root dir in '.path'
            // 'router.navigate()' won't send request
            /*
            if ('/' + url == location.pathname || url == location.pathname) { // the latter is for 'lib' page
                //router.get_dirents();
                return false;
            }
            */
            // show 'loading'
            var path = this.$('.path');
            // check if loading_icon is already there, in case some users may repeatly click the link
            if (path.find('img').length == 0) {
                path.append('<img src="' + app.config.mediaUrl + 'img/loading-icon.gif" alt="" class="vam" />');
            }
            // empty all models
            this.collection.reset();
            // update url & dirents
            app.router.navigate(url, {trigger: true}); // offer an url fragment
            return false;
        },
        uploadFile: function () {
/* todo
            {% if no_quota %}
            $('#upload-file-dialog').modal();
            {% endif %}
*/
        },
        newDir: function () {
            var form = $('#add-new-dir-form'),
                form_id = form.attr('id');
            form.modal({appendTo:'#main'});
            $('#simplemodal-container').css({'height':'auto'});
            var dirent_list = this.dirent_list;
            var dirents = this.collection;
            form.submit(function() {
                var dirent_name = $.trim($('input[name="name"]', form).val());
                if (!dirent_name) {
                    //apply_form_error(form_id, "{% trans "It is required." %}");
                    apply_form_error(form_id, "It is required.");
                    return false;
                }
                var post_data = {'dirent_name': dirent_name};
                var post_url = app.pages.lib.config.urls.new_dir + '?parent_dir=' + e(dirents.path);
                var after_op_success = function(data) {
                    $.modal.close();
                    var now = new Date().getTime()/1000;
                    var new_dirent = dirents.add({
                        'is_dir': true,
                        'obj_name': data['name'],
                        'last_modified': now,
                        //'last_update': "{% trans "Just now" %}",
                        'last_update': "Just now",
                        'p_dpath': data['p_dpath'],
                        'sharelink': '',
                        'sharetoken': '',
                        'uploadlink': '',
                        'uploadtoken': ''
                    }, {silent:true});
                    var view = new app.views.DirentView({model: new_dirent, collection: dirents});
                    $('tr:first', dirent_list).after(view.render().el); // put the new dir as the first one
                };
                ajaxPost({
                    'form': form,
                    'post_url': post_url,
                    'post_data': post_data,
                    'after_op_success': after_op_success,
                    'form_id': form_id
                });
                return false;
            });
        },
        newFile: function () {
            var path = this.collection.path;
            var form = $('#add-new-file-form'),
                form_id = form.attr('id');
            form.modal({appendTo:'#main', focus:false, containerCss:{'padding':'20px 25px'}});
            $('#simplemodal-container').css({'height':'auto'});
            form.submit(function() {
                var dirent_name = $.trim($('input[name="name"]', form).val());
                if (!dirent_name) {
                    //apply_form_error(form_id, "{% trans "It is required." %}");
                    apply_form_error(form_id, "It is required.");
                    return false;
                }
                // if it has an extension, make sure it has a name
                if (dirent_name.lastIndexOf('.') != -1 && dirent_name.substr(0, dirent_name.lastIndexOf('.')).length == 0) {
                    //apply_form_error(form_id, "{% trans "Only an extension there, please input a name." %}");
                    apply_form_error(form_id, "Only an extension there, please input a name.");
                    return false;
                }
                var post_data = {'dirent_name': dirent_name};
                var post_url = app.pages.lib.config.urls.new_file + '?parent_dir=' + e(path);
                var after_op_success = function(data) {
                    if (path.charAt(path.length - 1) != '/') {
                        path += '/';
                    }
                    location.href = app.config.siteRoot + 'lib/' + app.pages.lib.config.repo_id + '/file' + path + data['name'];
                };
                ajaxPost({
                    'form': form,
                    'post_url': post_url,
                    'post_data': post_data,
                    'after_op_success': after_op_success,
                    'form_id': form_id
                });
                return false;
            });
            // choose featured filetype
            $('.set-file-type', form).click(function() {
                var file_name = $('input[name="name"]', form);
                file_name.val('.' + $(this).data('filetype'));
                setCaretPos(file_name[0], 0);
                file_name.focus();
            });
        },
        share: function () {
            var op = this.$('#share-cur-dir'),
                name, aj_urls, type;
            var cur_path = this.collection.path;
            name = cur_path.substr(cur_path.lastIndexOf('/') + 1);
            aj_urls = {
                'link': op.data('url'),
                'upload-link': op.data('upload-url')
            };
            type = 'd';
            showSharePopup(op, name, aj_urls, type, cur_path);
        },
        select: function () {
            var checkbox = $('th .checkbox');
            checkbox.toggleClass('checkbox-checked');

            var dirents = this.collection;
            if (checkbox.hasClass('checkbox-checked')) {
                $('.checkbox').addClass('checkbox-checked');
                dirents.each(function(model) { model.set({'selected': true}, {silent: true}); });
            } else {
                $('.checkbox').removeClass('checkbox-checked');
                dirents.each(function(model) { model.set({'selected': false}, {silent: true}); });
            }

            var dirents_op = $('#dirents-op');
            if ($('.checkbox-checked', $('.repo-file-list tr:gt(0)')).length > 0) {
                dirents_op.removeClass('hide');
                setDirentsOpPos();
            } else {
                dirents_op.addClass('hide');
            }
        },
        sortByName: function () {
            var dirents = this.collection;
            var el = $('#by-name');
            dirents.comparator = function(a, b) {
                if (a.get('is_dir') && b.get('is_file')) {
                    return -1;
                }
                if (el.hasClass('icon-caret-up')) {
                    return a.get('obj_name').toLowerCase() < b.get('obj_name').toLowerCase() ? 1 : -1;
                } else {
                    return a.get('obj_name').toLowerCase() < b.get('obj_name').toLowerCase() ? -1 : 1;
                }
            };
            dirents.sort();
            $('tr:gt(0)', this.dirent_list).remove();
            dirents.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down');
        },
        sortByTime: function () {
            var dirents = this.collection;
            var el = $('#by-time');
            dirents.comparator = function(a, b) {
                if (a.get('is_dir') && b.get('is_file')) {
                    return -1;
                }
                if (el.hasClass('icon-caret-down')) {
                    return a.get('last_modified') < b.get('last_modified') ? 1 : -1;
                } else {
                    return a.get('last_modified') < b.get('last_modified') ? -1 : 1;
                }
            };
            dirents.sort();
            $('tr:gt(0)', this.dirent_list).remove();
            dirents.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down');
        },
        delete: function () {
            var dirents = this.collection;
            $('#confirm-popup').modal({appendTo:'#main'});
            $('#simplemodal-container').css({'height':'auto'});
            //$('#confirm-con').html('<h3>' + "{% trans "Delete Items" %}" + '</h3><p>' + "{% trans "Are you sure you want to delete these selected items?" %}" + '</p>');
            $('#confirm-con').html('<h3>' + "Delete Items" + '</h3><p>' + "Are you sure you want to delete these selected items?" + '</p>');
            var del_dirents = function() {
                //$('#confirm-popup').append('<p style="color:red;">' + "{% trans "Processing..." %}" + '</p>');
                $('#confirm-popup').append('<p style="color:red;">' + "Processing..." + '</p>');
                var selected_dirents = dirents.where({'selected':true}),
                    selected_names = [];
                $(selected_dirents).each(function() {
                    selected_names.push(this.get('obj_name'));
                });
                $.ajax({
                    url: app.pages.lib.config.urls.delete_dirents + '?parent_dir=' + e(dirents.path),
                    type: 'POST',
                    dataType: 'json',
                    beforeSend: prepareCSRFToken,
                    traditional: true,
                    data: {
                        'dirents_names': selected_names
                    },
                    success: function(data) {
                        var del_len = data['deleted'].length,
                            not_del_len = data['undeleted'].length,
                            msg_s, msg_f;

                        if (del_len > 0) {
                            if (del_len == selected_names.length) {
                                dirents.remove(selected_dirents);
                                $('th .checkbox').removeClass('checkbox-checked');
                            } else {
                                $(selected_dirents).each(function() {
                                    if (this.get('obj_name') in data['deleted']) {
                                        dirents.remove(this);
                                    }
                                });
                            }
                            if (del_len == 1) {
                                //msg_s = "{% trans "Successfully deleted %(name)s." %}";
                                msg_s = "Successfully deleted %(name)s.";
                            } else if (del_len == 2) {
                                //msg_s = "{% trans "Successfully deleted %(name)s and 1 other item." %}";
                                msg_s = "Successfully deleted %(name)s and 1 other item.";
                            } else {
                                //msg_s = "{% trans "Successfully deleted %(name)s and %(amount)s other items." %}";
                                msg_s = "Successfully deleted %(name)s and %(amount)s other items.";
                            }
                            msg_s = msg_s.replace('%(name)s', data['deleted'][0]).replace('%(amount)s', del_len - 1);
                            feedback(msg_s, 'success');
                        }
                        if (not_del_len > 0) {
                            if (not_del_len == 1) {
                                //msg_f = "{% trans "Internal error. Failed to delete %(name)s." %}"
                                msg_f = "Internal error. Failed to delete %(name)s.";
                            } else if (not_del_len == 2) {
                                //msg_f = "{% trans "Internal error. Failed to delete %(name)s and 1 other item." %}"
                                msg_f = "Internal error. Failed to delete %(name)s and 1 other item.";
                            } else {
                                //msg_f = "{% trans "Internal error. Failed to delete %(name)s and %(amount)s other items." %}"
                                msg_f = "Internal error. Failed to delete %(name)s and %(amount)s other items.";
                            }
                            msg_f = msg_f.replace('%(name)s', data['undeleted'][0]).replace('%(amount)s', not_del_len - 1);
                            feedback(msg_f, 'error');
                        }
                        $.modal.close();
                        $('#dirents-op').addClass('hide');
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        $.modal.close();
                        ajaxErrorHandler(xhr, textStatus, errorThrown);
                    }
                });
            };
            $('#confirm-yes').unbind().click(del_dirents);
        },
        mv: function () {
            this.mvcp({'op':'mv'});
        },
        cp: function () {
            this.mvcp({'op':'cp'});
        },
        mvcp: function (params) {
            var dirents = this.collection;
            var form = $('#mv-form');
            form.modal({appendTo:'#main', autoResize:true, focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            var op = params.op,
                //form_hd = op == 'mv' ? "{% trans "Move selected item(s) to:" %}" : "{% trans "Copy selected item(s) to:" %}";
                form_hd = op == 'mv' ? "Move selected item(s) to:" : "Copy selected item(s) to:";
            form.prepend('<h3>' + form_hd + '</h3>');

            render_jstree_for_cur_path();
            // get models
            var dirs = dirents.where({'is_dir':true, 'selected':true}),
                files = dirents.where({'is_file':true, 'selected':true});
            var dir_names = [], file_names = [];
            $(dirs).each(function() {
                dir_names.push(this.get('obj_name'));
            });
            $(files).each(function() {
                file_names.push(this.get('obj_name'));
            });
            form.submit(function() {
                var dst_repo = $('[name="dst_repo"]', form).val(),
                    dst_path = $('[name="dst_path"]', form).val(),
                    url_main;
                var cur_path = dirents.path;

                if (!$.trim(dst_repo) || !$.trim(dst_path)) {
                    $('.error', form).removeClass('hide');
                    return false;
                }
                if (dst_repo == app.pages.lib.config.repo_id && dst_path == cur_path) {
                    //$('.error', form).html("{% trans "Invalid destination path" %}").removeClass('hide');
                    $('.error', form).html("Invalid destination path").removeClass('hide');
                    return false;
                }

                disable($('[type="submit"]', form));
                //form.append('<p style="color:red;">' + "{% trans "Processing..." %}" + '</p>');
                form.append('<p style="color:red;">' + "Processing..." + '</p>');

                if (dst_repo == app.pages.lib.config.repo_id) {
                    // when mv/cp in current lib, files/dirs can be handled in batch, and no need to show progress
                    url_main = op == 'mv' ? app.pages.lib.config.urls.mv_dirents : app.pages.lib.config.urls.cp_dirents;
                    $.ajax({
                        url: url_main + '?parent_dir=' + e(cur_path),
                        type: 'POST',
                        dataType: 'json',
                        beforeSend: prepareCSRFToken,
                        traditional: true,
                        data: {
                            'file_names': file_names,
                            'dir_names': dir_names,
                            'dst_repo': dst_repo,
                            'dst_path': dst_path
                        },
                        success: function(data) {
                            var success_len = data['success'].length,
                                msg_s, msg_f,
                                view_url = data['url'];

                            $.modal.close();
                            $('#dirents-op').addClass('hide');
                            if (success_len > 0) {
                                if (op == 'mv') {
                                    if (success_len == files.length + dirs.length) {
                                        dirents.remove(dirs);
                                        dirents.remove(files);
                                    } else {
                                        $(dirs).each(function() {
                                            if (this.get('obj_name') in data['success']) {
                                                dirents.remove(this);
                                            }
                                        });
                                        $(files).each(function() {
                                            if (this.get('obj_name') in data['success']) {
                                                dirents.remove(this);
                                            }
                                        });
                                    }
                                    if (success_len == 1) {
                                        //msg_s = "{% trans "Successfully moved %(name)s." %}";
                                        msg_s = "Successfully moved %(name)s.";
                                    } else if (success_len == 2) {
                                        //msg_s = "{% trans "Successfully moved %(name)s and 1 other item." %}";
                                        msg_s = "Successfully moved %(name)s and 1 other item.";
                                    } else {
                                        //msg_s = "{% trans "Successfully moved %(name)s and %(amount)s other items." %}";
                                        msg_s = "Successfully moved %(name)s and %(amount)s other items.";
                                    }
                                } else { // cp
                                    if (success_len == 1) {
                                        //msg_s = "{% trans "Successfully copied %(name)s." %}";
                                        msg_s = "Successfully copied %(name)s.";
                                    } else if (success_len == 2) {
                                        //msg_s = "{% trans "Successfully copied %(name)s and 1 other item." %}";
                                        msg_s = "Successfully copied %(name)s and 1 other item.";
                                    } else {
                                        //msg_s = "{% trans "Successfully copied %(name)s and %(amount)s other items." %}";
                                        msg_s = "Successfully copied %(name)s and %(amount)s other items.";
                                    }
                                }

                                msg_s = msg_s.replace('%(name)s', data['success'][0]).replace('%(amount)s', success_len - 1);
                                //msg_s += ' <a href="' + view_url + '">' + "{% trans "View" %}" + '</a>';
                                msg_s += ' <a href="' + view_url + '">' + "View" + '</a>';
                                feedback(msg_s, 'success');
                            }

                            if (data['failed'].length > 0) {
                                if (op == 'mv') {
                                    if (data['failed'].length > 1) {
                                        //msg_f = "{% trans "Internal error. Failed to move %(name)s and %(amount)s other item(s)." %}";
                                        msg_f = "Internal error. Failed to move %(name)s and %(amount)s other item(s).";
                                    } else {
                                        //msg_f = "{% trans "Internal error. Failed to move %(name)s." %}";
                                        msg_f = "Internal error. Failed to move %(name)s.";
                                    }
                                } else {
                                    if (data['failed'].length > 1) {
                                        //msg_f = "{% trans "Internal error. Failed to copy %(name)s and %(amount)s other item(s)." %}";
                                        msg_f = "Internal error. Failed to copy %(name)s and %(amount)s other item(s).";
                                    } else {
                                        //msg_f = "{% trans "Internal error. Failed to copy %(name)s." %}";
                                        msg_f = "Internal error. Failed to copy %(name)s.";
                                    }
                                }
                                msg_f = msg_f.replace('%(name)s', data['failed'][0]).replace('%(amount)s', data['failed'].length - 1);
                                feedback(msg_f, 'error');
                            }
                        },
                        error: function(xhr, textStatus, errorThrown) {
                            $.modal.close();
                            ajaxErrorHandler(xhr, textStatus, errorThrown);
                        }
                    });
                } else {
                    // when mv/cp to another lib, files/dirs should be handled one by one, and need to show progress
                    var op_objs = dirents.where({'selected':true}),
                        i = 0;
                    // progress popup
                    var details = $('#mv-details'),
                        cancel_btn = $('#cancel-mv'),
                        other_info = $('#mv-other-info');

                    var mvcpDirent = function () {
                        var op_obj = op_objs[i],
                            obj_type = op_obj.get('is_dir') ? 'dir':'file',
                            obj_name = op_obj.get('obj_name'),
                            post_url,
                            post_data;

                        if (op == 'mv') {
                            post_url = obj_type == 'dir' ? app.pages.lib.config.urls.mv_dir : app.pages.lib.config.urls.mv_file;
                        } else {
                            post_url = obj_type == 'dir' ? app.pages.lib.config.urls.cp_dir : app.pages.lib.config.urls.cp_file;
                        }
                        post_url += '?path=' + e(cur_path) + '&obj_name=' + e(obj_name);
                        post_data = {
                            'dst_repo': dst_repo,
                            'dst_path': dst_path
                        };
                        var after_op_success = function (data) {
                            //var det_text = op == 'mv' ? "{% trans "Moving file %(index)s of %(total)s" %}": "{% trans "Copying file %(index)s of %(total)s" %}";
                            var det_text = op == 'mv' ? "Moving file %(index)s of %(total)s" : "Copying file %(index)s of %(total)s";
                            details.html(det_text.replace('%(index)s', i + 1).replace('%(total)s', op_objs.length)).removeClass('vh');
                            cancel_btn.removeClass('hide');
                            var req_progress = function () {
                                var task_id = data['task_id'];
                                cancel_btn.data('task_id', task_id);
                                $.ajax({
                                    url: app.pages.lib.config.urls.get_cp_progress + '?task_id=' + e(task_id),
                                    dataType: 'json',
                                    success: function(data) {
                                        var bar = $('.ui-progressbar-value', $('#mv-progress'));
                                        if (!data['failed'] && !data['canceled'] && !data['successful']) {
                                            setTimeout(req_progress, 1000);
                                        } else {
                                            if (data['successful']) {
                                                bar.css('width', parseInt((i + 1)/op_objs.length*100, 10) + '%').show();
                                                if (op == 'mv') {
                                                    dirents.remove(op_obj);
                                                }
                                                endOrContinue();
                                            } else { // failed or canceled
                                                if (data['failed']) {
                                                    //var error_msg = op == 'mv' ? 'Failed to move %(name)s':'Failed to copy %(name)s';
                                                    var error_msg = op == 'mv' ? 'Failed to move %(name)s':'Failed to copy %(name)s';
                                                    cancel_btn.after('<p class="error">' + error_msg.replace('%(name)s', obj_name) + '</p>');
                                                    end();
                                                }
                                            }
                                        }
                                    },
                                    error: function(xhr, textStatus, errorThrown) {
                                        var error;
                                        if (xhr.responseText) {
                                            error = $.parseJSON(xhr.responseText).error;
                                        } else {
                                            //error = "{% trans "Failed. Please check the network." %}";
                                            error = "Failed. Please check the network.";
                                        }
                                        cancel_btn.after('<p class="error">' + error + '</p>');
                                        end();
                                    }
                                });
                            }; // 'req_progress' ends
                            if (i == 0) {
                                $.modal.close();
                                $('#dirents-op').addClass('hide');
                                setTimeout(function () {
                                    $('#mv-progress-popup').modal({containerCss: {
                                        width: 300,
                                        height: 150,
                                        paddingTop: 50
                                    }, focus:false});
                                    $('#mv-progress').progressbar();
                                    req_progress();
                                }, 100);
                            } else {
                                req_progress();
                            }
                        }; // 'after_op_success' ends
                        ajaxPost({
                            'form': form,
                            'post_url': post_url,
                            'post_data': post_data,
                            'after_op_success': after_op_success,
                            'form_id': form.attr('id')
                        });
                    }; // 'mvcpDirent' ends
                    var endOrContinue = function () {
                        if (i == op_objs.length - 1) {
                            setTimeout(function () { $.modal.close(); }, 500);
                        } else {
                            mvcpDirent(++i);
                        }
                    };
                    var end = function () {
                        setTimeout(function () { $.modal.close(); }, 500);
                    };
                    mvcpDirent();
                    cancel_btn.click(function() {
                        disable(cancel_btn);
                        var task_id = $(this).data('task_id');
                        $.ajax({
                            url: app.pages.lib.config.urls.cancel_cp + '?task_id=' + e(task_id),
                            dataType: 'json',
                            success: function(data) {
                                //other_info.html("{% trans "Canceled." %}").removeClass('hide');
                                other_info.html("Canceled.").removeClass('hide');
                                cancel_btn.addClass('hide');
                                end();
                            },
                            error: function(xhr, textStatus, errorThrown) {
                                var error;
                                if (xhr.responseText) {
                                    error = $.parseJSON(xhr.responseText).error;
                                } else {
                                    //error = "{% trans "Failed. Please check the network." %}";
                                    error = "Failed. Please check the network.";
                                }
                                other_info.html(error).removeClass('hide');
                                enable(cancel_btn);
                            }
                        });
                    });
                }
                return false;
            });
        },
        onWindowScroll: function () {
            var dirents = this.collection;
            var start = dirents.more_start;
            if (dirents.dirent_more && $(window).scrollTop() + $(window).height() > $(document).height() - parseInt($('#repo-file-list').css('margin-bottom')) && start != dirents.last_start) {
                dirents.last_start = start;
                dirents.more();
            }
        }
    });
}(window, app, Backbone, jQuery, _));
