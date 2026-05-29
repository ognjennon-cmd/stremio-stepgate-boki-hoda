// server.js - Stremio StepGate v2
// Sada hostovano javno, ima admin panel za tebe

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 7000;
const STEP_GOAL = parseInt(process.env.STEP_GOAL || '3000', 10);
const ADMIN_KEY = process.env.ADMIN_KEY || 'promeni-ovu-tajnu';
// PUBLIC_URL je nas javni Render URL, npr. https://stepgate.onrender.com
const PUBLIC_URL = process.env.PUBLIC_URL || `http://127.0.0.1:${PORT}`;
const ADDON_NAME = process.env.ADDON_NAME || 'StepGate';

// ---------- Baza (JSON fajl) ----------
// Na Render free tier-u, /tmp je jedino mesto gde mozes da pises,
// ali se brise pri restartu. Za persistentno cuvanje koristimo /data ako postoji
// (Render persistent disk - placeno), inace fallback na fajl u root-u.
// Za pocetak, root je OK - resetuje se samo kad redeployujes kod.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'steps.json');

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Greska pri snimanju baze:', e.message);
  }
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSteps(date = today()) {
  const db = loadDb();
  return db[date] || 0;
}

function setSteps(steps, date = today()) {
  const db = loadDb();
  db[date] = steps;
  saveDb(db);
}

function getHistory(limit = 30) {
  const db = loadDb();
  return Object.entries(db)
    .map(([date, steps]) => ({ date, steps }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

// ---------- Stremio Addon Manifest ----------
const manifest = {
  id: 'org.stepgate.ogi',
  version: '2.0.0',
  name: `🚶 ${ADDON_NAME}`,
  description: `Da bi se gledao film, treba napraviti ${STEP_GOAL} koraka dnevno. Šetnja je zdrava!`,
  resources: ['stream'],
  types: ['movie', 'series'],
  catalogs: [],
  idPrefixes: ['tt'],
  behaviorHints: {
    configurable: false,
    configurationRequired: false
  }
};

// ---------- Express Server ----------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Stremio manifest endpoint
app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

// Stremio stream endpoint
app.get('/stream/:type/:id.json', (req, res) => {
  const steps = getSteps();
  const remaining = Math.max(0, STEP_GOAL - steps);
if (remaining > 0) {
    return res.json({
      streams: [
        {
          name: '🚶 ŠETNJA POTREBNA\n📺 4K Ultra HD',
          title: `▶ KLIKNI OVDE ◀\n\nTreba još ${remaining.toLocaleString()} koraka\npre nego što gledamo film`,
          url: https://files.catbox.moe/8ofkyw.mp4,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'stepgate-instruction'
          }
        }
      ]
    });
  }
  res.json({ streams: [] });
});

// ---------- Web API ----------
app.get('/api/status', (req, res) => {
  const steps = getSteps();
  const remaining = Math.max(0, STEP_GOAL - steps);
  res.json({
    date: today(),
    steps,
    goal: STEP_GOAL,
    remaining,
    unlocked: remaining === 0
  });
});

app.post('/api/steps', (req, res) => {
  const { steps } = req.body;
  const parsed = parseInt(steps, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 200000) {
    return res.status(400).json({ error: 'Nevalidan broj koraka' });
  }
  setSteps(parsed);
  res.json({ ok: true, steps: parsed, goal: STEP_GOAL });
});

app.get('/api/history', (req, res) => {
  res.json(getHistory(30));
});

// ---------- Admin endpoints (samo za tebe) ----------
function checkAdmin(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/all', checkAdmin, (req, res) => {
  res.json({
    today: today(),
    todaySteps: getSteps(),
    goal: STEP_GOAL,
    history: getHistory(60)
  });
});

app.post('/api/admin/set', checkAdmin, (req, res) => {
  const { date, steps } = req.body;
  const parsed = parseInt(steps, 10);
  if (isNaN(parsed) || parsed < 0) {
    return res.status(400).json({ error: 'Nevalidan broj' });
  }
  setSteps(parsed, date || today());
  res.json({ ok: true });
});

app.post('/api/admin/reset', checkAdmin, (req, res) => {
  saveDb({});
  res.json({ ok: true });
});

// Health check za Render (ping da se ne uspava odmah)
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n  🚶 StepGate addon v2 pokrenut na portu ${PORT}`);
  console.log(`  Korisnicka stranica: ${PUBLIC_URL}`);
  console.log(`  Manifest:            ${PUBLIC_URL}/manifest.json`);
  console.log(`  Admin panel:         ${PUBLIC_URL}/admin?key=<tvoj-kljuc>`);
  console.log(`  Dnevni cilj: ${STEP_GOAL} koraka\n`);
});
