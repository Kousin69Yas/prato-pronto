-- Prato Pronto — schema inicial MySQL
-- Selecione o banco antes de executar este arquivo (o nome fica no .env).
-- Não inclui usuários/senhas de exemplo; senhas devem ser guardadas como hash.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(190) NULL,
  senha_hash VARCHAR(255) NOT NULL,
  tipo ENUM('aluno', 'professor', 'admin') NOT NULL DEFAULT 'aluno',
  turma VARCHAR(32) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_tipo_ativo (tipo, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NULL,
  categoria ENUM('base', 'protein', 'side', 'salad', 'dessert', 'drink') NOT NULL DEFAULT 'side',
  emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
  disponivel TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_menu_disponivel_categoria (disponivel, categoria),
  KEY idx_menu_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NULL,
  nome VARCHAR(100) NOT NULL,
  tipo_usuario ENUM('aluno', 'professor') NOT NULL,
  turma VARCHAR(32) NULL,
  codigo CHAR(4) CHARACTER SET ascii COLLATE ascii_bin NULL,
  status ENUM('received', 'preparing', 'ready', 'picked_up') NOT NULL DEFAULT 'received',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  retirado_em TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_codigo (codigo),
  KEY idx_pedidos_status_criado (status, criado_em),
  KEY idx_pedidos_usuario (usuario_id),
  CONSTRAINT fk_pedidos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_itens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  menu_id BIGINT UNSIGNED NULL,
  nome_item VARCHAR(100) NOT NULL,
  emoji_snapshot VARCHAR(16) NOT NULL DEFAULT '🍽️',
  quantidade TINYINT UNSIGNED NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pedido_itens_pedido (pedido_id),
  KEY idx_pedido_itens_menu (menu_id),
  CONSTRAINT fk_pedido_itens_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pedido_itens_menu
    FOREIGN KEY (menu_id) REFERENCES menu (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS retiradas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  codigo_usado CHAR(4) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  registrado_por BIGINT UNSIGNED NULL,
  retirado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacao VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_retiradas_pedido (pedido_id),
  KEY idx_retiradas_codigo (codigo_usado),
  KEY idx_retiradas_data (retirado_em),
  CONSTRAINT fk_retiradas_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_retiradas_usuario
    FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
