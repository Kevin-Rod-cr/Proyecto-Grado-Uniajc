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

/* ---------- Init ---------- */
(function init(){
  // Ensure DB exists
  DB = loadData();
  showLogin();
})();