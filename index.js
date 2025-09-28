require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ==============================
// Conexión a MongoDB Atlas
// ==============================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch(err => console.error('Error al conectar a MongoDB', err));

// ==============================
// Schemas y Modelos
// ==============================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// ==============================
// Rutas
// ==============================
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Crear nuevo usuario
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Listar todos los usuarios
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id').lean();
    res.json(users);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Añadir ejercicio
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'Usuario no encontrado' });

    const date = req.body.date ? new Date(req.body.date) : new Date();
    const exercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: date
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Obtener logs de ejercicios
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'Usuario no encontrado' });

    let { from, to, limit } = req.query;
    let filter = { userId: user._id };
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);

    let query = Exercise.find(filter, 'description duration date').sort({ date: 1 });
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
