// ---- Event data (add a new event by adding one object here) ----
const events = [
  { id: 1, name: "CodeSprint 2026", category: "Technical", date: "2026-11-05", venue: "CSE Lab 2", seats: 40 },
  { id: 2, name: "Web Dev Workshop", category: "Workshop", date: "2026-11-08", venue: "Seminar Hall", seats: 60 },
  { id: 3, name: "Cultural Fest - Kalaivizha", category: "Cultural", date: "2026-11-12", venue: "Open Auditorium", seats: 200 },
  { id: 4, name: "Inter-Department Cricket", category: "Sports", date: "2026-11-15", venue: "College Ground", seats: 50 },
  { id: 5, name: "AI & ML Bootcamp", category: "Workshop", date: "2026-11-18", venue: "IT Block - Hall 1", seats: 50 },
  { id: 6, name: "Project Expo", category: "Technical", date: "2026-11-22", venue: "Main Auditorium", seats: 80 },
];

const STORE_KEY = "eventPortal.registrations";
const SEATS_KEY = "eventPortal.seats";

// ---- Storage helpers (wrapped in try/catch) ----
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

let registrations = load(STORE_KEY, []);
let seatsLeft = load(SEATS_KEY, {});
events.forEach(ev => { if (seatsLeft[ev.id] === undefined) seatsLeft[ev.id] = ev.seats; });

let currentEventId = null;

const $ = id => document.getElementById(id);
const grid = $("event-grid");
const search = $("search");
const catFilter = $("category-filter");
const modal = $("reg-modal");
const form = $("reg-form");

// ---- Rendering ----
function fillCategories() {
  [...new Set(events.map(e => e.category))].sort().forEach(c => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    catFilter.appendChild(o);
  });
}

function renderEvents() {
  const q = search.value.trim().toLowerCase();
  const cat = catFilter.value;
  grid.innerHTML = "";
  const list = events.filter(e =>
    e.name.toLowerCase().includes(q) && (cat === "" || e.category === cat));
  if (list.length === 0) {
    grid.innerHTML = '<p class="muted">No events match your search.</p>';
    return;
  }
  list.forEach(ev => {
    const full = seatsLeft[ev.id] <= 0;
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <span class="tag"></span>
      <h3></h3>
      <div class="meta"></div>
      <div class="meta"></div>
      <div class="meta"></div>
      <button type="button" ${full ? "disabled" : ""}>${full ? "Full" : "Register"}</button>`;
    card.querySelector(".tag").textContent = ev.category;
    card.querySelector("h3").textContent = ev.name;
    const metas = card.querySelectorAll(".meta");
    metas[0].textContent = "📅 " + ev.date;
    metas[1].textContent = "📍 " + ev.venue;
    metas[2].textContent = "🎟️ Seats left: " + seatsLeft[ev.id];
    card.querySelector("button").addEventListener("click", () => openModal(ev.id));
    grid.appendChild(card);
  });
}

function renderRegistrations() {
  const body = $("reg-body");
  body.innerHTML = "";
  $("reg-count").textContent = registrations.length;
  $("no-reg").style.display = registrations.length ? "none" : "block";
  registrations.forEach(r => {
    const tr = document.createElement("tr");
    [r.name, r.regno, r.eventName, r.date].forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    const td = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "cancel-btn";
    btn.textContent = "Cancel";
    btn.addEventListener("click", () => cancelRegistration(r.id));
    td.appendChild(btn);
    tr.appendChild(td);
    body.appendChild(tr);
  });
}

function refreshAll() {
  renderEvents();
  renderRegistrations();
}

// ---- Modal & validation ----
function openModal(eventId) {
  currentEventId = eventId;
  const ev = events.find(e => e.id === eventId);
  $("modal-title").textContent = "Register: " + ev.name;
  form.reset();
  clearErrors();
  modal.showModal();
}

function setError(field, msg) {
  const el = form.querySelector(`.err[data-for="${field}"]`);
  el.textContent = msg;
}

function clearErrors() {
  form.querySelectorAll(".err").forEach(e => e.textContent = "");
}

function validate(data) {
  let ok = true;
  if (!data.name) { setError("name", "Name is required."); ok = false; }
  if (!/^\d{9,12}$/.test(data.regno)) { setError("regno", "Register number must be 9-12 digits."); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setError("email", "Enter a valid email."); ok = false; }
  if (!/^\d{10}$/.test(data.phone)) { setError("phone", "Phone must be 10 digits."); ok = false; }
  return ok;
}

form.addEventListener("submit", e => {
  e.preventDefault();
  clearErrors();
  const data = {
    name: $("f-name").value.trim(),
    regno: $("f-regno").value.trim(),
    email: $("f-email").value.trim(),
    phone: $("f-phone").value.trim(),
  };
  if (!validate(data)) return;

  const ev = events.find(x => x.id === currentEventId);

  if (registrations.some(r => r.regno === data.regno && r.eventId === ev.id)) {
    showToast("This register number is already registered for this event.", true);
    return;
  }
  if (seatsLeft[ev.id] <= 0) {
    showToast("Sorry, seats are full.", true);
    return;
  }

  registrations.push({
    id: Date.now(),
    eventId: ev.id,
    eventName: ev.name,
    date: ev.date,
    name: data.name,
    regno: data.regno,
    email: data.email,
    phone: data.phone,
  });
  seatsLeft[ev.id]--;
  save(STORE_KEY, registrations);
  save(SEATS_KEY, seatsLeft);

  modal.close();
  refreshAll();
  showToast("Registered successfully for " + ev.name + "!");
});

$("cancel-btn").addEventListener("click", () => modal.close());

// ---- Cancel registration (restores seat) ----
function cancelRegistration(id) {
  const reg = registrations.find(r => r.id === id);
  if (!reg) return;
  registrations = registrations.filter(r => r.id !== id);
  seatsLeft[reg.eventId]++;
  save(STORE_KEY, registrations);
  save(SEATS_KEY, seatsLeft);
  refreshAll();
  showToast("Registration cancelled. Seat restored.");
}

// ---- Toast ----
let toastTimer;
function showToast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 2800);
}

// ---- Init ----
search.addEventListener("input", renderEvents);
catFilter.addEventListener("change", renderEvents);
fillCategories();
refreshAll();
