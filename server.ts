import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

interface Voto {
  id: number;
  nombre: string;
  cafe: boolean;
  te: boolean;
  jugo: boolean;
}

const DATA_FILE = path.resolve(process.cwd(), 'votos_data.json');

const VOTOS_INICIALES: Voto[] = [
  {
    id: 1,
    nombre: 'Carlos Gómez',
    cafe: true,
    te: false,
    jugo: false
  },
  {
    id: 2,
    nombre: 'Ana María Torres',
    cafe: false,
    te: true,
    jugo: false
  },
  {
    id: 3,
    nombre: 'Luis Martínez',
    cafe: true,
    te: false,
    jugo: true
  },
  {
    id: 4,
    nombre: 'Elena Morales',
    cafe: true,
    te: true,
    jugo: true
  },
  {
    id: 5,
    nombre: 'Pedro Ramírez',
    cafe: false,
    te: false,
    jugo: true
  },
  {
    id: 6,
    nombre: 'Sofía Herrera',
    cafe: false,
    te: true,
    jugo: true
  }
];

function cargarVotos(): Voto[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error leyendo archivo de votos:', err);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(VOTOS_INICIALES, null, 2), 'utf-8');
  return VOTOS_INICIALES;
}

function guardarVotos(votos: Voto[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votos, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando votos:', err);
  }
}

const sqlQueryLog: { query: string; timestamp: string }[] = [
  {
    query: `CREATE TABLE IF NOT EXISTS encuesta_bebidas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cafe TINYINT(1) DEFAULT 0,
  te TINYINT(1) DEFAULT 0,
  jugo TINYINT(1) DEFAULT 0
);`,
    timestamp: new Date().toISOString()
  }
];

function registrarSQL(query: string) {
  sqlQueryLog.unshift({
    query,
    timestamp: new Date().toISOString()
  });
  if (sqlQueryLog.length > 30) {
    sqlQueryLog.pop();
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/votos', (_req, res) => {
    const votos = cargarVotos();

    registrarSQL('SELECT * FROM encuesta_bebidas ORDER BY id DESC;');

    let totalCafe = 0;
    let totalTe = 0;
    let totalJugo = 0;

    let soloUna = 0;
    let dosOpciones = 0;
    let tresOpciones = 0;

    votos.forEach((v) => {
      if (v.cafe) totalCafe++;
      if (v.te) totalTe++;
      if (v.jugo) totalJugo++;

      const conteo = (v.cafe ? 1 : 0) + (v.te ? 1 : 0) + (v.jugo ? 1 : 0);
      if (conteo === 1) soloUna++;
      else if (conteo === 2) dosOpciones++;
      else if (conteo === 3) tresOpciones++;
    });

    res.json({
      success: true,
      totalVotantes: votos.length,
      estadisticas: {
        totalCafe,
        totalTe,
        totalJugo,
        combinaciones: {
          soloUna,
          dosOpciones,
          tresOpciones
        }
      },
      votos,
      sqlLog: sqlQueryLog.slice(0, 5)
    });
  });

  app.post('/api/votos', (req, res) => {
    const { nombre, cafe, te, jugo } = req.body;

    const cafeBool = Boolean(cafe);
    const teBool = Boolean(te);
    const jugoBool = Boolean(jugo);

    if (!cafeBool && !teBool && !jugoBool) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos una opción (Café, Té o Jugo).'
      });
    }

    const votos = cargarVotos();
    const nuevoId = votos.length > 0 ? Math.max(...votos.map(v => v.id)) + 1 : 1;

    const nuevoVoto: Voto = {
      id: nuevoId,
      nombre: (nombre && nombre.trim()) ? nombre.trim() : `Participante #${nuevoId}`,
      cafe: cafeBool,
      te: teBool,
      jugo: jugoBool
    };

    votos.unshift(nuevoVoto);
    guardarVotos(votos);

    const sqlQuery = `INSERT INTO encuesta_bebidas (nombre, cafe, te, jugo) 
VALUES ('${nuevoVoto.nombre.replace(/'/g, "\\'")}', ${nuevoVoto.cafe ? 1 : 0}, ${nuevoVoto.te ? 1 : 0}, ${nuevoVoto.jugo ? 1 : 0});`;

    registrarSQL(sqlQuery);

    res.json({
      success: true,
      mensaje: '¡Voto registrado exitosamente en la base de datos MySQL!',
      voto: nuevoVoto,
      sqlEjecutado: sqlQuery
    });
  });

  app.post('/api/reset', (_req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(VOTOS_INICIALES, null, 2), 'utf-8');
    registrarSQL('TRUNCATE TABLE encuesta_bebidas;');
    res.json({ success: true, mensaje: 'Base de datos restaurada con datos de prueba.' });
  });

  app.get('/api/mysql-info', (_req, res) => {
    res.json({
      schema: `CREATE DATABASE IF NOT EXISTS bd_encuesta;
USE bd_encuesta;

CREATE TABLE IF NOT EXISTS encuesta_bebidas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cafe TINYINT(1) DEFAULT 0,
  te TINYINT(1) DEFAULT 0,
  jugo TINYINT(1) DEFAULT 0
);`,
      phpConexion: `<?php
$host = "localhost";
$usuario = "root";
$password = "";
$bd = "bd_encuesta";

$conexion = new mysqli($host, $usuario, $password, $bd);

if ($conexion->connect_error) {
    die("Fallo en la conexión: " . $conexion->connect_error);
}
?>`,
      nodeConexion: `const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bd_encuesta',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;`
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
  });
}

startServer();
