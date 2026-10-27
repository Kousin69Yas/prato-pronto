// Pool MySQL compartilhado pelos controllers.
// Variáveis lidas do .env na raiz do projeto: DB_HOST, DB_PORT, DB_USER,
// DB_PASSWORD e DB_NAME. Também aceita os nomes MYSQL_* equivalentes.
const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const host = process.env.DB_HOST || process.env.MYSQL_HOST || "localhost";
const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);
const user = process.env.DB_USER || process.env.MYSQL_USER;
const password = process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "";
const databaseName = process.env.DB_NAME || process.env.MYSQL_DATABASE;
const connectionLimit = Number(process.env.DB_POOL_SIZE || 10);

if (!user || !databaseName) {
  throw new Error("Configure DB_USER e DB_NAME (ou MYSQL_USER e MYSQL_DATABASE) no .env da raiz do projeto.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT precisa ser um número de porta válido.");
}
if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
  throw new Error("DB_POOL_SIZE precisa ser um número inteiro positivo.");
}

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database: databaseName,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...(process.env.DB_SSL === "true"
    ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } }
    : {}),
});

module.exports = pool;
