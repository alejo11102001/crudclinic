const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');

// Conexión a PostgreSQL (ajusta el nombre de la BD si hace falta)
const client = new Client({
  user: 'root',
  host: '168.119.183.3',
  database: 'CrudClinic(A,D,J)', // <-- cámbiala si usas otra (p.ej. CrudClinic)
  password: 's7cq453mt2jnicTaQXKT',
  port: 5432,
});

async function cargarTodoDesdeCSV() {
  try {
    await client.connect();

    // === 1) Leer CSV de pacientes ===
    const pacientes = [];
    fs.createReadStream('data/pacientes-crudclinic.csv')
      .pipe(csv())
      .on('data', (data) => {
        pacientes.push(data); // { Nombre, Correo }
      })
      .on('end', async () => {
        // Insertar pacientes
        for (const p of pacientes) {
          await client.query(
            `INSERT INTO Pacientes (nombre, correo)
             VALUES ($1, $2)
             ON CONFLICT (correo) DO NOTHING;`,
            [p.Nombre, p.Correo]
          );
        }

        // === 2) Leer CSV de médicos ===
        const medicos = [];
        fs.createReadStream('data/medicos-crudclinic.csv')
          .pipe(csv())
          .on('data', (data) => {
            medicos.push(data); // { Nombre, Especialidad }
          })
          .on('end', async () => {
            // Insertar médicos
            for (const m of medicos) {
              await client.query(
                `INSERT INTO medicos (nombre, especialidad)
                 VALUES ($1, $2);`,
                [m.Nombre, m.Especialidad]
              );
            }

            // Obtener IDs para asignarlos en las citas
            const pacientesRes = await client.query('SELECT id FROM pacientes ORDER BY id;');
            const medicosRes   = await client.query('SELECT id FROM medicos ORDER BY id;');
            const pacienteIds  = pacientesRes.rows.map(r => r.id);
            const medicoIds    = medicosRes.rows.map(r => r.id);

            if (pacienteIds.length === 0 || medicoIds.length === 0) {
              console.error('Necesitas al menos 1 paciente y 1 médico antes de cargar citas.');
              await client.end();
              return;
            }

            // === 3) Leer CSV de citas ===
            const citas = [];
            fs.createReadStream('data/citas-crudclinic.csv')
              .pipe(csv())
              .on('data', (data) => {
                citas.push(data);
                // columnas: Fecha, Hora, Motivo, Descripción, Ubicación, Estatus, Método
              })
              .on('end', async () => {
                // Insertar citas con asignación round-robin de medico_id y paciente_id
                let iM = 0;
                let iP = 0;

                for (const c of citas) {
                  const medico_id   = medicoIds[iM % medicoIds.length];
                  const paciente_id = pacienteIds[iP % pacienteIds.length];
                  iM++; iP++;

                  await client.query(
                    `INSERT INTO citas
                      (fecha, hora, motivo, descripcion, ubicacion, estatus, metodo_pago, medico_id, paciente_id)
                     VALUES ($1,   $2,   $3,    $4,         $5,       $6,      $7,          $8,        $9);`,
                    [
                      vacioANull(c.Fecha),
                      vacioANull(c.Hora),
                      vacioANull(c.Motivo),
                      vacioANull(c['Descripción']),
                      vacioANull(c['Ubicación']),
                      vacioANull(c['Estatus']),    // Debe existir en tu ENUM (incluye 'Reprogramada' si lo agregaste)
                      vacioANull(c['Método']),     // Debe existir en tu ENUM (incluye 'Tarjeta Débito' si lo agregaste)
                      medico_id,
                      paciente_id
                    ]
                  );
                }

                console.log('✔ Datos de pacientes, médicos y citas cargados exitosamente.');
                await client.end();
              })
              .on('error', async (err) => {
                console.error('Error leyendo CSV de citas:', err);
                await client.end();
              });
          })
          .on('error', async (err) => {
            console.error('Error leyendo CSV de medicos:', err);
            await client.end();
          });
      })
      .on('error', async (err) => {
        console.error('Error leyendo CSV de pacientes:', err);
        await client.end();
      });

  } catch (err) {
    console.error('Error general:', err);
    await client.end();
  }
}

// Convierte texto vacío a NULL (para columnas opcionales)
function vacioANull(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

cargarTodoDesdeCSV();
