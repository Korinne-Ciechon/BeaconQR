var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var hbs = require('hbs');//added

var app = express();

const { Sequelize } = require('sequelize');
const { DataTypes } = require('sequelize');

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
const storage = path.join(__dirname, 'data', 'datebase.sqlite');
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

// Client Portal (QR CODE brings to)
app.get('/portal/:qrID', async (req,res) => {
  try {
    const client = await Client.findOne({ where: { qrID: req.params.qrID } });
    if (!client) return res.status(404).render('error', { message: 'Client Not Found' });

    res.render('portal', { client: client.get({ plain: true }) });
  } catch (err) {
    res.status(500).send(err.message);
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Results
app.get('/results', (req, res) => {
  res.render('results', { 
    title: 'Nearby Resources', 
    need: req.query.need 
  });
});

// Family view

app.get('/family-lookup', (req, res) => {
  const id = req.query.qrID;
  if (id) {
    res.redirect(`/family/${id}`);
  } else {
    res.redirect('/');
  }
});

app.get('/family/:qrID', async (req,res) => {
  try {
    const client = await Client.findOne({ where: {qrID: req.params.qrID } });
    const data = client.get({ plain: true });

    //logice for green/yellow light
    const hoursSinceSeen = (new Date() - new Date(data.lastSeen)) / (1000 * 60 * 60);
    const activeRecently = hoursSinceSeen < 24;

    res.render('family', { client: data, activeRecently });
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


// Caseworker Dashboard (shows all clients)
app.get('/caseworker', async (req, res) => {
  try {
    const allClients = await Client.findAll();
    //convert to plain JSON
    const cleanData = allClients.map(c => c.get({ plain: true }));

    res.render('caseworker', {
      title: 'Caseworker Dashboard',
      clients: cleanData
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});




module.exports = app;

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`BeaconQR Server running on http://localhost:${PORT}`);
//   console.log('try visisting: http://localhost:3000/portal/david123');
// });
// module.exports = app;
