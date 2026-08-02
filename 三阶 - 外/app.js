(function(){
  "use strict";

  /* ============================================================
     1. 核心数学：3x3 整数旋转矩阵 + 27 个小方块（cubies）的状态
     ============================================================ */
  function matVec(M, v){
    return [
      M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2],
      M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2],
      M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2],
    ];
  }
  function matMul(A,B){
    const R=[[0,0,0],[0,0,0],[0,0,0]];
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){
      let s=0; for(let k=0;k<3;k++) s+=A[i][k]*B[k][j];
      R[i][j]=s;
    }
    return R;
  }
  function transpose(M){
    return [[M[0][0],M[1][0],M[2][0]],[M[0][1],M[1][1],M[2][1]],[M[0][2],M[1][2],M[2][2]]];
  }
  const IDENT=[[1,0,0],[0,1,0],[0,0,1]];

  // 顺时针（从该面外部看进去）对应的世界坐标旋转矩阵
  const baseMatrix = {
    R: [[1,0,0],[0,0,1],[0,-1,0]],
    L: [[1,0,0],[0,0,-1],[0,1,0]],
    U: [[0,0,-1],[0,1,0],[1,0,0]],
    D: [[0,0,1],[0,1,0],[-1,0,0]],
    F: [[0,1,0],[-1,0,0],[0,0,1]],
    B: [[0,-1,0],[1,0,0],[0,0,1]],
  };
  // 用于动画：绕哪条数学坐标轴(0=x,1=y,2=z)，以及顺时针对应的角度符号(+90 或 -90)
  const axisOf = {R:0,L:0,U:1,D:1,F:2,B:2};
  // 各面"标准顺时针"(从该面外侧看顺时针)对应绕 axisOf 旋转的角度符号：
  // 正轴面(R/U/F)顺时针 = -90°(signOf=+1)，负轴面(L/D/B)顺时针 = +90°(signOf=-1)。
  // 3D 动画角 = -signOf[face]*90；2D 不依赖 signOf(实测六面标准顺时针状态在屏幕上均为视觉顺时针)。
  const signOf = {R:1,L:-1,U:1,D:-1,F:1,B:-1};

  const faceInfo = {
    U: {axis:1, val:1,  rowFn:(x,y,z)=> (z===-1?0:z===0?1:2), colFn:(x,y,z)=> (x===-1?0:x===0?1:2), normal:[0,1,0]},
    D: {axis:1, val:-1, rowFn:(x,y,z)=> (z===1?0:z===0?1:2),  colFn:(x,y,z)=> (x===-1?0:x===0?1:2), normal:[0,-1,0]},
    F: {axis:2, val:1,  rowFn:(x,y,z)=> (y===1?0:y===0?1:2),  colFn:(x,y,z)=> (x===-1?0:x===0?1:2), normal:[0,0,1]},
    B: {axis:2, val:-1, rowFn:(x,y,z)=> (y===1?0:y===0?1:2),  colFn:(x,y,z)=> (x===1?0:x===0?1:2),  normal:[0,0,-1]},
    R: {axis:0, val:1,  rowFn:(x,y,z)=> (y===1?0:y===0?1:2),  colFn:(x,y,z)=> (z===-1?0:z===0?1:2), normal:[1,0,0]},
    L: {axis:0, val:-1, rowFn:(x,y,z)=> (y===1?0:y===0?1:2),  colFn:(x,y,z)=> (z===1?0:z===0?1:2),  normal:[-1,0,0]},
  };
  const FACES = ['U','D','F','B','L','R'];

  function vecToKey(v){
    if(v[0]===1) return 'x+'; if(v[0]===-1) return 'x-';
    if(v[1]===1) return 'y+'; if(v[1]===-1) return 'y-';
    if(v[2]===1) return 'z+'; if(v[2]===-1) return 'z-';
    return null;
  }
  function keyToVec(key){
    return {'x+':[1,0,0],'x-':[-1,0,0],'y+':[0,1,0],'y-':[0,-1,0],'z+':[0,0,1],'z-':[0,0,-1]}[key];
  }
  const normalKeyToFace = {'x+':'R','x-':'L','y+':'U','y-':'D','z+':'F','z-':'B'};

  // 给定一个 cubie 当前的 pos/orient，以及它某个"原始局部朝向" key（对应它身上
  // 某一贴纸），算出这枚贴纸【当前】显示在哪个面的第几行第几列。
  // 用来在转动前后分别定位同一枚贴纸的旧/新格子，从而让 2D 图里的圆点真正"飞"过去。
  function getStickerSlot(cubie, key){
    const color = cubie.paint[key];
    if(color === undefined) return null;
    const worldDir = matVec(cubie.orient, keyToVec(key));
    const faceLetter = normalKeyToFace[vecToKey(worldDir)];
    const info = faceInfo[faceLetter];
    const row = info.rowFn(cubie.pos[0],cubie.pos[1],cubie.pos[2]);
    const col = info.colFn(cubie.pos[0],cubie.pos[1],cubie.pos[2]);
    return {face:faceLetter, row, col, color};
  }

  let cubies = [];      // 单一状态:2D 平面图与 3D 立体图共用,保证两边永远对应(同原始 app.js)
  function buildSolved(){
    cubies = [];
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
      const paint = {};
      if(x===1) paint['x+']='R'; if(x===-1) paint['x-']='L';
      if(y===1) paint['y+']='U'; if(y===-1) paint['y-']='D';
      if(z===1) paint['z+']='F'; if(z===-1) paint['z-']='B';
      cubies.push({ pos:[x,y,z], orient:IDENT.map(r=>r.slice()), paint });
    }
  }
  buildSolved();

  function applyMoveState(face, prime){
    const info = faceInfo[face];
    let M = baseMatrix[face];
    if(prime) M = transpose(M);
    for(const c of cubies){
      if(c.pos[info.axis] === info.val){
        c.pos = matVec(M, c.pos);
        c.orient = matMul(M, c.orient);
      }
    }
  }

  function getFaceGrid(face){
    const info = faceInfo[face];
    const grid = [[null,null,null],[null,null,null],[null,null,null]];
    for(const c of cubies){
      if(c.pos[info.axis] === info.val){
        const r = info.rowFn(c.pos[0],c.pos[1],c.pos[2]);
        const col = info.colFn(c.pos[0],c.pos[1],c.pos[2]);
        const localDir = matVec(transpose(c.orient), info.normal);
        const key = vecToKey(localDir);
        grid[r][col] = c.paint[key];
      }
    }
    return grid;
  }

  /* ============================================================
     2. 颜色
     ============================================================ */
  // 面字母 → 中文颜色名（中心块颜色）
  const FACE_COLOR_NAME = {U:'黄', D:'白', F:'绿', B:'蓝', L:'橙', R:'红'};
  const COLOR = {
    U:getCss('--c-U'), D:getCss('--c-D'), F:getCss('--c-F'),
    B:getCss('--c-B'), L:getCss('--c-L'), R:getCss('--c-R'),
  };
  function getCss(varName){
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }
  const CORE_COLOR = getCss('--c-core');

  /* ============================================================
     3. 2D 平面图渲染
     ------------------------------------------------------------
     规则：三组"三圈同心圆"（每组 3 个同心圆，三组圆心各不相同，
     构成一个等边三角形），任意两组圆两两相交：
       3 组 → 3 对组合，每对组合 3×3=9 组半径搭配，
       每组搭配两圆相交于 2 点 → 3 对 × 9 × 2 = 54 个交点，
     恰好对应立体魔方 54 个小面。
     三条坐标轴 X/Y/Z 各对应一组同心圆；某一对轴的圆相交，
     交点落在"被排除的第三根轴"所对应的那两个（正/负）面上。
     ============================================================ */
  const AXES3 = ['X','Y','Z'];
  const axisToFace = { X:{pos:'R',neg:'L'}, Y:{pos:'U',neg:'D'}, Z:{pos:'F',neg:'B'} };
  const bundleAngleDeg = { X:30, Y:270, Z:150 }; // 三个圆心构成等边三角形的三个顶点方向
  const RADII3 = [126, 164, 203];                // 每组同心圆的三个半径
  const CENTER_DIST = 150;                       // 任意两个圆心之间的距离
  const Rc3 = CENTER_DIST / Math.sqrt(3);        // 三个圆心所在外接圆半径

  function bundleCenter(axis){
    const th = bundleAngleDeg[axis] * Math.PI/180;
    return [Rc3*Math.cos(th), Rc3*Math.sin(th)];
  }
  const bundleCenters = {};
  AXES3.forEach(a => bundleCenters[a] = bundleCenter(a));

  function circleIntersect(c1, r1, c2, r2){
    const [x1,y1] = c1, [x2,y2] = c2;
    const dx = x2-x1, dy = y2-y1;
    const d = Math.hypot(dx,dy);
    if(d > r1+r2 || d < Math.abs(r1-r2) || d===0) return null;
    const a = (d*d + r1*r1 - r2*r2) / (2*d);
    const h = Math.sqrt(Math.max(0, r1*r1 - a*a));
    const xm = x1 + a*dx/d, ym = y1 + a*dy/d;
    const rx = -dy/d, ry = dx/d;
    return [[xm+h*rx, ym+h*ry], [xm-h*rx, ym-h*ry]];
  }
  function ptDist(p,q){ return Math.hypot(p[0]-q[0], p[1]-q[1]); }

  // faceCoord[face][row][col] = [x,y]  (row,col 只是两个半径下标 0..2，用来对齐 getFaceGrid 的行列)
  const faceCoord = {};
  FACES.forEach(f=> faceCoord[f] = [[0,0,0],[0,0,0],[0,0,0]]);
  const axisIndex = {X:0, Y:1, Z:2};
  const faceAxisLetter = {U:'Y',D:'Y',F:'Z',B:'Z',R:'X',L:'X'};
  const coordToRadiusIndex = v => (v===1 ? 0 : v===0 ? 1 : 2);
  const idxToCoordPos = i => [-1,0,1][i];
  const idxToCoordNeg = i => [1,0,-1][i];

  function slotWorldCoord(face, row, col){
    if(face==='U') return [idxToCoordPos(col), 1, idxToCoordPos(row)];
    if(face==='D') return [idxToCoordPos(col), -1, idxToCoordNeg(row)];
    if(face==='F') return [idxToCoordPos(col), idxToCoordNeg(row), 1];
    if(face==='B') return [idxToCoordNeg(col), idxToCoordNeg(row), -1];
    if(face==='R') return [1, idxToCoordNeg(row), idxToCoordPos(col)];
    return [-1, idxToCoordNeg(row), idxToCoordNeg(col)];
  }

  FACES.forEach(face=>{
    const excluded = faceAxisLetter[face];
    const [P,Q] = AXES3.filter(a=>a!==excluded);
    const positiveFace = axisToFace[excluded].pos;
    for(let row=0; row<3; row++){
      for(let col=0; col<3; col++){
        const pos = slotWorldCoord(face, row, col);
        const rP = RADII3[coordToRadiusIndex(pos[axisIndex[P]])];
        const rQ = RADII3[coordToRadiusIndex(pos[axisIndex[Q]])];
        const pts = circleIntersect(bundleCenters[P], rP, bundleCenters[Q], rQ);
        const [p1,p2] = pts;
        const d1 = ptDist(p1,[0,0]), d2 = ptDist(p2,[0,0]);
        const inner = d1<=d2 ? p1 : p2;
        const outer = d1<=d2 ? p2 : p1;
        faceCoord[face][row][col] = (face===positiveFace) ? inner : outer;
      }
    }
  });

  const clusterLabel = {U:'黄·上', D:'白·下', F:'绿·前', B:'蓝·后', L:'橙·左', R:'红·右'};
  const VB = 340; // viewBox 半宽/半高

  const svgNS = 'http://www.w3.org/2000/svg';
  const planarSvg = document.getElementById('planarSvg');
  const faceLabelsRoot = document.getElementById('faceLabels');
  planarSvg.setAttribute('viewBox', `${-VB} ${-VB} ${2*VB} ${2*VB}`);

  // 背景：9 个同心圆（3 组 × 3 个）
  AXES3.forEach(axis=>{
    const [cx,cy] = bundleCenters[axis];
    RADII3.forEach(r=>{
      const c = document.createElementNS(svgNS,'circle');
      c.setAttribute('class','bundle-circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
      planarSvg.appendChild(c);
    });
    const dot = document.createElementNS(svgNS,'circle');
    dot.setAttribute('class','bundle-center');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', 2.5);
    planarSvg.appendChild(dot);
  });

  // 54 个贴纸圆点 + 每面的控制按钮（放在该面 9 个点的质心稍外侧）
  const dotEls = {};      // face -> [9 <circle>] ，顺序与 getFaceGrid 的 row-major 一致
  const centroidOf = {};  // face -> [cx,cy]
  const spreadOf = {};    // face -> 该面 9 个点距自身质心的最大距离
  const outwardDir = {};  // face -> [ux,uy] 该面朝外的单位方向（原点→质心，或质心太靠内时用"对面→本面"）
  const hitEls = {};      // face -> 覆盖该面 9 点空隙的透明可点击大圆
  const oppositeFace = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};

  // 第一遍：算质心/散布半径/朝外方向 → 造一个透明命中大圆(补空隙) → 画 9 个贴纸点
  FACES.forEach(face=>{
    let sumx=0, sumy=0;
    for(let row=0; row<3; row++)for(let col=0; col<3; col++){
      const [x,y] = faceCoord[face][row][col];
      sumx+=x; sumy+=y;
    }
    const cx = sumx/9, cy = sumy/9;
    centroidOf[face] = [cx,cy];
    let maxSpread = 0;
    for(let row=0; row<3; row++)for(let col=0; col<3; col++){
      const [x,y] = faceCoord[face][row][col];
      const d = Math.hypot(x-cx, y-cy);
      if(d>maxSpread) maxSpread = d;
    }
    spreadOf[face] = maxSpread;

    let dirx = cx, diry = cy, dc = Math.hypot(dirx,diry);
    if(dc < 12){
      const [ox,oy] = centroidOf[oppositeFace[face]] || [0,0];
      dirx = cx-ox; diry = cy-oy; dc = Math.hypot(dirx,diry) || 1;
    }
    outwardDir[face] = [dirx/dc, diry/dc];

    // 透明命中区域：半径盖过该面 9 点连同彼此间的空隙，允许"点在色块簇的
    // 哪半边就按哪半边转"，即使正好点在两个贴纸圆点之间的缝隙里也生效。
    // 贴纸圆点自身在 DOM 顺序上更靠后（画在上面），点在圆点正中心时由圆点接管。
    const hit = document.createElementNS(svgNS,'circle');
    hit.setAttribute('class','face-hit');
    hit.setAttribute('cx', cx); hit.setAttribute('cy', cy);
    hit.setAttribute('r', maxSpread + 13);
    hit.style.fill = 'rgba(0,0,0,0.001)';
    hit.style.cursor = 'pointer';
    const hitTitle = document.createElementNS(svgNS,'title');
    hit.appendChild(hitTitle);
    planarSvg.appendChild(hit);
    hitEls[face] = hit;

    const dots = [];
    for(let row=0; row<3; row++){
      for(let col=0; col<3; col++){
        const [x,y] = faceCoord[face][row][col];
        const c = document.createElementNS(svgNS,'circle');
        c.setAttribute('class','sticker');
        c.setAttribute('data-face', face);
        c.setAttribute('data-idx', row*3+col);
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 9);
        c.style.cursor = 'pointer';
        const dotTitle = document.createElementNS(svgNS,'title');
        c.appendChild(dotTitle);
        planarSvg.appendChild(c);
        dots.push(c);
      }
    }
    dotEls[face] = dots;
  });

  // 把屏幕坐标(clientX/clientY)换算成 planarSvg 内部的 viewBox 坐标
  function svgPointFromEvent(evt){
    const pt = planarSvg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = planarSvg.getScreenCTM();
    if(!ctm) return [0,0];
    const loc = pt.matrixTransform(ctm.inverse());
    return [loc.x, loc.y];
  }

  // 直接点击某个面的色块簇（贴纸或其间空隙）即可转动该面：以"该面朝外方向"为
  // 参照轴，鼠标位置相对面心落在参照轴的哪一侧（叉积正负）决定顺时针还是
  // 逆时针 —— 即"鼠标指针放在哪半边，就用那半边对应的转动方向"。
  function faceHalfIsCCW(face, evt){
    const [mx,my] = svgPointFromEvent(evt);
    const [cx,cy] = centroidOf[face];
    const [ux,uy] = outwardDir[face];
    const vx = mx-cx, vy = my-cy;
    const cross = ux*vy - uy*vx;
    return cross > 0;
  }
  function faceHintText(face, ccw){
    return FACE_COLOR_NAME[face] + (ccw ? "：逆时针 ↺（点这一侧）" : "：顺时针 ↻（点这一侧）");
  }
  FACES.forEach(face=>{
    const hitTitle = hitEls[face].querySelector('title');
    const updateHint = evt=>{ hitTitle.textContent = faceHintText(face, faceHalfIsCCW(face, evt)); };
    hitEls[face].addEventListener('mousemove', updateHint);
    hitEls[face].addEventListener('mouseenter', updateHint);
    hitEls[face].addEventListener('click', evt=>{
      if(animating) return;
      doMove(face, faceHalfIsCCW(face, evt), undefined, commitStep);
    });
    dotEls[face].forEach(dot=>{
      const dotTitle = dot.querySelector('title');
      const updateDotHint = evt=>{ dotTitle.textContent = faceHintText(face, faceHalfIsCCW(face, evt)); };
      dot.addEventListener('mousemove', updateDotHint);
      dot.addEventListener('mouseenter', updateDotHint);
      dot.addEventListener('click', evt=>{
        if(animating) return;
        doMove(face, faceHalfIsCCW(face, evt), undefined, commitStep);
      });
    });
  });

  // ====== 9 个绿色（F 面）贴纸上的序号 1-9 ======
  // 序号绑定到具体的「某枚贴纸实例」(cubieIndex + 'z+' 局部朝向) 可不是绑定到格子。
  // 所以序号会跟着贴纸一起飞、被一起打到其他面上。
  // 需求：去掉 F 面（绿色）上的 1-9 数字，不再声明序号相关数组、不再生成序号元素。

  // 根据每个序号当前所在格子，更新其位置与可见性（静态/动画结束后调用）
  function syncNumberLabels(){
  }

  // 第二遍：放置面标签 + 旋转按钮（朝外方向复用第一遍已算好的 outwardDir，避免重复计算）
  FACES.forEach(face=>{
    const [cx,cy] = centroidOf[face];
    const [dirx, diry] = outwardDir[face];
    const push = spreadOf[face] + 22;
    const lx = cx + dirx*push, ly = cy + diry*push;

    const wrap = document.createElement('div');
    wrap.className = 'face-label';
    wrap.style.left = ((lx+VB)/(2*VB)*100) + '%';
    wrap.style.top = ((ly+VB)/(2*VB)*100) + '%';

    const label = document.createElement('div');
    label.className = 'lbl-text';
    label.textContent = clusterLabel[face];

    const ctrl = document.createElement('div');
    ctrl.className = 'cluster-ctrl';
    const ccwBtn = document.createElement('button');
    ccwBtn.className = 'mini-btn'; ccwBtn.textContent = '↺';
    ccwBtn.title = FACE_COLOR_NAME[face] + "' (逆时针)";
    ccwBtn.addEventListener('click', ()=>doMove(face, true, undefined, commitStep));
    const cwBtn = document.createElement('button');
    cwBtn.className = 'mini-btn'; cwBtn.textContent = '↻';
    cwBtn.title = FACE_COLOR_NAME[face] + ' (顺时针)';
    cwBtn.addEventListener('click', ()=>doMove(face, false, undefined, commitStep));
    ctrl.appendChild(ccwBtn); ctrl.appendChild(cwBtn);

    wrap.appendChild(label);
    wrap.appendChild(ctrl);
    faceLabelsRoot.appendChild(wrap);
  });

  function render2D(){
    FACES.forEach(face=>{
      const grid = getFaceGrid(face);
      const flat = [grid[0][0],grid[0][1],grid[0][2],grid[1][0],grid[1][1],grid[1][2],grid[2][0],grid[2][1],grid[2][2]];
      flat.forEach((letter,i)=>{
        const el = dotEls[face][i];
        el.style.fill = COLOR[letter] || CORE_COLOR;
        el.style.opacity = '1';
      });
    });
    syncNumberLabels();
  }

  /* ============================================================
     4. 3D 立体图渲染
     ============================================================ */
  const CS = 54;         // cubie size (px)
  const GAP = 3;
  const SPACING = CS + GAP;
  document.documentElement.style.setProperty('--cs', CS+'px');

  const cubeGroup = document.getElementById('cubeGroup');
  const sliceGroup = document.getElementById('sliceGroup');
  const sceneEl = document.getElementById('scene');
  const sceneHitEl = document.getElementById('sceneHit') || sceneEl;  // 拖拽热区(纯2D矩形)

  // 局部朝向(数学系, y向上) -> 子面 CSS 变换 (固定不变)
  const R2 = CS/2;
  const faceChildTransform = {
    'z+': `translateZ(${R2}px)`,
    'z-': `rotateY(180deg) translateZ(${R2}px)`,
    'x+': `rotateY(90deg) translateZ(${R2}px)`,
    'x-': `rotateY(-90deg) translateZ(${R2}px)`,
    'y+': `rotateX(90deg) translateZ(${R2}px)`,
    'y-': `rotateX(-90deg) translateZ(${R2}px)`,
  };
  const LOCAL_KEYS = ['x+','x-','y+','y-','z+','z-'];

  // f = [1,-1,1] 把数学坐标(y朝上)转换为 CSS 坐标(y朝下)，复用避免每次分配
  const CSS_FLIP = [1,-1,1];
  const _mBuf = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
  function orientToMatrix3d(O, pos){
    const f = CSS_FLIP;
    const m = _mBuf;
    m[0]=O[0][0]*f[0]*f[0]; m[1]=O[1][0]*f[1]*f[0]; m[2]=O[2][0]*f[2]*f[0]; m[3]=0;
    m[4]=O[0][1]*f[0]*f[1]; m[5]=O[1][1]*f[1]*f[1]; m[6]=O[2][1]*f[2]*f[1]; m[7]=0;
    m[8]=O[0][2]*f[0]*f[2]; m[9]=O[1][2]*f[1]*f[2]; m[10]=O[2][2]*f[2]*f[2]; m[11]=0;
    m[12]=pos[0]*f[0]*SPACING; m[13]=pos[1]*f[1]*SPACING; m[14]=pos[2]*f[2]*SPACING; m[15]=1;
    return 'matrix3d('+m.join(',')+')';
  }

  let cubieEls = null; // 缓存 27 个 cubie DOM 元素，避免每次重建

  function buildCubieEl(c){
    const el = document.createElement('div');
    el.className = 'cubie';
    el.style.transform = orientToMatrix3d(c.orient, c.pos);
    LOCAL_KEYS.forEach(key=>{
      const f = document.createElement('div');
      f.className = 'face';
      f.style.transform = faceChildTransform[key];
      const letter = c.paint[key];
      f.style.background = letter ? COLOR[letter] : CORE_COLOR;
      el.appendChild(f);
    });
    return el;
  }

  function render3D(){
    if(!cubieEls){
      // 首次：构建并缓存
      cubeGroup.innerHTML = '';
      sliceGroup.innerHTML = '';
      sliceGroup.style.transform = '';
      cubieEls = cubies.map(c=>{
        const el = buildCubieEl(c);
        cubeGroup.appendChild(el);
        return el;
      });
    }else{
      // 后续：先归位，再清空 sliceGroup（避免销毁元素导致重建合成层）
      cubies.forEach((c, i)=>{
        const el = cubieEls[i];
        if(el.parentNode !== cubeGroup) cubeGroup.appendChild(el);
      });
      sliceGroup.style.transform = '';
      // 只更新 transform 和颜色
      cubies.forEach((c, i)=>{
        const el = cubieEls[i];
        el.style.transform = orientToMatrix3d(c.orient, c.pos);
        const faces = el.children;
        LOCAL_KEYS.forEach((key, j)=>{
          const letter = c.paint[key];
          faces[j].style.background = letter ? COLOR[letter] : CORE_COLOR;
        });
      });
    }
  }

  /* ============================================================
     5. 联动：执行一次转动（3D 分层旋转 + 2D 贴纸真实"飞行"动画），
        并在两边动画结束后统一刷新
     ============================================================ */
  let animating = false;
  let moveHistory = []; // 每一步是一个数组 [[face,prime],...]，单步=1条，复合操作=整组
  let pendingStep = []; // 当前正在执行的步骤暂存区

  function commitStep(){
    if(pendingStep.length){ moveHistory.push(pendingStep); pendingStep = []; }
  }

  function setControlsDisabled(disabled){
    document.querySelectorAll('.move-btn, .mini-btn, .combo-opt, #scrambleBtn, #resetBtn').forEach(b=>b.disabled=disabled);
    if(!disabled) updateFaceBtnsDisabled(); // 恢复旋转面中顶面同色/对面的禁用
  }

  // 绕给定圆心 center 把 from 沿"半径 + 角度"同时插值到 to —— 视觉上就是绕那个
  // 圆心转过去，而不是直线平移。center 必须是三个"三层同心圆"圆心之一。
  //
  // 关键：扫角 da 由 bestPivot 预先按本次转动的 sign 强制选好（含方向），
  // 这里不再走"最短路径"。否则一次面转动里不同贴纸的最短路径方向不一致，
  // 视觉就会一半顺时针一半逆时针。强制统一 sign 后再到动画里线性插值即可。
  function polarLerp(from, to, t, center, da, trackRadius){
    const ox = center[0], oy = center[1];
    const r0 = Math.hypot(from[0]-ox, from[1]-oy), a0 = Math.atan2(from[1]-oy, from[0]-ox);
    const r1 = Math.hypot(to[0]-ox,   to[1]-oy);
    let r = r0 + (r1-r0)*t;
    if(trackRadius !== null && trackRadius !== undefined){
      const dock = 0.14;
      if(t < dock) r = r0 + (trackRadius-r0)*(t/dock);
      else if(t > 1-dock) r = trackRadius + (r1-trackRadius)*((t-(1-dock))/dock);
      else r = trackRadius;
    }
    const a = a0 + da*t;
    return [ox + r*Math.cos(a), oy + r*Math.sin(a)];
  }

  // 一枚贴纸从 from 飞到 to，应该绕 X/Y/Z 三个同心圆圆心中的哪一个转、转多少？
  //
  // 思路：先按本次转动 sign 把"自然最短径"的扫角归一化到目标方向（>0 表 CCW，<0 表 CW），
  // 即若 da 与 sign 方向相反则补 ±2π 让它"绕过来"也朝该方向走。
  // 然后从 X/Y/Z 三个圆心里挑出 "强制方向后总扫角绝对值最小"的那个 —— 这个圆心
  // 在该方向上需要的弧最少，视觉上最接近 90° 的自然弧；同时因为是按 sign 强制选的，
  // 同一次转动里所有贴纸的方向都被强制统一，再也不会"一半顺时针一半逆时针"。
  function signedSweep(from, to, center, sign){
    const a0 = Math.atan2(from[1]-center[1], from[0]-center[0]);
    const a1 = Math.atan2(to[1]-center[1],   to[0]-center[0]);
    let da = a1 - a0;
    while(da >  Math.PI) da -= Math.PI*2;
    while(da < -Math.PI) da += Math.PI*2;
    if(sign > 0 && da <= 0) da += Math.PI*2;
    else if(sign < 0 && da >= 0) da -= Math.PI*2;
    return da;
  }

  function bestPivot(from, to, sign, face){
    let bestCenter = bundleCenters[AXES3[0]], bestDa = 0;
    AXES3.forEach(ax=>{
      const c = bundleCenters[ax];
      const a0 = Math.atan2(from[1]-c[1], from[0]-c[0]);
      const a1 = Math.atan2(to[1]-c[1],   to[0]-c[0]);
      let da = a1 - a0;
      while(da >  Math.PI) da -= Math.PI*2;
      while(da < -Math.PI) da += Math.PI*2;
      // 把扫角强制成与 sign 同方向：sign>0 -> da>0(CCW)，sign<0 -> da<0(CW)
      if(sign > 0 && da <= 0) da += Math.PI*2;
      else if(sign < 0 && da >= 0) da -= Math.PI*2;
      if(bestDa === 0 || Math.abs(da) < Math.abs(bestDa) - 1e-9){
        bestDa = da;
        bestCenter = c;
      }
    });
    // 如果按"最短强制弧"选出的圆心走起来仍要绕一大圆（>π），
    // 改用 本面所对应轴的圆心 —— 它是该面 9 个贴纸的几何中心，走该圆心视觉上
    // 是该面整体转动自身、最符合「绕该面顺/逆时针」的直观感受。
    if(Math.abs(bestDa) > Math.PI + 1e-6){
      const c = bundleCenters[faceAxisLetter[face]];
      const a0 = Math.atan2(from[1]-c[1], from[0]-c[0]);
      const a1 = Math.atan2(to[1]-c[1],   to[0]-c[0]);
      let da = a1 - a0;
      while(da >  Math.PI) da -= Math.PI*2;
      while(da < -Math.PI) da += Math.PI*2;
      if(sign > 0 && da <= 0) da += Math.PI*2;
      else if(sign < 0 && da >= 0) da -= Math.PI*2;
      bestDa = da;
      bestCenter = c;
    }
    return { center: bestCenter, da: bestDa };
  }

  function planarFlightPath(from, to, sign, face, fromSlot, toSlot){
    if(fromSlot.face === face && toSlot.face === face){
      const center = centroidOf[face];
      return { center, da: signedSweep(from, to, center, sign), trackRadius:null };
    }
    // 跨面飞行(绕本面对应轴的束圆心):负轴面(D/B/L)在平面嵌入里"外圈"天然与"面内"反向,
    // 故符号取 signOf[face]*sign(正轴面 signOf=+1 不变;负轴面 signOf=-1 取反),
    // 让外圈跟随其自然方向 → 短弧、且与面内反向,与 3D 真实旋转一致(用户观察:面内顺时针时外圈应逆时针)。
    const crossSign = signOf[face] * sign;
    const center = bundleCenters[faceAxisLetter[face]];
    const neighborTrackRadius = (face==='D' || face==='B' || face==='L') ? RADII3[2] : RADII3[0];
    return { center, da: signedSweep(from, to, center, crossSign), trackRadius:neighborTrackRadius };
  }

  function doMove(face, prime, opts, onDone){
    opts = opts || {};
    if(animating) return;
    animating = true;
    setControlsDisabled(true);

    if(opts.record !== false) pendingStep.push([face, prime]);

    const desiredSign = prime ? -1 : 1;
    // —— 单状态 + 标准记号(与原始 app.js 一样:2D 与 3D 共用一份状态,永远对应) ——
    // 顺时针按钮(prime=false) → 标准顺时针状态(baseMatrix 非转置);逆时针(prime=true) → 转置。
    // 实测:标准顺时针状态在 2D 屏幕上对六面都呈视觉顺时针,故 sign2d=desiredSign 让 2D 六面
    //       方向都正确;3D 动画角 = 标准顺时针角 -signOf[face]*90,与状态匹配→不撕裂。
    // (注:此方案下 2D 橙/白/蓝转完后的排列是"标准正确"版,与 3D 完全一致;
    //   它和原始 app.js 的橙白蓝排列互为镜像——这是单状态下兼顾"3D正确+两边对应"的唯一解。)
    const revFace = (face==='U'||face==='F'||face==='R'); // 镜像面(语义保留,方向不再依赖它)
    const actualPrime = prime;                            // 单一状态,标准记号
    const info = faceInfo[face];
    const axis = axisOf[face];
    const sign2d = desiredSign;                           // 2D 飞行方向:CW 按钮→CW 视觉
    const sign3d = -signOf[face] * desiredSign;           // 3D 动画角:匹配 actualPrime,不撕裂

    // 1) 记下这一层 9 个 cubie（转动前的索引），以及它们身上每枚贴纸转动前所在的格子
    const movingIdx = [];
    cubies.forEach((c,idx)=>{ if(c.pos[info.axis] === info.val) movingIdx.push(idx); });

    const beforeList = [];
    movingIdx.forEach(idx=>{
      const c = cubies[idx];
      Object.keys(c.paint).forEach(key=>{
        const slot = getStickerSlot(c, key);
        if(slot) beforeList.push({idx, key, slot});
      });
    });

    // 2) 3D DOM 元素挪去 sliceGroup（视觉位置不变），供分层旋转动画使用
    const movingEls = movingIdx.map(idx => cubieEls[idx]);
    movingEls.forEach(el=>sliceGroup.appendChild(el));

    // 3) 真正更新状态（单一状态,2D 与 3D 共用,故永远对应）
    applyMoveState(face, actualPrime);

    // 4) 对比转动前后，找出真正换了格子的贴纸 —— 这些才需要"飞"
    const flights = [];
    beforeList.forEach(({idx,key,slot})=>{
      const newSlot = getStickerSlot(cubies[idx], key);
      if(newSlot.face!==slot.face || newSlot.row!==slot.row || newSlot.col!==slot.col){
        const from = faceCoord[slot.face][slot.row][slot.col];
        const to   = faceCoord[newSlot.face][newSlot.row][newSlot.col];
        // sign2d>0 → 飞行弧视觉顺时针(CW)，sign2d<0 → 视觉逆时针(CCW)；
        // sign2d = desiredSign 直接随按钮方向，与标准状态置换同向，故飞行弧取最短径。
        const piv = planarFlightPath(from, to, sign2d, face, slot, newSlot);
        flights.push({
          idx, key,
          fromSlot: slot, toSlot: newSlot,
          from, to,
          pivot: piv.center, da: piv.da, trackRadius: piv.trackRadius,
          color: COLOR[slot.color],
        });
      }
    });

    // 5) 涉及到的固定格子先隐藏（避免和飞行中的临时圆点重叠显示）
    const hiddenEls = new Set();
    flights.forEach(f=>{
      hiddenEls.add(dotEls[f.fromSlot.face][f.fromSlot.row*3+f.fromSlot.col]);
      hiddenEls.add(dotEls[f.toSlot.face][f.toSlot.row*3+f.toSlot.col]);
    });
    hiddenEls.forEach(el=>el.style.opacity='0');
    window.__lastFlights = flights.length;
    window.__lastBeforeCount = beforeList.length;
    window.__lastAngles = flights.map(f=>Math.round(f.da*180/Math.PI));

    if(location.hash.indexOf('dbg')>=0){
      console.group('%c[doMove '+face+(prime?"'":'')+' sign2d='+sign2d+']','color:#06c');
      flights.forEach(f=>{
        const found = Object.entries(bundleCenters).find(([k,c])=>c===f.pivot);
        const pivKey = found ? found[0] : '本面质心';
        const deg = (f.da*180/Math.PI).toFixed(0);
        console.log(`${f.fromSlot.face}${f.fromSlot.row}${f.fromSlot.col} (${f.key}) -> ${f.toSlot.face}${f.toSlot.row}${f.toSlot.col}` + ` \u7ed5\u5706\u5fc3 ${pivKey} \u626b\u8c9d ${deg}\u00b0`);
      });
      console.log('flights total =', flights.length);
      window.__lastFlights = flights.length;
      window.__lastBeforeCount = beforeList.length;
      console.groupEnd();
    }

    // 5.5) 序号已移除，不再计算数字飞行索引。

    const duration = opts.fast ? 180 : 380;
    let pending = 2; // 3D + 2D 两条动画都跑完才算完成
    function checkDone(){
      pending--;
      if(pending===0){
        render3D();
        render2D();
        animating = false;
        if(!opts.keepDisabled) setControlsDisabled(false);
        if(onDone) onDone();
      }
    }

    // --- 3D：分层旋转 ---
    const start3D = performance.now();
    function frame3D(now){
      let t = Math.min(1, (now-start3D)/duration);
      const eased = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
      sliceGroup.style.transform = rotMatrix3d(axis, sign3d*90*eased*Math.PI/180);
      if(t<1) requestAnimationFrame(frame3D); else checkDone();
    }
    requestAnimationFrame(frame3D);

    // --- 2D：贴纸绕圆心"飞"到新位置 ---
    if(flights.length===0){
      checkDone();
    }else{
      const flyEls = flights.map(f=>{
        const el = document.createElementNS(svgNS,'circle');
        el.setAttribute('class','sticker flying');
        el.setAttribute('r', 9);
        el.style.fill = f.color;
        el.setAttribute('cx', f.from[0]);
        el.setAttribute('cy', f.from[1]);
        planarSvg.appendChild(el);
        return el;
      });
      const start2D = performance.now();
      function frame2D(now){
        let t = Math.min(1, (now-start2D)/duration);
        const eased = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
        flights.forEach((f,i)=>{
          const [x,y] = polarLerp(f.from, f.to, eased, f.pivot, f.da, f.trackRadius);
          flyEls[i].setAttribute('cx', x);
          flyEls[i].setAttribute('cy', y);
        });
        if(t<1){
          requestAnimationFrame(frame2D);
        }else{
          flyEls.forEach(el=>el.remove());
          checkDone();
        }
      }
      requestAnimationFrame(frame2D);
    }
  }

  // 生成绕数学坐标轴 axis(0=x,1=y,2=z) 旋转 angle 弧度 的 CSS matrix3d（同样做 y 翻转换算）
  function rotMatrix3d(axis, angle){
    const c = Math.cos(angle), s = Math.sin(angle);
    let M;
    if(axis===0) M=[[1,0,0],[0,c,-s],[0,s,c]];
    else if(axis===1) M=[[c,0,s],[0,1,0],[-s,0,c]];
    else M=[[c,-s,0],[s,c,0],[0,0,1]];
    const f=[1,-1,1];
    const Op=[[0,0,0],[0,0,0],[0,0,0]];
    for(let i=0;i<3;i++)for(let j=0;j<3;j++) Op[i][j]=M[i][j]*f[i]*f[j];
    const m=[Op[0][0],Op[1][0],Op[2][0],0, Op[0][1],Op[1][1],Op[2][1],0, Op[0][2],Op[1][2],Op[2][2],0, 0,0,0,1];
    return 'matrix3d('+m.join(',')+')';
  }

  /* ============================================================
     6. 控制按钮 (3D 面板下方)
     ============================================================ */
  const controlsRoot = document.getElementById('controls');

  // —— 复合操作面板状态 ——
  const comboState = { top:'U', face:'F', hand:'right', count:1 };
  // 右手(上左下右): X顺 → top顺 → X逆 → top逆
  // 左手(上右下左): X逆 → top逆 → X顺 → top顺
  function buildComboSeq(top, face, hand){
    if(hand==='right') return [[face,false],[top,false],[face,true],[top,true]];
    return [[face,true],[top,true],[face,false],[top,false]];
  }

  // 顺序执行一串转动(复用 doMove 的 onDone 链)；opts 透传(默认正常速度、记入历史)
  function runSequence(seq, opts, onAllDone){
    let i=0;
    (function step(){
      if(i>=seq.length){ if(onAllDone) onAllDone(); return; }
      const [f,p] = seq[i++];
      doMove(f, p, opts, step);
    })();
  }

  // —— 左栏：单步转动(原 12 按钮) ——
  const leftCol = document.createElement('div');
  leftCol.className = 'controls-col';
  const leftTitle = document.createElement('div');
  leftTitle.className = 'col-title'; leftTitle.textContent = '单步转动';
  leftCol.appendChild(leftTitle);
  const rows = [['U','D'],['F','B'],['L','R']];
  rows.forEach(pair=>{
    const row = document.createElement('div');
    row.className = 'move-row';
    pair.forEach(face=>{
      [false,true].forEach(prime=>{
        const btn = document.createElement('button');
        btn.className = 'move-btn move-face-'+face;
        btn.textContent = FACE_COLOR_NAME[face] + (prime?"'":'');
        btn.addEventListener('click', ()=>doMove(face, prime, undefined, commitStep));
        row.appendChild(btn);
      });
    });
    leftCol.appendChild(row);
  });

  // —— 右栏：复合操作面板(五步选择) ——
  const rightCol = document.createElement('div');
  rightCol.className = 'controls-col';
  const rightTitle = document.createElement('div');
  rightTitle.className = 'col-title'; rightTitle.textContent = '复合操作';
  rightCol.appendChild(rightTitle);

  const panel = document.createElement('div');
  panel.className = 'combo-panel';

  const comboLeft = document.createElement('div');
  comboLeft.className = 'combo-left';
  panel.appendChild(comboLeft);

  // 通用：创建一组 radio 风格的选择按钮
  function makeOptionGroup(labelText, options, stateKey, onChange){
    const group = document.createElement('div');
    group.className = 'combo-group';
    const label = document.createElement('div');
    label.className = 'combo-group-label'; label.textContent = labelText;
    group.appendChild(label);
    const opts = document.createElement('div');
    opts.className = 'combo-options';
    const btns = [];
    options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.className = 'combo-opt' + (opt.cls ? ' '+opt.cls : '');
      btn.textContent = opt.label;
      if(opt.title) btn.title = opt.title;
      if(comboState[stateKey] === opt.value) btn.classList.add('active');
      btn.addEventListener('click', ()=>{
        if(animating) return;
        comboState[stateKey] = opt.value;
        btns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        if(onChange) onChange();
      });
      btns.push(btn);
      opts.appendChild(btn);
    });
    group.appendChild(opts);
    comboLeft.appendChild(group);
    return btns;
  }

  const faceOptions = FACES.map(f=>({ label:FACE_COLOR_NAME[f], value:f, cls:'c-'+f, title:FACE_COLOR_NAME[f]+'('+f+')' }));

  // 1. 顶面选择
  const topBtns = makeOptionGroup('1. 以什么为顶面', faceOptions, 'top', onTopChange);
  // 2. 旋转面选择
  const faceBtns = makeOptionGroup('2. 选择旋转面', faceOptions, 'face', updateComboDesc);

  // 顶面改变时：禁用旋转面中的同色与对面，必要时自动切换旋转面
  function onTopChange(){
    updateFaceBtnsDisabled();
    updateComboDesc();
  }
  function updateFaceBtnsDisabled(){
    const top = comboState.top;
    const opp = oppositeFace[top];
    const disabled = new Set([top, opp]);
    faceBtns.forEach((btn, i)=>{
      const f = FACES[i];
      btn.disabled = disabled.has(f);
    });
    // 若当前旋转面已被禁用，自动选第一个可用的
    if(disabled.has(comboState.face)){
      const available = FACES.find(f=>!disabled.has(f));
      comboState.face = available;
      faceBtns.forEach((btn, i)=>{
        btn.classList.toggle('active', FACES[i]===available);
      });
    }
  }
  updateFaceBtnsDisabled();
  // 3. 操作方向
  makeOptionGroup('3. 执行操作', [
    { label:'左手公式', value:'left', title:'上右下左：X逆 → 顶逆 → X顺 → 顶顺' },
    { label:'右手公式', value:'right', title:'上左下右：X顺 → 顶顺 → X逆 → 顶逆' },
  ], 'hand', updateComboDesc);
  // 4. 执行数量
  makeOptionGroup('4. 执行数量', [1,2,3,4,5,6].map(n=>({ label:String(n), value:n })), 'count', updateComboDesc);

  // 序列预览
  const descEl = document.createElement('div');
  descEl.className = 'combo-desc';
  comboLeft.appendChild(descEl);

  // 5. 执行按钮
  const execBtn = document.createElement('button');
  execBtn.className = 'combo-exec';
  execBtn.textContent = '执行';
  execBtn.addEventListener('click', ()=>{
    if(animating) return;
    if(comboState.top === comboState.face) return;
    const baseSeq = buildComboSeq(comboState.top, comboState.face, comboState.hand);
    let fullSeq = [];
    for(let i=0; i<comboState.count; i++) fullSeq = fullSeq.concat(baseSeq);
    runSequence(fullSeq, undefined, commitStep);
  });
  panel.appendChild(execBtn);

  function updateComboDesc(){
    const {top, face, hand, count} = comboState;
    const same = (top === face);
    execBtn.disabled = same;
    if(same){
      descEl.textContent = '⚠ 顶面与旋转面不能相同';
      return;
    }
    const seq = buildComboSeq(top, face, hand);
    const oneRound = seq.map(([f,p])=>FACE_COLOR_NAME[f]+(p?"'":'')).join(' → ');
    descEl.textContent = (hand==='right'?'右手公式':'左手公式') + '：' + oneRound + (count>1 ? '  ×'+count : '');
  }
  updateComboDesc();

  rightCol.appendChild(panel);

  controlsRoot.appendChild(leftCol);
  controlsRoot.appendChild(rightCol);

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(animating) return;
    if(moveHistory.length===0) return;
    // 取出最后一步，逆序+反向播放回去
    const lastStep = moveHistory.pop();
    const seq = lastStep.slice().reverse().map(([f,p])=>[f, !p]);
    runSequence(seq, {fast:true, record:false});
  });

  document.getElementById('scrambleBtn').addEventListener('click', ()=>{
    if(animating) return;
    const seq = [];
    let last = null;
    for(let i=0;i<16;i++){
      let f;
      do{ f = FACES[Math.floor(Math.random()*FACES.length)]; } while(f===last);
      last = f;
      seq.push([f, Math.random()<0.5]);
    }
    runSequence(seq, {fast:true}, commitStep);
  });

  /* ============================================================
     7. 视角拖拽（只改变相机角度，不影响魔方状态）
     ============================================================ */
  let dragging=false, lastX=0, lastY=0, yaw=-35, pitch=-24, rafPending=false;
  function setSceneTransform(){
    sceneEl.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg)`;
  }
  sceneHitEl.addEventListener('pointerdown', e=>{
    e.preventDefault();           // 阻止浏览器发起原生选中/拖拽（no-drop 光标 + 卡顿）
    dragging=true; lastX=e.clientX; lastY=e.clientY;
    sceneHitEl.classList.add('grabbing');
    sceneHitEl.setPointerCapture(e.pointerId);
  });
  sceneHitEl.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const dx = e.clientX-lastX, dy = e.clientY-lastY;
    lastX=e.clientX; lastY=e.clientY;
    yaw += dx*0.4;
    pitch -= dy*0.4;
    pitch = Math.max(-85, Math.min(85, pitch));
    if(!rafPending){
      rafPending = true;
      requestAnimationFrame(()=>{ setSceneTransform(); rafPending = false; });
    }
  });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>{
    sceneHitEl.addEventListener(ev, ()=>{ dragging=false; sceneHitEl.classList.remove('grabbing'); });
  });

  /* ============================================================
     8. 初始渲染
     ============================================================ */
  setSceneTransform();
  render3D();
  render2D();

  /* ============================================================
     9. 键盘快捷键（可切换：颜色键 / 标准键 U/D/F/B/L/R）
     ============================================================ */
  const KEY_MAPS = {
    color: {
      'h':['U',false],'H':['U',true],
      'b':['D',false],'B':['D',true],
      'g':['F',false],'G':['F',true],
      'l':['B',false],'L':['B',true],
      'r':['R',false],'R':['R',true],
      'c':['L',false],'C':['L',true],
    },
    standard: {
      'u':['U',false],'U':['U',true],
      'd':['D',false],'D':['D',true],
      'f':['F',false],'F':['F',true],
      'b':['B',false],'B':['B',true],
      'r':['R',false],'R':['R',true],
      'l':['L',false],'L':['L',true],
    },
  };
  const HINT_TEXTS = {
    color: '<b>H</b>黄 / <b>B</b>白 / <b>G</b>绿 / <b>L</b>蓝 / <b>R</b>红 / <b>C</b>橙',
    standard: '<b>U</b>上 / <b>D</b>下 / <b>F</b>前 / <b>B</b>后 / <b>R</b>右 / <b>L</b>左',
  };
  let activeKeyMap = KEY_MAPS.color;

  const keySchemeSel = document.getElementById('keyScheme');
  const keyHintSpan = document.getElementById('keyHintText');
  keySchemeSel.addEventListener('change', ()=>{
    activeKeyMap = KEY_MAPS[keySchemeSel.value];
    keyHintSpan.innerHTML = HINT_TEXTS[keySchemeSel.value];
  });

  document.addEventListener('keydown', e=>{
    if(animating) return;
    if(e.repeat) return;
    const move = activeKeyMap[e.key];
    if(move){
      e.preventDefault();
      doMove(move[0], move[1], undefined, commitStep);
    }
  });
})();
