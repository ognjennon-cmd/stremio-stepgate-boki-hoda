# 🚶 Stremio StepGate v2

Stremio addon koji presreće Play klikove i blokira filmove dok korisnik ne unese broj koraka. Hostovano javno na Render.com, korisnik samo upiše svoje korake na web stranici, a ti imaš zaseban admin panel za kontrolu.

## Arhitektura

```
[Njegov Stremio] ───→ [Render server] ───→ Vraća stream ili "prošetaj još X"
                            │
                            ├─→ /          ← korisnik unosi korake
                            └─→ /admin     ← ti kontrolišeš (sa lozinkom)
```

## Deploy na Render (korak po korak)

### 1. Napravi GitHub nalog i repo

1. Idi na https://github.com → registruj se ako nemaš nalog
2. Klikni **New repository**
3. Naziv: `stremio-stepgate` (može i drugi, nije bitno)
4. **Private** repo (ne mora biti javan)
5. Klikni **Create repository**

### 2. Upload-uj fajlove

**Najlakši način (preko web interfejsa):**

1. Na novom repo-u klikni **uploading an existing file**
2. Prevuci sve fajlove iz ovog foldera u browser (osim `.env`, `node_modules/`, `steps.json` ako postoje)
3. Klikni **Commit changes**

**Ili preko Git-a (ako si komotan):**

```bash
cd stremio-stepgate-v2
git init
git add .
git commit -m "Inicijalni commit"
git branch -M main
git remote add origin https://github.com/TVOJUSERNAME/stremio-stepgate.git
git push -u origin main
```

### 3. Registruj se na Render

1. Idi na https://render.com
2. Klikni **Get Started** → registruj se preko GitHub-a (najjednostavnije)
3. Dozvoli Render-u da pristupi tvojim repo-ima

### 4. Napravi Web Service

1. Na Render dashboard-u klikni **New +** → **Web Service**
2. Izaberi `stremio-stepgate` repo iz liste
3. Popuni:
   - **Name**: `stepgate` (ili šta hoćeš — biće deo URL-a, npr. `stepgate.onrender.com`)
   - **Region**: Frankfurt (najbliža za Srbiju)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

4. Klikni **Advanced** → **Add Environment Variable**, dodaj:
   - `STEP_GOAL` = `3000` (ili koliko god)
   - `ADMIN_KEY` = neka tvoja tajna lozinka, npr. `ogi-tajna-2026-xK9pL`
   - `PUBLIC_URL` = `https://NAZIVKOJISIDAO.onrender.com` (popunićeš posle prvog deploya)
   - `ADDON_NAME` = `StepGate` (ili nešto manje sumnjivo, npr. `Cinema Verify`)

5. Klikni **Create Web Service**

Render će sad da builduje i deployuje. Posle 2-3 minuta vidiš zelenu kvačicu i URL na vrhu (`https://stepgate.onrender.com` ili slično).

### 5. Vrati se i popuni PUBLIC_URL

1. U Render-u: **Environment** tab → edit `PUBLIC_URL` → upiši tvoj pravi URL
2. Klikni **Save Changes** → Render će redeploy-ovati (1 minut)

### 6. Testiraj da radi

Otvori u browseru:
- `https://stepgate.onrender.com` → trebalo bi da vidiš korisničku stranicu
- `https://stepgate.onrender.com/manifest.json` → JSON sa addon manifestom
- `https://stepgate.onrender.com/admin` → admin panel (treba ti ključ)

### 7. Instaliraj addon u njegov Stremio nalog

**Opcija A — preko web Stremio-a (najjednostavnije, ne moraš biti kod njega):**

1. Idi na https://web.stremio.com
2. Loguj se na njegov nalog (pošto je tvoj)
3. Klikni puzzle ikonicu (Addons)
4. U gornjem polju "Addon URL" zalepi: `https://stepgate.onrender.com/manifest.json`
5. Klikni **Install**
6. Addon se sad sinhronizuje na sve uređaje povezane sa tim nalogom — i njegov Stremio će ga imati.

**Opcija B — kad si fizički kod njega:**

1. Otvori njegov Stremio
2. Addons → zalepi URL → Install

## Kako se koristi

**On (korisnik):**
- Otvori `https://stepgate.onrender.com` u browseru
- Vidi koliko koraka mu treba danas
- Upiše broj posle šetnje, klikne Sačuvaj
- Kad pređe cilj, Stremio normalno radi (Torrentio i drugi addoni vraćaju streamove)
- Ako nije ispunio cilj, kada klikne Play na film vidi samo jedan "stream" → "🚶 Šetnja — treba još 3,000 koraka. Kliknite ovde."

**Ti (admin):**
- Otvori `https://stepgate.onrender.com/admin?key=TVOJ-TAJNI-KLJUČ`
- Vidiš njegov današnji unos i istoriju 60 dana
- Možeš ručno da postaviš broj koraka za bilo koji dan
- Možeš da resetuješ sve

## Render Free Tier — šta da znaš

✅ Besplatno, ne traži karticu
✅ Stalan URL, automatski HTTPS
✅ 750 sati mesečno (više nego dovoljno za 1 servis)
⚠️ Servis se **"uspava" posle 15 min neaktivnosti** — prvi zahtev nakon pauze traje 30-50 sekundi dok se ne probudi.
   - U praksi: kad on prvi put klikne Play tog dana, Stremio može da prikaže učitavanje ~30s. To je OK, čak igra u tvoju korist (više trenja = teže da odustane od šetnje).
   - Ako želiš da se ne uspava: koristi besplatan servis poput https://uptimerobot.com da ping-uje `https://stepgate.onrender.com/health` svakih 5 min.
⚠️ **Baza se resetuje pri svakom redeployu** (kad push-uješ izmene na GitHub). Istorija nestaje. Za stalno čuvanje istorije treba Render persistent disk (~$1/mesec) ili eksterna baza poput Supabase free tier.

## Promena cilja koraka

1. Render dashboard → Environment → edit `STEP_GOAL`
2. Save → automatski redeploy
3. Gotovo

## Sigurnost

- **Admin URL drži u tajnosti.** Ne deli ga, ne uvodi u istoriju browser-a koji on koristi.
- **Bookmark admin URL** sa ključem u svom browseru za brzi pristup.
- Ako sumnjaš da je curio ključ → promeni `ADMIN_KEY` env var u Render-u.

## Što treba imati na umu

1. Addon ne blokira **druge addone**. Stremio pita sve instalirane addone za streamove. Drugi (Torrentio, MediaFusion) takođe vraćaju streamove. Tvoj samo dodaje *svoj* "stream" kao opciju.
   - **Ali**: pošto si rekao da on nije tehnički — kad vidi "🚶 Šetnja" iznad ostalih streamova, on neće znati šta to znači, pa će verovatno kliknuti. To otvara web stranicu. Drugi streamovi su vidljivi ispod, ali on možda i ne shvati da može direktno tamo.
   - Ako primetiš da preskače i klika na Torrentio direktno — javi mi, mogu da prilagodim da `StepGate` stream ima atraktivniji naziv ili neku poruku.

2. Ako želiš da bude **još malo tvrđe**, mogu dodati:
   - Da `StepGate` "stream" bude prvi u listi (već jeste, ali zavisi od Stremio sortiranja)
   - Da poruka bude alarmnija ("⚠️ PRESTANITE — POTREBNO HODANJE")
   - Skrivene "free" dane (vikendi otvoreni bez koraka)
   - Streak counter koji se prikazuje njemu

3. **Test pre nego što daš njegovom Stremio-u:** instaliraj addon u svoj nalog prvo, vidi kako izgleda, pa onda na njegov.

## Trouble-shooting

**Addon se ne pojavljuje u Stremio-u nakon instalacije**
- Proveri da li si stavio `https://` u URL (ne `http://`)
- Proveri da `manifest.json` radi (otvori URL u browseru)

**Render servis ne radi (502/503)**
- Render dashboard → Logs tab → vidiš grešku
- Najčešće: greška u `package.json` ili neki paket nije instaliran

**Pres nije podiglo, dobijam "Build failed"**
- Logs → vidi grešku
- Obično `npm install` problem — proveri `package.json` sintaksu

**On kaže da addon ne radi**
- Proveri u admin panelu da li servis radi (refresh dashboard)
- Probaj `https://stepgate.onrender.com/health` — treba da vrati `{"ok":true}`
- Ako je servis "spava" — prvi zahtev će ga probuditi, sačekaj 30s

## Sledeći nivoi (ako bude trebalo)

- **Foto verifikacija** — mora da upload-uje screenshot brojača sa telefona
- **Telegram bot** — on šalje broj, ti potvrđuješ sa svog telefona
- **Streak system** — bonus dani za neprekidne šetnje
- **Google Fit/Health Connect** — automatsko povlačenje koraka sa telefona

Javi kad postaviš i kad budeš hteo dalje.
