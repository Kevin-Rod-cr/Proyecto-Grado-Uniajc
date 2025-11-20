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

/* ---------- Init ---------- */
(function init(){
  // Ensure DB exists
  DB = loadData();
  showLogin();
})();