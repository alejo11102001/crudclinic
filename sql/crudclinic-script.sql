CREATE TYPE estatus_cita AS ENUM ('Confirmada', 'Cancelada', 'Pendiente');
CREATE TYPE metodo_pago_cita AS ENUM ('Efectivo', 'Tarjeta Crédito', 'Transferencia');

CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE medicos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255) NOT NULL
);

CREATE TABLE citas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo VARCHAR(255),
    descripcion TEXT,
    ubicacion VARCHAR(255),
    estatus estatus_cita,
    metodo_pago metodo_pago_cita,
    medico_id INT NOT NULL,
    paciente_id INT NOT NULL,
    
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

