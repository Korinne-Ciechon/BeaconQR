var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs');//added

var app = express();

const { Sequelize } = require('sequelize');
const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// database setup (beaconQR models)
const storage = path.join(__dirname, 'data', 'database.sqlite');
const sequelize = new Sequelize({dialect: 'sqlite', storage, logging: false});

const Client = sequelize.define('Client',{
  qrID: {type: DataTypes.STRING, unique: true, allowNull: false},
  name: { type: DataTypes.STRING, allowNull: false },
  caseworkerID: { type: DataTypes.STRING },
  familyEmail: { type: DataTypes.STRING },
  lastSeen: { type: DataTypes.DATE },
  lastLat: { type: DataTypes.FLOAT },
  lastLng: { type: DataTypes.FLOAT },
  lastNeed: { type: DataTypes.STRING }
});

hbs.registerHelper('formatDate', function(date) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
});

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
  switch (operator) {
    case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
    default: return options.inverse(this);
  }
});

// Sync Database
async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('BeaconQR Database Sync Complete.');
  } catch (error) {
    console.error("Sync failed:", error);
  }
}
syncDatabase();

// This function "Plants" David into your database automatically
async function seedDavid() {
  try {
    // Check if David already exists so we don't create him twice
    const [david, created] = await Client.findOrCreate({
      where: { qrID: 'david123' },
      defaults: {
        name: 'David',
        caseworkerID: 'CW-101',
        lastNeed: 'Food',
        lastSeen: new Date()
      }
    });

    if (created) {
      console.log("🌱 Database Seeded: David is now ready for testing!");
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
  }
}

// Call it!
seedDavid();

// Routes

// landing page
app.get('/', (req, res) => {
  res.render('index', { title: 'BeaconQR Home'});
});

// lookup redirects
app.get('/portal-lookup', (req, res) => {
  const id = req.query.qrID;
  if (id) {
    res.redirect(`/portal/${id}`);
  } else {
    res.redirect('/');
  }
});

app.get('/family-lookup', (req, res) => {
  res.redirect(`/family/${req.query.qrID}`);
});

// Client Portal (QR CODE brings to)
app.get('/portal/:qrID', async (req,res) => {
  try {
    const client = await Client.findOne({ where: { qrID: req.params.qrID } });
    if (!client) return res.status(404).render('error', { message: 'Client Not Found' });

    res.render('portal', { 
      client: client.get({ plain: true }),
      showSignOut: true 
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

//Update status
app.post('/update-status/:qrID', async (req,res) => {
  try {
    const { lastNeed } = req.body;
    await Client.update(
      { lastNeed: lastNeed, lastSeen: new Date() },
      { where: { qrID: req.params.qrID } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Location
app.post('/update-location', async (req,res) => {
  try {
    const { qrID, lat, lng, need } = req.body;
    await Client.update(
      { lastLat: lat, lastLng: lng, lastSeen: new Date(), lastNeed: need },
      { where: { qrID: qrID } }
    );
    console.log(`Updated ${qrID} with need: ${need}`); // Look for this in your terminal!
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/family/:qrID', async (req,res) => {
  try {
    const client = await Client.findOne({ where: {qrID: req.params.qrID } });
    if (!client) return res.status(404).render('error', { message: 'Client Not Found' });
    const data = client.get({ plain: true });

    //logice for green/yellow light
    const hoursSinceSeen = (new Date() - new Date(data.lastSeen)) / (1000 * 60 * 60);
    const activeRecently = hoursSinceSeen < 24;

    res.render('family', { 
      client: data, activeRecently,
      showSignOut: true 
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Caseworker Dashboard (shows all clients)
app.get('/caseworker', async (req, res) => {
  try {
    const allClients = await Client.findAll({
      order: [['lastSeen', 'DESC']]
    });
    const cleanData = allClients.map(c => {
      const plain = c.get({ plain: true });
      const lastSeenDate = new Date(plain.lastSeen);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      plain.activeRecently = lastSeenDate > oneDayAgo;
      return plain;
    });

    res.render('caseworker', {
      title: 'Caseworker Dashboard',
      clients: cleanData,
      activeTab: 'master',
      showSignOut: true
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// CaseWorker: Intake Page
app.get('/caseworker/intake', (req, res) => {
  res.render('intake', { 
    title: 'New Client Intake',
    showSignOut: true
  });
});

//Handle the Intake form Submission
app.post('/create-client', async (req, res) => {
  try {
    const { name, qrID} = req.body;
    await Client.create({
      name: name, 
      qrID: qrID,
      lastSeen: new Date(),
      lastNeed: 'Initial Intake',
    });
    res.redirect('/caseworker');
  } catch (err) {
    res.status(500).send("Error creating client. Try another QR ID.")
  }
});

// Caseworker Urgent Alerts Page 
app.get('/caseworker/alerts', async (req, res) => {
  try {
    const urgentClients = await Client.findAll({
      where: { 
        lastNeed: {
          [Op.like]: '%Worker%'
        }
      },
      order: [['lastSeen', 'DESC']]
    });

    const cleanData = urgentClients.map(c => {
      const plain = c.get({ plain: true });
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      plain.activeRecently = new Date(plain.lastSeen) > oneDayAgo;
      return plain;
    });

    res.render('alerts', {
      title: 'Urgent Requests',
      clients: cleanData,
      activeTab: 'alerts',
      showSignOut: true
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// error handling
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
  res.locals.message = err.message; 
  res.locals.error = req.app.get('env') === 'development' ? err: {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;