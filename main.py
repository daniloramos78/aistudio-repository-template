from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import yaml

from database.logger import DataLogger
from drivers.inversor import Inversor


class SistemaScada:
    """Coordena configuracao, leitura Modbus e persistencia dos dados."""

    def __init__(self, config_path: str = "config.yaml") -> None:
        self.config = self._carregar_config(config_path)
        self.logger = self._criar_logger(self.config["logging"])
        self.inversores = self._criar_inversores(self.config["equipamentos"])

    def executar_ciclo(self) -> None:
        """Executa uma rodada de leitura para todos os inversores configurados."""
        for inversor in self.inversores:
            try:
                dados = inversor.ler_medicoes()
            except Exception as exc:
                print(f"Falha ao ler {inversor.nome}: {exc}")
                continue

            self.logger.salvar_leitura(inversor.nome, dados)
            print(f"Dados salvos para {inversor.nome}: {dados}")

    def executar(self) -> None:
        """Roda o loop principal do SCADA."""
        intervalo = self.config["logging"].get("intervalo_segundos", 5)

        try:
            while True:
                self.executar_ciclo()
                time.sleep(intervalo)
        except KeyboardInterrupt:
            print("SistemaScada finalizado pelo usuario.")
        finally:
            for inversor in self.inversores:
                inversor.desconectar()

    @staticmethod
    def _carregar_config(config_path: str) -> dict[str, Any]:
        caminho = Path(config_path)
        with caminho.open("r", encoding="utf-8") as arquivo:
            return yaml.safe_load(arquivo)

    @staticmethod
    def _criar_logger(config: dict[str, Any]) -> DataLogger:
        tipo = config.get("tipo", "sqlite")
        caminho = config["sqlite_path"] if tipo == "sqlite" else config["csv_path"]
        return DataLogger(tipo=tipo, caminho=caminho)

    @staticmethod
    def _criar_inversores(equipamentos: dict[str, dict[str, Any]]) -> list[Inversor]:
        inversores: list[Inversor] = []

        for nome, equipamento in equipamentos.items():
            if equipamento.get("tipo") != "inversor":
                continue

            inversores.append(
                Inversor(
                    nome=nome,
                    host=equipamento["host"],
                    porta=equipamento.get("porta", 502),
                    timeout=equipamento.get("timeout", 3.0),
                    device_id=equipamento.get("device_id", 1),
                    registradores=equipamento["registradores"],
                )
            )

        return inversores


if __name__ == "__main__":
    SistemaScada().executar()
