/* 多语言：中文(zh) / 英文(en)
 * window.t(key)        取当前语言的文案
 * window.setLang(lang) 切换语言并刷新整页
 * window.applyLang()   刷新所有文案（静态 + 动态）
 */
(function () {
  'use strict';

  var I18N = {
    zh: {
      title: '平面魔方 ⇄ 立体魔方 · 等价联动（模块化版）',
      h1: '平面魔方 ⇄ 立体魔方 · 等价联动',
      desc: '左边的<b>平面环形图</b>与右边的<b>三阶立体魔方</b>是同一个魔方状态的两种表示方式。<br>转动任意一边（3D 面按钮，或 2D 图上每个色块旁的 ↺ ↻ 小按钮），两侧会<b>同步联动</b>更新。',
      panel2d_h2: '平面等价图',
      panel2d_sub: '三组「三圈同心圆」两两相交 → 54 个交点 = 54 个小面；点击 ↺ / ↻ 旋转该面，或直接点某面色块簇——鼠标停在哪半边，就按那半边对应的方向转（悬停可看提示）',
      panel3d_h2: '立体魔方',
      panel3d_sub: '拖动可旋转视角',
      btn_scramble: '🔀 随机打乱',
      btn_reset: '↺ 上一步',
      hint_prefix: '键盘快捷键：',
      opt_color: '颜色键',
      opt_standard: '标准键(U/D/F/B/L/R)',
      hint_suffix: '，<b>Shift</b>+字母=逆时针',
      footer: '纯前端实现：真实的魔方群运算（旋转矩阵驱动），平面图与立体图共享同一份状态。',
      x_title: '在 X 上关注我',

      fc_U: '黄', fc_D: '白', fc_F: '绿', fc_B: '蓝', fc_L: '橙', fc_R: '红',
      cl_U: '黄·上', cl_D: '白·下', cl_F: '绿·前', cl_B: '蓝·后', cl_L: '橙·左', cl_R: '红·右',

      ccw_title_suffix: "' (逆时针)",
      cw_title_suffix: ' (顺时针)',
      hover_ccw: '：逆时针 ↺（点这一侧）',
      hover_cw: '：顺时针 ↻（点这一侧）',

      single_turn: '单步转动',
      combo_op: '复合操作',
      grp_top: '1. 以什么为顶面',
      grp_face: '2. 选择旋转面',
      grp_hand: '3. 执行操作',
      grp_count: '4. 执行数量',

      opt_left: '左手公式',
      opt_right: '右手公式',
      opt_left_title: '上右下左：X逆 → 顶逆 → X顺 → 顶顺',
      opt_right_title: '上左下右：X顺 → 顶顺 → X逆 → 顶逆',

      exec_btn: '执行',
      combo_same: '⚠ 顶面与旋转面不能相同',
      combo_hand_right: '右手公式',
      combo_hand_left: '左手公式',
      combo_sep: '：',

      hint_color: '<b>Y</b> / <b>W</b> / <b>G</b> / <b>B</b> / <b>R</b> / <b>O</b>',
      hint_standard: '<b>U</b>上 / <b>D</b>下 / <b>F</b>前 / <b>B</b>后 / <b>R</b>右 / <b>L</b>左'
    },

    en: {
      title: 'Planar ⇄ 3D Rubik’s Cube · Linked States',
      h1: 'Planar Cube ⇄ 3D Cube · Linked',
      desc: 'The <b>planar ring diagram</b> on the left and the <b>3×3 3D cube</b> on the right are two views of the same cube state.<br>Turn either side (the 3D face buttons, or the ↺ ↻ buttons beside each sticker on the 2D diagram) and both sides update <b>in sync</b>.',
      panel2d_h2: 'Planar View',
      panel2d_sub: 'Three sets of three concentric circles intersect pairwise → 54 intersections = 54 facelets. Click ↺ / ↻ to rotate a face, or click a sticker cluster — hover over either half to turn that way (hover for hint).',
      panel3d_h2: '3D Cube',
      panel3d_sub: 'Drag to rotate the view',
      btn_scramble: '🔀 Scramble',
      btn_reset: '↺ Undo',
      hint_prefix: 'Keyboard shortcuts: ',
      opt_color: 'Color keys',
      opt_standard: 'Standard (U/D/F/B/L/R)',
      hint_suffix: ', <b>Shift</b>+letter = CCW',
      footer: 'Pure front-end: real cube-group arithmetic (rotation-matrix driven); the planar and 3D views share one state.',
      x_title: 'Follow me on X',

      fc_U: 'Y', fc_D: 'W', fc_F: 'G', fc_B: 'B', fc_L: 'O', fc_R: 'R',
      cl_U: 'Y·Up', cl_D: 'W·Down', cl_F: 'G·Front', cl_B: 'B·Back', cl_L: 'O·Left', cl_R: 'R·Right',

      ccw_title_suffix: "' (CCW)",
      cw_title_suffix: ' (CW)',
      hover_ccw: ': CCW ↺ (click this side)',
      hover_cw: ': CW ↻ (click this side)',

      single_turn: 'Single Moves',
      combo_op: 'Combo Moves',
      grp_top: '1. Choose top face',
      grp_face: '2. Choose turning face',
      grp_hand: '3. Operation',
      grp_count: '4. Repeat count',

      opt_left: 'Left-hand',
      opt_right: 'Right-hand',
      opt_left_title: 'Up-R-Down-L: X′ → U′ → X → U',
      opt_right_title: 'Up-L-Down-R: X → U → X′ → U′',

      exec_btn: 'Run',
      combo_same: '⚠ Top face and turning face must differ',
      combo_hand_right: 'Right-hand',
      combo_hand_left: 'Left-hand',
      combo_sep: ': ',

      hint_color: '<b>Y</b> / <b>W</b> / <b>G</b> / <b>B</b> / <b>R</b> / <b>O</b>',
      hint_standard: '<b>U</b>Up / <b>D</b>Down / <b>F</b>Front / <b>B</b>Back / <b>R</b>Right / <b>L</b>Left'
    }
  };

  try { window.__lang = localStorage.getItem('mofang_lang') || 'zh'; }
  catch (e) { window.__lang = 'zh'; }

  function t(key) {
    var lang = window.I18N[window.__lang] ? window.__lang : 'zh';
    var dict = window.I18N[lang];
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (Object.prototype.hasOwnProperty.call(window.I18N.zh, key)) return window.I18N.zh[key];
    return key;
  }

  function setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') lang = 'zh';
    window.__lang = lang;
    try { localStorage.setItem('mofang_lang', lang); } catch (e) {}
    window.applyLang && window.applyLang();
  }

  function applyLang() {
    document.documentElement.lang = (window.__lang === 'en') ? 'en' : 'zh-CN';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      if (el.hasAttribute('data-i18n-attr')) {
        el.setAttribute(el.getAttribute('data-i18n-attr'), t(key));
      } else if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = t(key);
      } else {
        el.textContent = t(key);
      }
    }
    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('active', btns[j].getAttribute('data-lang') === window.__lang);
    }
    if (window.__rebuildControls) window.__rebuildControls();
    if (window.__refreshCubeLang) window.__refreshCubeLang();
  }

  window.I18N = I18N;
  window.t = t;
  window.setLang = setLang;
  window.applyLang = applyLang;

  // 绑定切换按钮（DOM 就绪后）
  function bindSwitch() {
    var list = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < list.length; i++) {
      list[i].addEventListener('click', function () {
        window.setLang(this.getAttribute('data-lang'));
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSwitch);
  } else {
    bindSwitch();
  }
})();
