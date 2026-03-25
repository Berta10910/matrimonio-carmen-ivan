require('dotenv').config()
const express = require('express')
const path = require('path')
const session = require('express-session')
const fs = require('fs')

const app = express()

const PORT = process.env.PORT || 3001
const PASSWORD = process.env.PASSWORD || 'IvanCarmen2026'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminCarmen'
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret'

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
  })
)

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next()
  return res.redirect('/login')
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next()
  return res.redirect('/')
}

app.get('/', requireAuth, (req, res) => {
  res.render('index', { 
    couple: 'Carmen & Ivan',
    isAdmin: req.session.isAdmin || false
  })
})

app.get('/login', (req, res) => {
  // Rimosso il redirect automatico se già autenticato per permettere il cambio utente/admin
  res.render('login', { error: null, couple: 'Carmen & Ivan' })
})

app.post('/login', (req, res) => {
  const password = (req.body.password || '').trim()

  req.session.regenerate((err) => {
    if (err) {
      console.error('Errore sessione:', err)
      return res.redirect('/login')
    }

    if (password === ADMIN_PASSWORD) {
      req.session.authenticated = true
      req.session.isAdmin = true
      console.log('Login ADMIN OK')
      return res.redirect('/')
    }

    if (password === PASSWORD) {
      req.session.authenticated = true
      req.session.isAdmin = false
      console.log('Login USER OK')
      return res.redirect('/')
    }

    res.status(401).render('login', { 
      error: 'Password non corretta', 
      couple: 'Carmen & Ivan' 
    })
  })
})

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid')
    res.redirect('/login')
  })
})

app.get('/invitati', requireAuth, requireAdmin, (req, res) => {
  const rsvpPath = path.join(__dirname, 'data', 'rsvp.json')
  let rsvps = []
  
  // Proviamo a leggere rsvp.json (dati dal form)
  try {
    if (fs.existsSync(rsvpPath)) {
      const json = fs.readFileSync(rsvpPath, 'utf8')
      rsvps = JSON.parse(json)
    }
  } catch (e) {
    console.error('Errore lettura rsvp.json:', e)
  }
  
  // Se rsvps è vuoto, proviamo a vedere se c'è invitati.json (vecchio formato o fallback)
  if (rsvps.length === 0) {
    try {
      const invitatiPath = path.join(__dirname, 'data', 'invitati.json')
      if (fs.existsSync(invitatiPath)) {
        const json = fs.readFileSync(invitatiPath, 'utf8')
        const invitati = JSON.parse(json)
        // Adattiamo il formato se necessario
        rsvps = invitati.map(inv => ({
          nome: inv.nome,
          presenza: 'si',
          messaggio: inv.note || 'Dati da invitati.json'
        }))
      }
    } catch (e) {}
  }

  res.render('invitati', { rsvps, couple: 'Carmen & Ivan' })
})

app.post('/rsvp', requireAuth, (req, res) => {
  const rsvpPath = path.join(__dirname, 'data', 'rsvp.json')
  const { 
    nome, 
    presenza, 
    partecipanti_num, 
    partecipanti_nomi, 
    allergie, 
    bambini_eta, 
    messaggio 
  } = req.body
  
  const newRsvp = {
    nome,
    presenza,
    partecipanti_num,
    partecipanti_nomi,
    allergie,
    bambini_eta,
    messaggio,
    timestamp: new Date().toISOString()
  }

  let rsvps = []
  try {
    if (fs.existsSync(rsvpPath)) {
      const data = fs.readFileSync(rsvpPath, 'utf8')
      rsvps = JSON.parse(data)
    }
  } catch (e) {
    console.error('Errore lettura RSVP:', e)
  }

  rsvps.push(newRsvp)

  try {
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
      fs.mkdirSync(path.join(__dirname, 'data'))
    }
    fs.writeFileSync(rsvpPath, JSON.stringify(rsvps, null, 2))
    res.send('<script>alert("Grazie! La tua conferma è stata inviata."); window.location.href="/";</script>')
  } catch (e) {
    console.error('Errore scrittura RSVP:', e)
    res.status(500).send('Errore nel salvataggio. Riprova più tardi.')
  }
})

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});