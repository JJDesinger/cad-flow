require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const authRoutes            = require('./routes/authRoutes');
const userRoutes            = require('./routes/userRoutes');
const activityRoutes        = require('./routes/activityRoutes');
const dashboardRoutes       = require('./routes/dashboardRoutes');
const notificationRoutes    = require('./routes/notificationRoutes');
const accessRequestRoutes   = require('./routes/accessRequestRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/activities',    activityRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/notifications',    notificationRoutes);
app.use('/api/access-requests',  accessRequestRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
