(function(){
  var $ = function(s){ return document.querySelector(s); };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var uid = function(){ return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); };
  var pad = function(n){ return String(n).padStart(2, '0'); };
  function dstr(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr(){ return dstr(new Date()); }
  function fmtDue(s){
    if (!s) return '';
    var t = new Date(); if (s === dstr(t)) return 'Today';
    t.setDate(t.getDate() + 1); if (s === dstr(t)) return 'Tomorrow';
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
  }
  function dueCls(s, done){ if (!s || done) return ''; var t = todayStr(); return s < t ? 'late' : (s === t ? 'today' : ''); }
  function dueTag(s, done){ return s ? '<span class="due ' + dueCls(s, done) + '">' + esc(fmtDue(s)) + '</span>' : ''; }
  var CHECK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CROSS = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var toastTimer;
  function toast(msg){
    var el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ el.hidden = true; }, 3500);
  }

  /* ---------- My tasks (kept in this browser) ---------- */
  var KEY = 'doable.me.v1';
  var me = {tasks: [], filter: 'all', editing: null};
  function seed(){
    var n = Date.now();
    return [
      {id: uid(), title: 'Add your first real task above', done: false, due: todayStr(), created: n},
      {id: uid(), title: 'Tick this one off to see progress move', done: false, due: '', created: n + 1},
      {id: uid(), title: 'Delete these examples when you are ready', done: false, due: '', created: n + 2}
    ];
  }
  function loadMe(){
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && Array.isArray(o.tasks)) { me.tasks = o.tasks; return; } }
    } catch (e) {}
    me.tasks = seed();
  }
  function saveMe(){ try { localStorage.setItem(KEY, JSON.stringify({tasks: me.tasks})); } catch (e) {} }

  function renderMe(){
    var total = me.tasks.length, done = me.tasks.filter(function(t){ return t.done; }).length, left = total - done;
    $('#me-bar').style.width = (total ? Math.round(done / total * 100) : 0) + '%';
    $('#me-count').textContent = done + ' of ' + total + ' done';
    $('#me-sub').textContent = !total ? 'Nothing here yet.' : (left === 0 ? 'All done. Nice work.' : left + (left === 1 ? ' task left' : ' tasks left'));
    var f = [['all', 'All', total], ['todo', 'To do', left], ['done', 'Done', done]];
    $('#me-filters').innerHTML = f.map(function(x){
      return '<button class="ghost" type="button" data-f="' + x[0] + '" aria-pressed="' + (me.filter === x[0]) + '">' + x[1] + '<b>' + x[2] + '</b></button>';
    }).join('');
    var list = me.tasks.filter(function(t){ return me.filter === 'all' || (me.filter === 'done' ? t.done : !t.done); });
    list.sort(function(a, b){
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
      if (!!a.due !== !!b.due) return a.due ? -1 : 1;
      return a.created - b.created;
    });
    if (!list.length) {
      $('#me-list').innerHTML = '<li class="empty"><strong>' + (total ? 'Nothing in this view' : 'A clean slate') + '</strong>' +
        (total ? 'Switch the filter to see the rest.' : 'Type a task above and press Enter.') + '</li>';
    } else {
      $('#me-list').innerHTML = list.map(function(t){
        var title = me.editing === t.id
          ? '<input class="in edit" id="edit-' + esc(t.id) + '" value="' + esc(t.title) + '" maxlength="200" aria-label="Edit task">'
          : '<span class="t" data-act="edit">' + esc(t.title) + '</span>';
        return '<li class="item' + (t.done ? ' done' : '') + '" data-id="' + esc(t.id) + '">' +
          '<button class="check" type="button" data-act="toggle" aria-label="' + (t.done ? 'Mark as not done' : 'Mark as done') + '" aria-pressed="' + t.done + '">' + CHECK + '</button>' +
          '<div class="body">' + title + dueTag(t.due, t.done) + '</div>' +
          '<button class="icon" type="button" data-act="del" aria-label="Delete task">' + CROSS + '</button></li>';
      }).join('');
    }
    $('#me-clear').hidden = done === 0;
    if (me.editing) { var inp = document.getElementById('edit-' + me.editing); if (inp) { inp.focus(); inp.select(); } }
  }
  function commitEdit(id, val){
    if (me.editing !== id) return;
    me.editing = null;
    var t = me.tasks.find(function(x){ return x.id === id; });
    val = (val || '').trim();
    if (t && val) { t.title = val; saveMe(); }
    renderMe();
  }
  $('#me-form').addEventListener('submit', function(e){
    e.preventDefault();
    var title = $('#me-title').value.trim(); if (!title) return;
    me.tasks.push({id: uid(), title: title, done: false, due: $('#me-due').value, created: Date.now()});
    $('#me-title').value = ''; $('#me-due').value = '';
    saveMe(); renderMe(); $('#me-title').focus();
  });
  $('#me-filters').addEventListener('click', function(e){
    var b = e.target.closest('[data-f]'); if (!b) return;
    me.filter = b.getAttribute('data-f'); renderMe();
  });
  $('#me-list').addEventListener('click', function(e){
    var b = e.target.closest('[data-act]'); if (!b) return;
    var li = b.closest('.item'); if (!li) return;
    var id = li.getAttribute('data-id'), act = b.getAttribute('data-act');
    var t = me.tasks.find(function(x){ return x.id === id; }); if (!t) return;
    if (act === 'toggle') { t.done = !t.done; saveMe(); renderMe(); }
    else if (act === 'del') { me.tasks = me.tasks.filter(function(x){ return x.id !== id; }); saveMe(); renderMe(); }
    else if (act === 'edit') { me.editing = id; renderMe(); }
  });
  $('#me-list').addEventListener('keydown', function(e){
    if (!e.target.classList.contains('edit')) return;
    var id = e.target.id.replace('edit-', '');
    if (e.key === 'Enter') commitEdit(id, e.target.value);
    else if (e.key === 'Escape') { me.editing = null; renderMe(); }
  });
  $('#me-list').addEventListener('focusout', function(e){
    if (e.target.classList && e.target.classList.contains('edit')) commitEdit(e.target.id.replace('edit-', ''), e.target.value);
  });
  $('#me-clear').addEventListener('click', function(){
    me.tasks = me.tasks.filter(function(t){ return !t.done; }); saveMe(); renderMe();
  });

  /* ---------- Team (shared via /api/team when available, otherwise on this device) ---------- */
  var LANES = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
  var team = {started: false, canWrite: true, name: '', members: [], tasks: [], filter: 'all', loaded: {p: false, m: false, t: false}, failed: false};

  function initial(n){ return (n || '?').trim().charAt(0).toUpperCase() || '?'; }
  function memberById(id){ return team.members.find(function(m){ return m.id === id; }); }
  function avatar(m){ return '<span class="av c' + (m ? m.color % 6 : 5) + '" aria-hidden="true">' + esc(m ? initial(m.name) : '?') + '</span>'; }

  async function save(fn){
    try { await fn(); }
    catch (e) { toast(e && e.code === 'quota_exceeded' ? 'The team database is full.' : 'Could not save that. Try again.'); }
  }

  function renderTeam(){
    var allLoaded = team.loaded.p && team.loaded.m && team.loaded.t;
    var tasks = team.tasks, total = tasks.length, done = tasks.filter(function(t){ return t.status === 'done'; }).length;
    $('#tm-bar').style.width = (total ? Math.round(done / total * 100) : 0) + '%';
    $('#tm-count').textContent = done + ' of ' + total + ' done';
    $('#tm-sub').textContent = team.failed ? 'Could not load the team board.' : (!allLoaded ? 'Loading the team board…' :
      team.members.length + (team.members.length === 1 ? ' teammate' : ' teammates') + ' · ' + (total - done) + ' open');
    if (document.activeElement !== $('#tm-name')) $('#tm-name').value = team.name;

    // people row (doubles as the filter)
    var unassigned = tasks.filter(function(t){ return !t.assignee || !memberById(t.assignee); }).length;
    var chips = '<span class="chipw plain" data-on="' + (team.filter === 'all') + '"><button class="chip" type="button" data-f="all">Everyone <b>' + done + '/' + total + '</b></button></span>';
    team.members.forEach(function(m){
      var mine = tasks.filter(function(t){ return t.assignee === m.id; });
      var md = mine.filter(function(t){ return t.status === 'done'; }).length;
      chips += '<span class="chipw" data-on="' + (team.filter === m.id) + '"><button class="chip" type="button" data-f="' + esc(m.id) + '">' + avatar(m) + esc(m.name) + ' <b>' + md + '/' + mine.length + '</b></button>' +
        '<button class="chipx editable" type="button" data-rm="' + esc(m.id) + '" aria-label="Remove ' + esc(m.name) + '">' + CROSS + '</button></span>';
    });
    if (unassigned) chips += '<span class="chipw plain" data-on="' + (team.filter === 'none') + '"><button class="chip" type="button" data-f="none">Unassigned <b>' + unassigned + '</b></button></span>';
    chips += '<form class="tm-add editable" id="tm-form" autocomplete="off"><input class="in" id="tm-newname" type="text" placeholder="Add teammate" aria-label="Teammate name" maxlength="40"><button class="btn" type="submit" aria-label="Add teammate">Add</button></form>';
    var keepName = ($('#tm-newname') || {}).value || '', hadFocus = document.activeElement && document.activeElement.id === 'tm-newname';
    $('#tm-people').innerHTML = chips;
    if (keepName) $('#tm-newname').value = keepName;
    if (hadFocus) $('#tm-newname').focus();

    // assignee select in the add form
    var sel = $('#tt-who'), cur = sel.value;
    sel.innerHTML = '<option value="">Unassigned</option>' + team.members.map(function(m){ return '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>'; }).join('');
    if (cur && memberById(cur)) sel.value = cur;

    // board
    var shown = tasks.filter(function(t){
      if (team.filter === 'all') return true;
      if (team.filter === 'none') return !t.assignee || !memberById(t.assignee);
      return t.assignee === team.filter;
    });
    $('#tm-board').innerHTML = LANES.map(function(l){
      var items = shown.filter(function(t){ return (t.status || 'todo') === l[0]; }).sort(function(a, b){
        if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
        if (!!a.due !== !!b.due) return a.due ? -1 : 1;
        return (a.created || 0) - (b.created || 0);
      });
      var cards = items.length ? items.map(function(t){ return card(t, l[0]); }).join('') : '';
      return '<section class="lane" aria-label="' + l[1] + '"><h3><span class="dot ' + l[0] + '"></span>' + l[1] + ' <em>' + items.length + '</em></h3>' +
        (cards ? '<ul class="cards">' + cards + '</ul>' : '<div class="none">' + (l[0] === 'todo' ? 'Nothing waiting.' : l[0] === 'doing' ? 'Nothing in progress.' : 'Nothing finished yet.') + '</div>') + '</section>';
    }).join('');
  }
  function card(t, st){
    var m = memberById(t.assignee);
    var opts = '<option value="">Unassigned</option>' + team.members.map(function(x){
      return '<option value="' + esc(x.id) + '"' + (x.id === t.assignee ? ' selected' : '') + '>' + esc(x.name) + '</option>';
    }).join('');
    var acts = st === 'todo' ? '<button class="mini go" type="button" data-act="doing">Start</button>'
      : st === 'doing' ? '<button class="mini" type="button" data-act="todo">Back</button><button class="mini go" type="button" data-act="done">Mark done</button>'
      : '<button class="mini" type="button" data-act="todo">Reopen</button>';
    return '<li class="card' + (st === 'done' ? ' done' : '') + '" data-id="' + esc(t.id) + '">' +
      '<div class="ct">' + esc(t.title) + '</div>' +
      '<div class="cm"><label class="who">' + avatar(m) + '<select data-act="assign" aria-label="Assignee"' + (team.canWrite ? '' : ' disabled') + '>' + opts + '</select></label>' + dueTag(t.due, st === 'done') + '</div>' +
      '<div class="ca editable">' + acts + '<button class="icon" type="button" data-act="del" aria-label="Delete task">' + CROSS + '</button></div></li>';
  }

  var STORE = 'doable.team.v1', mode = 'local', busy = 0, lastJson = '', pollTimer = null;
  var LOCAL_NOTE = '<div class="note"><strong>This board is saved on this device only.</strong> To share it with your team, connect a free Neon database to your Vercel project (steps are in the README) and redeploy.</div>';
  var FAIL_NOTE = '<div class="notice">Cannot reach the server right now. Changes will work again once you are back online.</div>';

  function clean(v, n){ return String(v == null ? '' : v).trim().slice(0, n); }
  function validDue(s){ return s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function blank(){ return {name: '', members: [], tasks: []}; }
  function readLocal(){
    try { var o = JSON.parse(localStorage.getItem(STORE)); if (o && Array.isArray(o.members) && Array.isArray(o.tasks)) return o; } catch (e) {}
    return blank();
  }
  function writeLocal(s){ try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} }

  // Same actions the server understands, applied to the on-device copy.
  function reduce(s, a){
    var t;
    if (a.action === 'setName') s.name = clean(a.name, 80);
    else if (a.action === 'addMember') {
      var n = clean(a.name, 40);
      if (n) s.members.push({id: uid(), name: n, color: s.members.length % 6, created: Date.now()});
    }
    else if (a.action === 'removeMember') {
      s.members = s.members.filter(function(m){ return m.id !== a.id; });
      s.tasks.forEach(function(x){ if (x.assignee === a.id) x.assignee = ''; });
    }
    else if (a.action === 'addTask') {
      var title = clean(a.title, 200); if (!title) return;
      var who = s.members.some(function(m){ return m.id === a.assignee; }) ? a.assignee : '';
      var due = validDue(clean(a.due, 10)) ? clean(a.due, 10) : '';
      s.tasks.push({id: uid(), title: title, assignee: who, status: 'todo', due: due, created: Date.now()});
    }
    else if (a.action === 'updateTask') {
      t = s.tasks.find(function(x){ return x.id === a.id; }); if (!t) return;
      if (['todo', 'doing', 'done'].indexOf(a.status) >= 0) t.status = a.status;
      if (typeof a.assignee === 'string') t.assignee = s.members.some(function(m){ return m.id === a.assignee; }) ? a.assignee : '';
      if (typeof a.due === 'string' && validDue(a.due)) t.due = a.due;
    }
    else if (a.action === 'deleteTask') s.tasks = s.tasks.filter(function(x){ return x.id !== a.id; });
  }
  var localApi = {
    load: async function(){ return readLocal(); },
    act: async function(a){ var s = readLocal(); reduce(s, a); writeLocal(s); }
  };
  var remoteApi = {
    load: async function(){
      var r = await fetch('/api/team', {cache: 'no-store'});
      if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; }
      return r.json();
    },
    act: async function(a){
      var r = await fetch('/api/team', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(a)});
      if (!r.ok) throw new Error('http ' + r.status);
    }
  };
  var api = localApi;

  function setNotice(){ $('#tm-notice').innerHTML = mode === 'local' ? LOCAL_NOTE : ''; }
  function apply(d){
    team.name = d.name || '';
    team.members = d.members || [];
    team.tasks = d.tasks || [];
    if (team.filter !== 'all' && team.filter !== 'none' && !memberById(team.filter)) team.filter = 'all';
    team.loaded = {p: true, m: true, t: true}; team.failed = false;
    renderTeam();
  }
  async function refresh(){
    if (busy) return;
    try {
      var d = await api.load();
      var j = JSON.stringify(d);
      if (j !== lastJson || team.failed) { lastJson = j; setNotice(); apply(d); }
    } catch (e) {
      lastJson = ''; team.failed = true;
      $('#tm-notice').innerHTML = FAIL_NOTE;
      renderTeam();
    }
  }
  async function mutate(a){
    busy++;
    try { await api.act(a); }
    catch (e) { toast('Could not save that. Try again.'); }
    busy--;
    await refresh();
  }
  async function initTeam(){
    if (team.started) return; team.started = true;
    try {
      var d = await remoteApi.load();
      api = remoteApi; mode = 'shared';
      lastJson = JSON.stringify(d); setNotice(); apply(d);
      pollTimer = setInterval(function(){ if (!$('#panel-team').hidden && !document.hidden) refresh(); }, 3000);
    } catch (e) {
      api = localApi; mode = 'local';
      var l = await localApi.load();
      lastJson = JSON.stringify(l); setNotice(); apply(l);
    }
  }

  $('#tm-name').addEventListener('change', function(){
    mutate({action: 'setName', name: $('#tm-name').value.trim()});
  });
  $('#tt-form').addEventListener('submit', async function(e){
    e.preventDefault();
    var title = $('#tt-title').value.trim(); if (!title) return;
    var rec = {action: 'addTask', title: title, assignee: $('#tt-who').value, due: $('#tt-due').value};
    $('#tt-title').value = ''; $('#tt-due').value = '';
    await mutate(rec);
    $('#tt-title').focus();
  });
  $('#tm-people').addEventListener('click', function(e){
    var f = e.target.closest('[data-f]');
    if (f) { team.filter = f.getAttribute('data-f'); renderTeam(); return; }
    var rm = e.target.closest('[data-rm]');
    if (rm) mutate({action: 'removeMember', id: rm.getAttribute('data-rm')});
  });
  $('#tm-people').addEventListener('submit', async function(e){
    if (e.target.id !== 'tm-form') return;
    e.preventDefault();
    var inp = $('#tm-newname'), name = inp.value.trim(); if (!name) return;
    inp.value = '';
    await mutate({action: 'addMember', name: name});
  });
  $('#tm-board').addEventListener('click', function(e){
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
    var li = b.closest('.card'); if (!li) return;
    var id = li.getAttribute('data-id'), act = b.getAttribute('data-act');
    if (act === 'del') mutate({action: 'deleteTask', id: id});
    else mutate({action: 'updateTask', id: id, status: act});
  });
  $('#tm-board').addEventListener('change', function(e){
    if (!e.target.matches('[data-act="assign"]')) return;
    mutate({action: 'updateTask', id: e.target.closest('.card').getAttribute('data-id'), assignee: e.target.value});
  });

  /* ---------- Tabs ---------- */
  function route(){
    var m = location.hash === '#team' ? 'team' : 'me';
    $('#panel-me').hidden = m !== 'me'; $('#panel-team').hidden = m !== 'team';
    $('#tab-me').setAttribute('aria-selected', String(m === 'me'));
    $('#tab-team').setAttribute('aria-selected', String(m === 'team'));
    if (m === 'team') initTeam();
  }
  $('#tab-me').addEventListener('click', function(){ location.hash = 'me'; });
  $('#tab-team').addEventListener('click', function(){ location.hash = 'team'; });
  window.addEventListener('hashchange', route);

  loadMe(); renderMe(); route();
})();
