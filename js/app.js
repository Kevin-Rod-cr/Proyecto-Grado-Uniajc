/* app.js
   Aplicación SPA ligera que simula la gestión de proyectos de grado.
   Persistencia en localStorage bajo la key 'uniajc_demo'.
*/

/* ---------- UTILIDADES Y DATOS ---------- */
const STORAGE_KEY = 'uniajc_demo_v1';

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const base = {
      users: [],        // {id, nombre, rol, codigoEstudiante?}
      projects: [],     // {id, titulo, descripcion, estado, estudianteId, directorId?, jurados:[], fechaRegistro}
      fases: [],        // {id, proyectoId, nombre, fechaInicio, fechaFin, estado}
      entregables: [],  // {id, proyectoId, faseId, nombreArchivo, contenidoBase64, fechaEntrega, estadoRevision}
      retro: [],        // {id, entregableId, autorId, autorRol, comentario, fecha}
      evaluaciones: [], // {id, proyectoId, juradoId, nota, observaciones, fecha}
      sustentaciones: [], // {id, proyectoId, fecha, hora, lugar, estado}
      actas: []         // {id, proyectoId, fechaEmision, calificacionFinal, observaciones}
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
    return base;
  }
  return JSON.parse(raw);
}
function saveData(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }

/* load initial */
let DB = loadData();

/* Current session */
let current = null; // {userId, rol}

/* ---------- UI helpers ---------- */
const el = id => document.getElementById(id);

function showLogin(){
  el('login-screen').style.display = 'block';
  el('main-app').style.display = 'none';
}
function showApp(){
  el('login-screen').style.display = 'none';
  el('main-app').style.display = 'block';
  renderMenu();
}

/* ---------- Login / Seed ---------- */
function seedData(){
  DB = loadData();
  // Clear then seed
  DB.users = [
    { id:'u_est_1', nombre:'Ana Pérez', rol:'estudiante', codigoEstudiante:'E2024001' },
    { id:'u_dir_1', nombre:'Dr. Carlos Ruiz', rol:'director' },
    { id:'u_jur_1', nombre:'Mg. Laura Gómez', rol:'jurado' },
    { id:'u_coor_1', nombre:'Coordinación', rol:'coordinacion' }
  ];
  const p1 = { id:'p_1', titulo:'Análisis de Líneas Equipotenciales', descripcion:'Simulación y medición', estado:'Registrado', fechaRegistro:nowISO(), estudianteId:'u_est_1', directorId:'u_dir_1', jurados:['u_jur_1'] };
  DB.projects = [p1];
  DB.fases = [
    {id:'f1', proyectoId:'p_1', nombre:'Anteproyecto', fechaInicio:nowISO(), estado:'Pendiente'},
    {id:'f2', proyectoId:'p_1', nombre:'Informe final', fechaInicio:null, estado:'Pendiente'}
  ];
  DB.entregables = [];
  DB.retro = [];
  DB.evaluaciones = [];
  DB.sustentaciones = [];
  DB.actas = [];
  saveData(DB);
  alert('Datos de ejemplo cargados. Inicia sesión como Coordinación / Director / Estudiante / Jurado.');
  location.reload();
}

el('btn-seed').addEventListener('click', seedData);

el('input-role').addEventListener('change', ()=> {
  const r = el('input-role').value;
  if(r === 'estudiante'){
    el('lbl-codigo').style.display = 'block';
    el('input-codigo').style.display = 'block';
  } else {
    el('lbl-codigo').style.display = 'none';
    el('input-codigo').style.display = 'none';
  }
});

el('btn-login').addEventListener('click', ()=> {
  const nombre = el('input-nombre').value.trim();
  const rol = el('input-role').value;
  const codigo = el('input-codigo').value.trim();
  if(!nombre){ alert('Ingresa tu nombre'); return; }

  // Crear / recuperar usuario local
  DB = loadData();
  let user = DB.users.find(u => u.nombre === nombre && u.rol === rol);
  if(!user){
    user = { id: uid('u'), nombre, rol };
    if(rol === 'estudiante') user.codigoEstudiante = codigo || ('E' + Math.floor(Math.random()*100000));
    DB.users.push(user);
    saveData(DB);
  }
  current = { userId: user.id, rol: user.rol, nombre: user.nombre };
  el('user-role').textContent = user.rol.toUpperCase();
  el('user-name').textContent = user.nombre;
  showApp();
  renderHome();
});

/* Logout */
el('btn-logout').addEventListener('click', ()=> {
  current = null;
  showLogin();
});

/* ---------- Menu rendering by role ---------- */
function menuItemsForRole(role){
  const common = [{id:'m_home', label:'Inicio'}];
  if(role === 'estudiante'){
    return common.concat([
      {id:'m_registrar', label:'Registrar proyecto'},
      {id:'m_misproy', label:'Mis proyectos'},
      {id:'m_entregables', label:'Cargar entregable'},
      {id:'m_consultar', label:'Consultar retroalimentación'}
    ]);
  }
  if(role === 'director'){
    return common.concat([
      {id:'m_asignados', label:'Proyectos asignados'},
      {id:'m_revisar', label:'Revisar entregable'}
    ]);
  }
  if(role === 'jurado'){
    return common.concat([
      {id:'m_eval', label:'Evaluar proyectos'},
      {id:'m_consultar', label:'Consultar actas'}
    ]);
  }
  if(role === 'coordinacion'){
    return common.concat([
      {id:'m_gestion', label:'Gestionar proyectos'},
      {id:'m_programar', label:'Programar sustentaciones'},
      {id:'m_generar', label:'Generar acta'}
    ]);
  }
  return common;
}

function renderMenu(){
  const menu = el('menu-list');
  menu.innerHTML = '';
  const items = menuItemsForRole(current.rol);
  items.forEach(it => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = it.label;
    btn.dataset.id = it.id;
    btn.addEventListener('click', ()=> {
      document.querySelectorAll('.sidebar button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      route(it.id);
    });
    li.appendChild(btn);
    menu.appendChild(li);
  });
  // activate first
  document.querySelector('.sidebar button').classList.add('active');
}

/* ---------- Router / Views ---------- */
function route(id){
  const root = el('view-root');
  root.innerHTML = '';
  switch(id){
    case 'm_home': renderHome(); break;
    case 'm_registrar': renderRegistrarProyecto(); break;
    case 'm_misproy': renderMisProyectos(); break;
    case 'm_entregables': renderCargarEntregable(); break;
    case 'm_consultar': renderConsultarRetro(); break;
    case 'm_asignados': renderAsignadosDirector(); break;
    case 'm_revisar': renderRevisarEntregable(); break;
    case 'm_eval': renderEvaluarProyectos(); break;
    case 'm_gestion': renderGestionCoordinacion(); break;
    case 'm_programar': renderProgramarSustentacion(); break;
    case 'm_generar': renderGenerarActa(); break;
    default: renderHome(); break;
  }
}

function renderHome(){
  const root = el('view-root');
  root.innerHTML = `
    <div class="card">
      <h2>Bienvenido, ${current.nombre}</h2>
      <p class="small-muted">Rol: ${current.rol}</p>
      <div class="note">
        <strong>Instrucciones rápidas:</strong>
        <ul>
          <li>Estudiante: registra proyectos, sube entregables y consulta retroalimentación.</li>
          <li>Director/Jurado: revisa entregables, registra retroalimentación y calificaciones.</li>
          <li>Coordinación: asigna director/jurados, programa sustentaciones y genera actas.</li>
        </ul>
      </div>
    </div>
  `;
}

/* ---------- Estudiante: Registrar proyecto ---------- */
function renderRegistrarProyecto(){
  const root = el('view-root');
  root.innerHTML = `
    <div class="card">
      <h3>Registrar nuevo proyecto</h3>
      <label>Título</label><input id="p_titulo" type="text" />
      <label>Descripción</label><textarea id="p_desc"></textarea>
      <div class="row">
        <button id="btn-save-proy" class="btn primary">Registrar</button>
      </div>
      <div id="msg-proy" class="small-muted"></div>
    </div>
  `;
  el('btn-save-proy').addEventListener('click', ()=> {
    const titulo = el('p_titulo').value.trim();
    const desc = el('p_desc').value.trim();
    if(!titulo){ alert('Ingrese título'); return; }
    DB = loadData();
    const project = {
      id: uid('p'),
      titulo, descripcion:desc, estado:'Registrado', fechaRegistro: nowISO(),
      estudianteId: current.userId, directorId: null, jurados: []
    };
    DB.projects.push(project);
    // crear fase inicial anteproyecto
    DB.fases.push({ id: uid('f'), proyectoId: project.id, nombre:'Anteproyecto', fechaInicio: nowISO(), estado:'Pendiente' });
    saveData(DB);
    el('msg-proy').textContent = 'Proyecto registrado correctamente.';
    el('p_titulo').value = ''; el('p_desc').value = '';
  });
}

/* ---------- Estudiante: Mis proyectos ---------- */
function renderMisProyectos(){
  const root = el('view-root');
  DB = loadData();
  const proys = DB.projects.filter(p => p.estudianteId === current.userId);
  let html = `<div class="card"><h3>Mis proyectos</h3>`;
  if(proys.length === 0) html += '<p class="small-muted">No tienes proyectos registrados.</p>';
  else {
    html += `<table class="table"><thead><tr><th>Título</th><th>Estado</th><th>Director</th><th>Jurados</th><th>Acciones</th></tr></thead><tbody>`;
    proys.forEach(p => {
      const director = DB.users.find(u=>u.id===p.directorId)?.nombre || '-';
      const jurados = (p.jurados||[]).map(id=>DB.users.find(u=>u.id===id)?.nombre || id).join(', ') || '-';
      html += `<tr><td>${p.titulo}</td><td>${p.estado}</td><td>${director}</td><td>${jurados}</td><td>
        <button class="btn small" data-id="${p.id}" onclick="viewProjectDetails('${p.id}')">Ver</button></td></tr>`;
    });
    html += `</tbody></table>`;
  }
  html += `</div>`;
  root.innerHTML = html;
  // expose viewProjectDetails globally
  window.viewProjectDetails = (id) => {
    const p = DB.projects.find(x=>x.id===id);
    const fases = DB.fases.filter(f=>f.proyectoId===id);
    const entregables = DB.entregables.filter(e=>e.proyectoId===id);
    let content = `<div class="card"><h3>${p.titulo}</h3><p>${p.descripcion}</p>`;
    content += `<p><strong>Estado:</strong> ${p.estado}</p>`;
    content += `<h4>Fases</h4><ul>`;
    fases.forEach(f=> content += `<li>${f.nombre} — ${f.estado}</li>`);
    content += `</ul>`;
    content += `<h4>Entregables</h4>`;
    if(entregables.length===0) content += '<p class="small-muted">No hay entregables</p>';
    else {
      content += `<table class="table"><thead><tr><th>Nombre</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
      entregables.forEach(e => {
        content += `<tr><td>${e.nombreArchivo}</td><td>${new Date(e.fechaEntrega).toLocaleString()}</td><td>${e.estadoRevision}</td>
          <td><button class="btn small" onclick="downloadEntregable('${e.id}')">Descargar</button></td></tr>`;
      });
      content += `</tbody></table>`;
    }
    content += `</div>`;
    el('view-root').innerHTML = content;
    window.downloadEntregable = (eid) => {
      const ent = DB.entregables.find(x=>x.id===eid);
      if(!ent){ alert('No encontrado'); return; }
      const a = document.createElement('a');
      a.href = ent.contenidoBase64;
      a.download = ent.nombreArchivo;
      a.click();
    };
  };
}

/* ---------- Estudiante: Cargar entregable ---------- */
function renderCargarEntregable(){
  const root = el('view-root');
  DB = loadData();
  const myProjects = DB.projects.filter(p => p.estudianteId === current.userId);
  if(myProjects.length===0){
    root.innerHTML = `<div class="card"><h3>Cargar entregable</h3><p class="small-muted">No tienes proyectos. Registra uno primero.</p></div>`;
    return;
  }
  let options = '<option value="">-- Selecciona proyecto --</option>';
  myProjects.forEach(p => options += `<option value="${p.id}">${p.titulo}</option>`);
  root.innerHTML = `
    <div class="card">
      <h3>Cargar entregable</h3>
      <label>Proyecto</label>
      <select id="sel-proy">${options}</select>
      <label>Fase</label>
      <select id="sel-fase"><option value="">-- elige proyecto primero --</option></select>
      <label>Archivo (PDF / DOCX / TXT)</label>
      <input id="file-input" type="file" />
      <div class="row">
        <button id="btn-upload" class="btn primary">Subir entregable</button>
      </div>
      <div id="msg-upload" class="small-muted"></div>
    </div>
  `;
  el('sel-proy').addEventListener('change', (e) => {
    const pid = e.target.value;
    const fases = DB.fases.filter(f=>f.proyectoId===pid);
    let html = '<option value="">-- Selecciona fase --</option>';
    fases.forEach(f => html += `<option value="${f.id}">${f.nombre}</option>`);
    el('sel-fase').innerHTML = html;
  });

  el('btn-upload').addEventListener('click', ()=> {
    const pid = el('sel-proy').value;
    const fid = el('sel-fase').value;
    const file = el('file-input').files[0];
    if(!pid || !fid || !file){ alert('Complete todos los campos'); return; }

    const reader = new FileReader();
    reader.onload = function(evt){
      const base64 = evt.target.result;
      DB = loadData();
      const ent = { id: uid('ent'), proyectoId: pid, faseId: fid, nombreArchivo: file.name, contenidoBase64: base64, fechaEntrega: nowISO(), estadoRevision: 'Pendiente' };
      DB.entregables.push(ent);
      saveData(DB);
      el('msg-upload').textContent = 'Entregable subido correctamente.';
      el('file-input').value = '';
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Estudiante: Consultar retroalimentación ---------- */
function renderConsultarRetro(){
  const root = el('view-root');
  DB = loadData();
  const myEnts = DB.entregables.filter(e => {
    const proj = DB.projects.find(p=>p.id===e.proyectoId);
    return proj && proj.estudianteId === current.userId;
  });
  let html = `<div class="card"><h3>Retroalimentación</h3>`;
  if(myEnts.length===0) html += '<p class="small-muted">No hay entregables.</p>';
  else {
    html += `<table class="table"><thead><tr><th>Archivo</th><th>Fase</th><th>Estado</th><th>Comentarios</th></tr></thead><tbody>`;
    myEnts.forEach(e => {
      const comentarios = DB.retro.filter(r=>r.entregableId===e.id);
      const comHtml = comentarios.length ? comentarios.map(c=>`<div><strong>${DB.users.find(u=>u.id===c.autorId)?.nombre||c.autorId}:</strong> ${c.comentario} <small class="small-muted">(${new Date(c.fecha).toLocaleString()})</small></div>`).join('') : '<span class="small-muted">Sin comentarios</span>';
      const fase = DB.fases.find(f=>f.id===e.faseId)?.nombre || '-';
      html += `<tr><td>${e.nombreArchivo}</td><td>${fase}</td><td>${e.estadoRevision}</td><td>${comHtml}</td></tr>`;
    });
    html += `</tbody></table>`;
  }
  html += `</div>`;
  root.innerHTML = html;
}

/* ---------- Init ---------- */
(function init(){
  // Ensure DB exists
  DB = loadData();
  showLogin();
})();