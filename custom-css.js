// 自定义美化 CSS 注入：根据当前页面是哪个角色的聊天，加载对应预设
(function(){
  try {
    // 读所有预设
    var presets = JSON.parse(localStorage.getItem('beauty_presets') || '[]');
    if (!presets.length) return;
    var active = JSON.parse(localStorage.getItem('beauty_active') || '{}');
    // 判断当前页面角色
    var params = new URLSearchParams(location.search);
    var currentRole = params.get('id') || '';
    var cssToApply = [];
    // 1. 全局预设先加载
    presets.forEach(function(p){
      if (p.target === 'all' && active['all'] === p.name) cssToApply.push(p.css);
    });
    // 2. 当前角色专属预设
    if (currentRole && !currentRole.startsWith('g')) {
      presets.forEach(function(p){
        if (p.target === currentRole && active[currentRole] === p.name) cssToApply.push(p.css);
      });
    }
    if (cssToApply.length) {
      var s = document.createElement('style');
      s.id = 'custom-beauty-css';
      s.textContent = cssToApply.join('\n');
      (document.head || document.documentElement).appendChild(s);
    }
  } catch(e) {}
})();
