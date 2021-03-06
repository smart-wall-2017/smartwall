define(function(require, exports) {
    "use strict";

    var utils = require("utils/utils");
    require("ligerui");
    require("ligerui-css");
    require("ligerui-css-icons");
    require("controls/umeditor");
    require("./css/editor.css");

    var editor;
    exports.init = function(conf) {
        editor = new QEditor(conf);
        //editor.addQuestion();
    };

    exports.save = function() {
        utils.postJson("exam/save.mvc", {
            type: editor.examType,
            guid: editor.examGuid,
            value: JSON.stringify(editor.getValue())
        }, function(result) {
            //alert(JSON.stringify(result));
        });
    };

    exports.addQuestion = function(type) {
        editor.addQuestion(type);
    };

    function extend(subClass, superClass) {
        var F = function() {};
        F.prototype = superClass.prototype;
        subClass.prototype = new F();
        subClass.superClass = superClass.prototype;
    };

    var QEditor = function(conf) {
        this._init_(conf);
    };

    QEditor.prototype._init_ = function(conf) {
        this.container = $("#" + conf["container"]);
        this.examGuid = conf["guid"];
        this.examType = conf["type"];

        this.lastQ = null;
        this._initTitle(this.container);
        this._loadExam();
    };

    QEditor.prototype._initTitle = function() {
        var dom = $('<div id="qe-title" class="qe-item"><div id="qe-title-main">问卷标题</div><div id="qe-title-sub">问卷说明</div></div>');
        dom.dblclick(function() {
            UM.getEditor("editor-title-um").setContent($("#qe-title-sub").html());
            $('#editor-title').find("#editor-title-ti").val($("#qe-title-main").text());
            $.ligerDialog.open({
                title: "修改",
                width: 600,
                hegith: 400,
                target: $('#editor-title'),
                buttons: [{
                    text: '保存',
                    onclick: function(i, d) {
                        $("#qe-title-sub").html(UM.getEditor("editor-title-um").getContent());
                        $("#qe-title-main").text($('#editor-title').find("#editor-title-ti").val());

                        d.hide();
                    }
                }, {
                    text: '关闭',
                    onclick: function(i, d) {
                        d.hide();
                    }
                }]
            });
        });

        this.container.append(dom);
    };

    QEditor.prototype._loadExam = function() {
        var that = this;
        utils.postJson("exam/get.mvc", {
            type: this.examType,
            guid: this.examGuid
        }, function(result) {
            if (result.code == 0) {
                var m = result.message;
                if (m) {
                    that._parseExam(JSON.parse(m));
                }
            } else {
                alert("error");
            }
        });
    };

    QEditor.prototype._parseExam = function(exam) {
        $("#qe-title-sub").html(exam.comment);
        $("#qe-title-main").text(exam.title);

        for (var i = 1; i < 500; i++) {
            var q = exam["Q" + i];

            if (!q) {
                break;
            }

            editor.addQuestion(q.type, q);
        }
    };

    /*获取最大编号*/
    QEditor.prototype.getMaxNo = function() {
        var nc = 0;
        $(".qe-item-question").each(function(index) {
            var question = $(this).data("question");
            if (!question.isMemo) {
                nc++;
            }
        });

        return nc;
    };

    QEditor.prototype.addQuestion = function(type, data) {
        var conf = {
            editor: this
        };
        var question;
        switch (type) {
            case 'SC':
                question = new SCQuestion(conf);
                question.setValue(data);
                question.updateOptions();
                break;
            case 'MT':
                question = new MTQuestion(conf);
                question.setValue(data);
                question.updateOptions();
                break;
            case 'AS':
                question = new ASQuestion(conf);
                question.setValue(data);

                break;
            case 'PG':
                question = new PGQuestion(conf);
                question.setValue(data);

                break;
        }
    };

    QEditor.prototype.getValue = function() {
        var v = {};
        v["title"] = $("#qe-title-main").text();
        v["comment"] = $("#qe-title-sub").html();

        $(".qe-item-question").each(function(index) {
            var question = $(this).data("question");
            v["Q" + (index + 1)] = question.getValue();
        });

        return v;
    };

    var Question = function(conf) {
        this._init_(conf);
    };

    Question.prototype._init_ = function(conf) {
        this.editor = conf.editor;
        /*注释题型*/
        this.isMemo = false;
        /*题目编号,注释题型没有*/
        this.no = this.updateNo();
        this.container = $('<div class="qe-item qe-item-question"></div>').appendTo(this.editor.container);
        /*添加到data.question中*/
        this.container.data("question", this);
        this.guid = utils.guid();
        this.renderUI();
    };

    Question.prototype.updateNo = function() {
        return this.editor.getMaxNo() + 1;
    };

    /*界面绘制*/
    Question.prototype.renderUI = function() {
        /*绘制题干区*/
        this.renderTitle();
        /*绘制内容区*/
        this.renderContent();
        /*绘制工具栏*/
        this.renderToolbar();
        /*绘属性编辑区*/
        this.renderWorkarea();
    }

    Question.prototype.setEditing = function(editing) {
        if (editing) {
            this.btnEditor$.text("完成");
            this.container.addClass("qe-item-editing");
        } else {
            this.btnEditor$.text("编辑");
            this.container.removeClass("qe-item-editing");
        }
    }
    Question.prototype.renderTitle = function() {
        this.title$ = $('<div class="qe-item-title"></div>');
        this.container.append(this.title$);
    };

    Question.prototype.renderContent = function() {
        this.content$ = $('<div class="qe-item-content"></div>');

        this.container.append(this.content$);
        this.container.append("<hr/>");
    };

    Question.prototype.renderToolbar = function() {
        /*编辑|删除|上移|下移|最前|最后*/
        var toolbar$ = $('<div class="qe-item-toolbar"></div>');
        var that = this;

        this.btnEditor$ = $('<a>编辑</a>').click(function() {
            var doEding = ($(this).text() == '编辑');
            if (doEding) {
                if (that.editor.lastQ) {
                    that.editor.lastQ.setEditing(false);
                }
            }
            that.editor.lastQ = that;
            that.setEditing(doEding);
        }).appendTo(toolbar$);
        $('<a>删除</a>').click(function() {
            $(this).parent().parent().remove();
        }).appendTo(toolbar$);
        $('<a>上移</a>').click(function() {
            var pp = $(this).parent().parent();
            var prev = pp.prev();
            if (prev.length > 0) {
                pp.after(prev);
            }
        }).appendTo(toolbar$);
        $('<a>下移</a>').click(function() {
            var pp = $(this).parent().parent();
            var next = pp.next();
            if (next.length > 0) {
                pp.before(next);
            }
        }).appendTo(toolbar$);
        $('<a>最前</a>').click(function() {
            var pp = $(this).parent().parent();
            pp.parent().prepend(pp);
        }).appendTo(toolbar$);
        $('<a>最后</a>').click(function() {
            var pp = $(this).parent().parent();
            pp.parent().append(pp);
        }).appendTo(toolbar$);

        this.container.append(toolbar$);
    };

    Question.prototype.renderWorkarea = function() {
        this.workarea$ = $('<div class="qe-item-workarea">标题</div>').appendTo(this.container);
        this.titleEditor = $('<div class="qe-item-e-title"><script id="' +
            this.guid +
            '" style="width:400px;height:160px;" type="text/plain" ></script></div>');
        this.optEditor = $('<div class="qe-item-e-opt"></div>');
        this.required$ = $('<label><input type="checkbox"></input>必答题</label>').appendTo(this.optEditor);

        this.workarea$.append(this.titleEditor).append(this.optEditor);

        var that = this;
        UM.getEditor(this.guid).addListener("blur", function(type, event) {
            that.title$.html(UM.getEditor(that.guid).getContent());
        });

        this.renderPropUI();
        this.renderAnalysis();
    };

    Question.prototype.renderPropUI = function() {};
    Question.prototype.renderAnalysis = function() {
        this.analysis$ = $('<div class="qe-item-e-analysis"><label>题目分数</label><select></select><br/><label>试题解析</label><textarea/></div>');

        var opts = '<option>0.5</option>';
        for (var i = 1; i < 51; i++) {
            opts = opts + '<option>' + i + '</option>';
        }
        $('select', this.analysis$).html(opts).val("1");

        this.workarea$.append(this.analysis$);
    };
    Question.prototype.addOption = function() {};
    Question.prototype.updateOpt = function(index, text) {};
    Question.prototype.updateOptions = function() {};
    Question.prototype.setTitle = function(title) {
        this.title$.html(title);
        if (title != '标题') {
            UM.getEditor(this.guid).setContent(title);
        }
    };
    Question.prototype.getValue = function() {
        var v = {
            no: this.no
        };

        return v;
    };

    Question.prototype.setValue = function(data) {};

    Question.prototype.createOprAdd = function() {
        var that = this;
        return $('<span class="eq-item-e-btn eq-item-e-add"></span>').click(function() {
            that.addOption();

            that.updateOptions();
        });
    };

    Question.prototype.createOprDel = function() {
        var that = this;
        return $('<span class="eq-item-e-btn eq-item-e-del"></span>').click(function() {
            $(this).parent().parent().remove();

            that.updateOptions();
        });
    };

    Question.prototype.createOprUp = function() {
        var that = this;

        return $('<span class="eq-item-e-btn eq-item-e-up"></span>').click(function() {
            /*tbody>tr>td>span*/
            var pp = $(this).parent().parent();
            var prev = pp.prev();
            if (prev.length > 0) {
                pp.after(prev);

                that.updateOptions();
            }
        });
    };

    Question.prototype.createOprDown = function() {
        var that = this;
        return $('<span class="eq-item-e-btn eq-item-e-down"></span>').click(function() {
            /*tbody>tr>td>span*/
            var pp = $(this).parent().parent();
            var next = pp.next();
            if (next.length > 0) {
                pp.before(next);

                that.updateOptions();
            }
        });
    };

    /*单选*/
    var SCQuestion = function(conf) {
        this._init_(conf);
    }
    extend(SCQuestion, Question);
    SCQuestion.prototype.renderPropUI = function() {
        this.prop$ = $('<table class="qe-item-e-prop"><thead></thead><tbody></tbody></table>');

        this.workarea$.append(this.prop$);
        this.prop$.find("thead").append('<tr><th style="width:300px">选项文字</th><th style="width:80px">图片</th><th>是否正确答案</th><th style="width:100px">操作</th><tr>');
    };

    SCQuestion.prototype.addOption = function(opt) {
        var that = this;
        var opt = opt || {
            text: "选项",
            right: false
        };
        var tr = $('<tr/>').data("model", opt);
        var td1 = $('<td><input/></td>').appendTo(tr);
        td1.find("input").blur(function() {
            var this$ = $(this);
            var data = tr.data("model");
            data.text = this$.val() || '';
            tr.data("model", data);

            that.updateOpt(tr.index(), data);
        }).val(opt.text);

        var td2 = $("<td/>").appendTo(tr);
        var cid = "C-" + this.guid;
        var td3 = $('<td><input type="checkbox" cid="' + cid + '"/></td>').appendTo(tr);
        td3.find("input").change(function() {
            var that$ = $(this);
            if (that$.is(":checked")) {
                $('input[cid="' + cid + '"]', tr.parent()).each(function() {
                    var this$ = $(this);
                    if (that$.is(this$)) {
                        return true;
                    }

                    if (this$.is(":checked")) {
                        var ctr = this$.parent().parent();
                        var cdata = ctr.data("model");
                        this$.attr("checked", false);
                        cdata.right = false;
                        ctr.data("model", cdata);

                        that.updateOpt(ctr.index(), cdata);
                    }
                });
            }

            var data = tr.data("model");
            data.right = $(this).is(":checked");
            tr.data("model", data);

            that.updateOpt(tr.index(), data);
        }).attr("checked", opt.right);

        var td4 = $("<td/>").append(this.createOprAdd()).append(this.createOprDel()).append(this.createOprUp()).append(this.createOprDown()).appendTo(tr);

        this.prop$.find("tbody").append(tr);
    };

    SCQuestion.prototype.updateOpt = function(index, data) {
        this.content$.children().eq(index).find("label").text(data.text);
    };
    SCQuestion.prototype.updateOptions = function() {
        var content = this.content$;

        content.empty();
        var dv = this.prop$.find("tbody").children();
        dv.each(function() {
            var text = $(this).data("model").text;
            content.append('<span><input type="radio"></input><label>' + text + '</label></span>')
        });
    };

    SCQuestion.prototype.getValue = function() {
        var v = {
            no: this.no,
            type: "SC"
        };

        v["title"] = this.title$.html();
        var opts = {};
        this.prop$.find("tbody").children().each(function(index) {
            var model = $(this).data("model");
            if (model) {
                var opt = {};
                opt["text"] = model.text;
                opt["right"] = model.right;
                opts["" + (index + 1)] = opt;
            }
        });

        v["opts"] = opts;
        v["score"] = this.analysis$.find("select").val();
        v["analysis"] = this.analysis$.find("textarea").val();

        return v;
    };
    SCQuestion.prototype.setValue = function(data) {
        var that = this;
        if (data) {
            that.setTitle(data["title"]);
            $.each(data.opts, function() {
                that.addOption(this);
            });
            that.analysis$.find("select").val(data.score);
            that.analysis$.find("textarea").val(data.analysis);
        } else {
            that.setTitle("标题");
            that.addOption();
            that.addOption();
        }
    };
    /*多选*/
    var MTQuestion = function(conf) {
        this._init_(conf);
    };
    extend(MTQuestion, Question);
    MTQuestion.prototype.renderPropUI = function() {
        this.prop$ = $('<table class="qe-item-e-prop"><thead></thead><tbody></tbody></table>');

        this.workarea$.append(this.prop$);
        this.prop$.find("thead").append('<tr><th style="width:300px">选项文字</th><th style="width:80px">图片</th><th>是否正确答案</th><th style="width:100px">操作</th><tr>');
    };

    MTQuestion.prototype.addOption = function(opt) {
        var that = this;
        var opt = opt || {
            text: "选项",
            right: false
        };
        var tr = $('<tr/>').data("model", opt);
        var td1 = $("<td><input/></td>").appendTo(tr);
        td1.find("input").blur(function() {
            var this$ = $(this);
            var data = tr.data("model");
            data.text = this$.val() || '';
            tr.data("model", data);

            that.updateOpt(tr.index(), data);

        }).val(opt.text);;

        var td2 = $("<td/>").appendTo(tr);
        var td3 = $('<td><input type="checkbox"/></td>').appendTo(tr);
        td3.find("input").change(function() {
            var data = tr.data("model");
            data.right = $(this).is(":checked");
            tr.data("model", data);

            that.updateOpt(tr.index(), data);
        }).attr("checked", opt.right);
        var td4 = $("<td/>").append(this.createOprAdd()).append(this.createOprDel()).append(this.createOprUp()).append(this.createOprDown()).appendTo(tr);

        this.prop$.find("tbody").append(tr);
    };

    MTQuestion.prototype.updateOpt = function(index, data) {
        this.content$.children().eq(index).find("label").text(data.text);
    };

    MTQuestion.prototype.updateOptions = function() {
        var content = this.content$;

        content.empty();
        var dv = this.prop$.find("tbody").children();
        dv.each(function() {
            var text = $(this).data("model").text;
            content.append('<span><input type="checkbox"></input><label>' + text + '</label></span>')
        });
    };
    MTQuestion.prototype.getValue = function() {
        var v = {
            no: this.no,
            type: "MT"
        };

        v["title"] = this.title$.html();
        var opts = {};
        this.prop$.find("tbody").children().each(function(index) {
            var model = $(this).data("model");
            if (model) {
                var opt = {};
                opt["text"] = model.text;
                opt["right"] = model.right;
                opts["" + (index + 1)] = opt;
            }
        });

        v["opts"] = opts;
        v["score"] = this.analysis$.find("select").val();
        v["analysis"] = this.analysis$.find("textarea").val();

        return v;
    };
    MTQuestion.prototype.setValue = function(data) {
        var that = this;
        if (data) {
            that.setTitle(data["title"]);
            $.each(data.opts, function() {
                that.addOption(this);
            });

            that.analysis$.find("select").val(data.score);
            that.analysis$.find("textarea").val(data.analysis);
        } else {
            that.setTitle("标题");
            that.addOption();
            that.addOption();
        }
    };
    /*问答题*/
    var ASQuestion = function(conf) {
        this._init_(conf);
    }
    extend(ASQuestion, Question);
    ASQuestion.prototype.getValue = function() {
        var v = {
            no: this.no,
            type: "AS"
        };

        v["title"] = this.title$.html();
        v["score"] = this.analysis$.find("select").val();
        v["analysis"] = this.analysis$.find("textarea").val();
        return v;
    };
    ASQuestion.prototype.setValue = function(data) {
        if (data) {
            this.setTitle(data["title"]);
        } else {
            this.setTitle("标题");
        }
        this.analysis$.find("select").val(data.score);
        this.analysis$.find("textarea").val(data.analysis);
    };

    /*段落说明*/
    var PGQuestion = function(conf) {
        this._init_(conf);
        this.isMemo = true;
    }

    extend(PGQuestion, Question);
    PGQuestion.prototype.getValue = function() {
        var v = {
            type: "PG"
        };

        v["title"] = this.title$.html();

        return v;
    };
    PGQuestion.prototype.setValue = function(data) {
        if (data) {
            this.setTitle(data["title"]);
        } else {
            this.setTitle("标题");
        }
    };
    PGQuestion.prototype.updateNo = function() {
        return -1;
    };
    PGQuestion.prototype.renderPropUI = function() {};

    PGQuestion.prototype.addOption = function() {};
});