const mysql = require('mysql2/promise');
const getApiConnection = require('../../utils/dbApiConnect');

exports.getOrderById = async (req, res) => {
  const orderId = req.params.id;

  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const connection = await getApiConnection();

    const query = `
      SELECT 
        nombreReceptor AS receptor,
        telefonoReceptor AS phone,
        descripcionEnvio AS observation,
        formaPago AS paymentMethod,
        estadoPedido AS status,
        u.name AS driver,
        u.telefono AS driverPhone
      FROM ahoraite.pedidos p
      LEFT JOIN pedidos_movimiento pm ON p.id = pm.id_pedidos
      LEFT JOIN users u ON u.id = pm.id_users
      WHERE p.id = ?
      LIMIT 1
    `;

    const [rows] = await connection.execute(query, [orderId]);
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error al consultar orden:', error);
    return res.status(500).json({ error: 'Error interno al consultar orden' });
  }
};