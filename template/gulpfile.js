var build = require('@rightscale/ui-build-tools');

build.init({
  bundles: [{
    name: '<%=moduleName %>',
    root: 'src',
    dist: true
  }],
  run: {
    bundle: '<%=moduleName %>'
  }
});
