<style lang="less">
    .subject-selector {
        padding: 10px 10px 10px 20px;
        border-bottom: 1px solid #dddee1;
    }
</style>

<template>
    <div class="subject-selector">
        <span>选择章节</span>
        <span>类别:</span>
        <select v-model="kind">
            <option v-for="opt in kinds" :value="opt.guid">
                {{opt.name}}
            </option>
        </select>
        <span>分类:</span>
        <select v-model="category">
            <option v-for="opt in categories" :value="opt.guid">
                {{opt.name}}
            </option>
        </select>
        <span>科目:</span>
        <select v-model="subject">
            <option v-for="opt in subjects" :value="opt.guid">
                {{opt.name}}
            </option>
        </select>
    </div>    
</template>

<script>
    import data from '../../js/data';

    export default {
        name: 'SubjectSelector',
        data() {
            return {
                kind: null,
                kinds: null,
                category: null,
                categories: null,
                subject: null,
                subjects: null
            };
        },
        props: {},
        computed: {},
        components: {},
        watch: {
            kind: function(val, oldVal) {
                this.load_categories(val);
            },
            category: function(val, oldVal) {
                this.load_subjects(val);
            },
            subject: function(val, oldVal) {
                this.$emit('on-select-subject', val);
            }
        },
        methods: {
            load_kinds() {
                var that = this;
                data.getKinds().then(function(req) {
                    that.kinds = req;

                    if (that.kinds.length > 0) {
                        that.kind = that.kinds[0].guid;
                    } else {
                        that.kind = null;
                    }
                });
            },

            load_categories(kind) {
                var that = this;
                data.getCategoris(kind).then(function(req) {
                    that.categories = req;

                    if (that.categories.length > 0) {
                        that.category = that.categories[0].guid
                    } else {
                        that.category = null;
                    }
                });
            },

            load_subjects(category) {
                var that = this;
                data.getSubjects(category).then(function(req) {
                    that.subjects = req;

                    if (that.subjects.length > 0) {
                        that.subject = that.subjects[0].guid
                    } else {
                        that.subject = null;
                    }
                });
            }
        },
        created() {
            this.load_kinds();
        }
    };
</script>
