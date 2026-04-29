from __future__ import annotations

import csv
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Mapping


class DataLogger:
    """Persiste leituras em SQLite ou CSV."""

    def __init__(self, tipo: str, caminho: str) -> None:
        self.tipo = tipo.lower()
        self.caminho = Path(caminho)
        self.caminho.parent.mkdir(parents=True, exist_ok=True)

        if self.tipo not in {"sqlite", "csv"}:
            raise ValueError("Tipo de logger deve ser 'sqlite' ou 'csv'.")

        if self.tipo == "sqlite":
            self._inicializar_sqlite()
        else:
            self._inicializar_csv()

    def salvar_leitura(self, equipamento: str, dados: Mapping[str, float | int]) -> None:
        timestamp = datetime.now(timezone.utc).isoformat()

        if self.tipo == "sqlite":
            self._salvar_sqlite(timestamp, equipamento, dados)
            return

        self._salvar_csv(timestamp, equipamento, dados)

    def fechar(self) -> None:
        """Mantido para simetria com loggers que usam conexoes persistentes."""
        return None

    def _inicializar_sqlite(self) -> None:
        with sqlite3.connect(self.caminho) as conexao:
            conexao.execute(
                """
                CREATE TABLE IF NOT EXISTS leituras (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    equipamento TEXT NOT NULL,
                    variavel TEXT NOT NULL,
                    valor REAL NOT NULL
                )
                """
            )

    def _salvar_sqlite(
        self,
        timestamp: str,
        equipamento: str,
        dados: Mapping[str, float | int],
    ) -> None:
        linhas = [
            (timestamp, equipamento, variavel, float(valor))
            for variavel, valor in dados.items()
        ]
        with sqlite3.connect(self.caminho) as conexao:
            conexao.executemany(
                """
                INSERT INTO leituras (timestamp, equipamento, variavel, valor)
                VALUES (?, ?, ?, ?)
                """,
                linhas,
            )

    def _inicializar_csv(self) -> None:
        if self.caminho.exists():
            return

        with self.caminho.open("w", newline="", encoding="utf-8") as arquivo:
            escritor = csv.writer(arquivo)
            escritor.writerow(["timestamp", "equipamento", "variavel", "valor"])

    def _salvar_csv(
        self,
        timestamp: str,
        equipamento: str,
        dados: Mapping[str, float | int],
    ) -> None:
        with self.caminho.open("a", newline="", encoding="utf-8") as arquivo:
            escritor = csv.writer(arquivo)
            for variavel, valor in dados.items():
                escritor.writerow([timestamp, equipamento, variavel, valor])
